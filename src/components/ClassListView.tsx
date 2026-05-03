import React from 'react';
import { 
  ChevronLeft, X, MonitorPlay, Users, Calendar, Clock, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ClassListViewProps {
  activeCourse: string;
  registrations: Record<string, string>;
  getCourseTag: (courseName: string | null) => string;
  globalData: { pm: any[]; sm: any[] };
  onClassSelect: (session: any) => void;
  onBack: () => void;
  getTeacherForCourse: (raw: any, course: string) => string;
}

const ClassListView: React.FC<ClassListViewProps> = ({
  activeCourse,
  registrations,
  getCourseTag,
  globalData,
  onClassSelect,
  onBack,
  getTeacherForCourse
}) => {
  const is1M = activeCourse.startsWith('1');
  const levelData = is1M ? globalData.pm : globalData.sm;

  // Helper to extract teacher

  return (
    <motion.div 
      className="class-selection-view"
      initial={{ opacity: 1, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 1, x: -20 }}
    >
      <div className="view-header">
        <div className="view-header-flex">
          <button className="back-btn-modern" onClick={onBack}>
            <ChevronLeft size={20} />
            <span>Cursos</span>
          </button>
          <div className="current-context">
            <p>Sesiones de seguimiento pedagógico</p>
            <h2>{activeCourse}</h2>
          </div>
          <button className="close-view-btn" onClick={onBack}>
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="class-grid-modern">
        {levelData.map((session, idx) => {
          const courseTag = getCourseTag(activeCourse);
          const clsId = session.clase;
          const registrationId = `${courseTag}-${clsId}`;
          const registeredStatus = registrations[registrationId];
          const teacherName = getTeacherForCourse(session.rawDocente, activeCourse);

          return (
            <div
              key={idx}
              className={`class-action-button ${registeredStatus ? `status-${registeredStatus}` : ''}`}
              onClick={() => onClassSelect({ ...session, rawDocente: teacherName, titulo: `Clase ${clsId}` })}
            >
              <div className="cab-accent-border"></div>

              <div className="cab-content-wrapper">
                <div className="cab-header-top">
                  <span className="cab-number">#{clsId}</span>
                  {session.canvaLink && (
                    <div className="cab-materials-badges">
                      <div className="material-symbol-pro canva-brand">
                        <MonitorPlay size={14} />
                        <span>CANVA</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="cab-main">
                  <span className="cab-label">Clase {clsId}</span>
                  <span className="cab-course-title">{session.objetivo.substring(0, 60)}...</span>
                  {registeredStatus && (
                    <span className="cab-status-badge">
                      {registeredStatus === 'green' ? '★ Clase Realizada' :
                        registeredStatus === 'yellow' ? '⚠ Clase Incompleta' :
                          '✖ No Realizada'}
                    </span>
                  )}
                </div>
              </div>

              <div className="cab-footer">
                <div className="cab-footer-item docente-highlight">
                  <Users size={14} />
                  <span>{teacherName || 'Docente no asignado'}</span>
                </div>
                <div className="cab-footer-item">
                  <Calendar size={14} />
                  <span>{session.fecha}</span>
                </div>
                <div className="cab-footer-item">
                  <Clock size={14} />
                  <span>90 min</span>
                </div>
                {session.etapa && (
                  <div className="etapa-badge-mini">
                    <Sparkles size={12} />
                    <span>{session.etapa}</span>
                  </div>
                )}
              </div>
              <div className="cab-gloss-shimmer"></div>
            </div>
          );
        })}
      </div>

      <div className="mobile-bottom-spacer" style={{ height: '120px', width: '100%' }}></div>
    </motion.div>
  );
};

export default ClassListView;
