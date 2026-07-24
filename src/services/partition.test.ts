import { describe, it, expect } from 'vitest';
import {
  courseForKey,
  partitionByCourse,
  mergePartitions,
  UNKNOWN_COURSE_DOC,
} from './partition';

describe('courseForKey', () => {
  it('reconoce el curso cuando es prefijo de la clave', () => {
    expect(courseForKey('1 Medio A-Clase 5')).toBe('1 Medio A');
    expect(courseForKey('2 Medio D-G3-est42')).toBe('2 Medio D');
  });

  it('prefiere la coincidencia más larga', () => {
    // Defiende contra un futuro curso "1 Medio A-1": la comparación es
    // contra la lista de cursos, no un corte en el primer guion.
    expect(courseForKey('1 Medio A-2026-03-15-Juan')).toBe('1 Medio A');
  });

  it('devuelve el documento de anomalías si no coincide ningún curso', () => {
    expect(courseForKey('curso inventado-x')).toBe(UNKNOWN_COURSE_DOC);
    expect(courseForKey('')).toBe(UNKNOWN_COURSE_DOC);
  });
});

describe('partitionByCourse', () => {
  it('agrupa las claves por curso', () => {
    const entrada = {
      '1 Medio A-c1': 'presente',
      '1 Medio A-c2': 'ausente',
      '2 Medio B-c1': 'presente',
    };
    expect(partitionByCourse(entrada)).toEqual({
      '1 Medio A': { '1 Medio A-c1': 'presente', '1 Medio A-c2': 'ausente' },
      '2 Medio B': { '2 Medio B-c1': 'presente' },
    });
  });

  it('manda las claves huérfanas al documento de anomalías', () => {
    expect(partitionByCourse({ 'basura-1': 'x' })).toEqual({
      [UNKNOWN_COURSE_DOC]: { 'basura-1': 'x' },
    });
  });

  it('devuelve un objeto vacío si no hay datos', () => {
    expect(partitionByCourse({})).toEqual({});
  });
});

describe('mergePartitions', () => {
  it('reensambla las particiones en un diccionario plano', () => {
    const partes = {
      '1 Medio A': { '1 Medio A-c1': 'presente' },
      '2 Medio B': { '2 Medio B-c1': 'ausente' },
    };
    expect(mergePartitions(partes)).toEqual({
      '1 Medio A-c1': 'presente',
      '2 Medio B-c1': 'ausente',
    });
  });

  it('es la inversa exacta de partitionByCourse', () => {
    const original = {
      '1 Medio A-c1': 'presente',
      '2 Medio D-G1-e9': 'ausente',
      'huerfana-x': 'raro',
    };
    expect(mergePartitions(partitionByCourse(original))).toEqual(original);
  });
});
