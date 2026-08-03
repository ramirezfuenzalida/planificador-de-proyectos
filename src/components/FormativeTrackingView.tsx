
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './Toast';
import { 
  Users, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  BookOpen,
  Target,
  Layers,
  Sparkles,
  Telescope,
  RefreshCw
} from 'lucide-react';
interface FormativeTrackingViewProps {
  courses1M: string[];
  courses2M: string[];
  globalData: { pm: any[]; sm: any[] };
  formativeRegistrations: Record<string, any>;
  setFormativeRegistrations: (regs: any) => void;
  getCourseTag: (course: string) => string;
  initialLevel?: '1M' | '2M';
  initialCourse?: string;
  dynamicGroups: Record<string, any>;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

// Mapeo oficial de estados de evaluación formativa y calificación
export const FORMATIVE_EVALUATION_MAP = {
  green: {
    initial: 'L',
    name: 'Logrado',
    title: 'Logrado (L)'
  },
  yellow: {
    initial: 'PL',
    name: 'Por Lograr',
    title: 'Por Lograr (PL)'
  },
  red: {
    initial: 'NL',
    name: 'No Logrado',
    title: 'No Logrado (NL)'
  },
  none: {
    initial: '-',
    name: 'Sin Evaluar',
    title: 'Sin Evaluar'
  }
} as const;

// Función para obtener la calificación por inicial a partir del color
export const getGradeInitial = (color: string): string => {
  const normColor = (color || '').toLowerCase();
  if (normColor === 'green') return 'L';
  if (normColor === 'yellow') return 'PL';
  if (normColor === 'red') return 'NL';
  return '-';
};

const FormativeTrackingView: React.FC<FormativeTrackingViewProps> = ({
  courses1M,
  courses2M,
  globalData,
  formativeRegistrations,
  setFormativeRegistrations,
  getCourseTag,
  initialLevel,
  initialCourse,
  dynamicGroups,
  onRefresh,
  isRefreshing
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'1M' | '2M'>(
    initialLevel || (initialCourse ? (initialCourse.startsWith('1') ? '1M' : '2M') : '1M')
  );
  const [selectedCourse, setSelectedCourse] = useState<string>(initialCourse || '');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // (Se eliminó handleSyncSheets: sincronizaba desde URLs fijas de Apps Script del
  //  proyecto STEAM y borraba los estudiantes reales del proyecto activo. El sync
  //  correcto es "Actualizar Planilla" de la barra lateral.)

  const courses = selectedLevel === '1M' ? courses1M : courses2M;
  const levelClasses = selectedLevel === '1M' ? globalData.pm : globalData.sm;

  // Initialize if empty
  if (selectedCourse === '' && courses.length > 0) setSelectedCourse(courses[0]);

  const lastClickRef = React.useRef<Record<string, number>>({});

  const handleStatusChange = (groupId: number, studentId: string | 'group', status: 'red' | 'yellow' | 'green') => {
    const targetKey = `${selectedCourse}-${selectedClass}-${groupId}-${studentId}-${status}`;
    const now = Date.now();
    const lastClickTime = lastClickRef.current[targetKey] || 0;
    
    // Throttle rapid clicks/taps on the same color button within 400ms to eliminate mobile ghost double-taps
    if (now - lastClickTime < 400) {
      return;
    }
    lastClickRef.current[targetKey] = now;

    setFormativeRegistrations((prev: Record<string, any>) => {
      const courseTag = getCourseTag(selectedCourse);
      const key = `${courseTag}-C${selectedClass}-G${groupId}`;
      
      const current = prev[key] || {
        group: 'none',
        students: { s1: 'none', s2: 'none', s3: 'none', s4: 'none' }
      };

      const updated = { ...current };
      if (studentId === 'group') {
        // Toggle: if clicked status is already active, revert to 'none'
        updated.group = current.group === status ? 'none' : status;
      } else {
        const currentStudentStatus = current.students?.[studentId] || 'none';
        // Toggle: if clicked status is already active, revert to 'none'
        updated.students = { 
          ...current.students, 
          [studentId]: currentStudentStatus === status ? 'none' : status 
        };
      }

      return {
        ...prev,
        [key]: updated
      };
    });
  };

  const currentClassData = levelClasses.find(c => c.clase === selectedClass);

  // Function to extract teacher for selected course
  const getTeacherForCurrentSelection = (raw: string) => {
    if (!raw) return 'No asignado';
    const tag = getCourseTag(selectedCourse);
    const tags = ['1MA', '1MB', '1MC', '1MD', '2MA', '2MB', '2MC', '2MD', 'RESUMEN'];
    const regex = new RegExp(`(${tags.join('|')})`, 'gi');
    
    if (!new RegExp(tag, 'i').test(raw)) {
      if (raw.toLowerCase().includes('http') || raw.toLowerCase().includes('canva.com')) return 'Ver material';
      return raw;
    }

    const parts = raw.split(regex);
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i].toUpperCase() === tag) {
        let content = parts[i + 1] || '';
        content = content.replace(/^[:\s\\-]+/, '').trim();
        content = content.replace(/[\s/|;,\-]+$/, '').trim();
        content = content.replace(/\s*\/\s*/g, ' / ').trim();
        if (content.toLowerCase().includes('http') || content.toLowerCase().includes('canva.com')) return 'Ver material';
        return content || 'Asignado';
      }
    }
    return raw;
  };

  // Calculate stats for the current class
  const classStats = { green: 0, yellow: 0, red: 0, none: 0 };
  if (selectedClass) {
    Array.from({ length: 10 }).forEach((_, i) => {
      const groupId = i + 1;
      const courseTag = getCourseTag(selectedCourse);
      const key = `${courseTag}-C${selectedClass}-G${groupId}`;
      const data = formativeRegistrations[key] || { group: 'none' };
      if (data.group === 'green') classStats.green++;
      else if (data.group === 'yellow') classStats.yellow++;
      else if (data.group === 'red') classStats.red++;
      else classStats.none++;
    });
  } else {
    classStats.none = 10;
  }

  return (
    <div className="formative-tracking-container">
      <div className="formative-header-glass">
        <div className="fh-top">
          <div className="fh-title-box">
            <h1><Telescope size={32} color="#0d9488" /> Seguimiento Formativo</h1>
            <p>Gestión de hitos y evaluación continua.</p>
          </div>
          {/* El espaciado y el ajuste de línea los define .fh-controls en el CSS. */}
          <div className="fh-controls" style={{ display: 'flex' }}>
            {/* Mismo botón de antes, pero ahora ejecuta el refresco CORRECTO
                (planilla/pestañas configuradas del proyecto activo), no las URLs
                fijas antiguas que borraban los nombres reales. */}
            <button
              className="save-revision-btn-premium"
              style={{
                // Mismo alto y radio que el toggle de nivel para que la fila
                // de controles quede pareja (el toggle mide .35+.6+.6+.35rem).
                padding: '0.95rem 1.4rem',
                height: 'auto',
                minHeight: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.9rem',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                opacity: isRefreshing ? 0.7 : 1,
                boxShadow: '0 6px 16px rgba(13, 148, 136, 0.35)'
              }}
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw size={16} className={isRefreshing ? "spin-icon" : ""} />
              {isRefreshing ? 'Actualizando...' : 'Actualizar Grupos'}
            </button>
            <div className="level-toggle-premium">
              <button 
                className={selectedLevel === '1M' ? 'active' : ''} 
                onClick={() => { setSelectedLevel('1M'); setSelectedCourse(courses1M[0]); setSelectedClass(''); }}
              >
                1° Medios
              </button>
              <button 
                className={selectedLevel === '2M' ? 'active' : ''} 
                onClick={() => { setSelectedLevel('2M'); setSelectedCourse(courses2M[0]); setSelectedClass(''); }}
              >
                2° Medios
              </button>
            </div>
          </div>
        </div>

        <div className="fh-filters-grid">
          <div className="filter-group-premium main-select">
            <label><Users size={16} /> Curso Seleccionado</label>
            <div className="custom-select-wrapper">
              <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedClass(''); }}>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="filter-group-premium main-select">
            <label><BookOpen size={16} /> Sesión de Aprendizaje</label>
            <div className="custom-select-wrapper">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">-- Seleccionar Sesión de Aprendizaje --</option>
                {levelClasses.map(c => (
                  <option key={c.clase} value={c.clase}>
                    N° {c.clase} • {c.fecha} • {c.objetivo.substring(0, 35)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="class-stats-mini-card">
            <div className="stat-pill green"><span>{classStats.green}</span> Logrado (L)</div>
            <div className="stat-pill yellow"><span>{classStats.yellow}</span> Por Lograr (PL)</div>
            <div className="stat-pill red"><span>{classStats.red}</span> No Logrado (NL)</div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedClass ? (
          <motion.div 
            key={`${selectedCourse}-${selectedClass}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="formative-content-grid"
          >
            {currentClassData && (
              <div className="class-context-banner-premium">
                <div className="ccb-left">
                  <div className="ccb-badge">CLASE {currentClassData.clase}</div>
                  <div className="ccb-date">{currentClassData.fecha}</div>
                </div>
                <div className="ccb-main">
                  <div className="ccb-section">
                    <Target size={16} className="icon-teal" />
                    <div className="ccb-text">
                      <strong>Objetivo de la Sesión</strong>
                      <p>{currentClassData.objetivo}</p>
                    </div>
                  </div>
                  <div className="ccb-section-row">
                    <div className="ccb-section">
                      <Layers size={16} className="icon-blue" />
                      <div className="ccb-text">
                        <strong>Etapa del Proyecto</strong>
                        <p>{currentClassData.etapa}</p>
                      </div>
                    </div>
                    <div className="ccb-section">
                      <Users size={16} className="icon-orange" />
                      <div className="ccb-text">
                        <strong>Docentes Asociados</strong>
                        <p>{getTeacherForCurrentSelection(currentClassData.rawDocente)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="ccb-section-row enriched">
                    <div className="ccb-section">
                      <BookOpen size={16} className="icon-emerald" />
                      <div className="ccb-text">
                        <strong>Contenido</strong>
                        <p>{currentClassData.contenido || 'No especificado'}</p>
                      </div>
                    </div>
                    <div className="ccb-section">
                      <Sparkles size={16} className="icon-yellow" />
                      <div className="ccb-text">
                        <strong>Actividad Sugerida</strong>
                        <p>{currentClassData.actividad || 'No especificada'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ccb-right">
                   <div className="progress-circle-mini" style={{ '--progress': `${Math.round(( (10 - classStats.none) / 10) * 100)}%` } as any}>
                      <div className="progress-circle-inner">
                        <div className="pc-val">{Math.round(( (10 - classStats.none) / 10) * 100)}%</div>
                        <div className="pc-label">Grupal</div>
                      </div>
                   </div>
                </div>
              </div>
            )}

            <div className="formative-footer-actions" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
              <motion.button
                className="save-revision-btn-premium"
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setToastMessage('Seguimiento Guardado Exitosamente');
                  setTimeout(() => {
                    setToastMessage(null);
                    setSelectedClass('');
                  }, 1500);
                }}
                style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}
              >
                <div className="srb-icon">
                  <CheckCircle2 size={24} />
                </div>
                <div className="srb-text" style={{ textAlign: 'left' }}>
                  <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>Finalizar y Guardar Revisión</strong>
                  <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Consolidar estado de los 10 grupos</span>
                </div>
                <Sparkles size={20} className="srb-sparkle" style={{ marginLeft: 'auto' }} />
              </motion.button>
            </div>

            <div className="groups-grid-premium">
              {Array.from({ length: 10 }).map((_, i) => {
                const groupId = i + 1;
                const courseTag = getCourseTag(selectedCourse);
                const key = `${courseTag}-C${selectedClass}-G${groupId}`;
                const data = formativeRegistrations[key] || {
                  group: 'none',
                  students: { s1: 'none', s2: 'none', s3: 'none', s4: 'none' }
                };

                return (
                  <motion.div 
                    key={groupId}
                    className={`group-card-premium status-${data.group}`}
                    whileHover={{ y: 0 }}
                  >
                    <div className="gc-header">
                      <div className="gc-title">
                        <Sparkles size={18} />
                        <h3>Grupo {groupId}</h3>
                      </div>
                      <div className="status-selector-mini">
                        <button 
                          type="button"
                          className={`status-btn-circle red ${data.group === 'red' ? 'active' : ''}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(groupId, 'group', 'red'); }}
                          title="Marcar Grupo Completo como No Logrado (NL)"
                        />
                        <button 
                          type="button"
                          className={`status-btn-circle yellow ${data.group === 'yellow' ? 'active' : ''}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(groupId, 'group', 'yellow'); }}
                          title="Marcar Grupo Completo como Por Lograr (PL)"
                        />
                        <button 
                          type="button"
                          className={`status-btn-circle green ${data.group === 'green' ? 'active' : ''}`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(groupId, 'group', 'green'); }}
                          title="Marcar Grupo Completo como Logrado (L)"
                        />
                      </div>
                    </div>

                    <div className="students-list-premium">
                      {['s1', 's2', 's3', 's4'].map((sid, idx) => {
                        let studentName = `Estudiante ${idx + 1}`;
                        let studentRole = ['Coordinador', 'Investigador', 'Mediador', 'Secretario'][idx];

                        const courseTag = getCourseTag(selectedCourse);
                        const groupKey = `${courseTag}-G${groupId}`;
                        const groupInfo = dynamicGroups[groupKey];
                        if (groupInfo && groupInfo[idx]) {
                          studentName = groupInfo[idx].name;
                          studentRole = groupInfo[idx].role;
                        }

                        const roleStyles: Record<string, any> = {
                          'Coordinador': { bg: '#ffedd5', text: '#ea580c', border: '#fdba74', shadow: 'rgba(234, 88, 12, 0.15)' },
                          'Investigador': { bg: '#fef3c7', text: '#d97706', border: '#fde68a', shadow: 'rgba(217, 119, 6, 0.15)' },
                          'Mediador': { bg: '#dbeafe', text: '#2563eb', border: '#bfdbfe', shadow: 'rgba(37, 99, 235, 0.15)' },
                          'Secretario': { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0', shadow: 'rgba(22, 163, 74, 0.15)' }
                        };

                        const normalizedRole = studentRole.charAt(0).toUpperCase() + studentRole.slice(1).toLowerCase();
                        const styleInfo = roleStyles[normalizedRole] || { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb', shadow: 'rgba(0,0,0,0.05)' };

                        const studentStatus = data.students[sid];
                        const isAssigned = studentStatus !== 'none';
                        const nameColor = isAssigned ? '#ffffff' : 'inherit';
                        const iconClass = isAssigned ? '' : 'icon-subtle';
                        const iconColor = isAssigned ? '#ffffff' : undefined;

                        return (
                          <div key={sid} className={`student-row-premium status-${studentStatus}`}>
                            <div className="student-info">
                              <User size={14} className={iconClass} color={iconColor} style={{ minWidth: '14px' }} />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: nameColor }}>{studentName}</span>
                                <span style={{ 
                                  fontSize: '0.65rem', 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.06em', 
                                  color: styleInfo.text,
                                  backgroundColor: styleInfo.bg,
                                  border: `1px solid ${styleInfo.border}`,
                                  boxShadow: `0 2px 6px ${styleInfo.shadow}`,
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  width: 'fit-content',
                                  fontWeight: 700
                                }}>
                                  {studentRole}
                                </span>
                              </div>
                            </div>
                            <div className="student-status-toggle">
                              <button 
                                type="button"
                                className={`st-btn red ${data.students[sid] === 'red' ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(groupId, sid, 'red'); }}
                                title="No Logrado (NL)"
                              >
                                <AlertCircle size={14} />
                              </button>
                              <button 
                                type="button"
                                className={`st-btn yellow ${data.students[sid] === 'yellow' ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(groupId, sid, 'yellow'); }}
                                title="Por Lograr (PL)"
                              >
                                <Clock size={14} />
                              </button>
                              <button 
                                type="button"
                                className={`st-btn green ${data.students[sid] === 'green' ? 'active' : ''}`}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStatusChange(groupId, sid, 'green'); }}
                                title="Logrado (L)"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '60px 40px',
              textAlign: 'center',
              border: '1px dashed rgba(13, 148, 136, 0.25)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              marginTop: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              width: '100%'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(13, 148, 136, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0d9488',
              marginBottom: '8px'
            }}>
              <BookOpen size={40} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Seguimiento Formativo Listo
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', maxWidth: '400px', margin: 0, lineHeight: 1.5 }}>
              Selecciona una sesión de aprendizaje en el selector de arriba para comenzar a registrar el logro de tus estudiantes.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
};

export default FormativeTrackingView;
