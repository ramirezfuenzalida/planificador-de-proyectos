import React, { useLayoutEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Users, Calendar, Clock, MapPin, FileDown, Image as ImageIcon,
  Save, Trash2, Check, X, ClipboardList, Lightbulb, Handshake, UserPlus,
  Share2, Download, Loader2,
} from 'lucide-react';
import type { ActaGlobalizacion } from '../types';
import {
  exportActaPDF, generarActaImagen, compartirActaImagen, descargarActaImagen,
  preloadActaAssets, fechaLarga, type ActaImagen,
} from '../utils/actaExport';

// Roster fijo del equipo docente (mismos nombres de la planilla).
const DOCENTES_EQUIPO = [
  'Maria Eugenia López',
  'Thiara Figueroa',
  'Camila Seguel',
  'Monserrat Vargas',
  'Lucy Colina',
  'Jean Villalobos',
  'Marco Ramírez',
  'Exequiel Ramírez',
];

interface Props {
  actas: ActaGlobalizacion[];
  onSaveActas: (next: ActaGlobalizacion[]) => void;
  canEdit: boolean;
}

const nuevoId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `acta_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Selector de hora propio (hora : minutos) — consistente en Mac, iPhone y iPad,
// legible sobre el tema oscuro (los <input type="time"> nativos variaban por
// dispositivo y quedaban ilegibles).
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const TimeField: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [h = '', m = ''] = (value || '').split(':');
  const minuteOpts = m && !MINUTES.includes(m) ? [...MINUTES, m].sort() : MINUTES;
  return (
    <div className="acta-time">
      <select className="acta-time-sel" value={h} onChange={e => onChange(`${e.target.value}:${m || '00'}`)}>
        <option value="">– –</option>
        {HOURS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span className="acta-time-colon">:</span>
      <select className="acta-time-sel" value={m} onChange={e => onChange(`${h || '00'}:${e.target.value}`)}>
        <option value="">– –</option>
        {minuteOpts.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
      <span className="acta-time-suffix">hrs</span>
    </div>
  );
};

const draftVacio = (): ActaGlobalizacion => ({
  id: nuevoId(),
  titulo: '',
  fecha: new Date().toISOString().slice(0, 10),
  horaInicio: '',
  horaFin: '',
  lugar: '',
  participantes: [],
  temas: '',
  propuesta: '',
  acuerdos: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const ActaGlobalizacionView: React.FC<Props> = ({ actas, onSaveActas, canEdit }) => {
  useLayoutEffect(() => {
    document.documentElement.classList.add('acta-cosmic');
    document.body.classList.add('acta-cosmic');
    // Precarga la foto de universo y el logo para que "Exportar imagen" sea
    // instantáneo y pueda abrir la hoja de compartir directamente.
    preloadActaAssets();
    return () => {
      document.documentElement.classList.remove('acta-cosmic');
      document.body.classList.remove('acta-cosmic');
    };
  }, []);

  const actasOrdenadas = useMemo(
    () => [...actas].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.updatedAt - a.updatedAt),
    [actas],
  );

  const [draft, setDraft] = useState<ActaGlobalizacion>(() => actasOrdenadas[0] || draftVacio());
  const [esNueva, setEsNueva] = useState(actasOrdenadas.length === 0);
  const [customName, setCustomName] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState<ActaImagen | null>(null);
  const [generando, setGenerando] = useState(false);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const set = <K extends keyof ActaGlobalizacion>(k: K, v: ActaGlobalizacion[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const toggleParticipante = (nombre: string) => {
    setDraft(d => ({
      ...d,
      participantes: d.participantes.includes(nombre)
        ? d.participantes.filter(p => p !== nombre)
        : [...d.participantes, nombre],
    }));
  };

  const agregarCustom = () => {
    const n = customName.trim();
    if (!n) return;
    if (!draft.participantes.includes(n)) set('participantes', [...draft.participantes, n]);
    setCustomName('');
  };

  const nuevaActa = () => {
    setDraft(draftVacio());
    setEsNueva(true);
  };

  const seleccionar = (a: ActaGlobalizacion) => {
    setDraft({ ...a });
    setEsNueva(false);
  };

  const guardar = () => {
    const ahora = Date.now();
    const limpio: ActaGlobalizacion = { ...draft, updatedAt: ahora };
    const existe = actas.some(a => a.id === limpio.id);
    const next = existe ? actas.map(a => (a.id === limpio.id ? limpio : a)) : [...actas, limpio];
    onSaveActas(next);
    setEsNueva(false);
    flash('Acta guardada correctamente');
  };

  const previsualizarImagen = async () => {
    if (generando) return;
    setGenerando(true);
    try {
      const img = await generarActaImagen(draft);
      setPreview(img);
    } catch {
      flash('No se pudo generar la imagen');
    } finally {
      setGenerando(false);
    }
  };

  const cerrarPreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const compartirPreview = async () => {
    if (!preview) return;
    const r = await compartirActaImagen(preview);
    if (r === 'opened') flash('Imagen abierta en una pestaña nueva');
    else if (r === 'downloaded') flash('Imagen guardada en Descargas');
  };

  const descargarPreview = () => {
    if (!preview) return;
    descargarActaImagen(preview);
    flash('Imagen guardada en Descargas');
  };

  const eliminar = () => {
    if (!window.confirm('¿Eliminar esta acta de forma permanente?')) return;
    onSaveActas(actas.filter(a => a.id !== draft.id));
    const resto = actas.filter(a => a.id !== draft.id);
    if (resto.length) { setDraft({ ...resto[0] }); setEsNueva(false); }
    else { setDraft(draftVacio()); setEsNueva(true); }
    flash('Acta eliminada');
  };

  const customParticipantes = draft.participantes.filter(p => !DOCENTES_EQUIPO.includes(p));
  const guardadaEnLista = actas.some(a => a.id === draft.id);

  return (
    <div className="acta-root">
      <style>{styles}</style>

      {toast && (
        <motion.div className="acta-toast" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <Check size={15} /> {toast}
        </motion.div>
      )}

      <div className="acta-shell">
        {/* Encabezado */}
        <div className="acta-head">
          <div className="acta-head-logo">
            <img src="/logo-proyecto.png" alt="Equipo de Proyectos · Liceo William Taylor" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="acta-eyebrow">EQUIPO DE PROYECTOS · REUNIONES</div>
            <h1 className="acta-title">Acta de <span>Globalización</span></h1>
            <p className="acta-sub">Registro de reuniones, propuestas y acuerdos del equipo docente.</p>
          </div>
          {canEdit && (
            <button className="acta-btn-new" onClick={nuevaActa}>
              <Plus size={16} /> Nueva acta
            </button>
          )}
        </div>

        <div className="acta-grid">
          {/* Lista de actas */}
          <aside className="acta-list-panel">
            <div className="acta-panel-label"><ClipboardList size={14} /> Actas registradas ({actas.length})</div>
            <div className="acta-list">
              {actasOrdenadas.length === 0 && (
                <div className="acta-empty-list">Aún no hay actas. Crea la primera con “Nueva acta”.</div>
              )}
              {actasOrdenadas.map(a => (
                <button
                  key={a.id}
                  className={`acta-list-item ${a.id === draft.id ? 'active' : ''}`}
                  onClick={() => seleccionar(a)}
                >
                  <div className="acta-li-title">{a.titulo || 'Reunión sin título'}</div>
                  <div className="acta-li-meta">
                    <span><Calendar size={11} /> {a.fecha ? fechaLarga(a.fecha) : 'Sin fecha'}</span>
                    <span><Users size={11} /> {a.participantes.length}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Editor */}
          <section className="acta-editor">
            <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
              {/* Info reunión */}
              <div className="acta-field">
                <label>Título / Motivo de la reunión</label>
                <input
                  className="acta-input"
                  placeholder="Ej. Globalización Proyecto SAE — Semana 5"
                  value={draft.titulo}
                  onChange={e => set('titulo', e.target.value)}
                />
              </div>

              <div className="acta-row3">
                <div className="acta-field">
                  <label><Calendar size={13} /> Fecha</label>
                  <input type="date" className="acta-input" value={draft.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
                <div className="acta-field">
                  <label><Clock size={13} /> Hora inicio</label>
                  <TimeField value={draft.horaInicio} onChange={v => set('horaInicio', v)} />
                </div>
                <div className="acta-field">
                  <label><Clock size={13} /> Hora término</label>
                  <TimeField value={draft.horaFin} onChange={v => set('horaFin', v)} />
                </div>
              </div>

              <div className="acta-field">
                <label><MapPin size={13} /> Lugar / Modalidad</label>
                <input
                  className="acta-input"
                  placeholder="Ej. Sala de profesores / Meet"
                  value={draft.lugar}
                  onChange={e => set('lugar', e.target.value)}
                />
              </div>

              {/* Participantes */}
              <div className="acta-field">
                <label><Users size={13} /> Participantes ({draft.participantes.length})</label>
                <div className="acta-part-grid">
                  {DOCENTES_EQUIPO.map(n => {
                    const on = draft.participantes.includes(n);
                    return (
                      <button
                        type="button"
                        key={n}
                        className={`acta-part-chip ${on ? 'on' : ''}`}
                        onClick={() => toggleParticipante(n)}
                      >
                        <span className="acta-part-check">{on ? <Check size={13} /> : null}</span>
                        {n}
                      </button>
                    );
                  })}
                </div>

                {/* Participante manual */}
                {canEdit && (
                  <div className="acta-custom-row">
                    <div className="acta-custom-input">
                      <UserPlus size={14} />
                      <input
                        placeholder="Agregar otro participante…"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarCustom(); } }}
                      />
                    </div>
                    <button type="button" className="acta-custom-add" onClick={agregarCustom}>Agregar</button>
                  </div>
                )}
                {customParticipantes.length > 0 && (
                  <div className="acta-custom-tags">
                    {customParticipantes.map(n => (
                      <span key={n} className="acta-custom-tag">
                        {n}
                        <button type="button" onClick={() => toggleParticipante(n)}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Áreas de texto */}
              <div className="acta-field">
                <label className="acta-section-label temas"><ClipboardList size={14} /> Temas de la reunión</label>
                <textarea className="acta-textarea" rows={4} placeholder="Puntos tratados durante la reunión…" value={draft.temas} onChange={e => set('temas', e.target.value)} />
              </div>
              <div className="acta-field">
                <label className="acta-section-label propuesta"><Lightbulb size={14} /> Propuesta de equipo</label>
                <textarea className="acta-textarea" rows={4} placeholder="Propuestas planteadas por el equipo…" value={draft.propuesta} onChange={e => set('propuesta', e.target.value)} />
              </div>
              <div className="acta-field">
                <label className="acta-section-label acuerdos"><Handshake size={14} /> Acuerdos tomados</label>
                <textarea className="acta-textarea" rows={4} placeholder="Acuerdos y compromisos definidos…" value={draft.acuerdos} onChange={e => set('acuerdos', e.target.value)} />
              </div>
            </fieldset>

            {/* Acciones */}
            <div className="acta-actions">
              {canEdit && (
                <button className="acta-act primary" onClick={guardar}>
                  <Save size={16} /> {esNueva || !guardadaEnLista ? 'Guardar acta' : 'Actualizar acta'}
                </button>
              )}
              <button className="acta-act pdf" onClick={() => exportActaPDF(draft)}>
                <FileDown size={16} /> Exportar PDF
              </button>
              <button className="acta-act img" onClick={previsualizarImagen} disabled={generando}>
                {generando ? <Loader2 size={16} className="acta-spin" /> : <ImageIcon size={16} />}
                {generando ? 'Generando…' : 'Ver imagen / Compartir'}
              </button>
              {canEdit && guardadaEnLista && (
                <button className="acta-act danger" onClick={eliminar}>
                  <Trash2 size={16} /> Eliminar
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Previsualización de la imagen antes de compartir */}
      {preview && (
        <motion.div
          className="acta-preview-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={cerrarPreview}
        >
          <motion.div
            className="acta-preview-card"
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="acta-preview-head">
              <span className="acta-preview-title"><ImageIcon size={16} /> Previsualización del acta</span>
              <button className="acta-preview-close" onClick={cerrarPreview}><X size={18} /></button>
            </div>
            <div className="acta-preview-imgwrap">
              <img src={preview.url} alt="Previsualización del acta" />
            </div>
            <p className="acta-preview-hint">Revisa cómo quedará antes de compartir o descargar.</p>
            <div className="acta-preview-actions">
              <button className="acta-act share" onClick={compartirPreview}>
                <Share2 size={16} /> Compartir
              </button>
              <button className="acta-act download" onClick={descargarPreview}>
                <Download size={16} /> Descargar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Manrope:wght@400;500;600;700;800&display=swap');

html.acta-cosmic, body.acta-cosmic { background: #070311 !important; }
body.acta-cosmic .app-window { background: transparent !important; }
body.acta-cosmic .main-board {
  background:
    radial-gradient(1200px 600px at 12% -10%, rgba(124,58,237,0.20), transparent 60%),
    radial-gradient(1000px 700px at 100% 0%, rgba(6,182,212,0.18), transparent 55%),
    radial-gradient(900px 900px at 50% 120%, rgba(217,70,239,0.10), transparent 60%),
    linear-gradient(180deg, #0a0716 0%, #0c0822 45%, #070311 100%) !important;
}
body.acta-cosmic .main-board:before { display: none !important; }
body.acta-cosmic .mobile-nav-header {
  background: transparent !important; border-bottom: none !important;
  -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
  padding: calc(env(safe-area-inset-top, 0px) + 1rem) 1.25rem 1rem 1.25rem !important;
  gap: 0.9rem !important;
}
body.acta-cosmic .mobile-nav-brand { color: #fff !important; }
body.acta-cosmic .mobile-menu-btn {
  background: rgba(255,255,255,0.07) !important; color: #5eead4 !important;
  border: 1px solid rgba(165,243,252,0.16) !important;
}

.acta-root {
  position: relative; min-height: 100vh; font-family: 'Manrope', sans-serif;
  padding: max(20px, calc(env(safe-area-inset-top,0px) + 8px)) calc(24px + env(safe-area-inset-right,0px)) 160px calc(24px + env(safe-area-inset-left,0px));
  background: #05030f; /* base oscura: nunca queda blanca en la transición */
  overflow-x: hidden;
}
/* ── FONDO DE UNIVERSO (misma imagen premium de la pantalla de clases) ── */
.acta-root::before {
  content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image: url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=2400&q=90&auto=format&fit=crop');
  background-size: cover; background-position: center;
  filter: brightness(0.5) saturate(1.25) contrast(1.05);
  animation: acta-drift 60s ease-in-out infinite alternate;
}
@keyframes acta-drift {
  0% { transform: scale(1.06) translate(0,0); }
  100% { transform: scale(1.12) translate(-1.5%, 1%); }
}
/* Velo para legibilidad + tinte cósmico violeta/cian */
.acta-root::after {
  content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(1000px 700px at 15% -10%, rgba(124,58,237,0.20), transparent 60%),
    radial-gradient(900px 700px at 100% 0%, rgba(6,182,212,0.20), transparent 55%),
    linear-gradient(180deg, rgba(5,3,15,0.42) 0%, rgba(5,3,15,0.80) 100%);
}
@media (prefers-reduced-motion: reduce) { .acta-root::before { animation: none; } }
.acta-shell { position: relative; z-index: 1; max-width: 1120px; margin: 0 auto; }

.acta-toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 3000;
  display: flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 100px;
  background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 700; font-size: 0.85rem;
  box-shadow: 0 12px 30px rgba(16,185,129,0.4);
}

/* Encabezado */
.acta-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 30px; flex-wrap: wrap; }
.acta-head-logo {
  width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0; overflow: hidden;
  border: 1.5px solid rgba(251,191,36,0.55);
  box-shadow: 0 0 0 3px rgba(251,191,36,0.12), 0 10px 26px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2);
}
.acta-head-logo img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.02); }
@media (max-width: 560px) { .acta-head-logo { width: 54px; height: 54px; } }
.acta-eyebrow { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.18em; color: rgba(165,243,252,0.6); margin-bottom: 5px; }
.acta-title { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: clamp(1.6rem, 4.5vw, 2.2rem); line-height: 1.05; letter-spacing: -0.02em; color: #fff; margin: 0; }
.acta-title span { background: linear-gradient(120deg, #5eead4, #22d3ee 55%, #818cf8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.acta-sub { font-size: 0.88rem; color: rgba(255,255,255,0.5); font-weight: 500; margin: 6px 0 0; }
.acta-btn-new {
  display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #22d3ee, #0891b2); color: #041016; font-weight: 800; font-size: 0.85rem; cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 20px rgba(6,182,212,0.4); transition: transform 0.2s;
}
.acta-btn-new:hover { transform: translateY(-2px); }

/* Layout */
.acta-grid { display: grid; grid-template-columns: 300px minmax(0,1fr); gap: 22px; align-items: start; }

/* Panel lista */
.acta-list-panel {
  background: linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.09); border-radius: 22px; padding: 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 40px rgba(5,3,20,0.35);
  position: sticky; top: 12px;
}
.acta-panel-label { display: flex; align-items: center; gap: 7px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #7dd3fc; margin-bottom: 12px; }
.acta-list { display: flex; flex-direction: column; gap: 9px; max-height: 62vh; overflow-y: auto; padding-right: 4px; }
.acta-empty-list { font-size: 0.82rem; color: rgba(255,255,255,0.45); line-height: 1.5; padding: 8px 4px; }
.acta-list-item {
  text-align: left; width: 100%; padding: 12px 14px; border-radius: 14px; cursor: pointer;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); transition: all 0.2s;
}
.acta-list-item:hover { background: rgba(255,255,255,0.06); transform: translateY(-1px); }
.acta-list-item.active { background: linear-gradient(135deg, rgba(34,211,238,0.16), rgba(124,58,237,0.14)); border-color: rgba(94,234,212,0.4); box-shadow: 0 8px 20px rgba(6,182,212,0.18); }
.acta-li-title { font-size: 0.86rem; font-weight: 700; color: #f1f5f9; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acta-li-meta { display: flex; gap: 12px; font-size: 0.72rem; color: rgba(255,255,255,0.55); }
.acta-li-meta span { display: inline-flex; align-items: center; gap: 4px; }

/* Editor */
.acta-editor {
  background: linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.09); border-radius: 24px; padding: 26px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 22px 50px rgba(5,3,20,0.4);
}
.acta-field { margin-bottom: 18px; }
.acta-field > label { display: flex; align-items: center; gap: 6px; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
.acta-section-label.temas { color: #7dd3fc; }
.acta-section-label.propuesta { color: #fbbf24; }
.acta-section-label.acuerdos { color: #6ee7b7; }
/* Fila fecha/horas: se reacomoda sola; nunca queda apretada. */
.acta-row3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }

.acta-input, .acta-textarea {
  width: 100%; box-sizing: border-box; background: rgba(8,5,22,0.55);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px 14px;
  color: #fff; font-size: 0.9rem; font-family: 'Manrope', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
}
.acta-textarea { resize: vertical; line-height: 1.55; min-height: 96px; }
.acta-input:focus, .acta-textarea:focus { border-color: rgba(94,234,212,0.5); box-shadow: 0 0 0 3px rgba(45,212,191,0.12); }
.acta-input::placeholder, .acta-textarea::placeholder { color: rgba(255,255,255,0.35); }
.acta-input[type="date"] { color-scheme: dark; }
fieldset:disabled .acta-input, fieldset:disabled .acta-textarea, fieldset:disabled .acta-time-sel { opacity: 0.7; }

/* Selector de hora propio — desplegables con aspecto de botón, buen toque */
.acta-time { display: flex; align-items: center; gap: 7px; }
.acta-time-sel {
  flex: 1 1 0; min-width: 58px; box-sizing: border-box; -webkit-appearance: none; appearance: none;
  background: rgba(94,234,212,0.08); color: #fff; font-size: 1.1rem; font-weight: 800; font-family: 'Outfit', 'Manrope', sans-serif;
  border: 1px solid rgba(94,234,212,0.28); border-radius: 12px; padding: 13px 26px 13px 12px; cursor: pointer;
  text-align: center; text-align-last: center; outline: none; color-scheme: dark; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235eead4' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 9px center;
}
.acta-time-sel:hover { background: rgba(94,234,212,0.14); }
.acta-time-sel:focus { border-color: rgba(94,234,212,0.6); box-shadow: 0 0 0 3px rgba(45,212,191,0.14); }
.acta-time-sel option { background: #0c0822; color: #fff; }
.acta-time-colon { color: #5eead4; font-weight: 900; font-size: 1.2rem; }
.acta-time-suffix { color: rgba(255,255,255,0.55); font-size: 0.82rem; font-weight: 700; flex-shrink: 0; }

/* Participantes */
.acta-part-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 9px; }
.acta-part-chip {
  display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 12px; cursor: pointer; text-align: left;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.82);
  font-size: 0.84rem; font-weight: 600; transition: all 0.18s;
}
.acta-part-chip:hover { background: rgba(255,255,255,0.06); }
.acta-part-chip .acta-part-check {
  width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  border: 1.5px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.03); color: #041016;
}
.acta-part-chip.on { background: linear-gradient(135deg, rgba(45,212,191,0.18), rgba(56,189,248,0.14)); border-color: rgba(94,234,212,0.5); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.1); }
.acta-part-chip.on .acta-part-check { background: linear-gradient(135deg, #5eead4, #22d3ee); border-color: transparent; }

.acta-custom-row { display: flex; gap: 8px; margin-top: 10px; }
.acta-custom-input { flex: 1; display: flex; align-items: center; gap: 8px; padding: 0 12px; background: rgba(8,5,22,0.55); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: rgba(255,255,255,0.5); }
.acta-custom-input input { flex: 1; background: none; border: none; outline: none; color: #fff; font-size: 0.86rem; padding: 11px 0; font-family: 'Manrope', sans-serif; }
.acta-custom-input input::placeholder { color: rgba(255,255,255,0.35); }
.acta-custom-add { padding: 0 18px; border-radius: 12px; border: 1px solid rgba(94,234,212,0.35); background: rgba(45,212,191,0.12); color: #5eead4; font-weight: 700; font-size: 0.82rem; cursor: pointer; white-space: nowrap; }
.acta-custom-add:hover { background: rgba(45,212,191,0.2); }
.acta-custom-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.acta-custom-tag { display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px 6px 12px; border-radius: 100px; background: rgba(124,58,237,0.18); border: 1px solid rgba(139,92,246,0.35); color: #ddd6fe; font-size: 0.8rem; font-weight: 600; }
.acta-custom-tag button { display: flex; background: rgba(255,255,255,0.1); border: none; border-radius: 50%; width: 18px; height: 18px; align-items: center; justify-content: center; color: #fff; cursor: pointer; padding: 0; }

/* Acciones */
.acta-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,0.08); }
.acta-act { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 13px; border: none; font-weight: 800; font-size: 0.86rem; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; font-family: 'Manrope', sans-serif; }
.acta-act:hover { transform: translateY(-2px); }
.acta-act.primary { background: linear-gradient(135deg, #10b981, #059669); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 20px rgba(16,185,129,0.4); }
.acta-act.pdf { background: linear-gradient(135deg, #f43f5e, #b91c1c); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 20px rgba(239,68,68,0.35); }
.acta-act.img { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 20px rgba(109,40,217,0.4); }
.acta-act.danger { background: rgba(255,255,255,0.05); border: 1px solid rgba(239,68,68,0.35); color: #fca5a5; margin-left: auto; }
.acta-act.danger:hover { background: rgba(239,68,68,0.15); }
.acta-act:disabled { opacity: 0.65; cursor: default; transform: none; }
.acta-spin { animation: acta-spin 0.9s linear infinite; }
@keyframes acta-spin { to { transform: rotate(360deg); } }

/* Modal de previsualización */
.acta-preview-overlay {
  position: fixed; inset: 0; z-index: 4000; display: flex; align-items: center; justify-content: center;
  padding: 20px; background: rgba(4,2,14,0.7); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
}
.acta-preview-card {
  width: 100%; max-width: 560px; max-height: 92vh; display: flex; flex-direction: column;
  background: linear-gradient(160deg, rgba(26,18,54,0.96), rgba(10,7,26,0.98));
  border: 1px solid rgba(255,255,255,0.12); border-radius: 24px; padding: 18px;
  box-shadow: 0 40px 90px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12);
}
.acta-preview-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.acta-preview-title { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 0.92rem; color: #fff; }
.acta-preview-close { display: flex; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); color: #e9e2ff; cursor: pointer; }
.acta-preview-close:hover { background: rgba(239,68,68,0.85); color: #fff; }
.acta-preview-imgwrap {
  flex: 1; min-height: 0; overflow-y: auto; border-radius: 16px; background: #05030f;
  border: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: center;
}
.acta-preview-imgwrap img { width: 100%; height: auto; display: block; border-radius: 16px; }
.acta-preview-hint { text-align: center; font-size: 0.8rem; color: rgba(255,255,255,0.55); margin: 12px 0; }
.acta-preview-actions { display: flex; gap: 10px; }
.acta-preview-actions .acta-act { flex: 1; justify-content: center; }
.acta-act.share { background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 20px rgba(37,211,102,0.4); }
.acta-act.download { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 20px rgba(109,40,217,0.4); }
@media (max-width: 480px) { .acta-preview-actions { flex-direction: column; } }

.acta-list::-webkit-scrollbar { width: 6px; }
.acta-list::-webkit-scrollbar-thumb { background: rgba(94,234,212,0.25); border-radius: 10px; }

/* Responsive — iPad y menores usan una sola columna a todo el ancho */
@media (max-width: 1080px) {
  .acta-grid { grid-template-columns: 1fr; gap: 16px; }
  .acta-list-panel { position: relative; top: 0; }
  .acta-list { max-height: 200px; flex-direction: row; overflow-x: auto; overflow-y: hidden; }
  .acta-list-item { min-width: 230px; }
}
@media (max-width: 560px) {
  .acta-root { padding-left: 14px; padding-right: 14px; }
  .acta-editor { padding: 18px; }
  .acta-row3 { grid-template-columns: 1fr; }
  .acta-btn-new { width: 100%; justify-content: center; }
  .acta-act { flex: 1; justify-content: center; }
  .acta-act.danger { margin-left: 0; }
  .acta-part-grid { grid-template-columns: 1fr; }
}
`;

export default ActaGlobalizacionView;
