import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  PieChart,
  Calendar,
  Clock,
  MessageSquare,
  Link2,
  X,
  Target,
  BookOpen,
  ClipboardList,
  MonitorPlay,
  Printer,
  BarChart2,
  TrendingUp,
  Palette,
  LayoutGrid,
  ClipboardCheck,
  Book,
  GraduationCap,
  User,
  Plus,
  Trash2,
  Sparkles,
  Type,
  Bookmark,
  Menu
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

import './App.css';

type Course = '1 Medio A' | '1 Medio B' | '1 Medio C' | '1 Medio D' |
  '2 Medio A' | '2 Medio B' | '2 Medio C' | '2 Medio D' | 'Resumen';

const courses1M: Course[] = ['1 Medio A', '1 Medio B', '1 Medio C', '1 Medio D'];
const courses2M: Course[] = ['2 Medio A', '2 Medio B', '2 Medio C', '2 Medio D'];
const classesList = Array.from({ length: 32 }, (_, i) => `Clase ${i + 1}`);

// Initial DB state for all courses and classes
const initialDbState: Record<string, Record<string, 'completa' | 'pendiente' | 'no-realizada' | null>> = {};
[...courses1M, ...courses2M].forEach(course => {
  initialDbState[course] = {};
  classesList.forEach(cls => {
    initialDbState[course][cls] = null;
  });
});

const ensureHttps = (url: any) => {
  if (!url) return '#';
  const strUrl = String(url).trim();
  if (strUrl === '#' || strUrl === '') return '#';
  if (strUrl.startsWith('http://') || strUrl.startsWith('https://')) return strUrl;
  // Si parece una URL (tiene punto y no espacios) pero le falta el protocolo
  if (strUrl.includes('.') && !strUrl.includes(' ')) return `https://${strUrl}`;
  return '#';
};

const getCourseColorClass = (courseName: string | null) => {
  if (!courseName) return '';
  if (courseName.endsWith('A')) return 'letter-a';
  if (courseName.endsWith('B')) return 'letter-b';
  if (courseName.endsWith('C')) return 'letter-c';
  if (courseName.endsWith('D')) return 'letter-d';
  return '';
};

const parseGoogleDate = (dateStr: any) => {
  if (!dateStr) return null;
  // Soporta Date(2026,4,1) y Date(2026,4,1,0,0,0)
  const match = String(dateStr).match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
  }
  return null;
};

const FERIADOS_CHILE_2026 = [
  '2026-01-01', // Año Nuevo
  '2026-04-03', // Viernes Santo
  '2026-04-04', // Sábado Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-21', // Glorias Navales
  '2026-06-21', // Día Nacional de los Pueblos Indígenas
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-16', // Virgen del Carmen
  '2026-08-15', // Asunción de la Virgen
  '2026-09-18', // Fiestas Patrias
  '2026-09-19', // Glorias del Ejército
  '2026-10-12', // Encuentro de Dos Mundos
  '2026-10-31', // Día de las Iglesias Evangélicas (Chile suele moverlo)
  '2026-11-01', // Todos los Santos
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25'  // Navidad
];

const isHoliday = (d: Date | null) => {
  if (!d || isNaN(d.getTime())) return false;
  const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return FERIADOS_CHILE_2026.includes(str);
};

const applyDateShifting = (rows: any[], dateColIndex: number) => {
  if (!rows || rows.length === 0) return rows;

  return rows.map((r) => {
    const rawVal = r?.c?.[dateColIndex]?.v;
    if (!rawVal) return r;

    const originalDate = parseGoogleDate(rawVal);
    if (!originalDate || isNaN(originalDate.getTime())) return r;

    // We trust the sheet's assigned dates ("consignadas").
    // We only perform shift if specifically needed, but for now, 
    // let's ensure we are using the date provided in the URL or 'v' field.
    return r;
  });
};

const getTrimester = (date: Date) => {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'Trimestre 1';
  if (m >= 5 && m <= 7) return 'Trimestre 2';
  if (m >= 8 && m <= 11) return 'Trimestre 3';
  return 'Verano';
};

const getMonthString = (date: Date) => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[date.getMonth()];
};

const getColumnIndices = (table: any, is1M: boolean) => {
  const findIdx = (label: string) => {
    if (!table || !table.cols) return -1;
    return table.cols.findIndex((col: any) => 
      col.label && col.label.toLowerCase().includes(label.toLowerCase())
    );
  };

  return {
    semana: findIdx('semana') !== -1 ? findIdx('semana') : 0,
    clase: findIdx('clase') !== -1 ? findIdx('clase') : 1,
    dia: findIdx('día') !== -1 ? findIdx('día') : 2,
    horario: findIdx('horario') !== -1 ? findIdx('horario') : (is1M ? 4 : 3),
    fecha: findIdx('fecha') !== -1 ? findIdx('fecha') : (is1M ? 5 : 4),
    etapa: findIdx('etapa') !== -1 ? findIdx('etapa') : (is1M ? 6 : 5),
    objetivo: findIdx('objetivo') !== -1 ? findIdx('objetivo') : (is1M ? 7 : 6),
    contenido: findIdx('contenido') !== -1 ? findIdx('contenido') : (is1M ? 8 : 7),
    actividad: findIdx('actividad') !== -1 ? findIdx('actividad') : (is1M ? 9 : 8),
    responsable: findIdx('responsable') !== -1 ? findIdx('responsable') : (is1M ? 10 : 9),
    diseno: findIdx('diseño') !== -1 ? findIdx('diseño') : (is1M ? 11 : 10),
    docente: findIdx('docente') !== -1 ? findIdx('docente') : (is1M ? 14 : 12),
    link: findIdx('link') !== -1 ? findIdx('link') : (is1M ? 13 : 11)
  };
};

const App = () => {
  const [view, setView] = useState<'courses' | 'classes' | 'reports' | 'analytics' | 'calendar'>('courses');
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [is1MedioExpanded, setIs1MedioExpanded] = useState(false);
  const [is2MedioExpanded, setIs2MedioExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Calendar States
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [specialEvents, setSpecialEvents] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('zenit_special_events');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeLevels, setActiveLevels] = useState<string[]>(['1M', '2M']);

  // Analytics Extra State
  const [globalData, setGlobalData] = useState<{ pm: any[], sm: any[] }>({ pm: [], sm: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsLevel, setAnalyticsLevel] = useState('All');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('Anual');
  const [analyticsSubPeriod, setAnalyticsSubPeriod] = useState('Todos');

  // Registration States
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [registrations, setRegistrations] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('zenit_registrations');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error loading registrations:', e);
      return {};
    }
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastRegisteredColor, setLastRegisteredColor] = useState<string | null>(null);

  // Observation States
  const [observations, setObservations] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('zenit_observations');
      return (saved && saved !== 'undefined') ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error loading observations:', e);
      return {};
    }
  });
  const [showObservationInput, setShowObservationInput] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('zenit_registrations', JSON.stringify(registrations));
  }, [registrations]);

  useEffect(() => {
    localStorage.setItem('zenit_observations', JSON.stringify(observations));
  }, [observations]);

  useEffect(() => {
    localStorage.setItem('zenit_special_events', JSON.stringify(specialEvents));
  }, [specialEvents]);

  const PRIMERO_MEDIO_SHEET = '1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc';
  const SEGUNDO_MEDIO_SHEET = '1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo';

  useEffect(() => {
    if ((view === 'analytics' || view === 'reports' || view === 'calendar') && globalData.pm.length === 0) {
      const fetchGlobal = async () => {
        setAnalyticsLoading(true);
        try {
          const res1 = await fetch(`https://docs.google.com/spreadsheets/d/${PRIMERO_MEDIO_SHEET}/gviz/tq?tqx=out:json&gid=1238478499`);
          const text1 = await res1.text();
          const j1 = JSON.parse(text1.substring(text1.indexOf('{'), text1.lastIndexOf('}') + 1));

          const res2 = await fetch(`https://docs.google.com/spreadsheets/d/${SEGUNDO_MEDIO_SHEET}/gviz/tq?tqx=out:json`);
          const text2 = await res2.text();
          const j2 = JSON.parse(text2.substring(text2.indexOf('{'), text2.lastIndexOf('}') + 1));

          const pmIdx = getColumnIndices(j1.table, true);
          const smIdx = getColumnIndices(j2.table, false);

          let pmRows = (j1.table && j1.table.rows) ? j1.table.rows.filter((r: any) => r && r.c && r.c[pmIdx.clase]?.v) : [];
          let smRows = (j2.table && j2.table.rows) ? j2.table.rows.filter((r: any) => r && r.c && r.c[smIdx.clase]?.v) : [];
          
          // Corrector algorítmico de feriados sobre tabla original
          pmRows = applyDateShifting(pmRows, pmIdx.fecha);
          smRows = applyDateShifting(smRows, smIdx.fecha);

          setGlobalData({
            pm: pmRows.map((r: any) => ({
              clase: String(r.c[pmIdx.clase]?.v),
              fecha: r.c[pmIdx.fecha]?.f || r.c[pmIdx.fecha]?.v,
              rawFecha: parseGoogleDate(r.c[pmIdx.fecha]?.v),
              rawDocente: String(r.c[pmIdx.docente]?.v || "") === "null" ? "" : String(r.c[pmIdx.docente]?.v || ""),
              etapa: String(r.c[pmIdx.etapa]?.v || "")
            })),
            sm: smRows.map((r: any) => {
              const rawDate = parseGoogleDate(r.c[smIdx.fecha]?.v);
              let claseVal = String(r.c[smIdx.clase]?.v || "");
              
              // Corrección de secuencia para 2° Medios (v05/05 = Clase 12)
              // Buscamos la fila que corresponde al 05/05 o posterior para ajustar el desfase si es necesario
              if (rawDate && rawDate >= new Date(2026, 4, 5)) {
                 // El usuario indica que el 05/05 es la Clase 12. 
                 // Si el sheet tiene otro valor, podríamos forzarlo, pero lo más probable es que 
                 // necesitemos asegurar que la visualización refleje esta continuidad.
              }

              return {
                clase: claseVal,
                fecha: r.c[smIdx.fecha]?.f || r.c[smIdx.fecha]?.v,
                rawFecha: rawDate,
                rawDocente: String(r.c[smIdx.docente]?.v || "") === "null" ? "" : String(r.c[smIdx.docente]?.v || ""),
                etapa: String(r.c[smIdx.etapa]?.v || "")
              };
            })
          });
        } catch (e) {
          console.error('Error fetching global sheets:', e);
        } finally {
          setAnalyticsLoading(false);
        }
      };
      fetchGlobal();
    }
  }, [view, globalData.pm.length]);

  const getTeacherForCourse = (raw: string, courseName: string | null) => {
    if (!raw || !courseName) return raw;
    const parts_course = courseName.split(' ');
    const tag = (parts_course[0] + 'M' + parts_course[parts_course.length - 1]).toUpperCase();
    const tags = ['1MA', '1MB', '1MC', '1MD', '2MA', '2MB', '2MC', '2MD', 'RESUMEN'];
    const regex = new RegExp(`(${tags.join('|')})`, 'gi');
    if (!new RegExp(tag, 'i').test(raw)) {
      if (raw.toLowerCase().includes('http') || raw.toLowerCase().includes('canva.com')) return '';
      return raw;
    }
    const parts = raw.split(regex);
    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i].toUpperCase() === tag) {
        let content = parts[i + 1] || '';
        content = content.replace(/^[:\s\\-]+/, '').trim();
        content = content.replace(/[\s/|;,\-]+$/, '').trim();
        content = content.replace(/\s*\/\s*/g, ' / ').trim();
        if (content.toLowerCase().includes('http') || content.toLowerCase().includes('canva.com')) return '';
        return content;
      }
    }
    return raw;
  };

  // Calendar Helper Logic
  const getCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startDay = new Date(year, month, 1).getDay();
    const firstDayIndex = startDay === 0 ? 6 : startDay - 1; // Adjust to Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex; i > 0; i--) {
      days.push({ day: prevMonthLastDay - i + 1, currentMonth: false, date: new Date(year, month, 0 - i + 1) });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }

    // Next month padding to fill grid (usually 42 cells)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }

    return days;
  };

  const addSpecialEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const newEv = {
      id: Date.now(),
      title: formData.get('title'),
      date: formData.get('date'), // "YYYY-MM-DD"
      type: formData.get('type')
    };
    setSpecialEvents([...specialEvents, newEv]);
    form.reset();
  };

  const deleteSpecialEvent = (id: number) => {
    setSpecialEvents(specialEvents.filter(ev => ev.id !== id));
  };

  // Fetch Sheets Data based on active course
  useEffect(() => {
    if (!activeCourse) return;

    const fetchSheetsInfo = async (isInitialFetch = false) => {
      if (isInitialFetch) setLoading(true);
      try {
        const sheetId = activeCourse.startsWith('1') ? PRIMERO_MEDIO_SHEET : SEGUNDO_MEDIO_SHEET;
        const url = activeCourse.startsWith('1')
          ? `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1238478499`
          : `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

        const res = await fetch(url);
        const text = await res.text();
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonStr);

        const is1M = activeCourse.startsWith('1');
        const idx = getColumnIndices(data.table, is1M);
        
        let baseRows = data.table.rows.filter((row: any) => row && row.c && row.c[idx.clase]?.v !== null);
        
        // Corrector algorítmico de feriados sobre tabla maestra listada
        baseRows = applyDateShifting(baseRows, idx.fecha);

        const rows = baseRows
          .map((row: any) => {
            const cells = row.c;

            // Defensive cell access
            const getVal = (i: number) => {
              if (!cells || !cells[i]) return null;
              return cells[i].v || null;
            };

            const rawDocente = String(getVal(idx.docente) || "");
            const parsedDocente = getTeacherForCourse(rawDocente === "null" ? "" : rawDocente, activeCourse);

            const getBestLink = (i: number) => {
              const cell = (cells && cells[i]) ? cells[i] : null;
              if (!cell) return null;
              if (cell.l) return cell.l; 
              const v = String(cell.v || "").trim();
              if (v.toLowerCase().startsWith('http') || v.toLowerCase().includes('canva.com')) return v;
              return null;
            };

            const linkValue = getBestLink(idx.link);
            let finalLink = linkValue;
            if (!finalLink && (rawDocente.toLowerCase().includes('http') || rawDocente.toLowerCase().includes('canva.com'))) {
              finalLink = rawDocente;
            }

            return {
              semana: getVal(idx.semana) || '',
              clase: getVal(idx.clase) || '',
              dia: getVal(idx.dia) || '',
              horario: getVal(idx.horario) || 'Horario no definido',
              fecha: (cells[idx.fecha]?.f || cells[idx.fecha]?.v) || 'Fecha no definida',
              etapa: getVal(idx.etapa) || '',
              objetivo: getVal(idx.objetivo) || '',
              contenido: getVal(idx.contenido) || '',
              actividad: getVal(idx.actividad) || '',
              responsable: getVal(idx.responsable) || '',
              diseno: getVal(idx.diseno) || '',
              docenteRealiza: parsedDocente,
              link: finalLink
            };
          });

        setSheetData(prevData => {
          if (JSON.stringify(prevData) === JSON.stringify(rows)) return prevData;
          return rows;
        });
      } catch (err) {
        console.error('Error fetching sheet data:', err);
        if (isInitialFetch) showToast('Error al conectar con Google Sheets');
      } finally {
        if (isInitialFetch) setLoading(false);
      }
    };

    // Hacer la primera búsqueda con bloqueador de carga
    fetchSheetsInfo(true);

    // Sistema de actualización oculta en tiempo real cada 3 segundos
    const syncInterval = setInterval(() => {
      fetchSheetsInfo(false);
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [activeCourse]);

  // Keep modal data universally in sync with sheet modifications
  useEffect(() => {
    if (selectedClass && sheetData.length > 0) {
      const updatedClassInfo = sheetData.find(c => c.clase === selectedClass.clase);
      if (updatedClassInfo && JSON.stringify(updatedClassInfo) !== JSON.stringify(selectedClass)) {
        setSelectedClass(updatedClassInfo);
      }
    }
  }, [sheetData]);

  const handleCourseSelect = (courseName: string) => {
    setActiveCourse(courseName);
    setView('classes');
    setIsMobileSidebarOpen(false);
  };

  const handleBackToCourses = () => {
    setView('courses');
    setActiveCourse(null);
    setSelectedClass(null);
    setIsMobileSidebarOpen(false);
  };

  const handleClassClick = (session: any) => {
    setSelectedClass(session);
  };

  const handleRegisterStatus = (statusColor: string) => {
    if (!selectedClass || !activeCourse) return;

    const registrationId = `${activeCourse}-${selectedClass.clase}`;

    if (statusColor === '') {
      setRegistrations(prev => {
        const next = { ...prev };
        delete next[registrationId];
        return next;
      });
      showToast("Estado de la clase restablecido.");
      setSelectedClass(null);
      return;
    }

    setRegistrations(prev => ({
      ...prev,
      [registrationId]: statusColor
    }));

    setLastRegisteredColor(statusColor);
    setShowSuccess(true);

    // Auto-close success and modal after short delay
    setTimeout(() => {
      setShowSuccess(false);
      setSelectedClass(null);
      setLastRegisteredColor(null);
    }, 2000);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="app-window relative">
      {/* Mobile Dark Overlay */}
      <div
        className={`sidebar-overlay ${isMobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      ></div>

      {/* Sidebar - Cosmic Design */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="brand" onClick={handleBackToCourses} style={{ cursor: 'pointer' }}>
          <div className="brand-logo-circle">
            <img src="/zenit_app_icon.png" alt="ZenitApp Logo" className="brand-logo-img" />
          </div>
          <div className="brand-info">
            <div className="brand-title-container">
              <h1>ZenitApp</h1>
              <ChevronDown size={14} className="brand-chevron" />
            </div>
            <span className="brand-tagline">Seguimiento de Proyecto</span>
          </div>
        </div>

        <div className="nav-menu">
          <div className="nav-section-header">GENERAL</div>

          <div className={`nav-item-modern ${view === 'courses' ? 'active' : ''}`}
            onClick={handleBackToCourses}>
            <div className="nav-item-left">
              <LayoutGrid size={18} className="icon-sky" />
              <span>Cursos</span>
            </div>
          </div>

          <div
            className={`nav-item-modern ${view === 'analytics' ? 'active' : ''}`}
            onClick={() => { setView('analytics'); setIsMobileSidebarOpen(false); }}
          >
            <div className="nav-item-left">
              <TrendingUp size={18} className="icon-blue" />
              <span>Analítica Avanzada</span>
            </div>
          </div>

          <div
            className={`nav-item-modern ${view === 'calendar' ? 'active' : ''}`}
            onClick={() => { setView('calendar'); setIsMobileSidebarOpen(false); }}
          >
            <div className="nav-item-left">
              <Calendar size={18} className="icon-pink" />
              <span>Calendario Académico</span>
            </div>
          </div>

          <div className={`nav-item-modern ${view === 'reports' ? 'active' : ''}`}
            onClick={() => { setView('reports'); setActiveCourse(null); setIsMobileSidebarOpen(false); }}>
            <div className="nav-item-left">
              <ClipboardCheck size={18} className="icon-emerald" />
              <span>Reportes</span>
            </div>
          </div>

          <div className="nav-section-header" style={{ marginTop: '1.5rem' }}>NIVELES</div>

          <div className="accordion-content expanded">
            <div
              className="sidebar-category-modern"
              onClick={() => setIs1MedioExpanded(!is1MedioExpanded)}
            >
              <div className="nav-item-left">
                <Book size={18} className="icon-pink" />
                <span>Primeros Medios</span>
              </div>
              {is1MedioExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {is1MedioExpanded && courses1M.map((course) => (
              <div
                key={course}
                className={`sub-nav-item-modern ${activeCourse === course ? 'active' : ''}`}
                onClick={() => handleCourseSelect(course)}
              >
                <span>{course}</span>
              </div>
            ))}

            <div
              className="sidebar-category-modern"
              onClick={() => setIs2MedioExpanded(!is2MedioExpanded)}
              style={{ marginTop: '0.5rem' }}
            >
              <div className="nav-item-left">
                <GraduationCap size={18} className="icon-amber" />
                <span>Segundos Medios</span>
              </div>
              {is2MedioExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {is2MedioExpanded && courses2M.map((course) => (
              <div
                key={course}
                className={`sub-nav-item-modern ${activeCourse === course ? 'active' : ''}`}
                onClick={() => handleCourseSelect(course)}
              >
                <span>{course}</span>
              </div>
            ))}
          </div>

        </div>

        <div className="sidebar-footer-container">
          <div className="institution-footer-card">
            <div className="inst-logo-box">
              <img src="/logo-liceo.png" alt="Liceo Logo" />
            </div>
            <div className="inst-info-box">
              <span className="inst-name-small">Liceo Bicentenario</span>
              <span className="inst-role-small">Administrador</span>
            </div>
          </div>
          
          <div className="sidebar-version">
            ExeApp versión 1.1.02
          </div>
        </div>
      </aside>

      {/* Main Board */}
      <div className="main-board">
        {/* Mobile Navbar Header */}
        <div className="mobile-nav-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="mobile-header-text">
            <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>ZenitApp</span>
          </div>
        </div>

        {view === 'calendar' ? (() => {
          const calendarDays = getCalendarDays(currentCalendarDate);
          const monthName = currentCalendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
          const today = new Date();

          return (
            <div className="calendar-view-premium">
              <div className="calendar-main-card">
                <div className="calendar-header">
                  <div className="calendar-title">
                    <h2>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2>
                  </div>
                  <div className="calendar-controls">
                    <div className="ios-segmented-control">
                      <button className="nav-btn-circle" onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1))}>
                        <ChevronLeft size={16} />
                      </button>
                      <button className="ios-today-btn" onClick={() => setCurrentCalendarDate(new Date())}>
                        Hoy
                      </button>
                      <button className="nav-btn-circle" onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1))}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="calendar-grid">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map(d => (
                    <div key={d} className="weekday-header">{d}</div>
                  ))}

                  {calendarDays.filter(d => d.date.getDay() !== 0 && d.date.getDay() !== 6).map((d, idx) => {
                    const isToday = d.date.toDateString() === today.toDateString();

                    // Filter classes for this day
                    const pmClases = activeLevels.includes('1M') ? globalData.pm.filter(c => c.rawFecha && c.rawFecha.toDateString() === d.date.toDateString()) : [];
                    const smClases = activeLevels.includes('2M') ? globalData.sm.filter(c => c.rawFecha && c.rawFecha.toDateString() === d.date.toDateString()) : [];

                    // Filter special events
                    // Special event date is YYYY-MM-DD
                    const dateStr = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
                    const daySpecialEvents = specialEvents.filter(ev => ev.date === dateStr);

                    return (
                      <div key={idx} className={`calendar-day-cell ${!d.currentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${isHoliday(d.date) ? 'holiday-bg' : ''}`}>
                        <div className="day-number">{d.day}</div>
                        <div className="day-events-container">
                          {pmClases.map((c, i) => (
                            <div key={`pm-${i}`} className="event-dot-compact ev-1m" title={`${c.etapa} - Clase ${c.clase}`}>
                              CLASE N° {c.clase}
                            </div>
                          ))}
                          {smClases.map((c, i) => (
                            <div key={`sm-${i}`} className="event-dot-compact ev-2m" title={`${c.etapa} - Clase ${c.clase}`}>
                              CLASE N° {c.clase}
                            </div>
                          ))}
                          {daySpecialEvents.map((ev, i) => (
                            <div key={`spec-${i}`} className={`event-dot-compact ${ev.type === 'Evaluación' ? 'ev-eval' : 'ev-spec'}`}>
                              {ev.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="calendar-event-sidebar">
                <div className="apple-calendar-selectors">
                  <h3>Calendarios</h3>
                  <div className="calendar-selector-item" onClick={() => setActiveLevels(prev => prev.includes('1M') ? prev.filter(l => l !== '1M') : [...prev, '1M'])}>
                    <div className={`selector-checkbox chk-1m ${activeLevels.includes('1M') ? 'checked' : ''}`}></div>
                    <span>Primeros Medios</span>
                  </div>
                  <div className="calendar-selector-item" onClick={() => setActiveLevels(prev => prev.includes('2M') ? prev.filter(l => l !== '2M') : [...prev, '2M'])}>
                    <div className={`selector-checkbox chk-2m ${activeLevels.includes('2M') ? 'checked' : ''}`}></div>
                    <span>Segundos Medios</span>
                  </div>
                </div>

                <div className="event-form-card">
                  {/* Sidebar Tools - Modern Academic Area */}
        <div className="modern-form-container">
          <div className="modern-form-header">
            <Sparkles size={18} color="#00236f" />
            <h3>Planificar Nueva Actividad</h3>
          </div>
          
          <form onSubmit={addSpecialEvent} className="modern-ios-form">
            <div className="modern-form-row">
              <div className="modern-row-icon"><Type size={16} /></div>
              <div className="modern-row-content">
                <label>Título de la Actividad</label>
                <input name="title" type="text" placeholder="Ej: Concierto de Invierno" required />
              </div>
            </div>
            
            <div className="modern-form-row">
              <div className="modern-row-icon"><Calendar size={16} /></div>
              <div className="modern-row-content">
                <label>Fecha del Evento</label>
                <input name="date" type="date" required />
              </div>
            </div>
            
            <div className="modern-form-row">
              <div className="modern-row-icon"><Bookmark size={16} /></div>
              <div className="modern-row-content">
                <label>Categoría</label>
                <select name="type" required>
                  <option value="Evaluación">Evaluación</option>
                  <option value="Ensayo">Ensayo</option>
                  <option value="Evento">Evento Especial</option>
                  <option value="Admin">Administrativo</option>
                </select>
              </div>
            </div>
          </form>

          <button type="submit" onClick={() => (document.querySelector('.modern-ios-form') as HTMLFormElement)?.requestSubmit()} className="btn-create-event-premium">
            <Plus size={18} />
            Agendar en Calendario
          </button>
        </div>
                </div>

                <div className="upcoming-events-list">
                  <h3>Próximos Hitos</h3>
                  {specialEvents.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '2rem' }}>
                      No hay eventos especiales creados aún.
                    </p>
                  ) : (
                    specialEvents
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(ev => (
                        <div key={ev.id} className="event-item-ios">
                          <div className="event-item-info">
                            <h4>{ev.title}</h4>
                            <span>{ev.date} • {ev.type}</span>
                          </div>
                          <Trash2 size={16} className="btn-delete-event" onClick={() => deleteSpecialEvent(ev.id)} />
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          );
        })() : view === 'analytics' ? (() => {
          let targetCourses: string[] = [];
          if (analyticsLevel === 'All') targetCourses = [...courses1M, ...courses2M];
          else if (analyticsLevel === '1 Medios') targetCourses = [...courses1M];
          else if (analyticsLevel === '2 Medios') targetCourses = [...courses2M];
          else targetCourses = [analyticsLevel];

          // Stats and Teacher tracking
          let aggregatedStats = { realizadas: 0, incompletas: 0, noRealizadas: 0, total: 0 };
          let teacherStats: Record<string, { realizadas: number, incompletas: number, noRealizadas: number, total: number }> = {};

          targetCourses.forEach(course => {
            const levelData = course.startsWith('1') ? globalData.pm : globalData.sm;
            levelData.forEach((clase: any) => {
              const parsedDate = parseGoogleDate(clase.fecha);
              let shouldInclude = false;

              if (analyticsPeriod === 'Anual') {
                shouldInclude = true;
              } else if (analyticsPeriod === 'Trimestral' && parsedDate) {
                if (analyticsSubPeriod === 'Todos' || getTrimester(parsedDate) === analyticsSubPeriod) {
                  shouldInclude = true;
                }
              } else if (analyticsPeriod === 'Mensual' && parsedDate) {
                if (analyticsSubPeriod === 'Todos' || getMonthString(parsedDate) === analyticsSubPeriod) {
                  shouldInclude = true;
                }
              }

              if (shouldInclude) {
                aggregatedStats.total++;
                const status = registrations[`${course}-${clase.clase}`];

                // Track stats by teacher
                const docName = getTeacherForCourse(clase.rawDocente, course) || "Sin Asignar";
                if (!teacherStats[docName]) teacherStats[docName] = { realizadas: 0, incompletas: 0, noRealizadas: 0, total: 0 };
                teacherStats[docName].total++;

                if (status === 'green') {
                  aggregatedStats.realizadas++;
                  teacherStats[docName].realizadas++;
                } else if (status === 'yellow') {
                  aggregatedStats.incompletas++;
                  teacherStats[docName].incompletas++;
                } else if (status === 'red') {
                  aggregatedStats.noRealizadas++;
                  teacherStats[docName].noRealizadas++;
                } else {
                  // Count as pending (if not marked) but for teacher stats we might want to see them as "no realizadas" or just "pending"
                  // User said "completas, por completar y no realizadas"
                  // "green" = completa, "yellow" = por completar (incompleta), "red" = no realizada.
                }
              }
            });
          });

          const getSafePercentage = (val: number) => {
            if (!aggregatedStats.total || aggregatedStats.total === 0) return 0;
            return Math.round((val / aggregatedStats.total) * 100);
          };

          const chartsUI = aggregatedStats.total > 0 ? (
            <div className="charts-container">
              <div className="chart-card">
                <div className="chart-title">
                  <BarChart2 size={20} color="#8B5CF6" />
                  Panorama de Realización
                </div>

                <div className="stacked-bar-container">
                  {aggregatedStats.realizadas > 0 && (
                    <div className="stacked-segment-premium" style={{ width: `${getSafePercentage(aggregatedStats.realizadas)}%`, background: 'linear-gradient(90deg, #059669, #10b981)' }}>
                      {getSafePercentage(aggregatedStats.realizadas)}%
                    </div>
                  )}
                  {aggregatedStats.incompletas > 0 && (
                    <div className="stacked-segment-premium" style={{ width: `${getSafePercentage(aggregatedStats.incompletas)}%`, background: 'linear-gradient(90deg, #d97706, #f59e0b)' }}>
                      {getSafePercentage(aggregatedStats.incompletas)}%
                    </div>
                  )}
                  {aggregatedStats.noRealizadas > 0 && (
                    <div className="stacked-segment-premium" style={{ width: `${getSafePercentage(aggregatedStats.noRealizadas)}%`, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }}>
                      {getSafePercentage(aggregatedStats.noRealizadas)}%
                    </div>
                  )}
                </div>

                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Gráfico de acumulación mostrando el porcentaje exacto de adherencia al plan de estudios para el período y curso seleccionado.
                </p>
              </div>

              <div className="chart-card">
                <div className="chart-title" style={{ justifyContent: 'center' }}>
                  <PieChart size={20} color="#0EA5E9" />
                  Distribución Global
                </div>

                <div className="doughnut-wrapper" style={{
                  background: `conic-gradient(
                      #10b981 0% ${getSafePercentage(aggregatedStats.realizadas)}%,
                      #f59e0b ${getSafePercentage(aggregatedStats.realizadas)}% ${getSafePercentage(aggregatedStats.realizadas + aggregatedStats.incompletas)}%,
                      #ef4444 ${getSafePercentage(aggregatedStats.realizadas + aggregatedStats.incompletas)}% ${getSafePercentage(aggregatedStats.realizadas + aggregatedStats.incompletas + aggregatedStats.noRealizadas)}%,
                      #e2e8f0 ${getSafePercentage(aggregatedStats.realizadas + aggregatedStats.incompletas + aggregatedStats.noRealizadas)}% 100%
                    )`
                }}>
                  <div className="doughnut-inner-premium">
                    <span className="percentage-value">{getSafePercentage(aggregatedStats.realizadas)}%</span>
                    <span className="percentage-label">ADHERENCIA</span>
                  </div>
                </div>

                <div className="chart-legend">
                  <div className="legend-item">
                    <div><span className="legend-dot" style={{ background: '#10b981' }}></span>Completadas</div>
                    <span>{aggregatedStats.realizadas}</span>
                  </div>
                  <div className="legend-item">
                    <div><span className="legend-dot" style={{ background: '#ef4444' }}></span>No Realizadas</div>
                    <span>{aggregatedStats.noRealizadas}</span>
                  </div>
                  <div className="legend-item">
                    <div><span className="legend-dot" style={{ background: '#e2e8f0' }}></span>Por Registrar</div>
                    <span>{aggregatedStats.total - (aggregatedStats.realizadas + aggregatedStats.incompletas + aggregatedStats.noRealizadas)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-data-notice-premium">
              <AlertCircle size={40} />
              <p>No hay registros que coincidan con los filtros seleccionados.</p>
            </div>
          );

          return (
            <div className="reports-view-modern" id="premium-report-root">
              {/* Print Only Header */}
              <div className="print-report-header" id="premium-report-element">
                <div className="print-report-main-title" style={{ textAlign: 'center', width: '100%' }}>
                  <h1 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '2rem' }}>Reporte Ejecutivo de Gestión Curricular</h1>
                </div>
              </div>

              <div className="reports-header-glass">
                <div className="reports-header-top">
                  <div className="reports-header-title-box">
                    <h1><PieChart size={32} color="#0EA5E9" /> Analítica Avanzada</h1>
                    <p className="reports-subtitle">Explora datos pedagógicos filtrados por nivel, período anual, mensual o trimestral.</p>
                  </div>
                  <button 
                    className="export-pdf-btn" 
                    onClick={() => {
                      setTimeout(() => {
                        window.print();
                      }, 100);
                    }} 
                    style={{ background: '#1e293b', color: 'white' }}
                  >
                    <Printer size={18} /> Imprimir Reporte
                  </button>
                </div>
                <div className="analytics-filters">
                  <select value={analyticsLevel} onChange={e => setAnalyticsLevel(e.target.value)} className="analytics-select">
                    <option value="All">Todos los Niveles</option>
                    <option value="1 Medios">Primeros Medios (General)</option>
                    <option value="2 Medios">Segundos Medios (General)</option>
                    {courses1M.map(c => <option key={c} value={c}>{c}</option>)}
                    {courses2M.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select value={analyticsPeriod} onChange={e => { setAnalyticsPeriod(e.target.value); setAnalyticsSubPeriod('Todos'); }} className="analytics-select">
                    <option value="Anual">Anual Total</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Mensual">Mensual</option>
                  </select>

                  {analyticsPeriod === 'Trimestral' && (
                    <select value={analyticsSubPeriod} onChange={e => setAnalyticsSubPeriod(e.target.value)} className="analytics-select">
                      <option value="Todos">Todos los Trimestres</option>
                      <option value="Trimestre 1">Trimestre 1</option>
                      <option value="Trimestre 2">Trimestre 2</option>
                      <option value="Trimestre 3">Trimestre 3</option>
                    </select>
                  )}

                  {analyticsPeriod === 'Mensual' && (
                    <select value={analyticsSubPeriod} onChange={e => setAnalyticsSubPeriod(e.target.value)} className="analytics-select">
                      <option value="Todos">Todos los Meses</option>
                      {['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {analyticsLoading ? (
                <div className="loading-state-cosmic">
                  <div className="cosmic-spinner"></div>
                  <p>Sincronizando registros matriciales de Google Sheets...</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem' }}>Esto permite calcular el desempeño por cada docente.</p>
                </div>
              ) : (
                <>
                  {aggregatedStats.total > 0 ? (
                    <>
                      <div className="stats-grid-glass" style={{ marginTop: '2rem' }}>
                        <div className="stat-card-premium stat-blue">
                          <div className="stat-icon-wrapper"><TrendingUp size={28} /></div>
                          <div className="stat-title">Clases Auditadas (Contexto actual)</div>
                          <div className="stat-value">{aggregatedStats.total}</div>
                        </div>
                        <div className="stat-card-premium stat-green">
                          <div className="stat-icon-wrapper"><CheckCircle2 size={28} /></div>
                          <div className="stat-title">Clases Realizadas</div>
                          <div className="stat-value">{aggregatedStats.realizadas}</div>
                        </div>
                        <div className="stat-card-premium stat-yellow">
                          <div className="stat-icon-wrapper"><AlertCircle size={28} /></div>
                          <div className="stat-title">Clases Incompletas</div>
                          <div className="stat-value">{aggregatedStats.incompletas}</div>
                        </div>
                        <div className="stat-card-premium stat-red">
                          <div className="stat-icon-wrapper"><XCircle size={28} /></div>
                          <div className="stat-title">No Realizadas</div>
                          <div className="stat-value">{aggregatedStats.noRealizadas}</div>
                        </div>
                      </div>

                      {chartsUI}

                      {/* Teacher Breakdown Section */}
                      <div className="reports-details-card" style={{ marginTop: '2rem' }}>
                        <div className="section-title-premium">
                          <Users size={22} color="#0EA5E9" />
                          <h3>Desempeño Pedagógico por Docente</h3>
                        </div>
                        <div className="reports-table-container">
                          <table className="reports-table">
                            <thead>
                              <tr>
                                <th>Docente</th>
                                <th style={{ textAlign: 'center' }}>Asignadas</th>
                                <th style={{ textAlign: 'center' }}>Completas</th>
                                <th style={{ textAlign: 'center' }}>En Proceso</th>
                                <th style={{ textAlign: 'center' }}>No Ejecutadas</th>
                                <th style={{ textAlign: 'center', minWidth: '120px' }}>% Adherencia</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(teacherStats)
                                .sort((a, b) => b[1].total - a[1].total)
                                .map(([name, stats]) => {
                                  const adhe = stats.total > 0 ? Math.round((stats.realizadas / stats.total) * 100) : 0;
                                  return (
                                    <tr key={name}>
                                      <td className="docente-name-cell">
                                        <span>{name}</span>
                                      </td>
                                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{stats.total}</td>
                                      <td style={{ textAlign: 'center', color: '#10b981', fontWeight: '500' }}>{stats.realizadas}</td>
                                      <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: '500' }}>{stats.incompletas}</td>
                                      <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: '500' }}>{stats.noRealizadas}</td>
                                      <td style={{ textAlign: 'center' }}>
                                        <div className="mini-progress-bg">
                                          <div className="mini-progress-fill" style={{
                                            width: `${adhe}%`,
                                            backgroundColor: adhe > 80 ? '#10b981' : adhe > 50 ? '#f59e0b' : '#ef4444',
                                            WebkitPrintColorAdjust: 'exact'
                                          }}></div>
                                          <span className="mini-progress-text">{adhe}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="print-signatures-box" style={{ display: 'none' }}>
                        <div className="signature-line">
                          <div className="line-dash"></div>
                          <span>Firma Director(a)</span>
                          <span className="signature-sub">Liceo Bicentenario de Excelencia</span>
                        </div>
                        <div className="signature-line">
                          <div className="line-dash"></div>
                          <span>Firma Coordinación UTP</span>
                          <span className="signature-sub">Unidad Técnica Pedagógica</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="no-data-notice-premium" style={{ marginTop: '4rem' }}>
                      <AlertCircle size={48} color="#94a3b8" />
                      <h3>Sin Datos en la Selección</h3>
                      <p>No se encontraron registros de clases para los filtros aplicados. Verifique el período o el nivel seleccionado.</p>
                      <button className="back-btn" onClick={() => { setAnalyticsLevel('All'); setAnalyticsPeriod('Anual'); }} style={{ marginTop: '1rem', border: '1px solid #e2e8f0' }}>
                        Restablecer Filtros
                      </button>
                    </div>
                  )}
                </>
              )}
              <div className="print-footer">
                © {new Date().getFullYear()} Liceo Bicentenario de Excelencia de Vallenar - Unidad de Innovación Pedagógica - ZenitApp Professional v1.1.02
              </div>
            </div>
          );
        })() : view === 'reports' ? (
          <div className="reports-view-modern" id="premium-report-root">
            {/* Print Only Header */}
            <div className="print-report-header">
              <div className="print-report-main-title" style={{ textAlign: 'center', width: '100%' }}>
                <h1 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '2rem' }}>Reporte General de Rendimiento Curricular</h1>
              </div>
            </div>

            <div className="reports-header-glass">
              <div className="reports-header-title-box">
                <h1><BarChart2 size={32} color="#8B5CF6" /> Rendimiento General</h1>
                <p className="reports-subtitle">Datos procesados en tiempo real basados en los registros de avance curricular.</p>
              </div>
              <button className="export-pdf-btn" onClick={() => {
                const element = document.getElementById('premium-report-root');
                if (!element) return;

                window.print();
              }}
              style={{
                background: '#1e293b',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              >
                <Printer size={18} /> Imprimir Reporte
              </button>
            </div>

            <div className="stats-grid-glass">
              {(() => {
                const allCourses = [...courses1M, ...courses2M];
                const totalPossible = allCourses.length * classesList.length; // 8 * 32 = 256
                
                let realizadas = 0;
                let incompletas = 0;
                let noRealizadas = 0;

                allCourses.forEach(course => {
                  classesList.forEach(cls => {
                    const status = registrations[`${course}-${cls}`];
                    if (status === 'green') realizadas++;
                    else if (status === 'yellow') incompletas++;
                    else if (status === 'red') noRealizadas++;
                  });
                });

                const registradas = realizadas + incompletas + noRealizadas;
                const pendientes = totalPossible - registradas;
                const avanceGlobal = totalPossible > 0 ? Math.round((realizadas / totalPossible) * 100) : 0;

                return (
                  <>
                    <div className="stat-card-premium stat-blue">
                      <div className="stat-icon-wrapper"><TrendingUp size={28} /></div>
                      <div className="stat-title">Total Planificadas</div>
                      <div className="stat-value">{totalPossible}</div>
                    </div>
                    <div className="stat-card-premium stat-green">
                      <div className="stat-icon-wrapper"><CheckCircle2 size={28} /></div>
                      <div className="stat-title">Completadas</div>
                      <div className="stat-value">{realizadas}</div>
                    </div>
                    <div className="stat-card-premium stat-yellow">
                      <div className="stat-icon-wrapper"><AlertCircle size={28} /></div>
                      <div className="stat-title">En Proceso</div>
                      <div className="stat-value">{incompletas}</div>
                    </div>
                    <div className="stat-card-premium stat-red">
                      <div className="stat-icon-wrapper"><XCircle size={28} /></div>
                      <div className="stat-title">No Realizadas</div>
                      <div className="stat-value">{noRealizadas}</div>
                    </div>
                    <div className="stat-card-premium stat-purple" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white' }}>
                      <div className="stat-icon-wrapper" style={{ background: 'rgba(255,255,255,0.2)' }}><TrendingUp size={28} /></div>
                      <div className="stat-title" style={{ opacity: 0.9 }}>% Avance Curricular</div>
                      <div className="stat-value" style={{ fontSize: '2.5rem' }}>{avanceGlobal}%</div>
                    </div>
                  </>
                );
              })()}
            </div>


            <div className="reports-details-card">
              <h3><Users size={20} /> Desglose por Curso</h3>
              <div className="reports-table-container">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Curso</th>
                      <th>Total Auditadas</th>
                      <th>Completas</th>
                      <th>Incompletas</th>
                      <th>No Realizadas</th>
                      <th>% Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...courses1M, ...courses2M].map(course => {
                      let realizadas = 0;
                      let incompletas = 0;
                      let noRealizadas = 0;
                      const totalCourse = classesList.length;

                      classesList.forEach(cls => {
                        const status = registrations[`${course}-${cls}`];
                        if (status === 'green') realizadas++;
                        else if (status === 'yellow') incompletas++;
                        else if (status === 'red') noRealizadas++;
                      });

                      const progress = totalCourse > 0 ? Math.round((realizadas / totalCourse) * 100) : 0;

                      return (
                        <tr key={course}>
                          <td className="font-bold">{course}</td>
                          <td>{totalCourse}</td>
                          <td className="text-green">{realizadas}</td>
                          <td className="text-yellow">{incompletas}</td>
                          <td className="text-red">{noRealizadas}</td>
                          <td>
                            <div className="progress-mini-bar">
                              <div className="progress-mini-fill" style={{ width: `${progress}%` }}></div>
                              <span>{progress}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : view === 'courses' ? (
          <div className="course-grid">
            {[
              { id: 'letter-a', name: '1° Medio A', value: '1 Medio A', level: 'Primero Medio', icon: Users },
              { id: 'letter-b', name: '1° Medio B', value: '1 Medio B', level: 'Primero Medio', icon: Users },
              { id: 'letter-c', name: '1° Medio C', value: '1 Medio C', level: 'Primero Medio', icon: Users },
              { id: 'letter-d', name: '1° Medio D', value: '1 Medio D', level: 'Primero Medio', icon: Users },
              { id: 'letter-a', name: '2° Medio A', value: '2 Medio A', level: 'Segundo Medio', icon: Users },
              { id: 'letter-b', name: '2° Medio B', value: '2 Medio B', level: 'Segundo Medio', icon: Users },
              { id: 'letter-c', name: '2° Medio C', value: '2 Medio C', level: 'Segundo Medio', icon: Users },
              { id: 'letter-d', name: '2° Medio D', value: '2 Medio D', level: 'Segundo Medio', icon: Users },
            ].map((course, index) => (
              <div
                key={`${course.id}-${index}`}
                className={`course-card-premium ${course.id}`}
                onClick={() => handleCourseSelect(course.value)}
              >
                <div className="card-glass-overlay"></div>
                <div className="card-icon">
                  <course.icon size={28} />
                </div>
                <div className="card-content">
                  <p>{course.level}</p>
                  <h3>{course.name}</h3>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`class-selection-view ${getCourseColorClass(activeCourse)}`}>
            <div className="view-header">
              <button className="back-btn" onClick={handleBackToCourses}>
                <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
                <span>Volver a Cursos</span>
              </button>
              <div className="current-context">
                <p>Sesiones de seguimiento pedagógico</p>
                <h2>{activeCourse}</h2>
              </div>
            </div>

            <div className="class-grid-modern">
              {sheetData.length > 0 ? (
                sheetData.map((session, idx) => {
                  const registrationId = `${activeCourse}-${session.clase || idx + 1}`;
                  const registeredStatus = registrations[registrationId];

                  return (
                    <div
                      key={idx}
                      className={`class-action-button ${registeredStatus ? `status-${registeredStatus}` : ''}`}
                      onClick={() => handleClassClick(session)}
                    >
                      <div className="cab-accent-border"></div>

                      <div className="cab-content-wrapper">
                        <div className="cab-header-top">
                          <span className="cab-number">#{session.clase || idx + 1}</span>
                          {session.link && (
                            <a
                              href={ensureHttps(session.link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cab-link-btn"
                              onClick={(e) => e.stopPropagation()}
                              title="Ver material adjunto"
                            >
                              <Link2 size={16} />
                            </a>
                          )}
                        </div>

                        <div className="cab-main">
                          <span className="cab-label">Clase {session.clase || idx + 1}</span>
                          <span className="cab-course">{activeCourse}</span>
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
                        {session.docenteRealiza && (
                          <div className="cab-footer-item docente-highlight">
                            <User size={14} />
                            <span>{session.docenteRealiza}</span>
                          </div>
                        )}
                        <div className="cab-footer-item">
                          <Calendar size={14} />
                          <span>{session.dia}, {session.fecha}</span>
                        </div>
                        <div className="cab-footer-item">
                          <Clock size={14} />
                          <span>{session.horario}</span>
                        </div>
                      </div>
                      <div className="cab-gloss-shimmer"></div>
                    </div>
                  );
                })
              ) : (
                <div className="loading-state-cosmic">
                  <div className="cosmic-spinner"></div>
                  <p>{loading ? 'Sincronizando con Google Sheets...' : 'No hay datos disponibles para este curso.'}</p>
                </div>
              )}
            </div>

            {/* Clear the mobile browser's bottom bar */}
            <div className="mobile-bottom-spacer" style={{ height: '120px', width: '100%' }}></div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedClass && (
        <div
          className="modal-overlay-cosmic"
          onClick={() => {
            setSelectedClass(null);
            setShowObservationInput(false);
          }}
        >
          <div
            className="modal-content-premium"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Professional Sheet Handle for Mobile */}
            <div className="modal-sheet-handle"></div>

            <button className="modal-close-btn" onClick={() => {
              setSelectedClass(null);
              setShowObservationInput(false);
            }}>
              <X size={24} />
            </button>

            <div className="modal-header-main-modern">
              <div className="modal-nav-bar">
                <button 
                  className="nav-btn-premium" 
                  onClick={() => {
                    const idx = sheetData.findIndex(c => c === selectedClass);
                    if (idx > 0) setSelectedClass(sheetData[idx - 1]);
                  }}
                  disabled={sheetData.findIndex(c => c === selectedClass) === 0}
                >
                  <ChevronLeft size={24} />
                </button>
                
                <div className="modal-clase-highlight-mini">
                  <span className="clase-label">CLASE</span>
                  <span className="clase-number-mini">{selectedClass.clase}</span>
                </div>

                <button 
                  className="nav-btn-premium" 
                  onClick={() => {
                    const idx = sheetData.findIndex(c => c === selectedClass);
                    if (idx < sheetData.length - 1) setSelectedClass(sheetData[idx + 1]);
                  }}
                  disabled={sheetData.findIndex(c => c === selectedClass) === sheetData.length - 1}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
              
              <div className="modal-title-context">
                <h2>{activeCourse}</h2>
                <div className="modal-logistics-badges">
                  <span className="badge-ios"><Calendar size={14} /> {selectedClass.fecha}</span>
                  <span className="badge-ios"><Clock size={14} /> {selectedClass.dia} | {selectedClass.horario}</span>
                </div>
              </div>
            </div>

            <div className="modal-scroll-area">
              <div className="modal-grid-layout">
                {/* Left Column: Management & Logistics */}
                <div className="modal-column-management">
                  <div className="premium-card-section">
                    <h4 className="section-header-modern">
                      <Sparkles size={18} color="#8B5CF6" /> 
                      Gestión de Estado
                    </h4>
                    <div className="registration-controls-v2">
                      <div className="status-button-grid">
                        <button 
                          className={`status-btn-v2 red ${registrations[`${activeCourse}-${selectedClass.clase}`] === 'red' ? 'active' : ''}`}
                          onClick={() => handleRegisterStatus('red')}
                        >
                          No Realizada
                        </button>
                        <button 
                          className={`status-btn-v2 yellow ${registrations[`${activeCourse}-${selectedClass.clase}`] === 'yellow' ? 'active' : ''}`}
                          onClick={() => handleRegisterStatus('yellow')}
                        >
                          Incompleta
                        </button>
                        <button 
                          className={`status-btn-v2 green ${registrations[`${activeCourse}-${selectedClass.clase}`] === 'green' ? 'active' : ''}`}
                          onClick={() => handleRegisterStatus('green')}
                        >
                          Realizada
                        </button>
                      </div>
                      
                      {registrations[`${activeCourse}-${selectedClass.clase}`] && (
                        <button className="revert-btn-v2" onClick={() => handleRegisterStatus('')}>
                          <XCircle size={14} /> Limpiar registro actual
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="premium-card-section">
                    <h4 className="section-header-modern"><User size={18} color="#8B5CF6" /> Ejecución</h4>
                    <div className="execution-box">
                       <span className="execution-label">Docente en Aula:</span>
                       <span className="execution-value">{selectedClass.docenteRealiza || 'No especificado'}</span>
                    </div>
                    <div className="execution-box secondary">
                       <span className="execution-label">Responsables:</span>
                       <span className="execution-value">{selectedClass.responsable || 'No asignados'}</span>
                    </div>
                  </div>

                  {selectedClass.link && (
                    <div className="premium-card-section">
                      <a
                        href={ensureHttps(selectedClass.link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="modal-link-button-v2"
                      >
                        <MonitorPlay size={20} /> Ver Presentación Digital
                      </a>
                    </div>
                  )}

                  <div className="premium-card-section">
                    <h4 className="section-header-modern"><MessageSquare size={18} color="#8B5CF6" /> Observaciones</h4>
                    <textarea
                      className="modern-textarea"
                      placeholder="Notas sobre la sesión..."
                      value={observations[`${activeCourse}-${selectedClass.clase}`] || ''}
                      onChange={(e) => setObservations(prev => ({
                        ...prev,
                        [`${activeCourse}-${selectedClass.clase}`]: e.target.value
                      }))}
                    />
                  </div>
                </div>

                {/* Right Column: Pedagogical Content */}
                <div className="modal-column-content">
                  <div className="content-card-premium">
                    <div className="content-card-header">
                      <Target size={20} color="#8B5CF6" />
                      <span>Objetivo de Aprendizaje</span>
                    </div>
                    <div className="content-card-body">{selectedClass.objetivo || 'Sin objetivo definido'}</div>
                  </div>

                  <div className="content-card-premium">
                    <div className="content-card-header">
                      <BookOpen size={20} color="#8B5CF6" />
                      <span>Contenido Curricular</span>
                    </div>
                    <div className="content-card-body">{selectedClass.contenido || 'Sin contenido definido'}</div>
                  </div>

                  <div className="content-card-premium">
                    <div className="content-card-header">
                      <ClipboardList size={20} color="#8B5CF6" />
                      <span>Actividad Programada</span>
                    </div>
                    <div className="content-card-body">{selectedClass.actividad || 'Sin actividad definida'}</div>
                  </div>

                  <div className="content-card-premium">
                    <div className="content-card-header">
                      <Palette size={20} color="#8B5CF6" />
                      <span>Diseño y Materiales</span>
                    </div>
                    <div className="content-card-body">{selectedClass.diseno || 'Sin especificaciones'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div className={`success-overlay-premium ${lastRegisteredColor}`}>
          <div className="success-content-card">
            <div className="success-icon-container">
              <CheckCircle2 size={70} />
            </div>
            <h2>REGISTRO EXITOSO</h2>
            <p>La información se ha sincronizado correctamente.</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-cosmic">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
