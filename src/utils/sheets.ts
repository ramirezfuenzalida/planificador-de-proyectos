/**
 * Utilidades para leer Google Sheets (planificación y equipos por proyecto).
 * Funciones puras, testeables sin red.
 */

/** Extrae el ID de un URL de Google Sheets. Acepta también un ID pelado. */
export function extractSheetId(input: string): string {
  const s = (input || '').trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  // Un ID de Sheets es una cadena larga sin espacios ni barras.
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return '';
}

export interface TeamMember { name: string; role: string; }
export type TeamsByCourse = Record<string, TeamMember[]>; // '1MA-G1' -> miembros

const ROLES = new Set(['COORDINADOR', 'INVESTIGADOR', 'MEDIADOR', 'SECRETARIO']);
// Cada curso ocupa un bloque de 4 columnas; nombre en offset 0, rol en offset 2.
const COURSE_BLOCKS: Array<{ letra: string; base: number }> = [
  { letra: 'A', base: 0 },
  { letra: 'B', base: 4 },
  { letra: 'C', base: 8 },
  { letra: 'D', base: 12 },
];

/**
 * Parsea la pestaña de equipos (formato horizontal de "1°TEAM BUILDING") a
 * `${curso}-G${n}` -> [{ name, role }]. `nivel` es '1' o '2' (Primeros/Segundos),
 * usado para el prefijo del curso (1MA, 2MA, …).
 *
 * `grid` es la matriz de celdas ya normalizadas a string (fila x columna).
 */
export function parseTeamsGrid(grid: string[][], nivel: '1' | '2'): TeamsByCourse {
  const result: TeamsByCourse = {};

  for (const { letra, base } of COURSE_BLOCKS) {
    const tag = `${nivel}M${letra}`;
    let team = 0;
    let key: string | null = null;

    for (const row of grid) {
      const name = (row[base] ?? '').trim();
      const role = (row[base + 2] ?? '').trim();
      const up = name.toUpperCase();

      if (up.startsWith('EQUIPO')) {
        team += 1;
        key = `${tag}-G${team}`;
        result[key] = [];
      } else if (name && ROLES.has(role.toUpperCase()) && key) {
        result[key].push({ name, role: title(role) });
      }
    }

    // Descartar equipos que quedaron sin integrantes (bloques vacíos).
    for (const k of Object.keys(result)) {
      if (k.startsWith(`${tag}-`) && result[k].length === 0) delete result[k];
    }
  }

  return result;
}

function title(s: string): string {
  const t = s.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
