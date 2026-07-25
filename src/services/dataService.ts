import {
  collection, doc, getDoc, getDocs, setDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PARTITIONED_KEYS, SINGLE_DOC_KEYS, partitionByCourse, mergePartitions } from './partition';
import {
  PROJECT_SCOPED_SINGLE, scopedPartDocId, cursoFromScopedDocId, scopedSingleDocId,
} from './projectScope';

let activeProjectId = 'steam';
/** Define el proyecto cuyos datos de seguimiento se leen/guardan. */
export function setActiveProject(id: string): void { activeProjectId = id || 'steam'; }

const esParticionada = (key: string) => (PARTITIONED_KEYS as readonly string[]).includes(key);
const esGlobalSingle = (key: string) => (SINGLE_DOC_KEYS as readonly string[]).includes(key);
const esScopedSingle = (key: string) => (PROJECT_SCOPED_SINGLE as readonly string[]).includes(key);

/**
 * Carga las claves. Las globales van directo; `calendarEvents` y las
 * particionadas (registrations, etc.) se leen del namespace del proyecto activo.
 * El resultado tiene el mismo formato plano que la app ya usa.
 */
export async function loadAll(): Promise<Record<string, unknown>> {
  const salida: Record<string, unknown> = {};

  for (const key of SINGLE_DOC_KEYS) {
    const snap = await getDoc(doc(db, 'app_sync', key));
    if (snap.exists()) salida[key] = snap.data().data;
  }

  for (const key of PROJECT_SCOPED_SINGLE) {
    const snap = await getDoc(doc(db, 'app_sync', scopedSingleDocId(key, activeProjectId)));
    if (snap.exists()) salida[key] = snap.data().data;
  }

  for (const key of PARTITIONED_KEYS) {
    const snap = await getDocs(collection(db, key));
    const partes: Record<string, Record<string, unknown>> = {};
    snap.forEach(d => {
      const curso = cursoFromScopedDocId(activeProjectId, d.id);
      if (curso) partes[curso] = d.data().data ?? {};
    });
    salida[key] = mergePartitions(partes);
  }

  return salida;
}

/** Dirige la escritura al documento correcto según la clave y el proyecto activo. */
export async function save(
  key: string,
  data: Record<string, unknown> | unknown[],
): Promise<void> {
  if (esGlobalSingle(key)) {
    await setDoc(doc(db, 'app_sync', key), { data });
    return;
  }
  if (esScopedSingle(key)) {
    await setDoc(doc(db, 'app_sync', scopedSingleDocId(key, activeProjectId)), { data });
    return;
  }
  if (esParticionada(key)) {
    const partes = partitionByCourse(data as Record<string, unknown>);
    await Promise.all(
      Object.entries(partes).map(([curso, datos]) =>
        setDoc(doc(db, key, scopedPartDocId(activeProjectId, curso)), { data: datos }),
      ),
    );
    return;
  }
  await setDoc(doc(db, 'app_sync', key), { data }); // fallback global
}

/** Registra los onSnapshot (respetando el proyecto activo) y devuelve limpieza. */
export function subscribe(
  cb: (key: string, data: Record<string, unknown>) => void,
): () => void {
  const bajas: Array<() => void> = [];

  for (const key of SINGLE_DOC_KEYS) {
    bajas.push(onSnapshot(doc(db, 'app_sync', key), snap => {
      if (snap.exists()) cb(key, snap.data().data);
    }));
  }

  for (const key of PROJECT_SCOPED_SINGLE) {
    bajas.push(onSnapshot(doc(db, 'app_sync', scopedSingleDocId(key, activeProjectId)), snap => {
      if (snap.exists()) cb(key, snap.data().data);
    }));
  }

  for (const key of PARTITIONED_KEYS) {
    bajas.push(onSnapshot(collection(db, key), snap => {
      const partes: Record<string, Record<string, unknown>> = {};
      snap.forEach(d => {
        const curso = cursoFromScopedDocId(activeProjectId, d.id);
        if (curso) partes[curso] = d.data().data ?? {};
      });
      cb(key, mergePartitions(partes));
    }));
  }

  return () => bajas.forEach(baja => baja());
}
