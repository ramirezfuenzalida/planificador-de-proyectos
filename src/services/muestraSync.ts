/**
 * Fusión de la Muestra Pública entre lo que tiene un docente en pantalla y lo
 * que hay en Firestore.
 *
 * La muestra vive en un solo documento con todos los equipos. Sin fusionar, dos
 * docentes trabajando a la vez se pisan: el último en guardar sobrescribe el
 * documento completo y borra lo que hizo el otro.
 *
 * La regla es por equipo, no por documento: gana la versión con `updatedAt` más
 * reciente. Los equipos que solo existen en un lado se conservan, salvo que
 * estén marcados como eliminados (ver `eliminados`).
 *
 * Lógica pura, sin Firebase, para poder probarla.
 */
import type { MuestraPublica, MuestraEquipo } from '../types';

/** Ids de equipos borrados, con el momento del borrado. */
export type Tombstones = Record<string, number>;

export interface MuestraConLapidas extends MuestraPublica {
  /** Sin esto, un equipo borrado por alguien reaparecería al fusionar. */
  eliminados?: Tombstones;
}

/** Marca un equipo como eliminado para que la fusión no lo resucite. */
export function marcarEliminado(
  muestra: MuestraConLapidas, equipoId: string, ahora = Date.now(),
): MuestraConLapidas {
  return {
    ...muestra,
    equipos: muestra.equipos.filter((e) => e.id !== equipoId),
    eliminados: { ...(muestra.eliminados || {}), [equipoId]: ahora },
  };
}

/** Se queda con el equipo editado más recientemente. */
function masReciente(a: MuestraEquipo, b: MuestraEquipo): MuestraEquipo {
  return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
}

/**
 * Fusiona dos versiones de la muestra.
 *
 * `local` son los cambios del docente que está guardando; `remoto` es lo que
 * hay en Firestore (posiblemente con cambios de otro docente). El resultado
 * conserva el trabajo de ambos.
 */
export function fusionarMuestra(
  local: MuestraConLapidas | null | undefined,
  remoto: MuestraConLapidas | null | undefined,
): MuestraConLapidas {
  if (!remoto) return local ?? { ...VACIA };
  if (!local) return remoto;

  const eliminados: Tombstones = { ...(remoto.eliminados || {}) };
  for (const [id, cuando] of Object.entries(local.eliminados || {})) {
    eliminados[id] = Math.max(eliminados[id] || 0, cuando);
  }

  const porId = new Map<string, MuestraEquipo>();
  for (const e of remoto.equipos) porId.set(e.id, e);
  for (const e of local.equipos) {
    const previo = porId.get(e.id);
    porId.set(e.id, previo ? masReciente(previo, e) : e);
  }

  // Un equipo se descarta si fue borrado DESPUÉS de su última edición: así una
  // edición posterior al borrado (otro docente siguió trabajando) lo rescata.
  const equipos = [...porId.values()].filter((e) => {
    const borrado = eliminados[e.id];
    return !borrado || (e.updatedAt || 0) > borrado;
  });

  // Los datos de cabecera siguen al lado que tenga el equipo más nuevo.
  const ultimoLocal = Math.max(0, ...local.equipos.map((e) => e.updatedAt || 0));
  const ultimoRemoto = Math.max(0, ...remoto.equipos.map((e) => e.updatedAt || 0));
  const cabecera = ultimoLocal >= ultimoRemoto ? local : remoto;

  return {
    nombre: cabecera.nombre || remoto.nombre || local.nombre,
    fecha: cabecera.fecha || remoto.fecha || local.fecha,
    nivel: local.nivel,                       // el nivel es la pestaña de cada uno
    configurada: local.configurada || remoto.configurada,
    equipos,
    eliminados,
  };
}

const VACIA: MuestraConLapidas = {
  nombre: '', fecha: '', nivel: '1M', configurada: false, equipos: [], eliminados: {},
};
