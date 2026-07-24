import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Plus, Trash2, Calendar, Palette, Layers, RefreshCw, CheckCircle2
} from 'lucide-react';
import type { ProjectsConfigData, ProjectConfig, ProjectPhase } from '../types';

interface ProjectConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  level: '1M' | '2M';
  trim: 't1' | 't2' | 't3';
  projectsConfig: ProjectsConfigData;
  onSave: (newConfig: ProjectsConfigData) => void;
  isSaving: boolean;
}

const TRIM_LABELS: Record<string, string> = { t1: 'Trimestre 1 · STEAM', t2: 'Trimestre 2 · SAE', t3: 'Trimestre 3 · Transversal' };
const LEVEL_LABELS: Record<string, string> = { '1M': '1° Medios', '2M': '2° Medios' };

const COLORS = [
  { name: 'Violeta',   value: '#06b6d4' },
  { name: 'Índigo',    value: '#06b6d4' },
  { name: 'Azul',      value: '#3B82F6' },
  { name: 'Cian',      value: '#06B6D4' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Lima',      value: '#84CC16' },
  { name: 'Ámbar',     value: '#F59E0B' },
  { name: 'Naranja',   value: '#F97316' },
  { name: 'Rosa',      value: '#EC4899' },
  { name: 'Rojo',      value: '#EF4444' },
];

const DEFAULT_PHASES: Record<string, ProjectPhase[]> = {
  'ABP': [
    { name: 'Lanzamiento e Identificación', startClass: 1, endClass: 6, startDate: '', endDate: '', color: '#06b6d4' },
    { name: 'Investigación Activa', startClass: 7, endClass: 13, startDate: '', endDate: '', color: '#3B82F6' },
    { name: 'Desarrollo y Crítica de Pares', startClass: 14, endClass: 22, startDate: '', endDate: '', color: '#F59E0B' },
    { name: 'Exposición Pública y Reflexión', startClass: 23, endClass: 30, startDate: '', endDate: '', color: '#10B981' },
  ],
  'Design Thinking': [
    { name: 'Empatizar y Definir', startClass: 1, endClass: 5, startDate: '', endDate: '', color: '#EC4899' },
    { name: 'Idear', startClass: 6, endClass: 11, startDate: '', endDate: '', color: '#F97316' },
    { name: 'Prototipar', startClass: 12, endClass: 20, startDate: '', endDate: '', color: '#3B82F6' },
    { name: 'Evaluar y Testear', startClass: 21, endClass: 28, startDate: '', endDate: '', color: '#10B981' },
  ],
  'HTH': [
    { name: 'La Pregunta Esencial', startClass: 1, endClass: 5, startDate: '', endDate: '', color: '#F59E0B' },
    { name: 'Trabajo de Campo', startClass: 6, endClass: 12, startDate: '', endDate: '', color: '#EC4899' },
    { name: 'Borradores Múltiples', startClass: 13, endClass: 20, startDate: '', endDate: '', color: '#06b6d4' },
    { name: 'Celebración del Aprendizaje', startClass: 21, endClass: 28, startDate: '', endDate: '', color: '#10B981' },
  ],
  'Personalizado': [
    { name: 'Fase Inicial', startClass: 1, endClass: 10, startDate: '', endDate: '', color: '#06b6d4' },
  ],
};

const emptyProject = (level: string, trim: string): ProjectConfig => ({
  id: `${trim}_${level.toLowerCase()}`,
  name: '',
  methodology: 'ABP',
  phases: JSON.parse(JSON.stringify(DEFAULT_PHASES['ABP'])),
});

export default function ProjectConfigDrawer({
  isOpen, onClose, level, trim, projectsConfig, onSave, isSaving
}: ProjectConfigDrawerProps) {
  const [local, setLocal] = useState<ProjectConfig>(emptyProject(level, trim));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = projectsConfig?.[level]?.[trim];
    setLocal(existing ? JSON.parse(JSON.stringify(existing)) : emptyProject(level, trim));
    setSaved(false);
  }, [isOpen, level, trim, projectsConfig]);

  const handleMethodologyChange = (m: string) => {
    setLocal(prev => ({
      ...prev,
      methodology: m as any,
      phases: JSON.parse(JSON.stringify(DEFAULT_PHASES[m] || [])),
    }));
  };

  const handlePhase = (idx: number, field: keyof ProjectPhase, val: any) => {
    setLocal(prev => {
      const phases = [...prev.phases];
      phases[idx] = { ...phases[idx], [field]: val };
      return { ...prev, phases };
    });
  };

  const addPhase = () => {
    setLocal(prev => {
      const last = prev.phases[prev.phases.length - 1];
      const start = last ? last.endClass + 1 : 1;
      return {
        ...prev,
        phases: [...prev.phases, {
          name: `Fase ${prev.phases.length + 1}`,
          startClass: start, endClass: start + 5,
          startDate: '', endDate: '',
          color: COLORS[prev.phases.length % COLORS.length].value,
        }],
      };
    });
  };

  const removePhase = (idx: number) => {
    setLocal(prev => ({ ...prev, phases: prev.phases.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    const updated: ProjectsConfigData = JSON.parse(JSON.stringify(projectsConfig || {}));
    if (!updated[level]) updated[level] = { t1: {} as any, t2: {} as any, t3: {} as any };
    updated[level][trim] = local;
    onSave(updated);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1400);
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
    color: '#f1f5f9', fontSize: '0.83rem', fontWeight: 600, outline: 'none',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  };

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.64rem', fontWeight: 800,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)', zIndex: 9990,
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', maxWidth: '95vw',
              background: 'linear-gradient(160deg, rgba(15,10,35,0.98) 0%, rgba(8,4,20,0.99) 100%)',
              backdropFilter: 'blur(30px)',
              borderLeft: '1px solid rgba(6, 182, 212,0.2)',
              zIndex: 9991, display: 'flex', flexDirection: 'column',
              fontFamily: 'Inter, sans-serif', color: '#f1f5f9',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px 24px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: 'rgba(6, 182, 212,0.15)', border: '1px solid rgba(6, 182, 212,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee',
                  }}>
                    <Layers size={17} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#22d3ee', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {LEVEL_LABELS[level]} · {TRIM_LABELS[trim]}
                    </p>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Configurar Proyecto</h2>
                  </div>
                </div>
              </div>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: '#64748b', cursor: 'pointer',
                padding: '7px', display: 'flex', alignItems: 'center',
              }}>
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Nombre */}
              <div>
                <label style={lbl}>Nombre del Proyecto</label>
                <input
                  style={inp} type="text"
                  placeholder="Ej. Proyecto STEAM: Energías del Futuro"
                  value={local.name}
                  onChange={e => setLocal(p => ({ ...p, name: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = 'rgba(6, 182, 212,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              {/* Metodología */}
              <div>
                <label style={lbl}>Metodología</label>
                <select
                  value={local.methodology}
                  onChange={e => handleMethodologyChange(e.target.value)}
                  style={{ ...inp, appearance: 'none' }}
                >
                  <option value="ABP">ABP — Aprendizaje Basado en Proyectos</option>
                  <option value="Design Thinking">Design Thinking</option>
                  <option value="HTH">HTH — High Tech High</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>

              {/* Fases */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label style={{ ...lbl, marginBottom: 0 }}>
                    Fases del Proyecto ({local.phases.length})
                  </label>
                  <button onClick={addPhase} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: 'rgba(6, 182, 212,0.12)', border: '1px solid rgba(6, 182, 212,0.25)',
                    borderRadius: '8px', padding: '5px 10px', color: '#22d3ee',
                    fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                    <Plus size={13} /> Fase
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {local.phases.map((phase, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderLeft: `3px solid ${phase.color}`,
                      border: `1px solid rgba(255,255,255,0.07)`,
                      borderLeftWidth: '3px',
                      borderRadius: '10px', padding: '12px',
                      display: 'flex', flexDirection: 'column', gap: '10px',
                    }}>
                      {/* Nombre fase + Borrar */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          style={{ ...inp, flex: 1 }} type="text"
                          placeholder={`Fase ${idx + 1}`}
                          value={phase.name}
                          onChange={e => handlePhase(idx, 'name', e.target.value)}
                        />
                        <button onClick={() => removePhase(idx)} style={{
                          padding: '7px', background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
                          color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        }}>
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Clases + Color */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ ...lbl, fontSize: '0.58rem' }}>Clase Inicio</label>
                          <input style={inp} type="number" min={1}
                            value={phase.startClass}
                            onChange={e => handlePhase(idx, 'startClass', parseInt(e.target.value) || 1)} />
                        </div>
                        <div>
                          <label style={{ ...lbl, fontSize: '0.58rem' }}>Clase Fin</label>
                          <input style={inp} type="number" min={1}
                            value={phase.endClass}
                            onChange={e => handlePhase(idx, 'endClass', parseInt(e.target.value) || 1)} />
                        </div>
                        <div>
                          <label style={{ ...lbl, fontSize: '0.58rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Palette size={10} /> Color
                          </label>
                          <select value={phase.color}
                            onChange={e => handlePhase(idx, 'color', e.target.value)}
                            style={{ ...inp, padding: '8px 6px', appearance: 'none' }}>
                            {COLORS.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Fechas */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ ...lbl, fontSize: '0.58rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Calendar size={10} /> Fecha Inicio
                          </label>
                          <input style={inp} type="date"
                            value={phase.startDate}
                            onChange={e => handlePhase(idx, 'startDate', e.target.value)} />
                        </div>
                        <div>
                          <label style={{ ...lbl, fontSize: '0.58rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Calendar size={10} /> Fecha Término
                          </label>
                          <input style={inp} type="date"
                            value={phase.endDate}
                            onChange={e => handlePhase(idx, 'endDate', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', gap: '10px',
            }}>
              <button onClick={onClose} style={{
                flex: 1, padding: '11px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#94a3b8', fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !local.name.trim()}
                style={{
                  flex: 2, padding: '11px', borderRadius: '10px',
                  background: saved
                    ? 'linear-gradient(135deg,#10b981,#059669)'
                    : 'linear-gradient(135deg,#06b6d4,#0d9488)',
                  border: 'none', color: 'white',
                  fontSize: '0.83rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  opacity: !local.name.trim() ? 0.5 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(6, 182, 212,0.3)',
                }}
              >
                {saved ? <><CheckCircle2 size={15} /> ¡Guardado!</> :
                 isSaving ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sincronizando...</> :
                 <><Save size={15} /> Guardar y Sincronizar</>}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
