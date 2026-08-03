import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Plus, Minus, X, Users, Search, Check, Trash2, ArrowLeft,
  FileSpreadsheet, CheckCheck, GraduationCap, Layers, Printer, Lock,
  NotebookPen, ChevronDown,
} from 'lucide-react';
import Toast from './Toast';
import type {
  MuestraPublica, MuestraEquipo, MuestraMiembro, SesionMuestra, PresentacionMuestra,
} from '../types';
import { COLORES_EQUIPO, colorDeEquipo } from '../types';
import {
  formatGrade,
  type ClaseLike, type FormativeRegistrations, type FormativeEvaluations,
  type DynamicGroups,
} from '../utils/formativeGrades';
import {
  consolidarMiembro, promedioEquipo, muestraGradeKey, exportarPorCurso,
  exportarPorNivel, construirCatalogo,
  type ExportContext, type FilaMiembro, type Candidato,
} from '../utils/muestraExport';
import { exportarListadoEquipoPDF, exportarListadoCompletoPDF } from '../utils/muestraListadoPDF';
import { exportarBitacoraPDF } from '../utils/muestraBitacoraPDF';
import { marcarEliminado } from '../services/muestraSync';

// Mismo roster fijo que usa el Acta de Globalización.
const DOCENTES_EQUIPO = [
  'Maria Eugenia López', 'Thiara Figueroa', 'Camila Seguel', 'Monserrat Vargas',
  'Lucy Colina', 'Jean Villalobos', 'Marco Ramírez', 'Exequiel Ramírez',
];

interface Props {
  muestra: MuestraPublica;
  setMuestra: React.Dispatch<React.SetStateAction<MuestraPublica>>;
  courses1M: string[];
  courses2M: string[];
  globalData: { pm: ClaseLike[]; sm: ClaseLike[] };
  formativeRegistrations: FormativeRegistrations;
  formativeEvaluations: FormativeEvaluations;
  setFormativeEvaluations: React.Dispatch<React.SetStateAction<FormativeEvaluations>>;
  getCourseTag: (course: string) => string;
  dynamicGroups: DynamicGroups;
  canEdit: boolean;
}

// ── Estilos compartidos ────────────────────────────────────────────────────
const PANEL: React.CSSProperties = {
  // Degradado diagonal + borde superior claro: la luz "cae" desde arriba a la
  // izquierda, que es lo que da la sensación de superficie vidriada.
  background: 'linear-gradient(155deg, #211c47 0%, #14103a 45%, #0c0822 100%)',
  backdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderTop: '1px solid rgba(255,255,255,0.16)',
  borderRadius: '20px',
  boxShadow: '0 18px 44px rgba(12, 8, 32, 0.30), inset 0 1px 0 rgba(255,255,255,0.06)',
};
const AMBAR = 'linear-gradient(135deg, #FFE082 0%, #fbbf24 45%, #f59e0b 100%)';

/** Color propio de cada nivel, siguiendo la convención del sidebar
 *  (Primeros Medios en rosa, Segundos Medios en ámbar). */
const COLOR_NIVEL = {
  '1M': { solido: '#ec4899', oscuro: '#be185d', suave: 'rgba(236, 72, 153, 0.18)', sombra: 'rgba(190, 24, 93, 0.35)' },
  '2M': { solido: '#f59e0b', oscuro: '#b45309', suave: 'rgba(245, 158, 11, 0.18)', sombra: 'rgba(180, 83, 9, 0.35)' },
} as const;
const LABEL: React.CSSProperties = {
  fontSize: '0.68rem', fontWeight: 800, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.07em',
};
const INPUT: React.CSSProperties = {
  width: '100%', background: 'rgba(8, 5, 22, 0.6)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
  padding: '11px 14px', fontSize: '0.86rem', color: 'white', outline: 'none',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
};

const nuevoEquipo = (nivel: '1M' | '2M', n: number): MuestraEquipo => ({
  id: `eq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  nombre: `Equipo ${n}`,
  nivel, tematica: '', asignatura: '', docentes: [], miembros: [],
  // El color sale de la paleta según el orden dentro del nivel, así dos
  // equipos consecutivos nunca comparten tono.
  color: COLORES_EQUIPO[(n - 1) % COLORES_EQUIPO.length],
  createdAt: Date.now(), updatedAt: Date.now(),
});

export default function MuestraPublicaView({
  muestra, setMuestra, courses1M, courses2M, globalData,
  formativeRegistrations, formativeEvaluations, setFormativeEvaluations,
  getCourseTag, dynamicGroups, canEdit,
}: Props) {
  const [showWizard, setShowWizard] = useState(false);
  const [equipoAbierto, setEquipoAbierto] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCurso, setFiltroCurso] = useState<string | null>(null); // null = todos
  const [docenteManual, setDocenteManual] = useState('');
  const [pestana, setPestana] = useState<'integrantes' | 'bitacora'>('integrantes');
  const [exportDestino, setExportDestino] = useState<'curso' | 'pdf' | null>(null);
  const [equiposExport, setEquiposExport] = useState<Set<string>>(new Set());
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  // Borrador del asistente inicial
  const [wNombre, setWNombre] = useState('Muestra Pública 2026');
  const [wFecha, setWFecha] = useState(new Date().toISOString().slice(0, 10));
  const [wGrupos1M, setWGrupos1M] = useState(4);
  const [wGrupos2M, setWGrupos2M] = useState(4);

  const avisar = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  // La muestra contiene equipos de ambos niveles; se ven de a uno.
  const nivelActivo = muestra.nivel;
  const setNivelActivo = (n: '1M' | '2M') => {
    setMuestra((prev) => ({ ...prev, nivel: n }));
    setEquipoAbierto(null);
  };

  const equipo = muestra.equipos.find((e) => e.id === equipoAbierto) || null;

  // El nivel de referencia es el del equipo abierto; si no hay ninguno abierto,
  // el de la pestaña. Así los cursos y las clases nunca quedan desfasados del
  // equipo que se está editando (antes, en Segundos podían salir los de 1°).
  const nivelRef: '1M' | '2M' = equipo ? equipo.nivel : nivelActivo;
  const cursos = nivelRef === '1M' ? courses1M : courses2M;
  const levelClasses = nivelRef === '1M' ? globalData.pm : globalData.sm;

  /** Equipos del nivel que se está viendo. */
  const equiposDelNivel = muestra.equipos.filter((e) => e.nivel === nivelActivo);
  /** Vista de la muestra acotada al nivel activo, para exportar. */
  const muestraDelNivel: MuestraPublica = {
    ...muestra, nivel: nivelActivo, equipos: equiposDelNivel,
  };

  const ctx: ExportContext = useMemo(
    () => ({ levelClasses, formativeRegistrations, formativeEvaluations }),
    [levelClasses, formativeRegistrations, formativeEvaluations],
  );

  // Catálogo de estudiantes reales del nivel (lógica en utils, con tests).
  const candidatos: Candidato[] = useMemo(
    () => construirCatalogo(cursos, dynamicGroups, getCourseTag),
    [cursos, dynamicGroups, getCourseTag],
  );

  /** Estudiante → nombre del equipo que ya lo tiene. */
  const asignados = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const e of muestra.equipos) {
      for (const m of e.miembros) {
        mapa.set(`${m.courseTag}-G${m.groupId}-${m.sid}`, e.nombre);
      }
    }
    return mapa;
  }, [muestra.equipos]);

  // ── Mutaciones ──────────────────────────────────────────────────────────
  const actualizarEquipo = (id: string, cambios: Partial<MuestraEquipo>) => {
    setMuestra((prev) => ({
      ...prev,
      equipos: prev.equipos.map((e) =>
        e.id === id ? { ...e, ...cambios, updatedAt: Date.now() } : e),
    }));
  };

  const crearMuestra = () => {
    // La muestra abarca los dos niveles: se crean los equipos de cada uno.
    const equipos = [
      ...Array.from({ length: wGrupos1M }, (_, i) => nuevoEquipo('1M', i + 1)),
      ...Array.from({ length: wGrupos2M }, (_, i) => nuevoEquipo('2M', i + 1)),
    ];
    setMuestra({
      nombre: wNombre.trim() || 'Muestra Pública',
      fecha: wFecha,
      nivel: wGrupos1M > 0 ? '1M' : '2M',
      configurada: true,
      equipos,
    });
    setShowWizard(false);
    avisar(`Muestra creada con ${equipos.length} ${equipos.length === 1 ? 'equipo' : 'equipos'}`);
  };

  const agregarEquipo = () => {
    setMuestra((prev) => {
      const delNivel = prev.equipos.filter((e) => e.nivel === prev.nivel).length;
      return {
        ...prev,
        equipos: [...prev.equipos, nuevoEquipo(prev.nivel, delNivel + 1)],
      };
    });
    avisar('Equipo agregado');
  };

  const borrarEquipo = (id: string) => {
    const e = muestra.equipos.find((x) => x.id === id);
    if (!e) return;
    if (!window.confirm(`¿Eliminar "${e.nombre}" y sus ${e.miembros.length} integrantes?`)) return;
    // Se marca como eliminado: si solo se quitara de la lista, la fusión con lo
    // que tenga otro docente lo devolvería a la vida.
    setMuestra((prev) => marcarEliminado(prev, id) as MuestraPublica);
    if (equipoAbierto === id) setEquipoAbierto(null);
    avisar('Equipo eliminado');
  };

  const confirmarSeleccion = () => {
    if (!equipo) return;
    const nuevos: MuestraMiembro[] = candidatos
      .filter((c) => seleccion.has(c.key))
      .map((c) => ({
        curso: c.curso, courseTag: c.courseTag, groupId: c.groupId,
        sid: c.sid, name: c.name, role: c.role,
      }));
    actualizarEquipo(equipo.id, { miembros: [...equipo.miembros, ...nuevos] });
    setShowSelector(false);
    setSeleccion(new Set());
    setBusqueda('');
    avisar(`${nuevos.length} ${nuevos.length === 1 ? 'estudiante agregado' : 'estudiantes agregados'}`);
  };

  /** Docentes del equipo que no vienen del roster fijo (escritos a mano). */
  const docentesExternos = equipo
    ? equipo.docentes.filter((d) => !DOCENTES_EQUIPO.includes(d))
    : [];

  const agregarDocenteManual = () => {
    if (!equipo) return;
    const nombre = docenteManual.trim();
    if (!nombre) return;
    // Comparación sin distinguir mayúsculas/acentos para no duplicar a alguien.
    const yaEsta = equipo.docentes.some(
      (d) => d.localeCompare(nombre, 'es', { sensitivity: 'base' }) === 0);
    if (yaEsta) { avisar(`${nombre} ya está en el equipo`); setDocenteManual(''); return; }

    actualizarEquipo(equipo.id, { docentes: [...equipo.docentes, nombre] });
    setDocenteManual('');
    avisar(`${nombre} agregado`);
  };

  const quitarMiembro = (m: MuestraMiembro) => {
    if (!equipo) return;
    actualizarEquipo(equipo.id, {
      miembros: equipo.miembros.filter(
        (x) => !(x.courseTag === m.courseTag && x.groupId === m.groupId && x.sid === m.sid)),
    });
  };

  const cambiarNota = (m: MuestraMiembro, valor: string) => {
    if (!equipo) return;
    const key = muestraGradeKey(equipo.id, m);
    setFormativeEvaluations((old) => ({
      ...old,
      [key]: { ...(old[key] || { grade: '', comment: '' }), grade: formatGrade(valor) },
    }));
  };

  const aceptarPropuestas = (filas: FilaMiembro[]) => {
    if (!equipo) return;
    const pendientes = filas.filter((f) => f.notaPropuesta !== null && !f.notaFinal);
    if (pendientes.length === 0) { avisar('No hay notas propuestas por aceptar'); return; }
    setFormativeEvaluations((old) => {
      const next = { ...old };
      for (const f of pendientes) {
        const key = muestraGradeKey(equipo.id, f.miembro);
        next[key] = { ...(next[key] || { comment: '' }), grade: formatGrade(f.notaPropuesta) };
      }
      return next;
    });
    avisar(`${pendientes.length} ${pendientes.length === 1 ? 'calificación aceptada' : 'calificaciones aceptadas'}`);
  };

  // Todas las exportaciones trabajan sobre el nivel que se está viendo.
  // "Por curso" y "Listados en PDF" preguntan primero qué equipos incluir;
  // "por nivel" no pregunta, porque por definición es el nivel completo.
  const abrirSelectorExport = (destino: 'curso' | 'pdf') => {
    const conGente = equiposDelNivel.filter((e) => e.miembros.length > 0);
    if (conGente.length === 0) { avisar('No hay estudiantes en este nivel'); return; }
    setEquiposExport(new Set(conGente.map((e) => e.id))); // por defecto, todos
    setExportDestino(destino);
  };

  const confirmarExport = async (ids: Set<string>) => {
    const elegidos = equiposDelNivel.filter((e) => ids.has(e.id) && e.miembros.length > 0);
    const destino = exportDestino;
    setExportDestino(null);
    if (elegidos.length === 0) { avisar('No seleccionaste ningún equipo'); return; }

    const recorte: MuestraPublica = { ...muestraDelNivel, equipos: elegidos };
    if (destino === 'curso') {
      const tags = exportarPorCurso(recorte, ctx);
      avisar(`Excel con ${tags.length} ${tags.length === 1 ? 'pestaña' : 'pestañas'}: ${tags.join(', ')}`);
    } else {
      avisar('Generando listados…');
      await exportarListadoCompletoPDF(recorte, ctx);
      avisar(`Listado de ${elegidos.length} ${elegidos.length === 1 ? 'equipo' : 'equipos'} generado`);
    }
  };

  const exportarNivel = () => {
    if (equiposDelNivel.every((e) => e.miembros.length === 0)) {
      avisar('No hay estudiantes que exportar en este nivel'); return;
    }
    exportarPorNivel(muestraDelNivel, ctx);
    avisar('Exportando el nivel completo…');
  };

  // ═══ PANTALLA 1 — Botón gigante de arranque ═══════════════════════════════
  if (!muestra.configurada) {
    return (
      <div style={{
        minHeight: '70vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '40px 20px',
      }}>
        <Toast message={toast} onClose={() => setToast(null)} />

        <motion.button
          onClick={() => canEdit ? setShowWizard(true) : avisar('No tienes permisos para editar')}
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          style={{
            position: 'relative', width: '100%', maxWidth: '1400px',
            minHeight: 'clamp(200px, 30vw, 320px)',
            background: AMBAR, border: 'none',
            // Píldora: el radio equivale a la mitad de la altura, así los
            // extremos quedan semicirculares en vez de rectangulares.
            borderRadius: '9999px', cursor: 'pointer',
            display: 'flex', flexDirection: 'row', alignItems: 'center',
            justifyContent: 'center', gap: 'clamp(14px, 3vw, 36px)',
            padding: 'clamp(28px, 5vw, 56px) clamp(36px, 7vw, 90px)',
            color: '#0c0822', fontFamily: 'Inter, sans-serif',
            boxShadow: '0 26px 80px rgba(245, 158, 11, 0.3)',
          }}
        >
          {/* El tamaño va por CSS (no por `size`) para que escale con el viewport. */}
          <Megaphone
            strokeWidth={2.1}
            style={{ width: 'clamp(46px, 8vw, 104px)', height: 'clamp(46px, 8vw, 104px)', flexShrink: 0 }}
          />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.6vw, 8px)', minWidth: 0 }}>
            <span style={{
              fontSize: 'clamp(2rem, 7vw, 5.5rem)', fontWeight: 900,
              letterSpacing: '-0.035em', lineHeight: 1, whiteSpace: 'nowrap',
            }}>
              Muestra Pública
            </span>
            <span style={{
              fontSize: 'clamp(0.82rem, 1.5vw, 1.35rem)', fontWeight: 600,
              opacity: 0.68, textAlign: 'left',
            }}>
              Arma los equipos y califica
            </span>
          </span>
        </motion.button>

        <p style={{ color: '#64748b', fontSize: '0.84rem', textAlign: 'center', maxWidth: '380px' }}>
          Aún no has configurado la muestra. Presiona el botón para definir el nivel
          y la cantidad de equipos.
        </p>

        {showWizard && (
          <Wizard
            nombre={wNombre} setNombre={setWNombre}
            fecha={wFecha} setFecha={setWFecha}
            grupos1M={wGrupos1M} setGrupos1M={setWGrupos1M}
            grupos2M={wGrupos2M} setGrupos2M={setWGrupos2M}
            onCancel={() => setShowWizard(false)}
            onConfirm={crearMuestra}
          />
        )}
      </div>
    );
  }

  // ═══ PANTALLA 4 — Detalle del equipo ══════════════════════════════════════
  if (equipo) {
    const filas = equipo.miembros.map((m) => consolidarMiembro(equipo, m, ctx));
    const colorEquipoActual = colorDeEquipo(
      equipo, equiposDelNivel.findIndex((e) => e.id === equipo.id));
    // La lista muestra el curso COMPLETO, en orden alfabético. Los que ya
    // pertenecen a un equipo siguen visibles con su aviso, pero no se pueden
    // seleccionar: un estudiante no puede estar en dos grupos.
    const disponibles = candidatos
      .filter((c) => c.name.toLowerCase().includes(busqueda.toLowerCase()))
      .filter((c) => filtroCurso === null || c.courseTag === filtroCurso);

    // Las pestañas cuentan solo a los que aún se pueden sumar.
    const conteoPorCurso = new Map<string, number>();
    for (const curso of cursos) conteoPorCurso.set(getCourseTag(curso), 0);
    for (const c of candidatos) {
      if (asignados.has(c.key)) continue;
      if (!c.name.toLowerCase().includes(busqueda.toLowerCase())) continue;
      conteoPorCurso.set(c.courseTag, (conteoPorCurso.get(c.courseTag) || 0) + 1);
    }

    const porCursoSel = new Map<string, Candidato[]>();
    for (const c of disponibles) {
      if (!porCursoSel.has(c.curso)) porCursoSel.set(c.curso, []);
      porCursoSel.get(c.curso)!.push(c);
    }

    return (
      <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', color: 'white' }}>
        <Toast message={toast} onClose={() => setToast(null)} />

        <button
          onClick={() => setEquipoAbierto(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
            background: '#ffffff', border: '1.5px solid #dbe1ea',
            borderRadius: '12px', padding: '10px 16px', color: '#475569',
            fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.07)',
          }}
        >
          <ArrowLeft size={16} /> Volver a los equipos
        </button>

        {/* Cabecera editable */}
        <div style={{ ...PANEL, padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <Campo label="Nombre del equipo">
              <input style={INPUT} value={equipo.nombre} disabled={!canEdit}
                onChange={(e) => actualizarEquipo(equipo.id, { nombre: e.target.value })} />
            </Campo>
            <Campo label="Asignatura">
              <input style={INPUT} value={equipo.asignatura} disabled={!canEdit}
                placeholder="Ej. Historia"
                onChange={(e) => actualizarEquipo(equipo.id, { asignatura: e.target.value })} />
            </Campo>
            <Campo label="Temática a abordar">
              <input style={INPUT} value={equipo.tematica} disabled={!canEdit}
                placeholder="Ej. Patrimonio local"
                onChange={(e) => actualizarEquipo(equipo.id, { tematica: e.target.value })} />
            </Campo>
          </div>

          <div style={{ marginTop: '18px' }}>
            <span style={LABEL}>Docentes encargados</span>

            {/* Equipo de proyecto: roster fijo, se marcan con un clic. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '9px' }}>
              {DOCENTES_EQUIPO.map((d) => {
                const activo = equipo.docentes.includes(d);
                return (
                  <button key={d} disabled={!canEdit}
                    onClick={() => actualizarEquipo(equipo.id, {
                      docentes: activo ? equipo.docentes.filter((x) => x !== d) : [...equipo.docentes, d],
                    })}
                    style={{
                      padding: '8px 13px', borderRadius: '100px', cursor: canEdit ? 'pointer' : 'default',
                      fontSize: '0.76rem', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                      background: activo ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${activo ? 'rgba(234, 179, 8, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: activo ? '#fbbf24' : '#94a3b8',
                    }}>
                    {activo && <Check size={12} style={{ marginRight: '5px', verticalAlign: '-2px' }} />}
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Docentes de fuera del equipo de proyecto, escritos a mano. */}
            {canEdit && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <input
                  value={docenteManual}
                  onChange={(ev) => setDocenteManual(ev.target.value)}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); agregarDocenteManual(); } }}
                  placeholder="Agregar otro docente…"
                  style={{ ...INPUT, flex: '1 1 220px', width: 'auto' }}
                />
                <button onClick={agregarDocenteManual}
                  style={{ ...btnSec('#fbbf24'), padding: '11px 16px' }}>
                  <Plus size={14} /> Agregar
                </button>
              </div>
            )}

            {docentesExternos.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {docentesExternos.map((d) => (
                  <span key={d} style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '7px 8px 7px 13px', borderRadius: '100px',
                    fontSize: '0.76rem', fontWeight: 700,
                    background: 'rgba(139, 92, 246, 0.14)',
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    color: '#c4b5fd',
                  }}>
                    {d}
                    {canEdit && (
                      <button onClick={() => actualizarEquipo(equipo.id, {
                        docentes: equipo.docentes.filter((x) => x !== d),
                      })}
                        title={`Quitar a ${d}`}
                        style={{
                          background: 'rgba(255,255,255,0.08)', border: 'none',
                          borderRadius: '50%', width: '17px', height: '17px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#c4b5fd', cursor: 'pointer', padding: 0,
                        }}>
                        <X size={11} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pestañas del detalle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
          {([
            ['integrantes', `Integrantes (${equipo.miembros.length})`, <Users size={16} key="u" />],
            ['bitacora', `Bitácora (${(equipo.sesiones || []).length})`, <NotebookPen size={16} key="n" />],
          ] as const).map(([val, txt, icono]) => {
            const activo = pestana === val;
            return (
              <button key={val} onClick={() => setPestana(val)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '11px 18px', borderRadius: '13px', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.86rem', fontWeight: 800,
                  background: activo ? colorEquipoActual : '#ffffff',
                  border: `1.5px solid ${activo ? colorEquipoActual : '#dbe1ea'}`,
                  color: activo ? '#ffffff' : '#475569',
                  boxShadow: activo
                    ? `0 8px 20px ${colorEquipoActual}55`
                    : '0 2px 8px rgba(15, 23, 42, 0.07)',
                  transition: 'all 0.15s',
                }}>
                {icono}{txt}
              </button>
            );
          })}
        </div>

        {/* Miembros y notas */}
        {pestana === 'integrantes' && (
        <div style={{ ...PANEL, padding: '24px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px', marginBottom: '18px',
          }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
                Integrantes ({equipo.miembros.length})
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '3px' }}>
                Consolidado de su seguimiento formativo de aula
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {canEdit && (
                <>
                  <button onClick={() => aceptarPropuestas(filas)} style={btnSec('#34d399')}>
                    <CheckCheck size={14} /> Aceptar propuestas
                  </button>
                  <button onClick={() => { setShowSelector(true); setSeleccion(new Set()); setFiltroCurso(null); setBusqueda(''); }}
                    style={{ ...btnSec('#0c0822'), background: AMBAR, border: 'none', fontWeight: 800 }}>
                    <Plus size={14} /> Agregar estudiantes
                  </button>
                </>
              )}
            </div>
          </div>

          {equipo.miembros.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Users size={34} style={{ opacity: 0.4, marginBottom: '10px' }} />
              <p style={{ fontSize: '0.86rem' }}>
                Este equipo aún no tiene integrantes. Puedes sumar estudiantes de
                cualquier curso de {equipo.nivel === '1M' ? 'Primeros' : 'Segundos'} Medios.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: '680px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Estudiante', 'Curso', 'Registros', 'L / PL / NL', 'Propuesta', 'Nota final', ''].map((h) => (
                      <th key={h} style={{ ...LABEL, textAlign: 'left', padding: '10px 12px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={`${f.miembro.courseTag}-${f.miembro.groupId}-${f.miembro.sid}`}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '11px 12px', fontWeight: 600 }}>{f.miembro.name}</td>
                      <td style={{ padding: '11px 12px', color: '#94a3b8' }}>{f.miembro.courseTag}</td>
                      <td style={{ padding: '11px 12px', color: '#94a3b8' }}>{f.registros}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ color: '#34d399' }}>{f.logrados}</span>
                        <span style={{ color: '#475569' }}> / </span>
                        <span style={{ color: '#fbbf24' }}>{f.porLograr}</span>
                        <span style={{ color: '#475569' }}> / </span>
                        <span style={{ color: '#f87171' }}>{f.noLogrados}</span>
                      </td>
                      <td style={{ padding: '11px 12px', fontWeight: 700, color: '#22d3ee' }}>
                        {f.notaPropuesta ?? '—'}
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <input
                          value={f.notaFinal} disabled={!canEdit}
                          onChange={(e) => cambiarNota(f.miembro, e.target.value)}
                          placeholder="—"
                          style={{ ...INPUT, width: '78px', padding: '7px 10px', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        {canEdit && (
                          <button onClick={() => quitarMiembro(f.miembro)}
                            title="Quitar del equipo"
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                            <X size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* Bitácora: la muestra y las sesiones previas */}
        {pestana === 'bitacora' && (
          <Bitacora
            equipo={equipo}
            canEdit={canEdit}
            color={colorEquipoActual}
            onCambiar={(cambios) => actualizarEquipo(equipo.id, cambios)}
            onExportar={async () => {
              avisar('Generando bitácora…');
              await exportarBitacoraPDF(equipo, muestraDelNivel);
              avisar('Bitácora generada');
            }}
          />
        )}

        {/* Selector de estudiantes */}
        <AnimatePresence>
          {showSelector && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSelector(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '20px',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  ...PANEL, width: '100%', maxWidth: '720px', maxHeight: '84vh',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  borderTop: '1px solid rgba(234, 179, 8, 0.3)',
                }}
              >
                <div style={{ padding: '22px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>
                    Agregar a {equipo.nombre}
                  </h3>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar estudiante…"
                      style={{ ...INPUT, paddingLeft: '38px' }} />
                  </div>

                  {/* Pestañas de curso: filtran la lista sin hacerla scrollear. */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <TabCurso
                      label="Todos"
                      count={[...conteoPorCurso.values()].reduce((a, b) => a + b, 0)}
                      activo={filtroCurso === null}
                      onClick={() => setFiltroCurso(null)}
                    />
                    {cursos.map((curso) => {
                      const tag = getCourseTag(curso);
                      return (
                        <TabCurso
                          key={tag}
                          label={tag}
                          count={conteoPorCurso.get(tag) || 0}
                          activo={filtroCurso === tag}
                          onClick={() => setFiltroCurso(filtroCurso === tag ? null : tag)}
                        />
                      );
                    })}
                  </div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: '10px 14px' }}>
                  {[...porCursoSel.keys()].sort().map((curso) => (
                    <div key={curso} style={{ marginBottom: '14px' }}>
                      {/* Con una pestaña activa el encabezado sobra: ya se sabe el curso. */}
                      {filtroCurso === null && (
                        <div style={{
                          ...LABEL, padding: '8px 10px', display: 'flex',
                          alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                        }}>
                          <span>{curso}</span>
                          <span style={{ color: '#475569' }}>
                            {porCursoSel.get(curso)!.length} estudiantes
                          </span>
                        </div>
                      )}
                      {porCursoSel.get(curso)!.map((c) => {
                        const yaEn = asignados.get(c.key);
                        const marcado = seleccion.has(c.key);
                        // Un estudiante solo puede pertenecer a un equipo: si ya
                        // tiene uno, sigue en la lista pero no se puede marcar.
                        const bloqueado = Boolean(yaEn);
                        return (
                          <button key={c.key}
                            disabled={bloqueado}
                            title={bloqueado ? `Ya pertenece a ${yaEn}` : undefined}
                            onClick={() => setSeleccion((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.key)) next.delete(c.key);
                              else next.add(c.key);
                              return next;
                            })}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: '11px',
                              padding: '10px 12px', borderRadius: '11px', marginBottom: '3px',
                              background: marcado ? 'rgba(234, 179, 8, 0.1)'
                                : bloqueado ? 'rgba(255,255,255,0.02)' : 'transparent',
                              border: `1px solid ${marcado ? 'rgba(234, 179, 8, 0.3)' : 'transparent'}`,
                              cursor: bloqueado ? 'not-allowed' : 'pointer',
                              textAlign: 'left', fontFamily: 'Inter, sans-serif',
                            }}>
                            <span style={{
                              width: '19px', height: '19px', borderRadius: '6px', flexShrink: 0,
                              border: `1.5px solid ${marcado ? '#fbbf24'
                                : bloqueado ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.18)'}`,
                              background: marcado ? '#fbbf24'
                                : bloqueado ? 'rgba(255,255,255,0.05)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {marcado && <Check size={12} color="#0c0822" strokeWidth={3} />}
                              {bloqueado && <Lock size={10} color="#64748b" />}
                            </span>
                            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{
                                fontSize: '0.84rem', fontWeight: 600,
                                color: bloqueado ? '#94a3b8' : '#e2e8f0',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {c.name}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {c.curso} · Equipo {c.groupId}
                                {c.role ? ` · ${c.role}` : ''}
                              </span>
                            </span>
                            {/* Curso siempre visible: en un equipo multicurso es el
                                dato que dice de dónde viene cada estudiante. */}
                            <span style={{
                              fontSize: '0.7rem', fontWeight: 800, padding: '3px 9px',
                              borderRadius: '100px', flexShrink: 0,
                              background: 'rgba(13, 148, 136, 0.14)',
                              border: '1px solid rgba(13, 148, 136, 0.3)',
                              color: '#22d3ee',
                            }}>
                              {c.courseTag}
                            </span>
                            {yaEn && (
                              <span style={{
                                fontSize: '0.67rem', fontWeight: 700, flexShrink: 0,
                                padding: '3px 9px', borderRadius: '100px',
                                background: 'rgba(234, 179, 8, 0.12)',
                                border: '1px solid rgba(234, 179, 8, 0.28)',
                                color: '#fbbf24', maxWidth: '150px',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                ya en {yaEn}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  {disponibles.length === 0 && (
                    <p style={{ color: '#64748b', fontSize: '0.84rem', textAlign: 'center', padding: '30px' }}>
                      No hay estudiantes disponibles con ese criterio.
                    </p>
                  )}
                </div>

                <div style={{
                  padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                    {seleccion.size} seleccionado{seleccion.size === 1 ? '' : 's'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowSelector(false)} style={btnSec('#94a3b8')}>Cancelar</button>
                    <button onClick={confirmarSeleccion} disabled={seleccion.size === 0}
                      style={{
                        ...btnSec('#0c0822'), background: AMBAR, border: 'none', fontWeight: 800,
                        opacity: seleccion.size === 0 ? 0.45 : 1,
                      }}>
                      Agregar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ═══ PANTALLA 3 — Grid de equipos ═════════════════════════════════════════
  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <Toast message={toast} onClose={() => setToast(null)} />

      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', marginBottom: '24px',
      }}>
        <div style={{ minWidth: 0 }}>
          {/* Banda dorada: garantiza contraste del título sea cual sea el fondo. */}
          <h2 style={{
            display: 'inline-block',
            fontSize: 'clamp(1.8rem, 3.6vw, 2.9rem)', fontWeight: 900,
            letterSpacing: '-0.03em', lineHeight: 1.1,
            background: AMBAR, color: '#0c0822',
            padding: '10px 22px', borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(245, 158, 11, 0.22)',
          }}>
            {muestra.nombre}
          </h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: '10px', fontWeight: 600 }}>
            {muestra.fecha && `${muestra.fecha} · `}
            {equiposDelNivel.length} equipo{equiposDelNivel.length === 1 ? '' : 's'} en
            {nivelActivo === '1M' ? ' Primeros' : ' Segundos'} Medios
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => abrirSelectorExport('curso')} {...hoverSolido}
            style={btnSolido('#10b981', '#047857', 'rgba(5, 150, 105, 0.38)')}>
            <FileSpreadsheet size={16} /> Exportar al libro digital
          </button>
          <button onClick={exportarNivel} {...hoverSolido}
            style={btnSolido('#22d3ee', '#0369a1', 'rgba(3, 105, 161, 0.38)')}>
            <Layers size={16} /> Exportar por nivel
          </button>
          <button onClick={() => abrirSelectorExport('pdf')} {...hoverSolido}
            style={btnSolido('#8b5cf6', '#6d28d9', 'rgba(109, 40, 217, 0.38)')}>
            <Printer size={16} /> Listados en PDF
          </button>
        </div>
      </div>

      {/* Pestañas de nivel: la muestra cubre ambos, se trabajan por separado. */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
        {([['1M', 'Primeros Medios'], ['2M', 'Segundos Medios']] as const).map(([val, txt]) => {
          const n = muestra.equipos.filter((e) => e.nivel === val).length;
          const activo = nivelActivo === val;
          const c = COLOR_NIVEL[val];
          return (
            <button key={val} onClick={() => setNivelActivo(val)}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px',
                padding: '13px 22px', borderRadius: '14px', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: '0.94rem', fontWeight: 800,
                // Cada nivel tiene su color. Activo va macizo; inactivo blanco
                // con el color solo en el ícono, para que igual se distinga.
                background: activo
                  ? `linear-gradient(135deg, ${c.solido} 0%, ${c.oscuro} 100%)`
                  : '#ffffff',
                border: `1.5px solid ${activo ? c.oscuro : '#dbe1ea'}`,
                color: activo ? '#ffffff' : '#475569',
                boxShadow: activo
                  ? `0 10px 26px ${c.sombra}`
                  : '0 2px 8px rgba(15, 23, 42, 0.07)',
                transition: 'all 0.15s',
              }}>
              <GraduationCap size={18} color={activo ? '#ffffff' : c.solido} />
              {txt}
              <span style={{
                fontSize: '0.76rem', fontWeight: 800, padding: '2px 10px',
                borderRadius: '100px',
                background: activo ? 'rgba(255,255,255,0.22)' : c.suave,
                color: activo ? '#ffffff' : c.oscuro,
              }}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* key por nivel: al cambiar de pestaña el grid se remonta en vez de
          animar posiciones entre dos listas distintas (eso hacía "saltar" la
          tarjeta de Agregar equipo). */}
      <div key={nivelActivo} style={{
        display: 'grid', gap: '16px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      }}>
        {equiposDelNivel.map((e, idx) => {
          const cursosEq = new Map<string, number>();
          for (const m of e.miembros) cursosEq.set(m.courseTag, (cursosEq.get(m.courseTag) || 0) + 1);
          const prom = promedioEquipo(e, ctx);
          const color = colorDeEquipo(e, idx);

          return (
            <motion.div key={e.id}
              whileHover={{ y: -3 }}
              onClick={() => setEquipoAbierto(e.id)}
              style={{
                ...PANEL, padding: '20px', cursor: 'pointer',
                position: 'relative', overflow: 'hidden',
                // Color identificador del equipo: franja superior + halo del
                // mismo tono en la sombra, para reconocerlo de un vistazo.
                borderTop: `4px solid ${color}`,
                boxShadow: `0 18px 44px rgba(12, 8, 32, 0.30), 0 -1px 26px ${color}33`,
              }}>
              <Gloss />
              {/* Resplandor del color en la esquina superior */}
              <span aria-hidden style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '86px',
                background: `linear-gradient(180deg, ${color}26 0%, transparent 100%)`,
                pointerEvents: 'none',
              }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', position: 'relative' }}>
                <div style={{ minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{
                    width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0,
                    background: color, marginTop: '5px',
                    boxShadow: `0 0 12px ${color}aa`,
                  }} />
                  <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '3px' }}>{e.nombre}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.76rem' }}>
                    {[e.asignatura, e.tematica].filter(Boolean).join(' · ') || 'Sin asignatura ni temática'}
                  </p>
                  </div>
                </div>
                {canEdit && (
                  <button onClick={(ev) => { ev.stopPropagation(); borrarEquipo(e.id); }}
                    title="Eliminar equipo"
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', flexShrink: 0 }}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#94a3b8', fontSize: '0.78rem', marginBottom: '10px' }}>
                <GraduationCap size={14} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.docentes.length > 0 ? e.docentes.join(' · ') : 'Sin docentes asignados'}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px' }}>
                {e.miembros.length} estudiante{e.miembros.length === 1 ? '' : 's'}
                <span style={{ color: '#64748b', fontWeight: 500 }}>
                  {' · '}{cursosEq.size} curso{cursosEq.size === 1 ? '' : 's'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[...cursosEq.entries()].sort().map(([tag, n]) => (
                  <span key={tag} style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: '100px',
                    background: 'rgba(13, 148, 136, 0.12)', border: '1px solid rgba(13, 148, 136, 0.25)',
                    color: '#22d3ee',
                  }}>{tag} {n}</span>
                ))}
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={LABEL}>Promedio propuesto</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: prom === null ? '#475569' : '#fbbf24' }}>
                  {prom ?? '—'}
                </span>
              </div>

              {/* Listado oficial de ESTE equipo, para pasar lista y gestionar cursos. */}
              <button
                onClick={async (ev) => {
                  ev.stopPropagation();
                  if (e.miembros.length === 0) { avisar('Este equipo aún no tiene integrantes'); return; }
                  avisar('Generando listado…');
                  await exportarListadoEquipoPDF(e, muestraDelNivel, ctx);
                  avisar(`Listado de ${e.nombre} generado`);
                }}
                style={{
                  width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '7px', padding: '9px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)', borderRadius: '11px',
                  color: '#94a3b8', fontSize: '0.76rem', fontWeight: 700,
                  fontFamily: 'Inter, sans-serif', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={(ev) => {
                  ev.currentTarget.style.background = 'rgba(234, 179, 8, 0.1)';
                  ev.currentTarget.style.borderColor = 'rgba(234, 179, 8, 0.3)';
                  ev.currentTarget.style.color = '#fbbf24';
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  ev.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
                  ev.currentTarget.style.color = '#94a3b8';
                }}
              >
                <Printer size={14} /> Imprimir listado oficial
              </button>
            </motion.div>
          );
        })}

        {canEdit && (
          <motion.button onClick={agregarEquipo} whileHover={{ y: -3 }}
            style={{
              minHeight: '210px', borderRadius: '20px', cursor: 'pointer',
              background: '#ffffff',
              border: '2px dashed #cbd5e1',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '10px', color: '#64748b',
              fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 800,
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(ev) => {
              ev.currentTarget.style.borderColor = '#f59e0b';
              ev.currentTarget.style.color = '#d97706';
            }}
            onMouseLeave={(ev) => {
              ev.currentTarget.style.borderColor = '#cbd5e1';
              ev.currentTarget.style.color = '#64748b';
            }}>
            <Plus size={26} />
            Agregar equipo
          </motion.button>
        )}
      </div>

      {/* Selector de equipos a exportar */}
      <AnimatePresence>
        {exportDestino && (
          <ModalEquipos
            destino={exportDestino}
            equipos={equiposDelNivel.filter((e) => e.miembros.length > 0)}
            seleccion={equiposExport}
            setSeleccion={setEquiposExport}
            onCancel={() => setExportDestino(null)}
            onConfirm={() => confirmarExport(equiposExport)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ModalEquiposProps {
  destino: 'curso' | 'pdf';
  equipos: MuestraEquipo[];
  seleccion: Set<string>;
  setSeleccion: React.Dispatch<React.SetStateAction<Set<string>>>;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Pregunta qué equipos incluir antes de exportar. */
function ModalEquipos({
  destino, equipos, seleccion, setSeleccion, onCancel, onConfirm,
}: ModalEquiposProps) {
  const todos = seleccion.size === equipos.length;
  const totalEstudiantes = equipos
    .filter((e) => seleccion.has(e.id))
    .reduce((n, e) => n + e.miembros.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...PANEL, width: '100%', maxWidth: '640px', maxHeight: '84vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderTop: '1px solid rgba(234, 179, 8, 0.3)',
          fontFamily: 'Inter, sans-serif', color: 'white',
        }}
      >
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '5px' }}>
            {destino === 'curso' ? '¿Qué grupos incluyes?' : '¿De qué grupos imprimes el listado?'}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>
            {destino === 'curso'
              ? 'Se descarga un solo Excel con una pestaña por curso, para copiar y pegar en el libro digital.'
              : 'Se genera un PDF con una página por equipo.'}
          </p>

          <button
            onClick={() => setSeleccion(todos ? new Set() : new Set(equipos.map((e) => e.id)))}
            style={{ ...btnSec('#fbbf24'), marginTop: '14px', fontSize: '0.76rem' }}
          >
            <CheckCheck size={14} /> {todos ? 'Quitar todos' : 'Seleccionar todos'}
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 14px' }}>
          {equipos.map((e) => {
            const marcado = seleccion.has(e.id);
            const cursos = [...new Set(e.miembros.map((m) => m.courseTag))].sort();
            return (
              <button key={e.id}
                onClick={() => setSeleccion((prev) => {
                  const next = new Set(prev);
                  if (next.has(e.id)) next.delete(e.id);
                  else next.add(e.id);
                  return next;
                })}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '13px 14px', borderRadius: '13px', marginBottom: '6px',
                  background: marcado ? 'rgba(234, 179, 8, 0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${marcado ? 'rgba(234, 179, 8, 0.32)' : 'rgba(255,255,255,0.06)'}`,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif',
                }}>
                <span style={{
                  width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, marginTop: '2px',
                  border: `1.5px solid ${marcado ? '#fbbf24' : 'rgba(255,255,255,0.2)'}`,
                  background: marcado ? '#fbbf24' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {marcado && <Check size={13} color="#0c0822" strokeWidth={3} />}
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: '#e2e8f0' }}>
                    {e.nombre}
                  </span>
                  {/* La info que puso el docente: por eso puede elegir con criterio. */}
                  <span style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginTop: '3px' }}>
                    {[e.asignatura, e.tematica].filter(Boolean).join(' · ') || 'Sin asignatura ni temática'}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.73rem', color: '#64748b', marginTop: '2px' }}>
                    {e.docentes.length ? e.docentes.join(' · ') : 'Sin docentes asignados'}
                  </span>
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '7px' }}>
                    {cursos.map((t) => (
                      <span key={t} style={{
                        fontSize: '0.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: '100px',
                        background: 'rgba(13, 148, 136, 0.14)', border: '1px solid rgba(13, 148, 136, 0.28)',
                        color: '#22d3ee',
                      }}>{t}</span>
                    ))}
                  </span>
                </span>

                <span style={{ fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700, flexShrink: 0 }}>
                  {e.miembros.length}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{
          padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
            {seleccion.size} equipo{seleccion.size === 1 ? '' : 's'} · {totalEstudiantes} estudiantes
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onCancel} style={btnSec('#94a3b8')}>Cancelar</button>
            <button onClick={onConfirm} disabled={seleccion.size === 0}
              style={{
                ...btnSec('#0c0822'), background: AMBAR, border: 'none', fontWeight: 800,
                opacity: seleccion.size === 0 ? 0.45 : 1,
              }}>
              {destino === 'curso' ? <FileSpreadsheet size={14} /> : <Printer size={14} />}
              Exportar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Bitácora del equipo ────────────────────────────────────────────────────
const PRESENTACION_VACIA: PresentacionMuestra = {
  fecha: '', hora: '', lugar: '', descripcion: '', acuerdos: '', observaciones: '',
};

const nuevaSesion = (n: number): SesionMuestra => ({
  id: `ses-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  fecha: new Date().toISOString().slice(0, 10),
  tema: `Sesión ${n}`,
  responsable: '', acuerdos: '', observaciones: '',
  realizada: false, avance: 0,
});

const AREA: React.CSSProperties = {
  ...INPUT, minHeight: '84px', resize: 'vertical', lineHeight: 1.5,
};

interface BitacoraProps {
  equipo: MuestraEquipo;
  canEdit: boolean;
  color: string;
  onCambiar: (cambios: Partial<MuestraEquipo>) => void;
  onExportar: () => void;
}

/**
 * Planificación del equipo: la muestra propiamente tal y las sesiones de
 * trabajo previas, cada una con sus acuerdos y observaciones.
 */
function Bitacora({ equipo, canEdit, color, onCambiar, onExportar }: BitacoraProps) {
  const sesiones = equipo.sesiones || [];
  const pres = equipo.presentacion || PRESENTACION_VACIA;

  const cambiarPres = (campos: Partial<PresentacionMuestra>) =>
    onCambiar({ presentacion: { ...pres, ...campos } });

  const cambiarSesion = (id: string, campos: Partial<SesionMuestra>) =>
    onCambiar({ sesiones: sesiones.map((s) => (s.id === id ? { ...s, ...campos } : s)) });

  const agregarSesion = () =>
    onCambiar({ sesiones: [...sesiones, nuevaSesion(sesiones.length + 1)] });

  const borrarSesion = (s: SesionMuestra) => {
    if (!window.confirm(`¿Eliminar "${s.tema}" del ${s.fecha || 'sin fecha'}?`)) return;
    onCambiar({ sesiones: sesiones.filter((x) => x.id !== s.id) });
  };

  // Orden cronológico; las sesiones sin fecha quedan al final.
  const ordenadas = [...sesiones].sort((a, b) =>
    (a.fecha || '9999').localeCompare(b.fecha || '9999'));

  const realizadas = sesiones.filter((s) => s.realizada).length;
  const avanceGlobal = sesiones.length
    ? Math.round(sesiones.reduce((n, s) => n + (s.avance || 0), 0) / sesiones.length)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* ── La muestra pública ── */}
      <div style={{ ...PANEL, padding: '24px', borderTop: `3px solid ${color}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px', marginBottom: '18px',
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>La Muestra Pública</h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '3px' }}>
              Cuándo y dónde presenta este equipo
            </p>
          </div>
          <button onClick={onExportar} style={btnSec('#c4b5fd')}>
            <Printer size={14} /> Bitácora en PDF
          </button>
        </div>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <Campo label="Fecha de la muestra">
            <input type="date" style={INPUT} value={pres.fecha} disabled={!canEdit}
              onChange={(e) => cambiarPres({ fecha: e.target.value })} />
          </Campo>
          <Campo label="Hora">
            <input type="time" style={INPUT} value={pres.hora} disabled={!canEdit}
              onChange={(e) => cambiarPres({ hora: e.target.value })} />
          </Campo>
          <Campo label="Lugar donde se realiza">
            <input style={INPUT} value={pres.lugar} disabled={!canEdit}
              placeholder="Ej. Patio central, stand 4"
              onChange={(e) => cambiarPres({ lugar: e.target.value })} />
          </Campo>
        </div>

        <div style={{ marginTop: '16px' }}>
          <Campo label="Detalle de la muestra">
            <textarea style={AREA} value={pres.descripcion} disabled={!canEdit}
              placeholder="Qué va a presentar el equipo, cómo es el montaje…"
              onChange={(e) => cambiarPres({ descripcion: e.target.value })} />
          </Campo>
        </div>

        <div style={{ display: 'grid', gap: '16px', marginTop: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <Campo label="Acuerdos del día de la muestra">
            <textarea style={AREA} value={pres.acuerdos} disabled={!canEdit}
              onChange={(e) => cambiarPres({ acuerdos: e.target.value })} />
          </Campo>
          <Campo label="Evaluación y observaciones del día">
            <textarea style={AREA} value={pres.observaciones} disabled={!canEdit}
              onChange={(e) => cambiarPres({ observaciones: e.target.value })} />
          </Campo>
        </div>
      </div>

      {/* ── Sesiones previas ── */}
      <div style={{ ...PANEL, padding: '24px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px', marginBottom: '18px',
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Sesiones previas ({sesiones.length})
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '3px' }}>
              {realizadas} realizada{realizadas === 1 ? '' : 's'} · avance promedio {avanceGlobal}%
            </p>
          </div>
          {canEdit && (
            <button onClick={agregarSesion}
              style={{ ...btnSec('#0c0822'), background: AMBAR, border: 'none', fontWeight: 800 }}>
              <Plus size={14} /> Agregar sesión
            </button>
          )}
        </div>

        {sesiones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
            <NotebookPen size={32} style={{ opacity: 0.4, marginBottom: '10px' }} />
            <p style={{ fontSize: '0.86rem' }}>
              Aún no hay sesiones registradas. Agrega la primera para llevar los
              acuerdos y observaciones del equipo.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {ordenadas.map((s, i) => (
              <FichaSesion
                key={s.id}
                sesion={s}
                numero={i + 1}
                docentes={equipo.docentes}
                canEdit={canEdit}
                color={color}
                onCambiar={(campos) => cambiarSesion(s.id, campos)}
                onBorrar={() => borrarSesion(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FichaSesionProps {
  sesion: SesionMuestra;
  numero: number;
  docentes: string[];
  canEdit: boolean;
  color: string;
  onCambiar: (campos: Partial<SesionMuestra>) => void;
  onBorrar: () => void;
}

/** Una sesión de trabajo, editable en línea. */
function FichaSesion({
  sesion, numero, docentes, canEdit, color, onCambiar, onBorrar,
}: FichaSesionProps) {
  const [abierta, setAbierta] = useState(false);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${sesion.realizada ? 'rgba(16, 185, 129, 0.28)' : 'rgba(255,255,255,0.08)'}`,
      borderLeft: `3px solid ${sesion.realizada ? '#10b981' : color}`,
      borderRadius: '14px', overflow: 'hidden',
    }}>
      {/* Cabecera siempre visible */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '13px 16px', flexWrap: 'wrap',
      }}>
        <span style={{
          width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0,
          background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.76rem', fontWeight: 800,
        }}>{numero}</span>

        <button onClick={() => setAbierta(!abierta)}
          style={{
            flex: 1, minWidth: '160px', background: 'none', border: 'none',
            textAlign: 'left', cursor: 'pointer', padding: 0,
            fontFamily: 'Inter, sans-serif',
          }}>
          <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>
            {sesion.tema || 'Sin tema'}
          </span>
          <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
            {sesion.fecha || 'sin fecha'}
            {sesion.responsable ? ` · ${sesion.responsable}` : ''}
          </span>
        </button>

        <label style={{
          display: 'flex', alignItems: 'center', gap: '6px', cursor: canEdit ? 'pointer' : 'default',
          fontSize: '0.74rem', fontWeight: 700,
          color: sesion.realizada ? '#34d399' : '#64748b',
        }}>
          <input type="checkbox" checked={sesion.realizada} disabled={!canEdit}
            onChange={(e) => onCambiar({ realizada: e.target.checked })} />
          {sesion.realizada ? 'Realizada' : 'Pendiente'}
        </label>

        <span style={{
          fontSize: '0.74rem', fontWeight: 800, color: '#22d3ee',
          padding: '3px 9px', borderRadius: '100px',
          background: 'rgba(13, 148, 136, 0.14)', border: '1px solid rgba(13, 148, 136, 0.28)',
        }}>{sesion.avance}%</span>

        <button onClick={() => setAbierta(!abierta)}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}>
          <ChevronDown size={17} style={{
            transform: abierta ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
          }} />
        </button>
      </div>

      {/* Detalle desplegable */}
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              padding: '4px 16px 18px', display: 'flex', flexDirection: 'column', gap: '14px',
              borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '2px', paddingTop: '16px',
            }}>
              <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                <Campo label="Fecha">
                  <input type="date" style={INPUT} value={sesion.fecha} disabled={!canEdit}
                    onChange={(e) => onCambiar({ fecha: e.target.value })} />
                </Campo>
                <Campo label="Tema u objetivo">
                  <input style={INPUT} value={sesion.tema} disabled={!canEdit}
                    placeholder="Ej. Diseño del prototipo"
                    onChange={(e) => onCambiar({ tema: e.target.value })} />
                </Campo>
                <Campo label="Responsable">
                  <select style={INPUT} value={sesion.responsable} disabled={!canEdit}
                    onChange={(e) => onCambiar({ responsable: e.target.value })}>
                    <option value="">— Sin asignar —</option>
                    {docentes.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Campo>
              </div>

              <Campo label={`Avance del equipo — ${sesion.avance}%`}>
                <input type="range" min={0} max={100} step={5} value={sesion.avance}
                  disabled={!canEdit} style={{ width: '100%', accentColor: color }}
                  onChange={(e) => onCambiar({ avance: Number(e.target.value) })} />
              </Campo>

              <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                <Campo label="Acuerdos">
                  <textarea style={AREA} value={sesion.acuerdos} disabled={!canEdit}
                    placeholder="Qué se acordó en esta sesión…"
                    onChange={(e) => onCambiar({ acuerdos: e.target.value })} />
                </Campo>
                <Campo label="Observaciones">
                  <textarea style={AREA} value={sesion.observaciones} disabled={!canEdit}
                    placeholder="Cómo trabajó el equipo, qué se observó…"
                    onChange={(e) => onCambiar({ observaciones: e.target.value })} />
                </Campo>
              </div>

              {canEdit && (
                <button onClick={onBorrar}
                  style={{ ...btnSec('#f87171'), alignSelf: 'flex-start' }}>
                  <Trash2 size={14} /> Eliminar sesión
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <span style={LABEL}>{label}</span>
      {children}
    </div>
  );
}

/** Pestaña de filtro por curso en el selector de estudiantes. */
function TabCurso({ label, count, activo, onClick }: {
  label: string; count: number; activo: boolean; onClick: () => void;
}) {
  const vacio = count === 0;
  return (
    <button
      onClick={onClick}
      disabled={vacio && !activo}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '7px 12px', borderRadius: '100px',
        fontSize: '0.76rem', fontWeight: 800, fontFamily: 'Inter, sans-serif',
        cursor: vacio && !activo ? 'default' : 'pointer',
        background: activo ? 'rgba(234, 179, 8, 0.16)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${activo ? 'rgba(234, 179, 8, 0.45)' : 'rgba(255,255,255,0.08)'}`,
        color: activo ? '#fbbf24' : '#94a3b8',
        opacity: vacio && !activo ? 0.4 : 1,
        transition: 'all 0.15s',
      }}
    >
      {label}
      <span style={{
        fontSize: '0.68rem', fontWeight: 700,
        color: activo ? '#fbbf24' : '#64748b',
        opacity: 0.85,
      }}>
        {count}
      </span>
    </button>
  );
}

function btnSec(color: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '7px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '11px', padding: '9px 14px', color,
    fontSize: '0.79rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
  };
}

/**
 * Botón sólido de acción principal. La vista se ve sobre fondo claro, así que
 * los botones translúcidos se lavaban: aquí el color va macizo, con sombra del
 * mismo tono para despegarlo del fondo.
 */
function btnSolido(desde: string, hasta: string, sombra: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: `linear-gradient(135deg, ${desde} 0%, ${hasta} 100%)`,
    border: 'none', borderRadius: '13px', padding: '12px 18px',
    color: '#ffffff', fontSize: '0.84rem', fontWeight: 800,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    boxShadow: `0 8px 22px ${sombra}`,
    transition: 'transform 0.15s, box-shadow 0.15s, filter 0.15s',
  };
}

/** Realce y sombra al pasar el mouse sobre un botón sólido. */
const hoverSolido = {
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.filter = 'brightness(1.07)';
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.filter = 'none';
  },
};

/** Reflejo superior que da el aspecto vidriado a las tarjetas. */
function Gloss({ radio = 20 }: { radio?: number }) {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute', inset: 0, borderRadius: `${radio}px`,
        pointerEvents: 'none',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 38%, rgba(255,255,255,0) 62%)',
      }}
    />
  );
}

interface WizardProps {
  nombre: string; setNombre: (v: string) => void;
  fecha: string; setFecha: (v: string) => void;
  grupos1M: number; setGrupos1M: (v: number) => void;
  grupos2M: number; setGrupos2M: (v: number) => void;
  onCancel: () => void; onConfirm: () => void;
}

/** PANTALLA 2 — Asistente de configuración inicial. */
function Wizard({
  nombre, setNombre, fecha, setFecha,
  grupos1M, setGrupos1M, grupos2M, setGrupos2M,
  onCancel, onConfirm,
}: WizardProps) {
  const total = grupos1M + grupos2M;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)', zIndex: 9998, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...PANEL, padding: '32px', width: '100%', maxWidth: '440px',
          borderTop: '1px solid rgba(234, 179, 8, 0.3)',
          boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
          fontFamily: 'Inter, sans-serif', color: 'white',
          maxHeight: '88vh', overflowY: 'auto',
        }}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
          Configurar la muestra
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '24px' }}>
          La muestra abarca los dos niveles por separado. Define con cuántos
          equipos parte cada uno.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Campo label="Nombre de la muestra">
            <input style={INPUT} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>

          <Campo label="Fecha">
            <input type="date" style={INPUT} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </Campo>

          <Campo label="Equipos de Primeros Medios">
            <StepperGrupos valor={grupos1M} setValor={setGrupos1M} />
          </Campo>

          <Campo label="Equipos de Segundos Medios">
            <StepperGrupos valor={grupos2M} setValor={setGrupos2M} />
          </Campo>

          <span style={{ color: '#64748b', fontSize: '0.74rem', marginTop: '-6px' }}>
            Podrás agregar o quitar equipos después en cualquiera de los dos niveles.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
          <button onClick={onCancel} style={{ ...btnSec('#94a3b8'), flex: 1, justifyContent: 'center' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={total === 0}
            style={{
              flex: 2, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px',
              background: AMBAR, color: '#0c0822', border: 'none', borderRadius: '12px',
              padding: '13px 20px', fontSize: '0.88rem', fontWeight: 800,
              fontFamily: 'Inter, sans-serif', cursor: total === 0 ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.25)',
              opacity: total === 0 ? 0.45 : 1,
            }}>
            <Megaphone size={16} /> Crear {total} equipo{total === 1 ? '' : 's'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Stepper de cantidad de equipos. 0 significa "este nivel no participa". */
function StepperGrupos({ valor, setValor }: { valor: number; setValor: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <button onClick={() => setValor(Math.max(0, valor - 1))} style={stepper}>
        <Minus size={16} />
      </button>
      <span style={{
        fontSize: '1.7rem', fontWeight: 900, minWidth: '52px', textAlign: 'center',
        color: valor === 0 ? '#475569' : 'white',
      }}>
        {valor}
      </span>
      <button onClick={() => setValor(Math.min(20, valor + 1))} style={stepper}>
        <Plus size={16} />
      </button>
    </div>
  );
}

const stepper: React.CSSProperties = {
  width: '42px', height: '42px', borderRadius: '12px',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};
