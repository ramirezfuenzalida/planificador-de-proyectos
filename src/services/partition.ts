/**
 * Lógica pura de partición por curso. Sin dependencias de Firebase, para
 * poder probarla en aislamiento.
 *
 * Las claves de asistencia, seguimiento, observaciones y evaluaciones llevan
 * siempre el curso como prefijo (`${curso}-${...}`). Derivamos el curso
 * comparando contra la lista conocida, NO cortando en el primer guion: cortar
 * por guion se rompería el día que un curso se llame "1 Medio A-1".
 */

export const COURSES = [
  '1 Medio A', '1 Medio B', '1 Medio C', '1 Medio D',
  '2 Medio A', '2 Medio B', '2 Medio C', '2 Medio D',
] as const;

/** Colecciones que crecen y se parten en un documento por curso. */
export const PARTITIONED_KEYS = [
  'registrations',
  'formativeRegistrations',
  'observations',
  'formativeEvaluations',
] as const;

/** Colecciones acotadas, que viven en un único documento de `app_sync`. */
export const SINGLE_DOC_KEYS = [
  'teacherRoles',
  'menuPermissions',
  'studentGroups',
  'calendarEvents',
] as const;

/** Destino de las claves que no coinciden con ningún curso conocido. */
export const UNKNOWN_COURSE_DOC = '_sin_curso';

/** Cursos ordenados de más largo a más corto, para que gane la coincidencia
 *  más específica si alguna vez un nombre es prefijo de otro. */
const CURSOS_POR_ESPECIFICIDAD = [...COURSES].sort((a, b) => b.length - a.length);

export function courseForKey(key: string): string {
  const encontrado = CURSOS_POR_ESPECIFICIDAD.find(curso => key.startsWith(curso));
  return encontrado ?? UNKNOWN_COURSE_DOC;
}

export function partitionByCourse(
  record: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  const salida: Record<string, Record<string, unknown>> = {};
  for (const [clave, valor] of Object.entries(record)) {
    const curso = courseForKey(clave);
    (salida[curso] ??= {})[clave] = valor;
  }
  return salida;
}

export function mergePartitions(
  parts: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  return Object.assign({}, ...Object.values(parts));
}
