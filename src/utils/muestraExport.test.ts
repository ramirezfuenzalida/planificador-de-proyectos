import { describe, it, expect } from 'vitest';
import {
  consolidarMiembro, consolidarMuestra, agruparPorCurso, promedioEquipo,
  muestraGradeKey, construirLibroPorCurso, construirCatalogo,
  type ExportContext,
} from './muestraExport';
import * as XLSX from 'xlsx';
import type { MuestraEquipo, MuestraMiembro, MuestraPublica } from '../types';

const clases = [
  { clase: '1', fecha: '2026-03-10' },
  { clase: '2', fecha: '2026-03-17' },
];

const miembro = (
  courseTag: string, groupId: number, sid: MuestraMiembro['sid'], name: string,
): MuestraMiembro => ({
  curso: `${courseTag[0]} Medio ${courseTag[2]}`,
  courseTag, groupId, sid, name, role: 'Coordinador',
});

const equipo = (miembros: MuestraMiembro[]): MuestraEquipo => ({
  id: 'eq1', nombre: 'Equipo Salitre', nivel: '1M',
  tematica: 'Patrimonio', asignatura: 'Historia',
  docentes: ['Marco Ramírez'], miembros,
  createdAt: 0, updatedAt: 0,
});

/**
 * Escenario central: un equipo con estudiantes de 1MA y 1MD. Cada uno tiene su
 * seguimiento en SU curso y SU grupo de aula — nunca en el del equipo.
 */
const ctx: ExportContext = {
  levelClasses: clases,
  formativeRegistrations: {
    '1MA-C1-G2': { group: 'none', students: { s1: 'green' } },
    '1MA-C2-G2': { group: 'none', students: { s1: 'green' } },
    '1MD-C1-G7': { group: 'none', students: { s3: 'red' } },
    '1MD-C2-G7': { group: 'none', students: { s3: 'yellow' } },
  },
  formativeEvaluations: {},
};

const ana = miembro('1MA', 2, 's1', 'Ana Rojas');
const beto = miembro('1MD', 7, 's3', 'Beto Silva');

describe('consolidarMiembro', () => {
  it('lee el seguimiento del curso de origen de cada integrante', () => {
    const eq = equipo([ana, beto]);

    const fAna = consolidarMiembro(eq, ana, ctx);
    expect(fAna.registros).toBe(2);
    expect(fAna.logrados).toBe(2);
    expect(fAna.notaPropuesta).toBe(7);

    const fBeto = consolidarMiembro(eq, beto, ctx);
    expect(fBeto.registros).toBe(2);
    expect(fBeto.noLogrados).toBe(1);
    expect(fBeto.porLograr).toBe(1);
    // 0 + 0,5 de 2 = 25% → 2
    expect(fBeto.notaPropuesta).toBe(2);
  });

  it('toma la nota final guardada bajo la clave del equipo', () => {
    const eq = equipo([ana]);
    const conNota: ExportContext = {
      ...ctx,
      formativeEvaluations: { [muestraGradeKey(eq.id, ana)]: { grade: '6.0' } },
    };
    expect(consolidarMiembro(eq, ana, conNota).notaFinal).toBe('6.0');
  });

  it('un estudiante sin registros no arrastra nota propuesta', () => {
    const sinDatos = miembro('1MB', 1, 's2', 'Caro Díaz');
    expect(consolidarMiembro(equipo([sinDatos]), sinDatos, ctx).notaPropuesta).toBeNull();
  });
});

describe('agruparPorCurso', () => {
  it('separa a los integrantes de un mismo equipo por su curso', () => {
    const muestra: MuestraPublica = {
      nombre: 'M', fecha: '2026-11-20', nivel: '1M', configurada: true,
      equipos: [equipo([ana, beto])],
    };
    const grupos = agruparPorCurso(consolidarMuestra(muestra, ctx));

    expect([...grupos.keys()].sort()).toEqual(['1MA', '1MD']);
    expect(grupos.get('1MA')!.map((f) => f.miembro.name)).toEqual(['Ana Rojas']);
    expect(grupos.get('1MD')!.map((f) => f.miembro.name)).toEqual(['Beto Silva']);
  });

  it('ordena por APELLIDO dentro del curso — el N° de lista queda estable', () => {
    // Muñoz va antes que Rojas aunque "Zoe" venga después que "Ana":
    // el orden es de lista de clase, por apellido.
    const zoe = miembro('1MA', 3, 's1', 'Zoe Muñoz');
    const muestra: MuestraPublica = {
      nombre: 'M', fecha: '', nivel: '1M', configurada: true,
      equipos: [equipo([ana, zoe])],
    };
    const grupos = agruparPorCurso(consolidarMuestra(muestra, ctx));
    expect(grupos.get('1MA')!.map((f) => f.miembro.name)).toEqual(['Zoe Muñoz', 'Ana Rojas']);
  });
});

describe('construirCatalogo', () => {
  // getCourseTag real de la app, para los dos niveles.
  const tag = (curso: string) => {
    const m = curso.match(/^([12]) Medio ([A-D])$/);
    return m ? `${m[1]}M${m[2]}` : '';
  };

  const grupos = {
    '1MA-G1': [{ name: 'Ana Rojas', role: 'Coordinador' }, { name: 'Estudiante 2', role: 'Investigador' }],
    '2MA-G1': [{ name: 'Paulo Brito', role: 'Coordinador' }, { name: 'Rihanna Jofré', role: 'Investigador' }],
    '2MD-G3': [{ name: 'Dariel Jaiña', role: 'Mediador' }],
  };

  it('arma el catálogo de Segundos igual que el de Primeros', () => {
    const primeros = construirCatalogo(['1 Medio A'], grupos, tag);
    const segundos = construirCatalogo(['2 Medio A', '2 Medio D'], grupos, tag);

    expect(primeros.map((c) => c.name)).toEqual(['Ana Rojas']);
    expect(segundos.map((c) => c.name)).toEqual(['Paulo Brito', 'Rihanna Jofré', 'Dariel Jaiña']);
    // Los courseTag de 2° se resuelven igual que los de 1°.
    expect(segundos.map((c) => c.courseTag)).toEqual(['2MA', '2MA', '2MD']);
  });

  it('excluye los placeholder "Estudiante N" en ambos niveles', () => {
    const todos = construirCatalogo(['1 Medio A', '2 Medio A'], grupos, tag);
    expect(todos.some((c) => /^Estudiante \d+$/.test(c.name))).toBe(false);
  });

  it('guarda el origen de aula de cada estudiante', () => {
    const [primero] = construirCatalogo(['2 Medio D'], grupos, tag);
    expect(primero).toMatchObject({
      key: '2MD-G3-s1', courseTag: '2MD', groupId: 3, sid: 's1', curso: '2 Medio D',
    });
  });

  it('devuelve vacío si el curso no tiene equipos cargados', () => {
    expect(construirCatalogo(['2 Medio B'], grupos, tag)).toEqual([]);
  });
});

describe('construirLibroPorCurso', () => {
  const caro = miembro('1MB', 1, 's2', 'Caro Díaz');
  const muestra: MuestraPublica = {
    nombre: 'M', fecha: '2026-11-20', nivel: '1M', configurada: true,
    equipos: [equipo([ana, beto]), equipo([caro])],
  };

  it('genera UN libro con una pestaña por curso', () => {
    const { libro, tags } = construirLibroPorCurso(muestra, ctx);
    expect(tags).toEqual(['1MA', '1MB', '1MD']);
    // Las pestañas del archivo deben llamarse como los cursos.
    expect(libro.SheetNames).toEqual(['1MA', '1MB', '1MD']);
  });

  it('cada pestaña trae encabezado y solo a los estudiantes de ese curso', () => {
    const { libro } = construirLibroPorCurso(muestra, ctx);
    const filas = XLSX.utils.sheet_to_json<string[]>(libro.Sheets['1MA'], { header: 1 });
    expect(filas[0]).toContain('Estudiante');
    expect(filas[0]).toContain('Nota final');
    expect(filas).toHaveLength(2);          // encabezado + 1 estudiante
    expect(filas[1][1]).toBe('Ana Rojas');
    expect(filas[1][2]).toBe('1 Medio A');
  });

  it('sin equipos devuelve un libro sin pestañas', () => {
    const { tags } = construirLibroPorCurso({ ...muestra, equipos: [] }, ctx);
    expect(tags).toEqual([]);
  });
});

describe('promedioEquipo', () => {
  it('promedia solo a quienes tienen nota propuesta', () => {
    const sinDatos = miembro('1MB', 1, 's2', 'Caro Díaz');
    // Ana 7, Beto 2, Caro sin registros → (7+2)/2 = 4,5
    expect(promedioEquipo(equipo([ana, beto, sinDatos]), ctx)).toBe(4.5);
  });

  it('devuelve null si nadie tiene registros', () => {
    const sinDatos = miembro('1MB', 1, 's2', 'Caro Díaz');
    expect(promedioEquipo(equipo([sinDatos]), ctx)).toBeNull();
  });
});
