import { describe, it, expect } from 'vitest';
import { fusionarMuestra, marcarEliminado, type MuestraConLapidas } from './muestraSync';
import type { MuestraEquipo } from '../types';

const eq = (id: string, nombre: string, updatedAt: number): MuestraEquipo => ({
  id, nombre, nivel: '1M', tematica: '', asignatura: '',
  docentes: [], miembros: [], createdAt: 0, updatedAt,
});

const muestra = (equipos: MuestraEquipo[], extra: Partial<MuestraConLapidas> = {}): MuestraConLapidas => ({
  nombre: 'Muestra 2026', fecha: '2026-11-20', nivel: '1M',
  configurada: true, equipos, ...extra,
});

describe('fusionarMuestra', () => {
  it('conserva el trabajo de los dos docentes — el caso que importa', () => {
    // La profesora A editó el equipo 1; el profesor B agregó el equipo 3.
    // Antes, el último en guardar borraba lo del otro.
    const local = muestra([eq('e1', 'Equipo 1 editado por A', 200), eq('e2', 'Equipo 2', 100)]);
    const remoto = muestra([eq('e1', 'Equipo 1', 100), eq('e2', 'Equipo 2', 100), eq('e3', 'Equipo 3 de B', 150)]);

    const r = fusionarMuestra(local, remoto);
    expect(r.equipos.map((e) => e.id).sort()).toEqual(['e1', 'e2', 'e3']);
    expect(r.equipos.find((e) => e.id === 'e1')!.nombre).toBe('Equipo 1 editado por A');
    expect(r.equipos.find((e) => e.id === 'e3')!.nombre).toBe('Equipo 3 de B');
  });

  it('gana la edición más reciente de un mismo equipo', () => {
    const local = muestra([eq('e1', 'versión vieja', 100)]);
    const remoto = muestra([eq('e1', 'versión nueva', 300)]);
    expect(fusionarMuestra(local, remoto).equipos[0].nombre).toBe('versión nueva');

    const local2 = muestra([eq('e1', 'versión nueva', 300)]);
    const remoto2 = muestra([eq('e1', 'versión vieja', 100)]);
    expect(fusionarMuestra(local2, remoto2).equipos[0].nombre).toBe('versión nueva');
  });

  it('un equipo eliminado no reaparece al fusionar', () => {
    const conTres = muestra([eq('e1', 'A', 100), eq('e2', 'B', 100)]);
    const local = marcarEliminado(conTres, 'e2', 500);
    const remoto = conTres; // el otro docente todavía lo tiene

    const r = fusionarMuestra(local, remoto);
    expect(r.equipos.map((e) => e.id)).toEqual(['e1']);
    expect(r.eliminados).toHaveProperty('e2');
  });

  it('una edición posterior al borrado rescata el equipo', () => {
    // Alguien lo borró, pero otro siguió trabajando en él después.
    const local = muestra([], { eliminados: { e2: 200 } });
    const remoto = muestra([eq('e2', 'B con trabajo nuevo', 900)]);
    expect(fusionarMuestra(local, remoto).equipos.map((e) => e.id)).toEqual(['e2']);
  });

  it('respeta el nivel que está viendo cada docente', () => {
    // El nivel es la pestaña local: no debe saltar porque el otro esté en 2°.
    const local = muestra([], { nivel: '1M' });
    const remoto = muestra([], { nivel: '2M' });
    expect(fusionarMuestra(local, remoto).nivel).toBe('1M');
  });

  it('sin remoto devuelve lo local, y sin local devuelve lo remoto', () => {
    const m = muestra([eq('e1', 'A', 100)]);
    expect(fusionarMuestra(m, null).equipos).toHaveLength(1);
    expect(fusionarMuestra(null, m).equipos).toHaveLength(1);
  });

  it('una muestra sin configurar no borra la que ya existe en Firestore', () => {
    const remoto = muestra([eq('e1', 'A', 100)]);
    const r = fusionarMuestra(null, remoto);
    expect(r.configurada).toBe(true);
    expect(r.equipos).toHaveLength(1);
  });

  it('acumula las lápidas de ambos lados', () => {
    const local = muestra([], { eliminados: { e1: 100 } });
    const remoto = muestra([], { eliminados: { e2: 200 } });
    const r = fusionarMuestra(local, remoto);
    expect(Object.keys(r.eliminados || {}).sort()).toEqual(['e1', 'e2']);
  });
});

describe('marcarEliminado', () => {
  it('quita el equipo y deja su lápida', () => {
    const m = muestra([eq('e1', 'A', 100), eq('e2', 'B', 100)]);
    const r = marcarEliminado(m, 'e1', 777);
    expect(r.equipos.map((e) => e.id)).toEqual(['e2']);
    expect(r.eliminados!.e1).toBe(777);
  });
});
