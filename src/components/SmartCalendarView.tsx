import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  Tag, 
  BookOpen, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Bookmark, 
  Briefcase,
  Layers,
  Sparkles,
  Award
} from 'lucide-react';
import { getCalendarDays, getMonthString } from '../utils/calendarUtils';

export interface CalendarEvent {
  id: string;
  title: string;
  category: 'proyectos' | 'evaluaciones' | 'reuniones' | 'hitos' | 'muestra';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes?: string; // Actividad
  linkedCourse?: string; // Optional linked course (e.g. "1 Medio A")
  linkedClassId?: string; // Optional class number
  responsible?: string;
  status?: string; // Optional status color (e.g. "green", "yellow", "red" for academic linking)
  isAcademic?: boolean; // Flag to identify auto sheets classes
}

interface SmartCalendarViewProps {
  globalData: { pm: any[]; sm: any[] };
  registrations: Record<string, string>;
  getTeacherForCourse: (raw: any, course: string) => string;
  getCourseTag: (course: string) => string;
  customEvents: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

export default function SmartCalendarView({
  globalData,
  registrations,
  getTeacherForCourse,
  getCourseTag,
  customEvents = [],
  onAddEvent,
  onDeleteEvent
}: SmartCalendarViewProps) {
  // Calendar Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [activeFilter, setActiveFilter] = useState<string>('todos');

  // Form Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'proyectos' | 'evaluaciones' | 'reuniones' | 'hitos' | 'muestra'>('proyectos');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndTime, setFormEndTime] = useState('09:30');
  const [formNotes, setFormNotes] = useState(''); // Actividad
  const [formCourse, setFormCourse] = useState('');
  const [formResponsible, setFormResponsible] = useState('');
  const [formError, setFormError] = useState('');

  // Detail Modal States
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Helper: Parse DD/MM/YYYY to YYYY-MM-DD
  // Helper: Parse DD/MM/YYYY or YYYY-MM-DD or DD-MM-YYYY to YYYY-MM-DD
  const formatFechaToISO = (fechaStr: string) => {
    if (!fechaStr) return '';
    const cleaned = String(fechaStr).trim();
    // Support slash and dash delimiters
    const parts = cleaned.split(/[\/\-]/);
    if (parts.length === 3) {
      // If first part is 4 digits, it is likely already YYYY-MM-DD
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const month = parts[1].padStart(2, '0');
      const day = parts[0].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  // 1. Map Google Sheets classes to CalendarEvents (Automated Academic Events)
  const mapClassesToEvents = (): CalendarEvent[] => {
    const academicEvents: CalendarEvent[] = [];

    const processLevel = (data: any[], courses: string[]) => {
      (data || []).forEach(clase => {
        if (!clase.fecha) return;
        const isoDate = formatFechaToISO(clase.fecha);
        if (!isoDate) return;

        // One event per course to show linked statuses
        courses.forEach(course => {
          const courseTag = getCourseTag(course);
          const clsId = String(clase.clase || "").replace(/[^0-9]/g, '');
          const status = registrations[`${courseTag}-${clsId}`] || 'pending';
          const teacher = getTeacherForCourse(clase.rawDocente, course);

          // Standard schedule times: split or use defaults
          let start = '08:00';
          let end = '09:30';
          if (clase.horario && clase.horario.includes('-')) {
            const hrParts = clase.horario.split('-');
            start = hrParts[0].trim();
            end = hrParts[1].trim();
          }

          // Detect if this session represents the showcase ("Muestra Pública")
          const isMuestra = 
            isoDate === '2026-06-04' || 
            (clase.etapa && String(clase.etapa).toLowerCase().includes('muestra')) ||
            (clase.objetivo && String(clase.objetivo).toLowerCase().includes('muestra')) ||
            (clase.actividad && String(clase.actividad).toLowerCase().includes('muestra'));

          academicEvents.push({
            id: `academic-${courseTag}-${clsId}`,
            title: isMuestra 
              ? `Muestra Pública (${courseTag}): ${clase.etapa || 'Presentación Final'}` 
              : `Sesión ${clase.clase}: ${clase.objetivo || 'Proyecto ' + course}`,
            category: isMuestra ? 'muestra' : 'proyectos',
            date: isoDate,
            startTime: start,
            endTime: end,
            notes: `Contenido: ${clase.contenido || 'Sin definir'}\n\nActividad: ${clase.actividad || 'Sin definir'}\n\nEtapa: ${clase.etapa || '—'}`,
            linkedCourse: course,
            linkedClassId: clsId,
            responsible: teacher || clase.responsable || 'Equipo Pedagógico',
            status: status,
            isAcademic: true
          });
        });
      });
    };

    processLevel(globalData.pm, ['1 Medio A', '1 Medio B', '1 Medio C', '1 Medio D']);
    processLevel(globalData.sm, ['2 Medio A', '2 Medio B', '2 Medio C', '2 Medio D']);

    return academicEvents;
  };

  // Combine sheets academic events with custom user events
  const allEvents = [...mapClassesToEvents(), ...customEvents];

  // 2. Navigation Actions
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
      setSelectedDate(prevWeek);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
      setSelectedDate(nextWeek);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // 3. Grid Calculation
  const getDaysForActiveView = () => {
    if (viewMode === 'month') {
      return getCalendarDays(currentDate);
    } else {
      // Calculate 7 days for the week containing the currentDate
      const curr = new Date(currentDate);
      const dayOfWeek = curr.getDay(); // 0 is Sunday
      const startOfWeek = new Date(curr.setDate(curr.getDate() - dayOfWeek));
      
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        weekDays.push({
          day: d.getDate(),
          currentMonth: d.getMonth() === currentDate.getMonth(),
          date: d
        });
      }
      return weekDays;
    }
  };

  const daysGrid = getDaysForActiveView();

  // Helper to format ISO Date (YYYY-MM-DD) safely
  const toISODateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 4. Filtering Logic (Chips + Active Day selection)
  const getEventsForDay = (date: Date) => {
    const isoStr = toISODateString(date);
    return allEvents.filter(event => {
      if (event.date !== isoStr) return false;
      if (activeFilter === 'todos') return true;
      return event.category === activeFilter;
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Get active day events
  const selectedDayEvents = getEventsForDay(selectedDate);

  // Helper: check which levels have events on this day
  const getDayLevelsAndSpecial = (date: Date) => {
    const isoStr = toISODateString(date);
    const dayEvents = allEvents.filter(e => {
      if (e.date !== isoStr) return false;
      if (activeFilter === 'todos') return true;
      return e.category === activeFilter;
    });

    let has1M = false;
    let has2M = false;
    let hasMuestra = false;

    dayEvents.forEach(e => {
      if (e.category === 'muestra') hasMuestra = true;
      if (e.linkedCourse) {
        if (e.linkedCourse.startsWith('1')) has1M = true;
        else if (e.linkedCourse.startsWith('2')) has2M = true;
      }
    });

    return { has1M, has2M, hasMuestra };
  };

  // 5. Submit Event Form
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('El título es requerido.');
      return;
    }
    if (!formDate) {
      setFormError('La fecha del evento es requerida.');
      return;
    }

    const newEvent: CalendarEvent = {
      id: `custom-${Date.now()}`,
      title: formTitle,
      category: formCategory,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      notes: formNotes,
      linkedCourse: formCourse || undefined,
      responsible: formResponsible || 'Administrador',
    };

    onAddEvent(newEvent);

    // Reset Form
    setFormTitle('');
    setFormCategory('proyectos');
    setFormNotes('');
    setFormCourse('');
    setFormResponsible('');
    setFormError('');
    setIsAddModalOpen(false);
  };

  // Colors mapping for category styling
  const categoryMeta = {
    proyectos: { label: 'Proyectos', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', dot: '#3B82F6' },
    evaluaciones: { label: 'Evaluación', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.3)', dot: '#c084fc' },
    reuniones: { label: 'Reunión', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', dot: '#10B981' },
    hitos: { label: 'Hito', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', dot: '#fbbf24' },
    muestra: { label: 'Muestra Pública', color: '#ff007f', bg: 'rgba(255, 0, 127, 0.12)', border: 'rgba(255, 0, 127, 0.35)', dot: '#ff007f' }
  };

  const getStatusLabelAndColor = (status: string) => {
    if (status === 'green') return { text: 'Realizada', color: '#10b981', bg: '#ecfdf5' };
    if (status === 'yellow') return { text: 'Incompleta', color: '#fbbf24', bg: '#fffbeb' };
    if (status === 'red') return { text: 'No Realizada', color: '#ef4444', bg: '#fef2f2' };
    return { text: 'Pendiente', color: '#94a3b8', bg: '#f8fafc' };
  };

  // Level Style Mapping
  const levelMeta = {
    '1M': { label: '1° Medios', color: '#f472b6', bg: '#fdf2f8', border: '#fbcfe8', text: '#db2777' }, // Pink
    '2M': { label: '2° Medios', color: '#f59e0b', bg: '#fef3c7', border: '#fde68a', text: '#d97706' }  // Amber
  };

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="sc-view-wrapper">
      <style>{`
        .sc-view-wrapper {
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          width: 100%;
          box-sizing: border-box;
        }

        .sc-header-card {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(148, 163, 184, 0.12);
          margin-bottom: 24px;
        }

        .sc-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }

        .sc-header-title h1 {
          font-size: 1.8rem;
          font-weight: 850;
          margin: 0;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #0f172a;
        }

        .sc-header-title p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 4px 0 0 0;
          font-weight: 500;
        }

        .sc-controls-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sc-view-toggle {
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          display: flex;
          gap: 4px;
        }

        .sc-toggle-btn {
          border: none;
          background: transparent;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sc-toggle-btn.active {
          background: white;
          color: #4f46e5;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .sc-action-btn-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
          transition: all 0.2s;
        }

        .sc-action-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(79, 70, 229, 0.3);
        }

        /* NAVIGATION CALENDAR */
        .sc-nav-calendar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
        }

        .sc-nav-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sc-nav-arrows {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sc-arrow-btn {
          border: 1px solid #e2e8f0;
          background: white;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sc-arrow-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .sc-arrow-btn.today-btn {
          width: auto;
          padding: 0 16px;
          font-size: 0.82rem;
          font-weight: 700;
        }

        /* FILTER CHIPS */
        .sc-filters-carousel {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          margin-bottom: 24px;
          scrollbar-width: none;
        }

        .sc-filters-carousel::-webkit-scrollbar {
          display: none;
        }

        .sc-chip {
          border: 1px solid #e2e8f0;
          background: white;
          padding: 8px 18px;
          border-radius: 100px;
          font-size: 0.82rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sc-chip:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .sc-chip.active {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.15);
        }

        .sc-chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        /* GRID CALENDAR */
        .sc-grid-card {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01);
          border: 1px solid rgba(148, 163, 184, 0.12);
          margin-bottom: 24px;
        }

        .sc-grid-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          margin-bottom: 12px;
        }

        .sc-weekday {
          font-size: 0.72rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sc-grid-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .sc-day-cell {
          aspect-ratio: 1.1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
          user-select: none;
        }

        .sc-day-cell:hover {
          background: #f1f5f9;
        }

        .sc-day-number {
          font-size: 0.95rem;
          font-weight: 700;
          color: #334155;
        }

        .sc-day-cell.other-month .sc-day-number {
          color: #cbd5e1;
        }

        .sc-day-cell.is-today {
          background: rgba(79, 70, 229, 0.06);
        }
        .sc-day-cell.is-today .sc-day-number {
          color: #4f46e5;
        }

        .sc-day-cell.is-selected {
          background: #4f46e5 !important;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.35);
        }
        .sc-day-cell.is-selected .sc-day-number {
          color: white !important;
        }

        .sc-dots-container {
          display: flex;
          gap: 3px;
          margin-top: 4px;
          height: 6px;
          justify-content: center;
        }

        .sc-day-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .sc-day-cell.is-selected .sc-day-dot {
          background: white !important;
        }

        /* AGENDA FEED */
        .sc-agenda-card {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.015);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .sc-agenda-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 12px;
        }

        .sc-agenda-header h3 {
          font-size: 1.1rem;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }

        .sc-agenda-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sc-event-card {
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .sc-event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.03);
          border-color: #cbd5e1;
        }

        /* Highlighted style for Muestra Publica */
        .sc-event-card.muestra-publica {
          background: linear-gradient(135deg, #fff1f2 0%, #ffffff 100%) !important;
          border: 1.5px solid rgba(255, 0, 127, 0.35) !important;
          box-shadow: 0 4px 15px rgba(255, 0, 127, 0.08) !important;
        }
        .sc-event-card.muestra-publica:hover {
          box-shadow: 0 8px 25px rgba(255, 0, 127, 0.15) !important;
          border-color: rgba(255, 0, 127, 0.6) !important;
        }

        .sc-event-accent-line {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 5px;
        }

        .sc-event-time-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 80px;
          padding-right: 16px;
          border-right: 1px dashed #cbd5e1;
          color: #475569;
        }

        .sc-event-time-block span:first-child {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
        }

        .sc-event-time-block span:last-child {
          font-size: 0.72rem;
          font-weight: 600;
          color: #94a3b8;
          margin-top: 2px;
        }

        .sc-event-details {
          flex: 1;
          min-width: 0;
        }

        .sc-event-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .sc-event-title {
          font-size: 0.95rem;
          font-weight: 750;
          color: #1e293b;
          margin: 0;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sc-event-meta-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .sc-meta-tag {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          text-transform: uppercase;
        }

        .sc-meta-tag.academic-status {
          background: #ecfdf5;
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }

        .sc-meta-tag.category-badge {
          background: rgba(0, 0, 0, 0.04);
          color: #475569;
        }

        /* Featured style for Muestra Publica category tag */
        .sc-meta-tag.muestra-publica-tag {
          background: linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%) !important;
          color: #e11d48 !important;
          border: 1px solid rgba(225, 29, 72, 0.25) !important;
          box-shadow: 0 2px 6px rgba(225, 29, 72, 0.08);
          font-weight: 800;
        }

        .sc-meta-tag.course-badge {
          background: rgba(79, 70, 229, 0.08);
          color: #4f46e5;
          border: 1px solid rgba(79, 70, 229, 0.12);
        }

        .sc-meta-tag.level-badge {
          border-style: solid;
          border-width: 1px;
        }

        .sc-meta-tag.responsible-badge {
          background: #f1f5f9;
          color: #475569;
        }

        .sc-empty-feed {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }

        /* MODAL COSMIC */
        .sc-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .sc-modal-card {
          background: white;
          border-radius: 24px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(148, 163, 184, 0.12);
          overflow: hidden;
          position: relative;
        }

        .sc-modal-header {
          padding: 24px 24px 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .sc-modal-header h2 {
          font-size: 1.25rem;
          font-weight: 850;
          margin: 0;
          color: #0f172a;
        }

        .sc-modal-close {
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .sc-modal-close:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .sc-modal-body {
          padding: 24px;
          max-height: 70vh;
          overflow-y: auto;
        }

        /* FORM */
        .sc-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .sc-form-group label {
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sc-input, .sc-textarea, .sc-select {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 0.85rem;
          font-weight: 600;
          color: #1e293b;
          outline: none;
          transition: all 0.2s;
          width: 100%;
        }

        .sc-input:focus, .sc-textarea:focus, .sc-select:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
          background: white;
        }

        .sc-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .sc-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .sc-btn-cancel {
          border: 1px solid #e2e8f0;
          background: white;
          color: #475569;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sc-btn-cancel:hover {
          background: #f8fafc;
        }

        .sc-btn-delete {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #ef4444;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sc-btn-delete:hover {
          background: #fee2e2;
        }

        /* DETAIL VIEW CUSTOMS */
        .sc-detail-title-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
        }

        .sc-detail-title-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          min-width: 44px;
        }

        .sc-detail-title h3 {
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
          line-height: 1.4;
        }

        .sc-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .sc-detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sc-detail-item label {
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sc-detail-item span {
          font-size: 0.85rem;
          font-weight: 700;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sc-detail-notes-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .sc-detail-notes-card.muestra-publica-detail {
          background: linear-gradient(135deg, #fff1f2 0%, #f8fafc 100%) !important;
          border: 1px solid rgba(255, 0, 127, 0.25) !important;
        }

        .sc-detail-notes-card label {
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
          margin-bottom: 8px;
        }

        .sc-detail-notes-content {
          font-size: 0.85rem;
          color: #475569;
          line-height: 1.6;
          white-space: pre-wrap;
          font-weight: 550;
        }

        /* MOBILE ADJUSTMENTS */
        @media (max-width: 768px) {
          .sc-view-wrapper {
            padding: 12px;
            padding-bottom: 120px;
          }
          .sc-header-card {
            padding: 16px;
            border-radius: 20px;
          }
          .sc-header-title h1 {
            font-size: 1.4rem;
          }
          .sc-grid-card, .sc-agenda-card {
            padding: 16px;
            border-radius: 20px;
          }
          .sc-day-cell {
            border-radius: 12px;
          }
          .sc-day-number {
            font-size: 0.85rem;
          }
        }
      `}</style>

      {/* ── HEADER CARD ── */}
      <div className="sc-header-card">
        <div className="sc-header-top">
          <div className="sc-header-title">
            <h1><CalendarIcon size={28} color="#4f46e5" /> Calendario Inteligente</h1>
            <p>Agenda, filtra y vincula actividades al plan curricular 2026</p>
          </div>

          <div className="sc-controls-row">
            {/* View Mode Toggle */}
            <div className="sc-view-toggle">
              <button 
                className={`sc-toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
                onClick={() => setViewMode('month')}
              >
                Mes
              </button>
              <button 
                className={`sc-toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
                onClick={() => setViewMode('week')}
              >
                Semana
              </button>
            </div>

            {/* Agendar Evento Trigger */}
            <button 
              className="sc-action-btn-primary"
              onClick={() => {
                setFormDate(toISODateString(selectedDate));
                setIsAddModalOpen(true);
              }}
            >
              <Plus size={16} /> Agendar Evento
            </button>
          </div>
        </div>

        {/* Date Month/Year & Quick Carets */}
        <div className="sc-nav-calendar">
          <span className="sc-nav-title">
            {getMonthString(currentDate)} {currentDate.getFullYear()}
          </span>

          <div className="sc-nav-arrows">
            <button className="sc-arrow-btn" onClick={handlePrev} title="Anterior">
              <ChevronLeft size={18} />
            </button>
            <button className="sc-arrow-btn today-btn" onClick={handleToday}>
              Hoy
            </button>
            <button className="sc-arrow-btn" onClick={handleNext} title="Siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── FILTER CHIPS ── */}
      <div className="sc-filters-carousel">
        <button 
          className={`sc-chip ${activeFilter === 'todos' ? 'active' : ''}`}
          onClick={() => setActiveFilter('todos')}
        >
          Todos
        </button>
        {Object.entries(categoryMeta).map(([key, meta]) => (
          <button
            key={key}
            className={`sc-chip ${activeFilter === key ? 'active' : ''}`}
            onClick={() => setActiveFilter(key)}
          >
            <span className="sc-chip-dot" style={{ backgroundColor: meta.dot }} />
            {meta.label}
          </button>
        ))}
      </div>

      {/* ── CALENDAR GRID ── */}
      <div className="sc-grid-card">
        <div className="sc-grid-weekdays">
          {daysOfWeek.map((day, idx) => (
            <div key={idx} className="sc-weekday">{day}</div>
          ))}
        </div>

        <div className="sc-grid-days">
          {daysGrid.map((dayObj, index) => {
            const isSelected = toISODateString(dayObj.date) === toISODateString(selectedDate);
            const isToday = toISODateString(dayObj.date) === toISODateString(new Date());
            
            // Level and category checks for this cell
            const { has1M, has2M, hasMuestra } = getDayLevelsAndSpecial(dayObj.date);

            return (
              <motion.div
                key={index}
                whileTap={{ scale: 0.96 }}
                className={`sc-day-cell ${dayObj.currentMonth ? '' : 'other-month'} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                onClick={() => {
                  setSelectedDate(dayObj.date);
                  // Update current month if day clicked is in other month
                  if (dayObj.date.getMonth() !== currentDate.getMonth()) {
                    setCurrentDate(dayObj.date);
                  }
                }}
              >
                <span className="sc-day-number">{dayObj.day}</span>
                
                {/* Visual indicators color-coded by Level/Muestra */}
                <div className="sc-dots-container">
                  {hasMuestra && (
                    <span 
                      className="sc-day-dot" 
                      style={{ backgroundColor: categoryMeta.muestra.dot }}
                      title="Contiene Muestra Pública"
                    />
                  )}
                  {has1M && (
                    <span 
                      className="sc-day-dot" 
                      style={{ backgroundColor: levelMeta['1M'].color }}
                      title="Actividad 1° Medios"
                    />
                  )}
                  {has2M && (
                    <span 
                      className="sc-day-dot" 
                      style={{ backgroundColor: levelMeta['2M'].color }}
                      title="Actividad 2° Medios"
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── AGENDA FEED (Feed Inferior) ── */}
      <div className="sc-agenda-card">
        <div className="sc-agenda-header">
          <h3>
            Agenda del {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', weekday: 'long' })}
          </h3>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', background: 'rgba(79, 70, 229, 0.08)', padding: '4px 10px', borderRadius: '100px' }}>
            {selectedDayEvents.length} Evento{selectedDayEvents.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="sc-agenda-list">
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map((event) => {
              const meta = categoryMeta[event.category as keyof typeof categoryMeta];
              
              // Level details if linked to course
              let levelStyle = null;
              if (event.linkedCourse) {
                const lvlKey = event.linkedCourse.startsWith('1') ? '1M' : '2M';
                levelStyle = levelMeta[lvlKey];
              }

              // Accent color priorities: Muestra Pública takes absolute priority, then course levels, then categories
              let accentColor = meta?.color || '#94a3b8';
              if (event.category === 'muestra') {
                accentColor = categoryMeta.muestra.color;
              } else if (levelStyle) {
                accentColor = levelStyle.color;
              }
              
              return (
                <motion.div
                  key={event.id}
                  className={`sc-event-card ${event.category === 'muestra' ? 'muestra-publica' : ''}`}
                  whileHover={{ scale: 1.005 }}
                  onClick={() => setSelectedEvent(event)}
                >
                  {/* Category Accent Line with priority colors */}
                  <div className="sc-event-accent-line" style={{ backgroundColor: accentColor }}></div>
                  
                  {/* Time Block */}
                  <div className="sc-event-time-block">
                    <span>{event.startTime}</span>
                    <span>{event.endTime}</span>
                  </div>

                  {/* Details */}
                  <div className="sc-event-details">
                    <div className="sc-event-title-row">
                      <h4 className="sc-event-title">{event.title}</h4>
                      {event.category === 'muestra' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#ff007f', fontSize: '0.7rem', fontWeight: 800 }}>
                          <Sparkles size={12} /> DESTACADO
                        </span>
                      )}
                    </div>

                    <div className="sc-event-meta-tags">
                      {/* Category Badge - Highlighted if Muestra Pública */}
                      <span className={`sc-meta-tag ${event.category === 'muestra' ? 'muestra-publica-tag' : 'category-badge'}`}>
                        {event.category === 'muestra' ? <Award size={10} /> : <Tag size={10} />}
                        {meta?.label || 'General'}
                      </span>

                      {/* Level-Specific Badge: Pink for 1° Medios, Amber for 2° Medios */}
                      {levelStyle && (
                        <span className="sc-meta-tag level-badge" style={{
                          backgroundColor: levelStyle.bg,
                          color: levelStyle.text,
                          borderColor: levelStyle.border
                        }}>
                          <Bookmark size={10} /> {levelStyle.label}
                        </span>
                      )}

                      {/* Responsible Badge */}
                      {event.responsible && (
                        <span className="sc-meta-tag responsible-badge">
                          <User size={10} /> Resp: {event.responsible}
                        </span>
                      )}

                      {/* Linked Course Badge */}
                      {event.linkedCourse && (
                        <span className="sc-meta-tag course-badge">
                          <BookOpen size={10} /> {event.linkedCourse}
                        </span>
                      )}

                      {/* Linked Academic Status Badge */}
                      {event.isAcademic && event.status && (
                        <span className="sc-meta-tag academic-status" style={{ 
                          color: getStatusLabelAndColor(event.status).color,
                          backgroundColor: getStatusLabelAndColor(event.status).bg
                        }}>
                          {event.status === 'green' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                          {getStatusLabelAndColor(event.status).text}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="sc-empty-feed">
              <Plus size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>No hay hitos ni eventos programados para este día.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: AGENDAR EVENTO ── */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="sc-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
            <motion.div 
              className="sc-modal-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sc-modal-header">
                <h2>Agendar Hito / Evento</h2>
                <button className="sc-modal-close" onClick={() => setIsAddModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateEvent}>
                <div className="sc-modal-body">
                  {formError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fee2e2', color: '#ef4444', padding: '10px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '16px' }}>
                      <AlertCircle size={16} /> {formError}
                    </div>
                  )}

                  <div className="sc-form-group">
                    <label>Título del Evento *</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Muestra Pública del Proyecto"
                      className="sc-input"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="sc-form-row">
                    <div className="sc-form-group">
                      <label>Tipo de Evento *</label>
                      <select 
                        className="sc-select"
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value as any)}
                        style={{ borderLeft: formCategory === 'muestra' ? '3px solid #ff007f' : '1px solid #e2e8f0' }}
                      >
                        <option value="muestra">★ Muestra Pública (Destacado)</option>
                        <option value="proyectos">Proyecto (Hito)</option>
                        <option value="evaluaciones">Evaluación</option>
                        <option value="reuniones">Reunión</option>
                        <option value="hitos">Evento General</option>
                      </select>
                    </div>

                    <div className="sc-form-group">
                      <label>Día del Evento (Fecha) *</label>
                      <input 
                        type="date" 
                        className="sc-input"
                        value={formDate}
                        onChange={e => setFormDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="sc-form-row">
                    <div className="sc-form-group">
                      <label>Horario Inicio *</label>
                      <input 
                        type="time" 
                        className="sc-input"
                        value={formStartTime}
                        onChange={e => setFormStartTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className="sc-form-group">
                      <label>Horario Término *</label>
                      <input 
                        type="time" 
                        className="sc-input"
                        value={formEndTime}
                        onChange={e => setFormEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="sc-form-row">
                    <div className="sc-form-group">
                      <label>Curso Vinculado (Opcional)</label>
                      <select 
                        className="sc-select"
                        value={formCourse}
                        onChange={e => setFormCourse(e.target.value)}
                      >
                        <option value="">Ninguno</option>
                        <optgroup label="1° Medios">
                          <option value="1 Medio A">1 Medio A</option>
                          <option value="1 Medio B">1 Medio B</option>
                          <option value="1 Medio C">1 Medio C</option>
                          <option value="1 Medio D">1 Medio D</option>
                        </optgroup>
                        <optgroup label="2° Medios">
                          <option value="2 Medio A">2 Medio A</option>
                          <option value="2 Medio B">2 Medio B</option>
                          <option value="2 Medio C">2 Medio C</option>
                          <option value="2 Medio D">2 Medio D</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="sc-form-group">
                      <label>Docente / Responsable *</label>
                      <input 
                        type="text" 
                        placeholder="Nombre del encargado..."
                        className="sc-input"
                        value={formResponsible}
                        onChange={e => setFormResponsible(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="sc-form-group">
                    <label>Actividad / Descripción del Hito</label>
                    <textarea 
                      rows={3}
                      placeholder="Escribe la descripción de la actividad, objetivos, pautas o links..."
                      className="sc-textarea"
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className="sc-form-actions">
                    <button type="button" className="sc-btn-cancel" onClick={() => setIsAddModalOpen(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="sc-action-btn-primary">
                      Crear Evento
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DETALLE PROFUNDO (Deep Detail) ── */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="sc-modal-overlay" onClick={() => setSelectedEvent(null)}>
            <motion.div 
              className="sc-modal-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sc-modal-header">
                <h2>Detalle del Evento</h2>
                <button className="sc-modal-close" onClick={() => setSelectedEvent(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="sc-modal-body">
                {/* Event Category & Title block */}
                <div className="sc-detail-title-box">
                  <div 
                    className="sc-detail-title-icon" 
                    style={{ 
                      backgroundColor: selectedEvent.category === 'muestra' ? categoryMeta.muestra.color :
                        selectedEvent.linkedCourse?.startsWith('1') ? levelMeta['1M'].color :
                        selectedEvent.linkedCourse?.startsWith('2') ? levelMeta['2M'].color :
                        categoryMeta[selectedEvent.category as keyof typeof categoryMeta]?.color || '#4f46e5' 
                    }}
                  >
                    {selectedEvent.category === 'muestra' ? <Award size={22} /> :
                     selectedEvent.category === 'reuniones' ? <User size={22} /> : 
                     selectedEvent.category === 'evaluaciones' ? <Plus size={22} /> : 
                     selectedEvent.category === 'hitos' ? <Bookmark size={22} /> : <Briefcase size={22} />}
                  </div>

                  <div className="sc-detail-title">
                    <h3 style={{ textShadow: selectedEvent.category === 'muestra' ? '0 0 10px rgba(255,0,127,0.1)' : 'none' }}>
                      {selectedEvent.title}
                    </h3>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="sc-detail-grid">
                  <div className="sc-detail-item">
                    <label>Categoría</label>
                    <span style={{ 
                      color: categoryMeta[selectedEvent.category as keyof typeof categoryMeta]?.color,
                      fontWeight: selectedEvent.category === 'muestra' ? 800 : 700
                    }}>
                      <Tag size={14} /> {categoryMeta[selectedEvent.category as keyof typeof categoryMeta]?.label || 'General'}
                    </span>
                  </div>

                  <div className="sc-detail-item">
                    <label>Fecha / Día</label>
                    <span>
                      <ChevronRight size={14} />
                      {new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
                    </span>
                  </div>

                  <div className="sc-detail-item">
                    <label>Horario</label>
                    <span>
                      <Clock size={14} />
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </span>
                  </div>

                  <div className="sc-detail-item">
                    <label>Responsable</label>
                    <span>
                      <User size={14} />
                      {selectedEvent.responsible || 'Equipo Pedagógico'}
                    </span>
                  </div>

                  {selectedEvent.linkedCourse && (
                    <div className="sc-detail-item">
                      <label>Nivel / Curso</label>
                      <span style={{ 
                        color: selectedEvent.linkedCourse.startsWith('1') ? levelMeta['1M'].text : levelMeta['2M'].text,
                        fontWeight: 800 
                      }}>
                        <BookOpen size={14} />
                        {selectedEvent.linkedCourse} ({selectedEvent.linkedCourse.startsWith('1') ? '1° Medio' : '2° Medio'})
                      </span>
                    </div>
                  )}

                  {selectedEvent.isAcademic && selectedEvent.status && (
                    <div className="sc-detail-item">
                      <label>Estado de Avance</label>
                      <span style={{ 
                        color: getStatusLabelAndColor(selectedEvent.status).color,
                        padding: '2px 8px',
                        background: getStatusLabelAndColor(selectedEvent.status).bg,
                        borderRadius: '6px',
                        width: 'fit-content'
                      }}>
                        {getStatusLabelAndColor(selectedEvent.status).text}
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes/Descriptions card */}
                {selectedEvent.notes && (
                  <div className={`sc-detail-notes-card ${selectedEvent.category === 'muestra' ? 'muestra-publica-detail' : ''}`}>
                    <label><Layers size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Actividad / Descripción</label>
                    <div className="sc-detail-notes-content">
                      {selectedEvent.notes}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="sc-form-actions">
                  <button type="button" className="sc-btn-cancel" onClick={() => setSelectedEvent(null)}>
                    Cerrar Detalle
                  </button>

                  {/* Only allow deleting custom user events, not the automated sheet plan classes */}
                  {!selectedEvent.isAcademic && (
                    <button 
                      type="button" 
                      className="sc-btn-delete"
                      onClick={() => {
                        if (window.confirm('¿Está seguro de que desea eliminar este evento? Esta acción no se puede deshacer.')) {
                          onDeleteEvent(selectedEvent.id);
                          setSelectedEvent(null);
                        }
                      }}
                    >
                      <Trash2 size={16} /> Eliminar Evento
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
