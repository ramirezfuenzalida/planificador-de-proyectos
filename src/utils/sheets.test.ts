import { describe, it, expect } from 'vitest';
import { extractSheetId, parseTeamsGrid } from './sheets';

describe('extractSheetId', () => {
  it('extrae el id de un URL completo', () => {
    expect(extractSheetId('https://docs.google.com/spreadsheets/d/1aI7uy0GWk6hQFxwa7KhbrrMsWjvHbc1AO0wEKsSC080/edit?usp=sharing'))
      .toBe('1aI7uy0GWk6hQFxwa7KhbrrMsWjvHbc1AO0wEKsSC080');
  });
  it('acepta un id pelado', () => {
    expect(extractSheetId('1aI7uy0GWk6hQFxwa7KhbrrMsWjvHbc1AO0wEKsSC080'))
      .toBe('1aI7uy0GWk6hQFxwa7KhbrrMsWjvHbc1AO0wEKsSC080');
  });
  it('devuelve vacío para basura o vacío', () => {
    expect(extractSheetId('no es un link')).toBe('');
    expect(extractSheetId('')).toBe('');
  });
});

describe('parseTeamsGrid', () => {
  // Réplica reducida del layout real de "1°TEAM BUILDING": bloques de 4 columnas
  // por curso (A=0, B=4), nombre en offset 0, rol en offset 2.
  const grid: string[][] = [
    ['PRIMERO MEDIO A', '', '', '', 'PRIMERO MEDIO B', '', '', ''],
    ['EQUIPO N°1', '', '', '', 'EQUIPO N°1', '', '', ''],
    ['Ysaac Quiñones', '', 'COORDINADOR', '', 'Alisson Tapia', '', 'COORDINADOR', ''],
    ['Rafaela Saavedra', '', 'INVESTIGADOR', '', 'Christopher Oyardo', '', 'INVESTIGADOR', ''],
    ['', '', '', '', '', '', '', ''],
    ['EQUIPO N°2', '', '', '', 'EQUIPO N°2', '', '', ''],
    ['Josefa Mamani', '', 'COORDINADOR', '', 'Carmen Ayala', '', 'COORDINADOR', ''],
  ];

  it('agrupa por curso y equipo, con nombre y rol', () => {
    const res = parseTeamsGrid(grid, '1');
    expect(res['1MA-G1']).toEqual([
      { name: 'Ysaac Quiñones', role: 'Coordinador' },
      { name: 'Rafaela Saavedra', role: 'Investigador' },
    ]);
    expect(res['1MA-G2']).toEqual([{ name: 'Josefa Mamani', role: 'Coordinador' }]);
    expect(res['1MB-G1']).toEqual([
      { name: 'Alisson Tapia', role: 'Coordinador' },
      { name: 'Christopher Oyardo', role: 'Investigador' },
    ]);
  });

  it('usa el prefijo de nivel (2 → 2MA…)', () => {
    const res = parseTeamsGrid(grid, '2');
    expect(Object.keys(res).some(k => k.startsWith('2MA-'))).toBe(true);
    expect(res['2MB-G2']).toEqual([{ name: 'Carmen Ayala', role: 'Coordinador' }]);
  });

  it('ignora filas vacías y celdas sin rol válido', () => {
    const res = parseTeamsGrid(grid, '1');
    // No debe haber equipos vacíos ni entradas sin rol.
    for (const miembros of Object.values(res)) {
      expect(miembros.length).toBeGreaterThan(0);
      for (const m of miembros) expect(m.name).not.toBe('');
    }
  });
});
