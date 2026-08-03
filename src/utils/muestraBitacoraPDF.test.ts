import { describe, it, expect } from 'vitest';
import { construirBitacora } from './muestraBitacoraPDF';
import type { MuestraEquipo, MuestraPublica, SesionMuestra } from '../types';

const SIN_LOGOS = { liceo: null, proyecto: null };

const sesion = (over: Partial<SesionMuestra> = {}): SesionMuestra => ({
  id: `s-${Math.random()}`, fecha: '2026-09-10', tema: 'Diseño del prototipo',
  responsable: 'Marco Ramírez', acuerdos: 'Traer materiales reciclados.',
  observaciones: 'El equipo se organizó bien.', realizada: true, avance: 40,
  ...over,
});

const equipo: MuestraEquipo = {
  id: 'eq1', nombre: 'Humberstone Vive', nivel: '2M',
  tematica: 'Patrimonio salitrero', asignatura: 'Historia',
  docentes: ['Marco Ramírez'], miembros: [], color: '#ec4899',
  createdAt: 0, updatedAt: 0,
  presentacion: {
    fecha: '2026-11-20', hora: '10:30', lugar: 'Patio central, stand 4',
    descripcion: 'Maqueta de la oficina salitrera con recorrido guiado.',
    acuerdos: 'Montar a las 8:00.',
    observaciones: 'Buena recepción del público.',
  },
  sesiones: [sesion(), sesion({ tema: 'Montaje', fecha: '2026-10-02', realizada: false, avance: 80 })],
};

const muestra: MuestraPublica = {
  nombre: 'Proyecto STEAM', fecha: '2026-11-20',
  nivel: '2M', configurada: true, equipos: [equipo],
};

const esPDF = (doc: { output: (t: string) => string }) =>
  doc.output('datauristring').includes('application/pdf');

describe('construirBitacora', () => {
  it('genera un PDF válido con la muestra y sus sesiones', async () => {
    const doc = await construirBitacora(equipo, muestra, SIN_LOGOS);
    expect(esPDF(doc)).toBe(true);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('no falla con un equipo sin bitácora', async () => {
    const pelado: MuestraEquipo = { ...equipo, sesiones: undefined, presentacion: undefined };
    await expect(construirBitacora(pelado, muestra, SIN_LOGOS)).resolves.toBeDefined();
  });

  it('no falla con sesiones vacías ni con campos en blanco', async () => {
    const vacio: MuestraEquipo = {
      ...equipo, sesiones: [sesion({ tema: '', acuerdos: '', observaciones: '', fecha: '' })],
    };
    await expect(construirBitacora(vacio, muestra, SIN_LOGOS)).resolves.toBeDefined();
  });

  it('pagina cuando hay muchas sesiones', async () => {
    const muchas: MuestraEquipo = {
      ...equipo,
      sesiones: Array.from({ length: 14 }, (_, i) => sesion({ tema: `Sesión ${i + 1}` })),
    };
    const doc = await construirBitacora(muchas, muestra, SIN_LOGOS);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('resiste textos largos sin desbordar', async () => {
    const largo: MuestraEquipo = {
      ...equipo,
      sesiones: [sesion({ observaciones: 'Observación muy extensa. '.repeat(120) })],
    };
    await expect(construirBitacora(largo, muestra, SIN_LOGOS)).resolves.toBeDefined();
  });
});
