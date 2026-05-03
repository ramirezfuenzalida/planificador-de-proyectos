
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Sparkles, Clock
} from 'lucide-react';
import { getCalendarDays, getMonthString } from '../utils/calendarUtils';

interface CalendarViewProps {
  currentCalendarDate: Date;
  setCurrentCalendarDate: (date: Date) => void;
  selectedCalendarDay: Date | null;
  setSelectedCalendarDay: (day: Date | null) => void;
  globalData: { pm: any[]; sm: any[] };
  registrations: Record<string, string>;
  getTeacherForCourse: (raw: any, course: string) => string;
  getCourseTag: (course: string) => string;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  currentCalendarDate,
  setCurrentCalendarDate,
  selectedCalendarDay,
  setSelectedCalendarDay,
  globalData,
  registrations,
  getTeacherForCourse,
  getCourseTag
}) => {
  const calendarDays = getCalendarDays(currentCalendarDate);

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1));
    setSelectedCalendarDay(null);
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1));
    setSelectedCalendarDay(null);
  };

  const handleGoToday = () => {
    setCurrentCalendarDate(new Date());
    setSelectedCalendarDay(null);
  };

  const getDayTasks = (date: Date) => {
    if (!date) return [];
    const tasks: any[] = [];
    
    const processLevel = (data: any[], courses: string[]) => {
      (data || []).forEach(clase => {
        if (clase.fecha) {
          const parts = clase.fecha.split('/');
          if (parts.length === 3) {
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            const d = new Date(`${year}-${parts[1]}-${parts[0]}T12:00:00`);
            if (d.toDateString() === date.toDateString()) {
              // Special events (Feriado, etc)
              if (clase.etapa && (clase.etapa.toLowerCase().includes('feriado') || 
                  clase.etapa.toLowerCase().includes('estudiante') || 
                  clase.etapa.toLowerCase().includes('tayloriana'))) {
                tasks.push({
                  isSpecial: true,
                  title: clase.etapa,
                  notes: clase.notes || ''
                });
              }

              courses.forEach(c => {
                const teacherName = getTeacherForCourse(clase.rawDocente, c);
                tasks.push({
                  course: c,
                  clase: clase.clase,
                  teacher: teacherName,
                  horario: clase.horario,
                  status: registrations[`${getCourseTag(c)}-${clase.clase}`] || 'pending'
                });
              });
            }
          }
        }
      });
    };

    processLevel(globalData.pm, ['1 Medio A', '1 Medio B', '1 Medio C', '1 Medio D']);
    processLevel(globalData.sm, ['2 Medio A', '2 Medio B', '2 Medio C', '2 Medio D']);

    return tasks;
  };

  const effectiveDate = selectedCalendarDay || new Date();
  const dayTasks = getDayTasks(effectiveDate);
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <motion.div 
      className="calendar-view-premium"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="calendar-main-card">
        <div className="calendar-header">
          <div className="calendar-title">
            <span className="banner-badge">Agenda Académica</span>
            <h2>{getMonthString(currentCalendarDate)} {currentCalendarDate.getFullYear()}</h2>
          </div>
          
          <div className="calendar-controls-premium">
            <button className="zch-btn" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
            <button className="zch-btn" onClick={handleGoToday}>Hoy</button>
            <button className="zch-btn" onClick={handleNextMonth}><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="calendar-grid-container">
          <div className="calendar-grid">
            {daysOfWeek.map((d, idx) => (
              <div key={idx} className="weekday-header">{d}</div>
            ))}
            
            {calendarDays.map((dayObj, i) => {
              const isSelected = selectedCalendarDay && 
                dayObj.date.toDateString() === selectedCalendarDay.toDateString();
              const isToday = new Date().toDateString() === dayObj.date.toDateString();
              const hasActivity = getDayTasks(dayObj.date).length > 0;

              return (
                <motion.div
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCalendarDay(dayObj.date)}
                  className={`calendar-day-cell ${dayObj.currentMonth ? '' : 'other-month'} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                >
                  <span className="day-number">{dayObj.day}</span>
                  {hasActivity && <div className="activity-indicator" />}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="calendar-event-sidebar">
        <div className="event-form-card">
          <div className="event-sidebar-header">
            <div className="header-icon-box">
              <Clock size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>
                {effectiveDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', weekday: 'long' })}
              </h3>
              <p style={{ color: '#64748b', fontWeight: 600 }}>Sesiones Programadas</p>
            </div>
          </div>

          <div className="tasks-scroll-area">
            <AnimatePresence mode="popLayout">
              {dayTasks.length > 0 ? (
                dayTasks.map((task, i) => (
                  <motion.div
                    key={`${task.course || task.title}-${task.clase || i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`premium-task-item ${task.isSpecial ? 'special-event' : ''}`}
                  >
                    {task.isSpecial ? (
                      <div className="task-info">
                        <div className="task-top">
                          <span className="task-course special-label">EVENTO / FERIADO</span>
                        </div>
                        <h4 className="special-title">{task.title}</h4>
                        {task.notes && <p className="special-notes">{task.notes}</p>}
                      </div>
                    ) : (
                      <>
                        <div className={`status-pill ${task.status}`}></div>
                        <div className="task-info">
                          <div className="task-top">
                            <span className="task-course">{task.course}</span>
                            <span className="task-session">Sesión {task.clase}</span>
                          </div>
                          <span className="task-teacher">{task.teacher}</span>
                          <div className="task-time">
                            <Clock size={14} />
                            <span>{task.horario || 'Sin horario definido'}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="empty-tasks-state">
                  <Sparkles size={48} color="#e2e8f0" />
                  <p>No hay sesiones para este día</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CalendarView;
