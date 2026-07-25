/**
 * Helpers puros de rutas por proyecto en Firestore. Separan los datos de
 * seguimiento de cada proyecto usando el id del proyecto en el id del documento,
 * sin cambiar el formato interno de las claves ni las reglas de Firestore.
 */

/** Claves particionadas por curso y por proyecto. */
export const PROJECT_SCOPED_PARTITIONED = [
  'registrations', 'formativeRegistrations', 'observations', 'formativeEvaluations',
] as const;

/** Claves de documento único, por proyecto. */
export const PROJECT_SCOPED_SINGLE = ['calendarEvents'] as const;

/** Claves de documento único, globales (no dependen del proyecto). */
export const GLOBAL_SINGLE = [
  'teacherRoles', 'menuPermissions', 'studentGroups', 'projectsConfig',
] as const;

const SEP = '__';

export function scopedPartDocId(projectId: string, curso: string): string {
  return `${projectId}${SEP}${curso}`;
}

export function cursoFromScopedDocId(projectId: string, docId: string): string | null {
  const prefijo = `${projectId}${SEP}`;
  return docId.startsWith(prefijo) ? docId.slice(prefijo.length) : null;
}

export function scopedSingleDocId(key: string, projectId: string): string {
  return `${key}${SEP}${projectId}`;
}
