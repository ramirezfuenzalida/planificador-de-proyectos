/**
 * Exportación de la Muestra Pública a Excel.
 *
 * El libro digital carga curso por curso, pero los equipos de muestra son
 * multicurso. Por eso el archivo trae una hoja por curso (cada estudiante
 * vuelve a su curso de origen con su nota) más una hoja de resumen por equipo.
 */
import * as XLSX from 'xlsx';
import type { MuestraPublica, MuestraEquipo, MuestraMiembro } from '../types';
import {
  getStudentHistory, calculateProposedGrade, countByStatus, formatGrade,
  compararPorApellido,
  type ClaseLike, type FormativeRegistrations, type FormativeEvaluations,
} from './formativeGrades';

export interface ExportContext {
  levelClasses: ClaseLike[];
  formativeRegistrations: FormativeRegistrations;
  formativeEvaluations: FormativeEvaluations;
}

/** Estudiante disponible para sumar a un equipo, con su origen de aula. */
export interface Candidato extends MuestraMiembro {
  key: string;
}

const SLOTS: MuestraMiembro['sid'][] = ['s1', 's2', 's3', 's4'];
const GRUPOS_POR_CURSO = 10;

/**
 * Arma el catálogo de estudiantes reales de un conjunto de cursos, leyendo los
 * equipos de aula del Sheets. Funciona igual para Primeros y Segundos: lo único
 * que cambia es la lista de cursos que se le pasa.
 *
 * Los placeholder "Estudiante N" no son personas y quedan fuera.
 */
export function construirCatalogo(
  cursos: string[],
  dynamicGroups: Record<string, { name?: string; role?: string }[]>,
  getCourseTag: (curso: string) => string,
): Candidato[] {
  const salida: Candidato[] = [];
  for (const curso of cursos) {
    const courseTag = getCourseTag(curso);
    if (!courseTag) continue;

    const delCurso: Candidato[] = [];
    for (let groupId = 1; groupId <= GRUPOS_POR_CURSO; groupId++) {
      const info = dynamicGroups[`${courseTag}-G${groupId}`] || [];
      SLOTS.forEach((sid, idx) => {
        const name = info[idx]?.name ? String(info[idx].name).trim() : '';
        if (!name || /^Estudiante \d+$/i.test(name)) return;
        delCurso.push({
          key: `${courseTag}-G${groupId}-${sid}`,
          curso, courseTag, groupId, sid, name,
          role: info[idx]?.role || '',
        });
      });
    }

    // Orden de lista de clase: por apellido dentro del curso, no por equipo.
    delCurso.sort((a, b) => compararPorApellido(a.name, b.name));
    salida.push(...delCurso);
  }
  return salida;
}

/** Clave con que se guarda la nota de un integrante en `formativeEvaluations`. */
export function muestraGradeKey(equipoId: string, m: MuestraMiembro): string {
  return `muestra-${equipoId}-${m.courseTag}-G${m.groupId}-${m.sid}`;
}

/** Un estudiante ya consolidado, listo para pintar en tabla o exportar. */
export interface FilaMiembro {
  miembro: MuestraMiembro;
  equipo: MuestraEquipo;
  registros: number;
  logrados: number;
  porLograr: number;
  noLogrados: number;
  notaPropuesta: number | null;
  notaFinal: string;
}

/** Consolida un integrante leyendo su seguimiento de aula. */
export function consolidarMiembro(
  equipo: MuestraEquipo,
  miembro: MuestraMiembro,
  ctx: ExportContext,
): FilaMiembro {
  const history = getStudentHistory(
    miembro.courseTag, miembro.groupId, miembro.sid,
    ctx.levelClasses, ctx.formativeRegistrations,
  );
  const { logrados, porLograr, noLogrados, total } = countByStatus(history);
  const evaluacion = ctx.formativeEvaluations[muestraGradeKey(equipo.id, miembro)];

  return {
    miembro, equipo,
    registros: total, logrados, porLograr, noLogrados,
    notaPropuesta: calculateProposedGrade(history),
    notaFinal: formatGrade(evaluacion?.grade),
  };
}

/** Todas las filas de la muestra, en orden de equipo. */
export function consolidarMuestra(
  muestra: MuestraPublica,
  ctx: ExportContext,
): FilaMiembro[] {
  return muestra.equipos.flatMap((equipo) =>
    equipo.miembros.map((m) => consolidarMiembro(equipo, m, ctx)),
  );
}

/** Promedio de las notas propuestas de un equipo (null si no hay ninguna). */
export function promedioEquipo(equipo: MuestraEquipo, ctx: ExportContext): number | null {
  const notas = equipo.miembros
    .map((m) => consolidarMiembro(equipo, m, ctx).notaPropuesta)
    .filter((n): n is number => n !== null);
  if (notas.length === 0) return null;
  return parseFloat((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1));
}

const ENCABEZADOS = [
  'N° lista', 'Estudiante', 'Curso', 'Equipo', 'Asignatura', 'Temática',
  'Docentes', 'Registros', 'L', 'PL', 'NL', 'Nota propuesta', 'Nota final',
];

const ANCHOS = [
  { wch: 8 }, { wch: 28 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 24 },
  { wch: 26 }, { wch: 10 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 14 }, { wch: 12 },
];

/** Agrupa las filas por curso de origen. */
export function agruparPorCurso(filas: FilaMiembro[]): Map<string, FilaMiembro[]> {
  const porCurso = new Map<string, FilaMiembro[]>();
  for (const fila of filas) {
    const tag = fila.miembro.courseTag;
    if (!porCurso.has(tag)) porCurso.set(tag, []);
    porCurso.get(tag)!.push(fila);
  }
  // Ordenamos por apellido dentro de cada curso: así el N° de lista es estable
  // entre exportaciones aunque se reordenen los equipos.
  for (const filasCurso of porCurso.values()) {
    filasCurso.sort((a, b) => compararPorApellido(a.miembro.name, b.miembro.name));
  }
  return porCurso;
}

function hojaDeCurso(filasCurso: FilaMiembro[]): XLSX.WorkSheet {
  const datos = filasCurso.map((f, i) => [
    i + 1,
    f.miembro.name,
    f.miembro.curso,
    f.equipo.nombre,
    f.equipo.asignatura,
    f.equipo.tematica,
    f.equipo.docentes.join(', '),
    f.registros,
    f.logrados,
    f.porLograr,
    f.noLogrados,
    f.notaPropuesta ?? '',
    f.notaFinal,
  ]);
  const hoja = XLSX.utils.aoa_to_sheet([ENCABEZADOS, ...datos]);
  hoja['!cols'] = ANCHOS;
  return hoja;
}

/**
 * UN solo archivo .xlsx con una pestaña por curso, para copiar y pegar en el
 * libro digital.
 *
 * Antes bajaba un archivo por curso, pero los navegadores descartan las
 * descargas disparadas en ráfaga y solo llegaba la primera. Un único libro con
 * pestañas evita el problema por completo y además es más cómodo de usar.
 *
 * Devuelve los cursos incluidos.
 */
export function construirLibroPorCurso(
  muestra: MuestraPublica, ctx: ExportContext,
): { libro: XLSX.WorkBook; tags: string[] } {
  const porCurso = agruparPorCurso(consolidarMuestra(muestra, ctx));
  const tags = [...porCurso.keys()].sort();

  const libro = XLSX.utils.book_new();
  for (const tag of tags) {
    XLSX.utils.book_append_sheet(libro, hojaDeCurso(porCurso.get(tag)!), tag);
  }
  return { libro, tags };
}

export function exportarPorCurso(muestra: MuestraPublica, ctx: ExportContext): string[] {
  const { libro, tags } = construirLibroPorCurso(muestra, ctx);
  if (tags.length === 0) return [];

  const nivel = muestra.nivel === '1M' ? 'Primeros' : 'Segundos';
  const fecha = muestra.fecha || new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `Muestra_Publica_Notas_${nivel}_${fecha}.xlsx`);
  return tags;
}

/**
 * Un solo archivo con todo el nivel: una hoja "Todos" con los estudiantes de
 * todos los cursos juntos, una hoja por cada curso, y el resumen por equipo.
 * Es la vista completa de la muestra.
 */
export function exportarPorNivel(muestra: MuestraPublica, ctx: ExportContext): void {
  const libro = XLSX.utils.book_new();
  const filas = consolidarMuestra(muestra, ctx);
  const porCurso = agruparPorCurso(filas);

  // Hoja del nivel completo, ordenada por curso y luego por nombre.
  const todas = [...filas].sort((a, b) =>
    a.miembro.courseTag.localeCompare(b.miembro.courseTag, 'es') ||
    compararPorApellido(a.miembro.name, b.miembro.name),
  );
  const nivelLabel = muestra.nivel === '1M' ? 'Primeros Medios' : 'Segundos Medios';
  XLSX.utils.book_append_sheet(libro, hojaDeCurso(todas), nivelLabel);

  for (const tag of [...porCurso.keys()].sort()) {
    XLSX.utils.book_append_sheet(libro, hojaDeCurso(porCurso.get(tag)!), tag);
  }

  // ── Hoja de resumen por equipo ──────────────────────────────────────────
  const resumen = muestra.equipos.map((e) => [
    e.nombre,
    e.asignatura,
    e.tematica,
    e.docentes.join(', '),
    e.miembros.length,
    new Set(e.miembros.map((m) => m.courseTag)).size,
    promedioEquipo(e, ctx) ?? '',
  ]);

  const hojaResumen = XLSX.utils.aoa_to_sheet([
    ['Equipo', 'Asignatura', 'Temática', 'Docentes', 'Estudiantes', 'Cursos', 'Promedio propuesto'],
    ...resumen,
  ]);
  hojaResumen['!cols'] = [
    { wch: 22 }, { wch: 18 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 8 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen');

  const nivel = muestra.nivel === '1M' ? 'Primeros' : 'Segundos';
  const fecha = muestra.fecha || new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `Muestra_Publica_${nivel}_${fecha}.xlsx`);
}
