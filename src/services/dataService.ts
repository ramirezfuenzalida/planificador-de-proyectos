import {
  collection, doc, getDoc, getDocs, setDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  PARTITIONED_KEYS, SINGLE_DOC_KEYS, partitionByCourse, mergePartitions,
} from './partition';

const esParticionada = (key: string) =>
  (PARTITIONED_KEYS as readonly string[]).includes(key);

/**
 * Carga las 8 claves. Las particionadas se reensamblan en el mismo
 * diccionario plano que la app usa hoy, de modo que el estado de React
 * no cambia respecto de la versión con Supabase.
 */
export async function loadAll(): Promise<Record<string, unknown>> {
  const salida: Record<string, unknown> = {};

  for (const key of SINGLE_DOC_KEYS) {
    const snap = await getDoc(doc(db, 'app_sync', key));
    if (snap.exists()) salida[key] = snap.data().data;
  }

  for (const key of PARTITIONED_KEYS) {
    const snap = await getDocs(collection(db, key));
    const partes: Record<string, Record<string, unknown>> = {};
    snap.forEach(d => { partes[d.id] = d.data().data ?? {}; });
    salida[key] = mergePartitions(partes);
  }

  return salida;
}

/** Dirige la escritura al documento correcto según la clave. Las claves de
 *  documento único pueden guardar arreglos (p. ej. calendarEvents); las
 *  particionadas son siempre diccionarios con el curso como prefijo. */
export async function save(
  key: string,
  data: Record<string, unknown> | unknown[],
): Promise<void> {
  if (!esParticionada(key)) {
    await setDoc(doc(db, 'app_sync', key), { data });
    return;
  }
  const partes = partitionByCourse(data as Record<string, unknown>);
  await Promise.all(
    Object.entries(partes).map(([curso, datos]) =>
      setDoc(doc(db, key, curso), { data: datos }),
    ),
  );
}

/** Registra los onSnapshot y devuelve una función de limpieza. */
export function subscribe(
  cb: (key: string, data: Record<string, unknown>) => void,
): () => void {
  const bajas: Array<() => void> = [];

  for (const key of SINGLE_DOC_KEYS) {
    bajas.push(onSnapshot(doc(db, 'app_sync', key), snap => {
      if (snap.exists()) cb(key, snap.data().data);
    }));
  }

  for (const key of PARTITIONED_KEYS) {
    bajas.push(onSnapshot(collection(db, key), snap => {
      const partes: Record<string, Record<string, unknown>> = {};
      snap.forEach(d => { partes[d.id] = d.data().data ?? {}; });
      cb(key, mergePartitions(partes));
    }));
  }

  return () => bajas.forEach(baja => baja());
}
