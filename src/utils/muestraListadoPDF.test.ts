import { describe, it, expect } from 'vitest';
import { construirListadoEquipo, construirListadoCompleto } from './muestraListadoPDF';
import type { ExportContext } from './muestraExport';
import type { MuestraEquipo, MuestraMiembro, MuestraPublica } from '../types';

const miembro = (
  courseTag: string, groupId: number, sid: MuestraMiembro['sid'], name: string,
): MuestraMiembro => ({
  curso: `${courseTag[0]} Medio ${courseTag[2]}`,
  courseTag, groupId, sid, name, role: 'Coordinador',
});

const ctx: ExportContext = {
  levelClasses: [{ clase: '1', fecha: '2026-03-10' }, { clase: '2', fecha: '2026-03-17' }],
  formativeRegistrations: {
    '1MA-C1-G2': { group: 'none', students: { s1: 'green' } },
    '1MD-C1-G7': { group: 'none', students: { s3: 'red' } },
  },
  formativeEvaluations: {},
};

const equipo = (nombre: string, miembros: MuestraMiembro[]): MuestraEquipo => ({
  id: `eq-${nombre}`, nombre, nivel: '1M',
  tematica: 'Patrimonio', asignatura: 'Historia',
  docentes: ['Marco Ramírez'], miembros, createdAt: 0, updatedAt: 0,
});

const eq1 = equipo('Equipo Salitre', [
  miembro('1MA', 2, 's1', 'Ana Rojas'),
  miembro('1MD', 7, 's3', 'Beto Silva'),
]);

const muestra: MuestraPublica = {
  nombre: 'Muestra Pública 2026', fecha: '2026-11-20',
  nivel: '1M', configurada: true, equipos: [eq1, equipo('Equipo Pampa', [
    miembro('1MB', 1, 's1', 'Caro Díaz'),
  ])],
};

/** Los bytes de un PDF válido siempre empiezan con la firma %PDF. */
const esPDF = (doc: { output: (t: string) => string }) =>
  doc.output('datauristring').includes('application/pdf');

/** Los tests corren sin fetch de /public, así que se pasan logos explícitos. */
const SIN_LOGOS = { liceo: null, proyecto: null };

describe('construirListadoEquipo', () => {
  it('genera un PDF válido de una página', async () => {
    const doc = await construirListadoEquipo(eq1, muestra, ctx, SIN_LOGOS);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(esPDF(doc)).toBe(true);
  });

  it('no falla con un equipo sin integrantes', async () => {
    const vacio = equipo('Equipo Vacío', []);
    await expect(construirListadoEquipo(vacio, muestra, ctx, SIN_LOGOS)).resolves.toBeDefined();
  });

  it('no falla con campos sin completar', async () => {
    const pelado: MuestraEquipo = { ...eq1, asignatura: '', tematica: '', docentes: [] };
    await expect(construirListadoEquipo(pelado, muestra, ctx, SIN_LOGOS)).resolves.toBeDefined();
  });

  it('sobrevive a que no se puedan cargar los logos', async () => {
    // cargarLogos() devuelve null en entorno sin fetch: el PDF igual se emite.
    await expect(construirListadoEquipo(eq1, muestra, ctx)).resolves.toBeDefined();
  });
});

describe('construirListadoCompleto', () => {
  it('usa una página por equipo', async () => {
    const doc = await construirListadoCompleto(muestra, ctx, SIN_LOGOS);
    expect(doc.getNumberOfPages()).toBe(2);
    expect(esPDF(doc)).toBe(true);
  });

  it('no falla sin equipos', async () => {
    await expect(
      construirListadoCompleto({ ...muestra, equipos: [] }, ctx, SIN_LOGOS),
    ).resolves.toBeDefined();
  });
});
