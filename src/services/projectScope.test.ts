import { describe, it, expect } from 'vitest';
import { scopedPartDocId, cursoFromScopedDocId, scopedSingleDocId } from './projectScope';

describe('rutas por proyecto', () => {
  it('construye el doc id particionado con proyecto', () => {
    expect(scopedPartDocId('sae', '1 Medio A')).toBe('sae__1 Medio A');
  });
  it('recupera el curso solo si el doc es del proyecto activo', () => {
    expect(cursoFromScopedDocId('sae', 'sae__1 Medio A')).toBe('1 Medio A');
    expect(cursoFromScopedDocId('sae', 'steam__1 Medio A')).toBeNull();
  });
  it('construye el doc id de clave única con proyecto', () => {
    expect(scopedSingleDocId('calendarEvents', 'steam')).toBe('calendarEvents__steam');
  });
});
