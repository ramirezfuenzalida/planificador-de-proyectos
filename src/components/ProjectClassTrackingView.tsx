import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Link2, FileText, ClipboardList, CheckCircle2,
  Save, X, ExternalLink, ChevronRight, Info, Pencil
} from 'lucide-react';
import type { ProjectsConfigData, ProjectConfig, ProjectPhase } from '../types';

interface ProjectClassTrackingViewProps {
  level: '1M' | '2M';
  trim: 't1' | 't2' | 't3';
  projectsConfig: ProjectsConfigData;
  planningConfig: Record<string, any>;
  onSavePlanning: (newPlanning: Record<string, any>) => void;
  onBack: () => void;
  isAdmin: boolean;
  onEditProject?: () => void;
}

const TRIM_NAMES: Record<string, string> = {
  t1: 'STEAM', t2: 'SAE', t3: 'Transversal'
};
const LEVEL_NAMES: Record<string, string> = {
  '1M': '1° Medios', '2M': '2° Medios'
};

interface ClassPlan {
  objective: string;
  description: string;
  canvasUrl: string;
  pptxUrl: string;
  notes: string;
}

const emptyPlan = (): ClassPlan => ({
  objective: '', description: '', canvasUrl: '', pptxUrl: '', notes: ''
});

function getPhaseForClass(phases: ProjectPhase[], classNum: number): ProjectPhase | null {
  return phases.find(p => classNum >= p.startClass && classNum <= p.endClass) || null;
}

function getTotalClasses(phases: ProjectPhase[]): number {
  if (!phases.length) return 0;
  return Math.max(...phases.map(p => p.endClass));
}

export default function ProjectClassTrackingView({
  level, trim, projectsConfig, planningConfig, onSavePlanning,
  onBack, isAdmin, onEditProject
}: ProjectClassTrackingViewProps) {

  const project: ProjectConfig | null = projectsConfig?.[level]?.[trim] || null;
  const planKey = `${level}_${trim}`;

  const [modalClassNum, setModalClassNum] = useState<number | null>(null);
  const [modalTab, setModalTab] = useState<'planning' | 'tracking'>('planning');
  const [localPlan, setLocalPlan] = useState<ClassPlan>(emptyPlan());
  const [isSaving, setIsSaving] = useState(false);
  const [savedClass, setSavedClass] = useState<number | null>(null);

  const planningData: Record<number, ClassPlan> = useMemo(() => {
    return planningConfig?.[planKey] || {};
  }, [planningConfig, planKey]);

  const totalClasses = project ? getTotalClasses(project.phases) : 0;
  const classes = Array.from({ length: totalClasses }, (_, i) => i + 1);

  const openModal = (classNum: number) => {
    setModalClassNum(classNum);
    setLocalPlan(planningData[classNum] ? { ...emptyPlan(), ...planningData[classNum] } : emptyPlan());
    setModalTab('planning');
  };

  const handleSavePlan = () => {
    setIsSaving(true);
    const updated = {
      ...planningConfig,
      [planKey]: {
        ...(planningConfig?.[planKey] || {}),
        [modalClassNum!]: localPlan,
      }
    };
    onSavePlanning(updated);
    setSavedClass(modalClassNum);
    setTimeout(() => {
      setIsSaving(false);
      setSavedClass(null);
    }, 1400);
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '10px',
    border: '1px solid #e2e8f0', background: '#f8fafc',
    color: '#1e293b', fontSize: '0.84rem', fontWeight: 500, outline: 'none',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
  };

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.68rem', fontWeight: 800,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px',
  };

  if (!project) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'Inter, sans-serif', gap: '16px',
        background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '20px',
          background: 'rgba(6, 182, 212,0.08)', border: '1px solid rgba(6, 182, 212,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4',
        }}>
          <BookOpen size={32} />
        </div>
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
          Proyecto sin configurar
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', textAlign: 'center', maxWidth: '320px' }}>
          {isAdmin
            ? 'Ve al Panel de Administración → Estructura de Proyectos para configurar este proyecto.'
            : 'El administrador aún no ha configurado este proyecto. Consulta con tu coordinador.'}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onBack} style={{
            padding: '10px 20px', borderRadius: '10px',
            background: 'rgba(6, 182, 212,0.08)', border: '1px solid rgba(6, 182, 212,0.2)',
            color: '#06b6d4', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <ArrowLeft size={15} /> Volver
          </button>
          {isAdmin && onEditProject && (
            <button onClick={onEditProject} style={{
              padding: '10px 20px', borderRadius: '10px',
              background: 'linear-gradient(135deg,#06b6d4,#0d9488)',
              border: 'none', color: 'white', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Pencil size={15} /> Configurar ahora
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentPhase = getPhaseForClass(project.phases, 1); // could be dynamic

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── CABECERA ── */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '20px 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onBack} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '10px',
            background: 'rgba(100,116,139,0.07)', border: '1px solid rgba(100,116,139,0.15)',
            color: '#475569', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          }}>
            <ArrowLeft size={14} /> Volver
          </button>

          <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: `${currentPhase?.color || '#06b6d4'}15`,
              border: `1px solid ${currentPhase?.color || '#06b6d4'}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: currentPhase?.color || '#06b6d4',
            }}>
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 800, color: currentPhase?.color || '#06b6d4',
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  background: `${currentPhase?.color || '#06b6d4'}12`,
                  padding: '2px 8px', borderRadius: '20px',
                }}>
                  {LEVEL_NAMES[level]} · {TRIM_NAMES[trim]}
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                {project.name}
              </h1>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                {project.methodology} · {totalClasses} clases · {project.phases.length} fases
              </p>
            </div>
          </div>
        </div>

        {isAdmin && onEditProject && (
          <button onClick={onEditProject} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 16px', borderRadius: '10px',
            background: 'rgba(6, 182, 212,0.08)', border: '1px solid rgba(6, 182, 212,0.2)',
            color: '#14b8a6', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          }}>
            <Pencil size={14} /> Editar Estructura
          </button>
        )}
      </div>

      <div style={{ padding: '24px 28px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* ── TIMELINE DE FASES ── */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '18px 20px',
          marginBottom: '24px', border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Fases del Proyecto
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {project.phases.map((phase, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: `${phase.color}10`, border: `1px solid ${phase.color}30`,
                borderLeft: `3px solid ${phase.color}`, borderRadius: '8px',
                padding: '8px 12px', flex: '1 1 180px', minWidth: '160px',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 800, color: phase.color }}>
                    Fase {idx + 1}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                    {phase.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.67rem', color: '#64748b' }}>
                    Clases {phase.startClass}–{phase.endClass}
                    {phase.startDate && ` · ${phase.startDate}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── GRILLA DE CLASES ── */}
        <div style={{
          background: 'white', borderRadius: '16px', padding: '20px',
          border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                Planificación de Clases
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Haz click en cualquier clase para planificar o registrar seguimiento
              </p>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(100,116,139,0.06)', borderRadius: '8px', padding: '6px 12px',
              fontSize: '0.72rem', fontWeight: 700, color: '#64748b',
            }}>
              <Info size={12} />
              {Object.keys(planningData).length} / {totalClasses} planificadas
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '10px',
          }}>
            {classes.map(classNum => {
              const phase = getPhaseForClass(project.phases, classNum);
              const hasPlan = !!planningData[classNum]?.objective;
              const color = phase?.color || '#94a3b8';

              return (
                <motion.button
                  key={classNum}
                  onClick={() => openModal(classNum)}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                    border: `1px solid ${color}30`,
                    background: hasPlan ? `${color}12` : 'rgba(248,250,252,1)',
                    borderTop: `3px solid ${color}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    transition: 'box-shadow 0.2s',
                    boxShadow: hasPlan ? `0 4px 12px ${color}18` : '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 800, color: color,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    Clase
                  </span>
                  <span style={{
                    fontSize: '1.5rem', fontWeight: 900, color: hasPlan ? color : '#94a3b8',
                    lineHeight: 1,
                  }}>
                    {classNum}
                  </span>
                  {hasPlan ? (
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 700, color: color,
                      background: `${color}18`, padding: '2px 7px', borderRadius: '20px',
                    }}>
                      Planificada
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 600, color: '#94a3b8',
                    }}>
                      Sin planif.
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MODAL DE CLASE ── */}
      <AnimatePresence>
        {modalClassNum !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModalClassNum(null)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(6px)', zIndex: 9980,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%', maxWidth: '560px', maxHeight: '90vh',
                background: 'white', borderRadius: '20px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.18)',
                zIndex: 9981, display: 'flex', flexDirection: 'column',
                fontFamily: 'Inter, sans-serif', overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              {(() => {
                const phase = getPhaseForClass(project.phases, modalClassNum!);
                const color = phase?.color || '#06b6d4';
                return (
                  <div style={{
                    padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9',
                    background: `linear-gradient(135deg, ${color}08 0%, white 100%)`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: `${color}15`, border: `1px solid ${color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: color, fontWeight: 900, fontSize: '1rem',
                        }}>
                          {modalClassNum}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 800, color: color, textTransform: 'uppercase' }}>
                            {phase?.name || 'Clase'}
                          </p>
                          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                            Clase {modalClassNum} · {project.name}
                          </h3>
                        </div>
                      </div>
                      <button onClick={() => setModalClassNum(null)} style={{
                        padding: '7px', background: 'rgba(100,116,139,0.08)',
                        border: '1px solid rgba(100,116,139,0.15)', borderRadius: '8px',
                        color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      }}>
                        <X size={16} />
                      </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '14px', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
                      {(['planning', 'tracking'] as const).map(tab => (
                        <button key={tab} onClick={() => setModalTab(tab)} style={{
                          flex: 1, padding: '7px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          background: modalTab === tab ? 'white' : 'transparent',
                          color: modalTab === tab ? color : '#64748b',
                          fontSize: '0.78rem', fontWeight: 700,
                          boxShadow: modalTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                          transition: 'all 0.15s',
                        }}>
                          {tab === 'planning' ? <><ClipboardList size={13} /> Planificación</> : <><CheckCircle2 size={13} /> Seguimiento</>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Modal Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
                {modalTab === 'planning' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={lbl}>Objetivo de la Clase</label>
                      <textarea
                        rows={2} style={{ ...inp, resize: 'vertical' }}
                        placeholder="¿Qué aprenderán los estudiantes en esta clase?"
                        value={localPlan.objective}
                        onChange={e => setLocalPlan(p => ({ ...p, objective: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Descripción / Actividades</label>
                      <textarea
                        rows={3} style={{ ...inp, resize: 'vertical' }}
                        placeholder="Describe las actividades y metodología de la clase..."
                        value={localPlan.description}
                        onChange={e => setLocalPlan(p => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Link2 size={10} /> Enlace Canvas
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            style={inp} type="url"
                            placeholder="https://canvas...."
                            value={localPlan.canvasUrl}
                            onChange={e => setLocalPlan(p => ({ ...p, canvasUrl: e.target.value }))}
                          />
                          {localPlan.canvasUrl && (
                            <a href={localPlan.canvasUrl} target="_blank" rel="noreferrer" style={{
                              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                              color: '#3b82f6',
                            }}>
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                      <div>
                        <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FileText size={10} /> Enlace PPTX
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            style={inp} type="url"
                            placeholder="https://docs.google..."
                            value={localPlan.pptxUrl}
                            onChange={e => setLocalPlan(p => ({ ...p, pptxUrl: e.target.value }))}
                          />
                          {localPlan.pptxUrl && (
                            <a href={localPlan.pptxUrl} target="_blank" rel="noreferrer" style={{
                              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                              color: '#06b6d4',
                            }}>
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label style={lbl}>Notas del Docente</label>
                      <textarea
                        rows={2} style={{ ...inp, resize: 'vertical' }}
                        placeholder="Notas internas, recordatorios, materiales extra..."
                        value={localPlan.notes}
                        onChange={e => setLocalPlan(p => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '40px 20px', gap: '12px', textAlign: 'center',
                  }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '16px',
                      background: 'rgba(6, 182, 212,0.08)', border: '1px solid rgba(6, 182, 212,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4',
                    }}>
                      <CheckCircle2 size={26} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                      Seguimiento Formativo
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', maxWidth: '280px' }}>
                      El seguimiento formativo de cada clase se registra en la sección <strong>Seguimiento Formativo</strong> del menú principal, filtrando por proyecto.
                    </p>
                    <button
                      onClick={() => setModalClassNum(null)}
                      style={{
                        marginTop: '8px', padding: '9px 18px', borderRadius: '10px',
                        background: 'rgba(6, 182, 212,0.08)', border: '1px solid rgba(6, 182, 212,0.2)',
                        color: '#14b8a6', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      Ir al Seguimiento <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {modalTab === 'planning' && (
                <div style={{
                  padding: '14px 20px', borderTop: '1px solid #f1f5f9',
                  display: 'flex', gap: '10px',
                }}>
                  <button onClick={() => setModalClassNum(null)} style={{
                    flex: 1, padding: '10px', borderRadius: '10px',
                    background: 'rgba(100,116,139,0.07)', border: '1px solid rgba(100,116,139,0.15)',
                    color: '#475569', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                    Cerrar
                  </button>
                  <button onClick={handleSavePlan} disabled={isSaving} style={{
                    flex: 2, padding: '10px', borderRadius: '10px',
                    background: savedClass === modalClassNum
                      ? 'linear-gradient(135deg,#10b981,#059669)'
                      : 'linear-gradient(135deg,#06b6d4,#0d9488)',
                    border: 'none', color: 'white',
                    fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                    boxShadow: '0 4px 12px rgba(6, 182, 212,0.25)',
                    transition: 'all 0.2s',
                  }}>
                    {savedClass === modalClassNum
                      ? <><CheckCircle2 size={14} /> ¡Guardado!</>
                      : <><Save size={14} /> Guardar Clase {modalClassNum}</>}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
