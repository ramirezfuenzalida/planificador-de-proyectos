
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Telescope
} from 'lucide-react';

interface FormativeTrackingViewProps {
  courses1M: string[];
  courses2M: string[];
  globalData: { pm: any[]; sm: any[] };
  formativeRegistrations: Record<string, any>;
  setFormativeRegistrations: (regs: any) => void;
  getCourseTag: (course: string) => string;
}

const FormativeTrackingView: React.FC<FormativeTrackingViewProps> = ({
  courses1M,
  courses2M,
  globalData,
  formativeRegistrations,
  setFormativeRegistrations,
  getCourseTag
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'1M' | '2M'>('1M');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');

  const courses = selectedLevel === '1M' ? courses1M : courses2M;
  const levelClasses = selectedLevel === '1M' ? globalData.pm : globalData.sm;

  // Initialize if empty
  if (selectedCourse === '' && courses.length > 0) setSelectedCourse(courses[0]);
  if (selectedClass === '' && levelClasses.length > 0) setSelectedClass(levelClasses[0].clase);

  const handleStatusChange = (groupId: number, studentId: string | 'group', newStatus: string) => {
    const courseTag = getCourseTag(selectedCourse);
    const key = `${courseTag}-C${selectedClass}-G${groupId}`;
    
    const current = formativeRegistrations[key] || {
      group: 'none',
      students: { s1: 'none', s2: 'none', s3: 'none', s4: 'none' }
    };

    const updated = { ...current };
    if (studentId === 'group') {
      updated.group = newStatus;
    } else {
      updated.students = { ...updated.students, [studentId]: newStatus };
    }

    setFormativeRegistrations({
      ...formativeRegistrations,
      [key]: updated
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

  return (
    <div className="formative-tracking-container">
      <div className="formative-header-glass">
        <div className="fh-top">
          <div className="fh-title-box">
            <h1><Telescope size={32} color="#8B5CF6" /> Seguimiento Formativo</h1>
            <p>Gestión de hitos y evaluación continua.</p>
          </div>
          <div className="fh-controls">
            <div className="level-toggle-premium">
              <button 
                className={selectedLevel === '1M' ? 'active' : ''} 
                onClick={() => { setSelectedLevel('1M'); setSelectedCourse(courses1M[0]); }}
              >
                1° Medios
              </button>
              <button 
                className={selectedLevel === '2M' ? 'active' : ''} 
                onClick={() => { setSelectedLevel('2M'); setSelectedCourse(courses2M[0]); }}
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
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="filter-group-premium main-select">
            <label><BookOpen size={16} /> Sesión de Aprendizaje</label>
            <div className="custom-select-wrapper">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                {levelClasses.map(c => (
                  <option key={c.clase} value={c.clase}>
                    N° {c.clase} • {c.fecha} • {c.objetivo.substring(0, 35)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="class-stats-mini-card">
            <div className="stat-pill green"><span>{classStats.green}</span> Logrado</div>
            <div className="stat-pill yellow"><span>{classStats.yellow}</span> Proceso</div>
            <div className="stat-pill red"><span>{classStats.red}</span> Alerta</div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div 
          key={`${selectedCourse}-${selectedClass}`}
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 1, y: -20 }}
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
                  <Target size={16} className="icon-purple" />
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
                 <div className="progress-circle-mini">
                    <div className="pc-val">{Math.round(( (10 - classStats.none) / 10) * 100)}%</div>
                    <div className="pc-label">Avance Grupal</div>
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
                alert(`Revisión de la Clase ${selectedClass} para el curso ${selectedCourse} guardada exitosamente.`);
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
                  whileHover={{ y: -5 }}
                >
                  <div className="gc-header">
                    <div className="gc-title">
                      <Sparkles size={18} />
                      <h3>Grupo {groupId}</h3>
                    </div>
                    <div className="status-selector-mini">
                      <button 
                        className={`status-btn-circle red ${data.group === 'red' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(groupId, 'group', data.group === 'red' ? 'none' : 'red')}
                      />
                      <button 
                        className={`status-btn-circle yellow ${data.group === 'yellow' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(groupId, 'group', data.group === 'yellow' ? 'none' : 'yellow')}
                      />
                      <button 
                        className={`status-btn-circle green ${data.group === 'green' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(groupId, 'group', data.group === 'green' ? 'none' : 'green')}
                      />
                    </div>
                  </div>

                  <div className="students-list-premium">
                    {['s1', 's2', 's3', 's4'].map((sid, idx) => (
                      <div key={sid} className={`student-row-premium status-${data.students[sid]}`}>
                        <div className="student-info">
                          <User size={14} />
                          <span>Estudiante {idx + 1}</span>
                        </div>
                        <div className="student-status-toggle">
                          <button 
                            className={`st-btn red ${data.students[sid] === 'red' ? 'active' : ''}`}
                            onClick={() => handleStatusChange(groupId, sid, data.students[sid] === 'red' ? 'none' : 'red')}
                            title="Pendiente / Alerta"
                          >
                            <AlertCircle size={14} />
                          </button>
                          <button 
                            className={`st-btn yellow ${data.students[sid] === 'yellow' ? 'active' : ''}`}
                            onClick={() => handleStatusChange(groupId, sid, data.students[sid] === 'yellow' ? 'none' : 'yellow')}
                            title="En Proceso"
                          >
                            <Clock size={14} />
                          </button>
                          <button 
                            className={`st-btn green ${data.students[sid] === 'green' ? 'active' : ''}`}
                            onClick={() => handleStatusChange(groupId, sid, data.students[sid] === 'green' ? 'none' : 'green')}
                            title="Logrado"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FormativeTrackingView;
