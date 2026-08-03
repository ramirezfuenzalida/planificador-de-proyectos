import { describe, it, expect } from 'vitest';
import {
  getStudentHistory,
  calculateProposedGrade,
  countByStatus,
  formatGrade,
  apellidoDe,
  compararPorApellido,
  type HistoryEntry,
} from './formativeGrades';

const clases = [
  { clase: '1', fecha: '2026-03-10' },
  { clase: '2', fecha: '2026-03-17' },
  { clase: '3', fecha: '2026-03-24' },
];

/** Atajo para construir un historial con los estados dados. */
const hist = (...estados: HistoryEntry['status'][]): HistoryEntry[] =>
  estados.map((status, i) => ({ classId: String(i + 1), date: '2026-03-10', status }));

describe('getStudentHistory', () => {
  it('recoge solo las clases con estado registrado', () => {
    const regs = {
      '1MC-C1-G3': { group: 'none', students: { s1: 'green' } },
      '1MC-C3-G3': { group: 'none', students: { s1: 'red' } },
    };
    const h = getStudentHistory('1MC', 3, 's1', clases, regs);
    expect(h.map((e) => e.classId)).toEqual(['1', '3']);
    expect(h.map((e) => e.status)).toEqual(['green', 'red']);
  });

  it('hereda el estado del grupo cuando el estudiante no tiene el suyo', () => {
    const regs = { '1MC-C1-G3': { group: 'yellow', students: { s1: 'none' } } };
    expect(getStudentHistory('1MC', 3, 's1', clases, regs)[0].status).toBe('yellow');
  });

  it('el estado propio del estudiante gana sobre el del grupo', () => {
    const regs = { '1MC-C1-G3': { group: 'red', students: { s1: 'green' } } };
    expect(getStudentHistory('1MC', 3, 's1', clases, regs)[0].status).toBe('green');
  });

  it('lee el curso de origen, no el curso en pantalla — clave de Muestra Pública', () => {
    // Un equipo de muestra junta estudiantes de varios cursos: cada integrante
    // se consulta con SU courseTag y SU groupId.
    const regs = {
      '1MA-C1-G2': { group: 'none', students: { s1: 'green' } },
      '1MD-C1-G7': { group: 'none', students: { s3: 'red' } },
    };
    expect(getStudentHistory('1MA', 2, 's1', clases, regs)[0].status).toBe('green');
    expect(getStudentHistory('1MD', 7, 's3', clases, regs)[0].status).toBe('red');
  });

  it('devuelve vacío si no hay registros', () => {
    expect(getStudentHistory('1MC', 3, 's1', clases, {})).toEqual([]);
  });
});

describe('calculateProposedGrade', () => {
  it('devuelve null sin registros — distinto de proponer un 1', () => {
    expect(calculateProposedGrade([])).toBeNull();
  });

  it('todo logrado da 7', () => {
    expect(calculateProposedGrade(hist('green', 'green', 'green'))).toBe(7);
  });

  it('todo no logrado da 1', () => {
    expect(calculateProposedGrade(hist('red', 'red'))).toBe(1);
  });

  it('aplica los cortes de la tabla institucional', () => {
    // Por Lograr vale medio punto: 2 PL de 2 = 50% → 4
    expect(calculateProposedGrade(hist('yellow', 'yellow'))).toBe(4);
    // 3 de 4 logrados = 75% → 6
    expect(calculateProposedGrade(hist('green', 'green', 'green', 'red'))).toBe(6);
    // 1 de 4 logrados = 25% → 2
    expect(calculateProposedGrade(hist('green', 'red', 'red', 'red'))).toBe(2);
  });
});

describe('countByStatus', () => {
  it('desglosa L / PL / NL', () => {
    expect(countByStatus(hist('green', 'green', 'yellow', 'red'))).toEqual({
      logrados: 2, porLograr: 1, noLogrados: 1, total: 4,
    });
  });
});

describe('apellidoDe', () => {
  it('toma la última palabra como apellido', () => {
    expect(apellidoDe('Paulo Brito')).toBe('Brito');
    expect(apellidoDe('Maytte Sofía Espinoza')).toBe('Espinoza');
  });

  it('arrastra las partículas del apellido', () => {
    expect(apellidoDe('Kimbeli San Cristobal')).toBe('San Cristobal');
    expect(apellidoDe('Ana de la Fuente')).toBe('de la Fuente');
    expect(apellidoDe('Luis Van Damme')).toBe('Van Damme');
  });

  it('con una sola palabra devuelve esa palabra', () => {
    expect(apellidoDe('Copa')).toBe('Copa');
  });

  it('no se come el nombre cuando solo hay nombre y apellido', () => {
    // "Y" es partícula, pero no puede quedar sin nombre de pila.
    expect(apellidoDe('Ana Y')).toBe('Y');
  });
});

describe('compararPorApellido', () => {
  it('ordena por apellido, no por nombre de pila', () => {
    const lista = ['Zoe Aguirre', 'Ana Brito', 'Beto Alvarez'];
    expect([...lista].sort(compararPorApellido)).toEqual([
      'Zoe Aguirre', 'Beto Alvarez', 'Ana Brito',
    ]);
  });

  it('a igual apellido, ordena por el nombre completo', () => {
    const lista = ['Pedro Rojas', 'Ana Rojas'];
    expect([...lista].sort(compararPorApellido)).toEqual(['Ana Rojas', 'Pedro Rojas']);
  });

  it('ignora acentos y mayúsculas al comparar', () => {
    const lista = ['Ana Ñuñez', 'Beto Muñoz', 'Ceci ALVAREZ'];
    expect([...lista].sort(compararPorApellido)).toEqual([
      'Ceci ALVAREZ', 'Beto Muñoz', 'Ana Ñuñez',
    ]);
  });
});

describe('formatGrade', () => {
  it('normaliza a un decimal', () => {
    expect(formatGrade(6)).toBe('6.0');
    expect(formatGrade('5.67')).toBe('5.7');
    // Ojo: toFixed redondea sobre el binario, así que 5.55 baja a "5.5"
    // (5.55 se almacena como 5.5499…). Es el comportamiento histórico y las
    // notas se ingresan con un decimal, así que no lo forzamos.
    expect(formatGrade('5.55')).toBe('5.5');
  });

  it('devuelve vacío para valores no numéricos', () => {
    expect(formatGrade('')).toBe('');
    expect(formatGrade(null)).toBe('');
    expect(formatGrade('abc')).toBe('');
  });
});
