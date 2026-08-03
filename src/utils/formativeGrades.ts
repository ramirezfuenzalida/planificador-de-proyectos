/**
 * Lógica pura de consolidación formativa y cálculo de nota.
 *
 * Vivía dentro de FormativeEvaluationView; se extrajo para que la Muestra
 * Pública consolide exactamente igual. La diferencia entre ambas vistas es de
 * dónde salen `courseTag` y `groupId`: en Evaluación Formativa vienen del curso
 * seleccionado, y en Muestra Pública de cada integrante del equipo — que puede
 * ser de otro curso. La lógica de abajo no necesita saber cuál es el caso.
 */

export type FormativeStatus = 'green' | 'yellow' | 'red' | 'none';

export interface HistoryEntry {
  classId: string;
  date: string;
  status: Exclude<FormativeStatus, 'none'>;
}

/** Clase mínima que necesita el consolidado (subconjunto de `Clase`). */
export interface ClaseLike {
  clase: string;
  fecha: string;
}

/** Una celda de seguimiento: el estado del grupo y el de cada slot s1..s4. */
export interface FormativeRegistration {
  group?: FormativeStatus;
  students?: Record<string, FormativeStatus>;
}
export type FormativeRegistrations = Record<string, FormativeRegistration>;

/** Nota y retroalimentación oficial de un estudiante. */
export interface FormativeEvaluation {
  grade?: string;
  comment?: string;
}
export type FormativeEvaluations = Record<string, FormativeEvaluation>;

/** Integrante de un grupo tal como llega desde el Sheets. */
export interface GrupoMiembroSheet {
  name?: string;
  role?: string;
}
export type DynamicGroups = Record<string, GrupoMiembroSheet[]>;

/**
 * Recorre las clases del nivel y devuelve las evaluaciones registradas de un
 * estudiante. Si el estudiante no tiene estado propio pero su grupo sí, hereda
 * el del grupo: así una evaluación puesta a nivel de grupo cuenta para todos
 * sus integrantes en vez de dejar el consolidado vacío.
 */
export function getStudentHistory(
  courseTag: string,
  groupId: number,
  studentId: string,
  levelClasses: ClaseLike[],
  formativeRegistrations: FormativeRegistrations,
): HistoryEntry[] {
  const history: HistoryEntry[] = [];

  levelClasses.forEach((clase) => {
    const classId = clase.clase;
    const trackingData = formativeRegistrations[`${courseTag}-C${classId}-G${groupId}`];
    if (!trackingData) return;

    const studentStatus: FormativeStatus = trackingData.students?.[studentId] || 'none';
    const groupStatus: FormativeStatus = trackingData.group || 'none';

    const finalStatus = studentStatus === 'none' ? groupStatus : studentStatus;
    if (finalStatus !== 'none') {
      history.push({ classId, date: clase.fecha, status: finalStatus });
    }
  });

  return history;
}

/**
 * Nota propuesta según la tabla de indicadores de logro institucional.
 * Logrado suma 1 punto, Por Lograr 0,5 y No Logrado 0.
 *
 *   D  (Desarrollado)       86%–100% → 7
 *   ED (En Desarrollo)      73%–85%  → 6
 *   DI (Desarrollo Inicial) 67%–72%  → 5
 *   ND (No Desarrollado)    50%–66%  → 4
 *                           26%–49%  → 3
 *                            1%–25%  → 2
 *                               0%   → 1
 *
 * Devuelve `null` cuando no hay ninguna evaluación registrada: sin registros no
 * hay nota que proponer, que es distinto de proponer un 1.
 */
export function calculateProposedGrade(history: HistoryEntry[]): number | null {
  const total = history.length;
  if (total === 0) return null;

  let points = 0;
  history.forEach((h) => {
    if (h.status === 'green') points += 1.0;
    else if (h.status === 'yellow') points += 0.5;
  });

  const pct = (points / total) * 100;

  let grade: number;
  if (pct >= 86)      grade = 7;
  else if (pct >= 73) grade = 6;
  else if (pct >= 67) grade = 5;
  else if (pct >= 50) grade = 4;
  else if (pct >= 26) grade = 3;
  else if (pct >= 1)  grade = 2;
  else                grade = 1;

  return parseFloat(grade.toFixed(1));
}

/** Conteo de logros para mostrar el desglose L / PL / NL. */
export function countByStatus(history: HistoryEntry[]): {
  logrados: number; porLograr: number; noLogrados: number; total: number;
} {
  return {
    logrados:   history.filter((h) => h.status === 'green').length,
    porLograr:  history.filter((h) => h.status === 'yellow').length,
    noLogrados: history.filter((h) => h.status === 'red').length,
    total: history.length,
  };
}

/** Partículas que forman parte del apellido junto con la palabra siguiente. */
const PARTICULAS = new Set([
  'de', 'del', 'la', 'las', 'los', 'san', 'santa', 'santo',
  'da', 'das', 'do', 'dos', 'di', 'van', 'von', 'mac', 'mc', 'y',
]);

/**
 * Apellido con que se ordena a un estudiante.
 *
 * Los nombres llegan del Sheets como "Nombre Apellido" ("Paulo Brito"), así que
 * ordenar la cadena completa ordenaría por nombre de pila. Tomamos la última
 * palabra como apellido, arrastrando las partículas que la anteceden para que
 * "Kimbeli San Cristobal" ordene por "San Cristobal" y no por "Cristobal".
 *
 * Es una heurística: si algún día la planilla trae "Apellido Nombre", el orden
 * de esos casos saldría por el nombre de pila.
 */
export function apellidoDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return nombre.trim();

  let inicio = partes.length - 1;
  while (inicio > 1 && PARTICULAS.has(partes[inicio - 1].toLowerCase())) inicio--;
  return partes.slice(inicio).join(' ');
}

/** Compara dos estudiantes por apellido y, a igualdad, por nombre completo. */
export function compararPorApellido(a: string, b: string): number {
  return apellidoDe(a).localeCompare(apellidoDe(b), 'es', { sensitivity: 'base' })
    || a.localeCompare(b, 'es', { sensitivity: 'base' });
}

/** Normaliza una nota a un decimal. Cadena vacía si no es un número válido. */
export function formatGrade(grade: unknown): string {
  if (grade === undefined || grade === null || grade === '') return '';
  const num = parseFloat(String(grade));
  if (isNaN(num)) return '';
  return num.toFixed(1);
}
