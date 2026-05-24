import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  X, 
  User, 
  FileDown, 
  TrendingUp, 
  BookOpen, 
  Calendar,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { exportStudentPDF } from '../utils/pdfGenerator';

interface HistoryItem {
  classId: string;
  date: string;
  status: 'green' | 'yellow' | 'red' | 'none';
}

interface StudentData {
  name: string;
  role: string;
  groupId: number;
  history: HistoryItem[];
  proposed: number | null;
  grade: string;
  comment: string;
  counts: { green: number; yellow: number; red: number };
  evalKey: string;
}

interface StudentDetailModalProps {
  student: StudentData;
  courseTag: string;
  selectedCourse: string;
  levelClasses: any[];
  onClose: () => void;
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  courseTag,
  selectedCourse,
  levelClasses,
  onClose
}) => {
  const [classObservations, setClassObservations] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('zenit_observations');
    if (saved) {
      try {
        setClassObservations(JSON.parse(saved));
      } catch (e) {
        console.error('No se pudieron leer las observaciones del localStorage', e);
      }
    }
  }, []);

  // 1. Calcular Datos del Gráfico SVG
  const historyList = [...student.history].sort((a, b) => parseInt(a.classId) - parseInt(b.classId));
  const chartWidth = Math.max(600, historyList.length * 80 + 160);
  const chartHeight = 180;
  
  // Mapear estados a alturas del eje Y (Green = arriba, Yellow = centro, Red = base)
  const getY = (status: string) => {
    if (status === 'green') return 35;
    if (status === 'yellow') return 90;
    if (status === 'red') return 145;
    return 90; // Default/none
  };

  const getPoints = () => {
    return historyList.map((h, index) => ({
      x: 130 + index * 80,
      y: getY(h.status),
      classId: h.classId,
      date: h.date,
      status: h.status
    }));
  };

  const points = getPoints();

  // Generar cadena del path para la línea del gráfico (línea suavizada o directa)
  const getLinePath = () => {
    if (points.length === 0) return '';
    return points.reduce((path, p, index) => {
      return index === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
    }, '');
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Pequeño retardo para dar feedback visual con spinner
      await new Promise(resolve => setTimeout(resolve, 800));
      exportStudentPDF(student, courseTag, levelClasses);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay-cosmic"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="modal-content-premium student-dashboard-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '850px', width: '92%' }}
      >
        {/* Barra superior de arrastre en móvil */}
        <div className="modal-sheet-handle"></div>

        <button className="modal-close-btn-pro" onClick={onClose} title="Cerrar Ficha">
          <X size={24} />
        </button>

        {/* ── CABECERA DE LA FICHA ── */}
        <div className="modal-header-compact student-modal-header">
          <div className="modal-header-left" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.25)'
            }}>
              <User size={24} />
            </div>
            <div className="modal-header-info">
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
                {student.name}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
                Curso: <span style={{ color: '#8B5CF6' }}>{selectedCourse}</span> • Rol: <span style={{ color: '#6366F1' }}>{student.role}</span> • Grupo: <span style={{ color: '#10B981' }}>Equipo N° {student.groupId}</span>
              </p>
            </div>
          </div>
          
          <button 
            className="save-revision-btn-premium export-pdf-btn" 
            onClick={handleExportPDF}
            disabled={isExporting}
            style={{
              padding: '0.55rem 1.1rem',
              height: 'auto',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              marginLeft: 'auto'
            }}
          >
            <FileDown size={15} className={isExporting ? "spin-icon" : ""} />
            <span>{isExporting ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
          </button>
        </div>

        <div className="modal-scroll-area" style={{ maxHeight: '72vh', paddingRight: '4px' }}>
          <div className="modal-vertical-stack" style={{ gap: '1.5rem' }}>
            
            {/* ── CARD SECCIÓN 1: SCORECARDS / MÉTRICAS ── */}
            <div className="stats-scorecards-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              width: '100%'
            }}>
              <div className="stat-card-item purple">
                <span className="sc-label">Clases Totales</span>
                <strong className="sc-val">{student.history.length}</strong>
              </div>
              <div className="stat-card-item green">
                <span className="sc-label">Logrados (L)</span>
                <strong className="sc-val">{student.counts.green}</strong>
              </div>
              <div className="stat-card-item yellow">
                <span className="sc-label">Por Lograr (PL)</span>
                <strong className="sc-val">{student.counts.yellow}</strong>
              </div>
              <div className="stat-card-item red">
                <span className="sc-label">No Logrados (NL)</span>
                <strong className="sc-val">{student.counts.red}</strong>
              </div>
              <div className="stat-card-item proposed">
                <span className="sc-label">Nota Propuesta</span>
                <strong className="sc-val">{student.proposed || '—'}</strong>
              </div>
              <div className="stat-card-item grade">
                <span className="sc-label">Calificación</span>
                <strong className="sc-val" style={{ color: student.grade ? '#10B981' : '#f59e0b' }}>
                  {student.grade || 'Pend.'}
                </strong>
              </div>
            </div>

            {/* ── CARD SECCIÓN 2: GRÁFICO LINEAL DE PROGRESO ── */}
            <div className="premium-card-section">
              <h4 className="section-header-modern" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', fontWeight: 800, color: '#4b5563', marginBottom: '1rem' }}>
                <TrendingUp size={18} color="#8B5CF6" />
                Gráfico Lineal de Evolución Temporal (Eje de Hitos)
              </h4>
              
              {historyList.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  border: '1px dashed #e2e8f0'
                }}>
                  <AlertTriangle size={24} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                  No se registran hitos evaluados para trazar el gráfico de evolución.
                </div>
              ) : (
                <div className="horizontal-chart-scroll-wrapper" style={{
                  overflowX: 'auto',
                  background: '#f8fafc',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  padding: '1rem 0',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <svg width={chartWidth} height={chartHeight} style={{ display: 'block', margin: '0 auto' }}>
                    <defs>
                      {/* Degradado para la línea */}
                      <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="50%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                      
                      {/* Sombra de brillo en la línea */}
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#8B5CF6" floodOpacity="0.15" />
                      </filter>
                    </defs>

                    {/* Líneas de Guía de Eje Y (Gridlines) */}
                    <line x1="120" y1="35" x2={chartWidth - 30} y2="35" stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
                    <line x1="120" y1="90" x2={chartWidth - 30} y2="90" stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
                    <line x1="120" y1="145" x2={chartWidth - 30} y2="145" stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />

                    {/* Etiquetas Eje Y */}
                    <text x="115" y="40" fill="#10b981" fontSize="10.5" fontWeight="900" textAnchor="end">L (Logrado)</text>
                    <text x="115" y="94" fill="#f59e0b" fontSize="10.5" fontWeight="900" textAnchor="end">PL (En Des.)</text>
                    <text x="115" y="149" fill="#ef4444" fontSize="10.5" fontWeight="900" textAnchor="end">NL (No Log.)</text>

                    {/* La Línea de Conexión de Hitos */}
                    {points.length > 1 && (
                      <path d={getLinePath()} fill="none" stroke="url(#line-grad)" strokeWidth="3.5" filter="url(#glow)" strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {/* Puntos de Datos y Etiquetas */}
                    {points.map((p, idx) => {
                      const color = p.status === 'green' ? '#10b981' : p.status === 'yellow' ? '#f59e0b' : '#ef4444';
                      const strokeColor = p.status === 'green' ? '#dcfce7' : p.status === 'yellow' ? '#fef3c7' : '#fee2e2';
                      return (
                        <g key={idx}>
                          {/* Círculo del Punto */}
                          <circle cx={p.x} cy={p.y} r="8" fill={color} stroke={strokeColor} strokeWidth="3" style={{ cursor: 'pointer', transition: 'all 0.2s' }} />
                          <circle cx={p.x} cy={p.y} r="3" fill="#ffffff" />

                          {/* Etiqueta del Número de Clase arriba */}
                          <text x={p.x} y={p.y - 14} fill="#1e293b" fontSize="9" fontWeight="900" textAnchor="middle">
                            Clase {p.classId}
                          </text>

                          {/* Etiqueta de la Fecha abajo */}
                          <text x={p.x} y={170} fill="#94a3b8" fontSize="8.5" fontWeight="700" textAnchor="middle">
                            {p.date}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>

            {/* ── CARD SECCIÓN 3: MURO CRONOLÓGICO DE OBSERVACIONES DOCENTES ── */}
            <div className="premium-card-section">
              <h4 className="section-header-modern" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem', fontWeight: 800, color: '#4b5563', marginBottom: '1.25rem' }}>
                <BookOpen size={18} color="#8B5CF6" />
                Muro Cronológico de Observaciones Docentes
              </h4>

              <div className="observations-timeline-wall" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {/* 1. Comentario Actitudinal / Retroalimentación Global del Alumno */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.06) 100%)',
                  border: '1px solid rgba(139,92,246,0.18)',
                  borderRadius: '16px',
                  padding: '1rem 1.25rem',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Sparkles size={14} color="#8B5CF6" />
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, color: '#8B5CF6' }}>
                      RETROALIMENTACIÓN GLOBAL DE APRENDIZAJE
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', margin: 0, color: '#374151', lineHeight: 1.45, fontWeight: 600 }}>
                    {student.comment || 'Sin comentarios globales registrados aún por el docente.'}
                  </p>
                </div>

                {/* 2. Listado de observaciones técnicas por clase del Sheet / Grupo */}
                {historyList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No hay bitácoras de clases disponibles.
                  </div>
                ) : (
                  historyList.map((h) => {
                    const obsKey = `${selectedCourse}-${h.classId}`;
                    const classObs = classObservations[obsKey];
                    const classData = levelClasses.find(c => String(c.clase) === String(h.classId));
                    const objetivo = classData ? classData.objetivo : 'Hito formativo de la sesión de ABP';
                    
                    const statusColor = h.status === 'green' ? 'green' : h.status === 'yellow' ? 'yellow' : h.status === 'red' ? 'red' : 'none';
                    const statusLabel = h.status === 'green' ? 'Logrado' : h.status === 'yellow' ? 'En Desarrollo' : h.status === 'red' ? 'No Logrado' : 'Sin Evaluar';

                    return (
                      <div key={h.classId} className={`observation-card-premium ${statusColor}-accent`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6d28d9', background: 'rgba(139,92,246,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                              Clase N° {h.classId}
                            </span>
                            <span className={`badge-status-pill ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {h.date}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '0.78rem', margin: '4px 0', color: '#475569', lineHeight: 1.4 }}>
                          <strong>Objetivo / Hito:</strong> {objetivo}
                        </p>

                        <div className="observation-bitacora-content" style={{
                          color: classObs ? '#1f2937' : '#9ca3af',
                          fontStyle: classObs ? 'normal' : 'italic'
                        }}>
                          <strong>Bitácora del Docente:</strong> {classObs || 'No se registraron observaciones específicas para esta clase.'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export default StudentDetailModal;
