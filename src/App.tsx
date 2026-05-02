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
  Menu,
  Globe
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
  let s = String(url).trim();
  if (!s || s === 'null') return '#';
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  
  // Si es un enlace de Canva incompleto
  if (s.toLowerCase().includes('canva.com')) {
    return `https://${s.replace(/^https?:\/\//, '')}`;
  }

  // Si es un nombre de archivo .pptx (o similar)
  if (s.toLowerCase().match(/\.(pptx|pdf|docx|xlsx|zip)$/)) {
    // Si tiene espacios o no parece URL, buscamos directamente en Google Drive del usuario
    if (s.includes(' ') || !s.includes('.')) {
      return `https://drive.google.com/drive/search?q=${encodeURIComponent(s)}`;
    }
    return `https://${s}`;
  }

  // Validación estándar de URL
  if (s.includes('.') && !s.includes(' ')) {
    return `https://${s}`;
  }
  
  // Fallback: búsqueda en Drive para cualquier texto descriptivo que no sea URL
  if (s.length > 3) {
    return `https://drive.google.com/drive/search?q=${encodeURIComponent(s)}`;
  }

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

  const canvaIdx = findIdx('canva');
  const pptxIdx = findIdx('pptx');
  const presIdx = findIdx('presentación');
  const presIdx2 = findIdx('presentacion');

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
    canva: canvaIdx !== -1 ? canvaIdx : (is1M ? 12 : 11),
    pptx: pptxIdx !== -1 ? pptxIdx : (presIdx !== -1 ? presIdx : (presIdx2 !== -1 ? presIdx2 : (is1M ? 13 : (findIdx('link') !== -1 ? findIdx('link') : -1)))),
    link: findIdx('link') !== -1 ? findIdx('link') : (canvaIdx !== -1 ? canvaIdx : (presIdx !== -1 ? presIdx : (presIdx2 !== -1 ? presIdx2 : (findIdx('material') !== -1 ? findIdx('material') : (is1M ? 12 : 11))))),
    sites: findIdx('sites') !== -1 ? findIdx('sites') : (findIdx('google site') !== -1 ? findIdx('google site') : (findIdx('google sites') !== -1 ? findIdx('google sites') : -1))
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
    const saved = localStorage.getItem('zenit_registrations_v1');
    const base = saved ? JSON.parse(saved) : {};
    
    // Auto-populate first 9 classes if not present
    const courses = ['1MA', '1MB', '1MC', '1MD', '2MA', '2MB', '2MC', '2MD'];
    let changed = false;
    courses.forEach(c => {
      for (let i = 1; i <= 32; i++) {
        const key = `${c}-${i}`;
        if (!base[key] && i <= 9) {
          base[key] = 'green';
          changed = true;
        }
      }
    });
    
    if (changed) {
      localStorage.setItem('zenit_registrations_v1', JSON.stringify(base));
    }
    
    return base;
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastRegisteredColor, setLastRegisteredColor] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState({ title: 'REGISTRO EXITOSO', sub: 'La información se ha sincronizado correctamente.' });

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
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<any | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('zenit_registrations_v1', JSON.stringify(registrations));
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
          const jsonStr1 = text1.substring(text1.indexOf('{'), text1.lastIndexOf('}') + 1);
          const j1 = JSON.parse(jsonStr1);

          const res2 = await fetch(`https://docs.google.com/spreadsheets/d/${SEGUNDO_MEDIO_SHEET}/gviz/tq?tqx=out:json&gid=0`);
          const text2 = await res2.text();
          const jsonStr2 = text2.substring(text2.indexOf('{'), text2.lastIndexOf('}') + 1);
          const j2 = JSON.parse(jsonStr2);

          const pmIdx = getColumnIndices(j1.table, true);
          const smIdx = getColumnIndices(j2.table, false);

          let pmRows = (j1.table && j1.table.rows) ? j1.table.rows.filter((r: any) => r && r.c && r.c[pmIdx.clase]?.v) : [];
          let smRows = (j2.table && j2.table.rows) ? j2.table.rows.filter((r: any) => r && r.c && r.c[smIdx.clase]?.v) : [];

          // Corrector algorítmico de feriados sobre tabla original
          pmRows = applyDateShifting(pmRows, pmIdx.fecha);
          smRows = applyDateShifting(smRows, smIdx.fecha);

          setGlobalData({
            pm: pmRows.map((r: any) => {
              const rawDate = parseGoogleDate(r.c[pmIdx.fecha]?.v);
              const rawDocente = String(r.c[pmIdx.docente]?.v || "") === "null" ? "" : String(r.c[pmIdx.docente]?.v || "");
              
              const getBestLink = (i: number) => {
                const cell = (r.c && r.c[i]) ? r.c[i] : null;
                if (!cell) return null;
                if (cell.l) return cell.l;
                const v = String(cell.v || "").trim();
                if (v === "" || v === "null") return null;
                if (v.toLowerCase().startsWith('http') || v.toLowerCase().includes('canva.com') || v.toLowerCase().endsWith('.pptx')) return v;
                return null;
              };

              const linkValue = getBestLink(pmIdx.link);
              let finalLink = linkValue;
              if (!finalLink && (rawDocente.toLowerCase().includes('http') || rawDocente.toLowerCase().includes('canva.com'))) {
                finalLink = rawDocente;
              }

              return {
                clase: String(r.c[pmIdx.clase]?.v),
                fecha: r.c[pmIdx.fecha]?.f || r.c[pmIdx.fecha]?.v,
                rawFecha: rawDate,
                dia: String(r.c[pmIdx.dia]?.v || ""),
                horario: String(r.c[pmIdx.horario]?.v || ""),
                etapa: String(r.c[pmIdx.etapa]?.v || ""),
                objetivo: String(r.c[pmIdx.objetivo]?.v || ""),
                contenido: String(r.c[pmIdx.contenido]?.v || ""),
                actividad: String(r.c[pmIdx.actividad]?.v || ""),
                responsable: String(r.c[pmIdx.responsable]?.v || ""),
                diseno: String(r.c[pmIdx.diseno]?.v || ""),
                docenteRealiza: getTeacherForCourse(rawDocente, '1 Medio A'),
                rawDocente: rawDocente, 
                link: finalLink,
                sitesLink: (() => {
                  const val = getBestLink(pmIdx.sites) || getBestLink(pmIdx.link);
                  return (val && (val.includes('sites.google.com') || val.includes('google.com/site'))) ? val : null;
                })(),
                canvaLink: (() => {
                  // Buscamos en columna canva, diseno o link general
                  const val = getBestLink(pmIdx.canva) || getBestLink(pmIdx.diseno) || getBestLink(pmIdx.link);
                  return (val && (val.includes('canva.com') || val.includes('design'))) ? val : null;
                })(),
                pptLink: (() => {
                  // Buscamos en columna pptx o link general
                  const val = (pmIdx.pptx !== -1 ? getBestLink(pmIdx.pptx) : null) || getBestLink(pmIdx.link);
                  return (val && (val.toLowerCase().endsWith('.pptx') || val.includes('presentation') || val.includes('drive.google.com'))) ? val : null;
                })()
              };
            }),
            sm: smRows.map((r: any) => {
              const rawDate = parseGoogleDate(r.c[smIdx.fecha]?.v);
              const rawDocente = String(r.c[smIdx.docente]?.v || "") === "null" ? "" : String(r.c[smIdx.docente]?.v || "");
              
              const getBestLink = (i: number) => {
                const cell = (r.c && r.c[i]) ? r.c[i] : null;
                if (!cell) return null;
                if (cell.l) return cell.l;
                const v = String(cell.v || "").trim();
                if (v === "" || v === "null") return null;
                if (v.toLowerCase().startsWith('http') || v.toLowerCase().includes('canva.com') || v.toLowerCase().endsWith('.pptx')) return v;
                return null;
              };

              const linkValue = getBestLink(smIdx.link);
              let finalLink = linkValue;
              if (!finalLink && (rawDocente.toLowerCase().includes('http') || rawDocente.toLowerCase().includes('canva.com'))) {
                finalLink = rawDocente;
              }

              return {
                clase: String(r.c[smIdx.clase]?.v),
                fecha: r.c[smIdx.fecha]?.f || r.c[smIdx.fecha]?.v,
                rawFecha: rawDate,
                dia: String(r.c[smIdx.dia]?.v || ""),
                horario: String(r.c[smIdx.horario]?.v || ""),
                etapa: String(r.c[smIdx.etapa]?.v || ""),
                objetivo: String(r.c[smIdx.objetivo]?.v || ""),
                contenido: String(r.c[smIdx.contenido]?.v || ""),
                actividad: String(r.c[smIdx.actividad]?.v || ""),
                responsable: String(r.c[smIdx.responsable]?.v || ""),
                diseno: String(r.c[smIdx.diseno]?.v || ""),
                docenteRealiza: getTeacherForCourse(rawDocente, '2 Medio A'),
                rawDocente: rawDocente,
                link: finalLink,
                sitesLink: (() => {
                  const val = getBestLink(smIdx.sites) || getBestLink(smIdx.link);
                  return (val && (val.includes('sites.google.com') || val.includes('google.com/site'))) ? val : null;
                })(),
                canvaLink: (() => {
                  const val = getBestLink(smIdx.canva) || getBestLink(smIdx.diseno) || getBestLink(smIdx.link);
                  return (val && (val.includes('canva.com') || val.includes('design'))) ? val : null;
                })(),
                pptLink: (() => {
                  const val = (smIdx.pptx !== -1 ? getBestLink(smIdx.pptx) : null) || getBestLink(smIdx.link);
                  return (val && (val.toLowerCase().endsWith('.pptx') || val.includes('presentation') || val.includes('drive.google.com'))) ? val : null;
                })()
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
  }, [view]);

  const getCourseTag = (courseName: string | null) => {
    if (!courseName) return '';
    if (courseName === 'Resumen') return 'RESUMEN';
    const parts = courseName.split(' ');
    // "1 Medio A" -> "1" + "M" + "A" = "1MA"
    return (parts[0] + 'M' + parts[parts.length - 1]).toUpperCase();
  };

  const getTeacherForCourse = (raw: string, courseName: string | null) => {
    if (!raw || !courseName) return raw;
    const tag = getCourseTag(courseName);
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
              if (v === "" || v === "null") return null;
              if (v.toLowerCase().startsWith('http') || v.toLowerCase().includes('canva.com') || v.toLowerCase().endsWith('.pptx')) return v;
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
              link: finalLink,
              sitesLink: (() => {
                const val = getBestLink(idx.sites) || getBestLink(idx.link);
                return (val && (val.includes('sites.google.com') || val.includes('google.com/site'))) ? val : null;
              })(),
              canvaLink: (() => {
                const val = getBestLink(idx.canva) || getBestLink(idx.diseno) || getBestLink(idx.link);
                return (val && (val.includes('canva.com') || val.includes('design'))) ? val : null;
              })(),
              pptLink: (() => {
                const val = (idx.pptx !== -1 ? getBestLink(idx.pptx) : null) || getBestLink(idx.link);
                return (val && (val.toLowerCase().endsWith('.pptx') || val.includes('presentation') || val.includes('drive.google.com'))) ? val : null;
              })()
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

    const courseTag = getCourseTag(activeCourse);
    const clsId = String(selectedClass.clase || "").replace(/[^0-9]/g, '');
    const registrationId = `${courseTag}-${clsId}`;

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

    setSuccessInfo({
      title: 'REGISTRO EXITOSO',
      sub: 'El estado de la clase se ha actualizado correctamente.'
    });
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
              <span className="inst-name-small">Liceo William Taylor</span>
              <span className="inst-role-small">Administrador</span>
            </div>
          </div>

          <div className="sidebar-version">
            ZenitApp versión 1.1.09
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
                      <button className="nav-btn-circle" onClick={() => { setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1)); setSelectedCalendarDay(null); }}>
                        <ChevronLeft size={16} />
                      </button>
                      <button className="ios-today-btn" onClick={() => { setCurrentCalendarDate(new Date()); setSelectedCalendarDay(null); }}>
                        Hoy
                      </button>
                      <button className="nav-btn-circle" onClick={() => { setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1)); setSelectedCalendarDay(null); }}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {!selectedCalendarDay ? (
                  <div className="calendar-grid">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map(d => (
                      <div key={d} className="weekday-header">{d}</div>
                    ))}

                    {calendarDays.filter(d => d.date.getDay() !== 0 && d.date.getDay() !== 6).map((d, idx) => {
                      const isToday = d.date.toDateString() === today.toDateString();
                      const dateStr = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
                      
                      const pmClases = activeLevels.includes('1M') ? globalData.pm.filter(c => c.rawFecha && c.rawFecha.toDateString() === d.date.toDateString()) : [];
                      const smClases = activeLevels.includes('2M') ? globalData.sm.filter(c => c.rawFecha && c.rawFecha.toDateString() === d.date.toDateString()) : [];
                      const daySpecialEvents = specialEvents.filter(ev => ev.date === dateStr);

                      const hasActivity = pmClases.length > 0 || smClases.length > 0 || daySpecialEvents.length > 0;

                      return (
                        <div 
                          key={idx} 
                          className={`calendar-day-cell ${!d.currentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${isHoliday(d.date) ? 'holiday-bg' : ''} ${hasActivity ? 'has-activity' : ''}`}
                          onClick={() => setSelectedCalendarDay({ date: d.date, pm: pmClases, sm: smClases, special: daySpecialEvents })}
                        >
                          <div className="day-number">{d.day}</div>
                          <div className="day-events-container">
                            {pmClases.map((c, i) => {
                              const clsId = String(c.clase || "").replace(/[^0-9]/g, '');
                              const status = registrations[`1MA-${clsId}`] || registrations[`1MB-${clsId}`] || registrations[`1MC-${clsId}`] || registrations[`1MD-${clsId}`];
                              return (
                                <div 
                                  key={`pm-${i}`} 
                                  className={`event-dot-compact ev-1m clickable status-${status || 'none'}`}
                                  onClick={(e) => { e.stopPropagation(); setActiveCourse(c.curso || '1 Medio A'); setSelectedClass(c); }}
                                >
                                  {status === 'completa' && <CheckCircle2 size={10} className="status-mini-icon" />}
                                  {status === 'pendiente' && <AlertCircle size={10} className="status-mini-icon" />}
                                  {status === 'no-realizada' && <XCircle size={10} className="status-mini-icon" />}
                                  Clase {c.clase}
                                </div>
                              );
                            })}
                            {smClases.map((c, i) => {
                              const clsId = String(c.clase || "").replace(/[^0-9]/g, '');
                              const status = registrations[`2MA-${clsId}`] || registrations[`2MB-${clsId}`] || registrations[`2MC-${clsId}`] || registrations[`2MD-${clsId}`];
                              return (
                                <div 
                                  key={`sm-${i}`} 
                                  className={`event-dot-compact ev-2m clickable status-${status || 'none'}`}
                                  onClick={(e) => { e.stopPropagation(); setActiveCourse(c.curso || '2 Medio A'); setSelectedClass(c); }}
                                >
                                  {status === 'completa' && <CheckCircle2 size={10} className="status-mini-icon" />}
                                  {status === 'pendiente' && <AlertCircle size={10} className="status-mini-icon" />}
                                  {status === 'no-realizada' && <XCircle size={10} className="status-mini-icon" />}
                                  Clase {c.clase}
                                </div>
                              );
                            })}
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
                ) : (
                  <div className="selected-day-focus-view">
                    <div className="focus-view-header">
                      <button className="back-to-grid-btn" onClick={() => setSelectedCalendarDay(null)}>
                        <ChevronLeft size={20} /> Volver al Mes
                      </button>
                      <div className="focus-date-title">
                        <h3>{selectedCalendarDay.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                      </div>
                    </div>

                    <div className="focus-activities-grid">
                      <div className="focus-section">
                        <h4><BookOpen size={18} /> Clases Programadas</h4>
                        <div className="focus-cards-list">
                          {[...selectedCalendarDay.pm, ...selectedCalendarDay.sm].map((c, i) => (
                            <div key={i} className={`focus-activity-card ${c.rawFecha && c.rawFecha.toDateString().includes('1M') ? 'ev-1m' : 'ev-2m'}`} onClick={() => { setActiveCourse(c.curso || (selectedCalendarDay.pm.includes(c) ? '1 Medio A' : '2 Medio A')); setSelectedClass(c); }}>
                              <div className="focus-card-meta">
                                <span className="focus-clase-num">CLASE N° {c.clase}</span>
                                <span className="focus-clase-time"><Clock size={12} /> {c.horario}</span>
                              </div>
                              <p className="focus-clase-obj">{c.objetivo || 'Sin objetivo definido'}</p>
                              <div className="focus-card-footer">
                                <span><User size={12} /> {c.docenteRealiza}</span>
                              </div>
                            </div>
                          ))}
                          {selectedCalendarDay.pm.length === 0 && selectedCalendarDay.sm.length === 0 && (
                            <p className="empty-focus">No hay clases registradas para este día.</p>
                          )}
                        </div>
                      </div>

                      <div className="focus-section">
                        <h4><Sparkles size={18} /> Eventos y Especiales</h4>
                        <div className="focus-cards-list">
                          {selectedCalendarDay.special.map((ev: any, i: number) => (
                            <div key={i} className="focus-activity-card ev-spec">
                              <span className="focus-clase-num">{ev.title}</span>
                              <span className="focus-clase-time">{ev.type}</span>
                            </div>
                          ))}
                          {selectedCalendarDay.special.length === 0 && (
                            <p className="empty-focus">No hay eventos especiales.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="calendar-event-sidebar">
                {/* ... existing sidebar content ... */}
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
                      <div className="modern-form-row title-row">
                        <div className="modern-row-icon icon-blue"><Type size={24} /></div>
                        <input name="title" type="text" placeholder="Título de la Actividad..." required />
                      </div>

                      <div className="modern-form-row">
                        <div className="modern-row-icon icon-red"><Calendar size={20} /></div>
                        <div className="modern-row-content">
                          <label>Fecha del Evento</label>
                          <input name="date" type="date" required />
                        </div>
                      </div>

                      <div className="modern-form-row">
                        <div className="modern-row-icon icon-green"><Bookmark size={20} /></div>
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
          let teacherStats: Record<string, { realizadas: number, incompletas: number, noRealizadas: number, total: number, classLog: any[] }> = {};

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
                const courseTag = getCourseTag(course);
                // Robust key extraction: handles "1", "Clase 1", 1, etc.
                const clsId = String(clase.clase || "").replace(/[^0-9]/g, '');
                const status = registrations[`${courseTag}-${clsId}`];

                // Track stats by teacher
                const docName = getTeacherForCourse(clase.rawDocente || clase.docenteRealiza || clase.responsable, course);
                if (!docName || docName.trim() === "" || docName.toLowerCase().includes("sin asignar")) return;
                
                if (!teacherStats[docName]) {
                  teacherStats[docName] = { realizadas: 0, incompletas: 0, noRealizadas: 0, total: 0, classLog: [] };
                }
                
                teacherStats[docName].total++;
                teacherStats[docName].classLog.push({ 
                  num: clsId, 
                  course: courseTag, 
                  status: status || 'pending' 
                });

                if (status === 'green') {
                  aggregatedStats.realizadas++;
                  teacherStats[docName].realizadas++;
                } else if (status === 'yellow') {
                  aggregatedStats.incompletas++;
                  teacherStats[docName].incompletas++;
                } else if (status === 'red') {
                  aggregatedStats.noRealizadas++;
                  teacherStats[docName].noRealizadas++;
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
                                .sort((a, b) => {
                                  const adheA = a[1].total > 0 ? (a[1].realizadas / a[1].total) : 0;
                                  const adheB = b[1].total > 0 ? (b[1].realizadas / b[1].total) : 0;
                                  return adheB - adheA;
                                })
                                .map(([name, stats]) => {
                                  const adhe = stats.total > 0 ? Math.round((stats.realizadas / stats.total) * 100) : 0;
                                  let statusClass = 'status-bad';
                                  let statusText = 'REQUIERE APOYO';
                                  if (adhe >= 90) { statusClass = 'status-perfect'; statusText = 'EXCELENTE'; }
                                  else if (adhe >= 70) { statusClass = 'status-good'; statusText = 'ÓPTIMO'; }
                                  else if (adhe >= 50) { statusClass = 'status-warning'; statusText = 'EN PROGRESO'; }

                                  return (
                                    <tr key={name}>
                                      <td className="docente-name-cell">
                                        <div className="teacher-avatar-mini">
                                          {name.charAt(0)}
                                        </div>
                                        <div className="teacher-info-stack">
                                          <span className="teacher-name-main">{name}</span>
                                          <span className={`teacher-status-badge ${statusClass}`}>{statusText}</span>
                                        </div>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <span className="count-badge total">{stats.total}</span>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <span className="count-badge done">{stats.realizadas}</span>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <span className="count-badge process">{stats.incompletas}</span>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <span className="count-badge fail">{stats.noRealizadas}</span>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <div className="premium-adherence-cell">
                                          <div className="pac-progress-bar">
                                            <div className="pac-fill" style={{ width: `${adhe}%`, backgroundColor: adhe >= 90 ? '#10b981' : adhe >= 70 ? '#0ea5e9' : '#f59e0b' }}></div>
                                          </div>
                                          <span className="pac-value">{adhe}%</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Detailed Teacher Logs Section */}
                      <div className="reports-details-card" style={{ marginTop: '2rem' }}>
                        <div className="section-title-premium">
                          <BookOpen size={22} color="#0EA5E9" />
                          <h3>Detalle de Clases por Docente</h3>
                        </div>
                        <div className="teachers-detail-grid">
                          {Object.entries(teacherStats)
                            .sort((a, b) => a[0].localeCompare(b[0]))
                            .map(([name, stats]) => {
                              return (
                                <div key={name} className="teacher-detail-card">
                                  <div className="tdc-header">
                                    <div className="tdc-avatar">{name.charAt(0)}</div>
                                    <div className="tdc-info">
                                      <h4>{name}</h4>
                                      <span>{stats.realizadas} de {stats.total} completadas</span>
                                    </div>
                                  </div>
                                  <div className="tdc-classes-tags">
                                    {stats.classLog
                                      .sort((a, b) => parseInt(a.num) - parseInt(b.num))
                                      .map((log, idx) => (
                                        <div key={idx} className={`class-tag-mini ${log.status}`}>
                                          <span className="ctm-num">C{log.num}</span>
                                          <span className="ctm-course">{log.course}</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      {/* Observations Log Section */}
                      <div className="reports-details-card" style={{ marginTop: '2rem' }}>
                        <div className="section-title-premium">
                          <MessageSquare size={22} color="#8B5CF6" />
                          <h3>Bitácora de Observaciones Pedagógicas</h3>
                        </div>
                        <div className="observations-log-grid">
                          {Object.entries(observations).filter(([_, text]) => text.trim().length > 0).length > 0 ? (
                            Object.entries(observations)
                              .filter(([_, text]) => text.trim().length > 0)
                              .map(([id, text]) => {
                                const [course, className] = id.split('-');
                                const status = registrations[id];
                                
                                // Try to find teacher in global data
                                let teacher = "Docente no especificado";
                                const courseData = course.startsWith('1') ? globalData.pm : globalData.sm;
                                const session = courseData.find((s: any) => s.clase === className);
                                if (session) teacher = session.docenteRealiza || session.responsable || teacher;

                                return (
                                  <div key={id} className={`observation-log-card ${status || 'pending'}`}>
                                    <div className="olc-header">
                                      <span className="olc-course">{course}</span>
                                      <span className="olc-class">Clase {className}</span>
                                      <div className={`olc-status-dot ${status || 'pending'}`}></div>
                                    </div>
                                    <div className="olc-teacher">
                                      <Users size={12} />
                                      <span>{teacher}</span>
                                    </div>
                                    <p className="olc-text">"{text}"</p>
                                  </div>
                                );
                              })
                          ) : (
                            <div className="no-observations-notice">
                              <p>No se han registrado observaciones aún.</p>
                            </div>
                          )}
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
                © {new Date().getFullYear()} Liceo Bicentenario William Taylor de Alto Hospicio - Unidad de Innovación Pedagógica - ZenitApp Professional v1.1.04
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
                  const courseTag = getCourseTag(course);
                  classesList.forEach((_, i) => {
                    const clsNum = i + 1;
                    const status = registrations[`${courseTag}-${clsNum}`];
                    if (status === 'green') realizadas++;
                    else if (status === 'yellow') incompletas++;
                    else if (status === 'red') noRealizadas++;
                  });
                });

                // const registradas = realizadas + incompletas + noRealizadas;
                // const pendientes = totalPossible - registradas;
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

                      const courseTag = getCourseTag(course);
                      classesList.forEach((_, i) => {
                        const clsNum = i + 1;
                        const status = registrations[`${courseTag}-${clsNum}`];
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
          <div className="main-dashboard-container">
            {/* Dashboard Overview Header */}
            <div className="dashboard-overview-header">
              <div className="welcome-banner-modern">
                <div className="banner-text">
                  <span className="banner-badge">Panel de Gestión Curricular</span>
                  <h1>Bienvenido al Seguimiento de Proyectos</h1>
                  <p>Liceo Bicentenario William Taylor de Alto Hospicio • Gestión de proyectos 2026</p>
                </div>
                <div className="banner-visual">
                  <Sparkles size={120} className="floating-sparkle" />
                </div>
              </div>

              <div className="dashboard-summary-row">
                {(() => {
                  const allCourses = [...courses1M, ...courses2M];
                  const totalPossible = allCourses.length * classesList.length;
                  let realizadas = 0;
                  allCourses.forEach(course => {
                    const courseTag = getCourseTag(course);
                    classesList.forEach((_, i) => {
                      const clsNum = i + 1;
                      if (registrations[`${courseTag}-${clsNum}`] === 'green') realizadas++;
                    });
                  });
                  const adherence = totalPossible > 0 ? Math.round((realizadas / totalPossible) * 100) : 0;

                  return (
                    <>
                      <div className="summary-stat-item">
                        <div className="stat-item-icon blue"><BookOpen size={24} /></div>
                        <div className="stat-item-info">
                          <span className="stat-label">Cursos Activos</span>
                          <span className="stat-value">{allCourses.length} cursos disponibles</span>
                        </div>
                      </div>
                      <div className="summary-stat-item">
                        <div className="stat-item-icon green"><TrendingUp size={24} /></div>
                        <div className="stat-item-info">
                          <span className="stat-label">Adherencia Global</span>
                          <span className="stat-value">{adherence}%</span>
                        </div>
                      </div>
                      <div className="summary-stat-item">
                        <div className="stat-item-icon purple"><Calendar size={24} /></div>
                        <div className="stat-item-info">
                          <span className="stat-label">Total Sesiones</span>
                          <span className="stat-value">{totalPossible}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

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
        </div>
        ) : (
          <div className={`class-selection-view ${getCourseColorClass(activeCourse)}`}>
            <div className="view-header">
              <div className="view-header-flex">
                <button className="back-btn-modern" onClick={handleBackToCourses}>
                  <ChevronLeft size={20} />
                  <span>Cursos</span>
                </button>
                <div className="current-context">
                  <p>Sesiones de seguimiento pedagógico</p>
                  <h2>{activeCourse}</h2>
                </div>
                <button className="close-view-btn" onClick={handleBackToCourses}>
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="class-grid-modern">
              {sheetData.length > 0 ? (
                sheetData.map((session, idx) => {
                  const courseTag = getCourseTag(activeCourse);
                  const clsId = String(session.clase || idx + 1).replace(/[^0-9]/g, '');
                  const registrationId = `${courseTag}-${clsId}`;
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
                          <div className="cab-materials-badges">
                            {session.canvaLink && (
                              <div className="material-symbol-pro canva" title="Material Canva disponible">
                                <MonitorPlay size={14} />
                                <span>CANVA</span>
                              </div>
                            )}
                            {session.pptLink && (
                              <div className="material-symbol-pro ppt" title="Presentación PPTX disponible">
                                <LayoutGrid size={14} />
                                <span>PPTX</span>
                              </div>
                            )}
                          </div>
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
          }}
        >
          <div
            className="modal-content-premium"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Professional Sheet Handle for Mobile */}
            <div className="modal-sheet-handle"></div>

            <button className="modal-close-btn-pro" onClick={() => setSelectedClass(null)} title="Cerrar detalle">
              <X size={24} />
            </button>

            <div className="modal-header-compact">
              <div className="modal-header-left">
                <div className="modal-clase-num-badge">#{selectedClass.clase}</div>
                <div className="modal-header-info">
                  <h2>{activeCourse}</h2>
                  <p>{selectedClass.dia} | {selectedClass.horario} • {selectedClass.fecha}</p>
                </div>
              </div>
            </div>

            <div className="modal-scroll-area">
              <div className="modal-vertical-stack">
                {/* Gestión de Estado */}
                <div className="premium-card-section">
                  <h4 className="section-header-modern">
                    <Sparkles size={18} color="#8B5CF6" />
                    Gestión de Estado
                  </h4>
                  <div className="registration-controls-v2">
                    <div className="status-button-grid-pro">
                      <button
                        className={`status-btn-pro red ${registrations[`${getCourseTag(activeCourse)}-${String(selectedClass.clase || "").replace(/[^0-9]/g, '')}`] === 'red' ? 'active' : ''}`}
                        onClick={() => handleRegisterStatus('red')}
                      >
                        <XCircle size={24} />
                        <span>NO REALIZADA</span>
                      </button>
                      <button
                        className={`status-btn-pro yellow ${registrations[`${getCourseTag(activeCourse)}-${String(selectedClass.clase || "").replace(/[^0-9]/g, '')}`] === 'yellow' ? 'active' : ''}`}
                        onClick={() => handleRegisterStatus('yellow')}
                      >
                        <AlertCircle size={24} />
                        <span>INCOMPLETA</span>
                      </button>
                      <button
                        className={`status-btn-pro green ${registrations[`${getCourseTag(activeCourse)}-${selectedClass.clase}`] === 'green' ? 'active' : ''}`}
                        onClick={() => handleRegisterStatus('green')}
                      >
                        <CheckCircle2 size={24} />
                        <span>REALIZADA</span>
                      </button>
                    </div>

                    {registrations[`${getCourseTag(activeCourse)}-${selectedClass.clase}`] && (
                      <button className="revert-btn-v2" onClick={() => handleRegisterStatus('')}>
                        <XCircle size={14} /> Limpiar registro actual
                      </button>
                    )}
                  </div>
                </div>

                {/* Ejecución */}
                <div className="premium-card-section">
                  <h4 className="section-header-modern"><User size={18} color="#8B5CF6" /> Ejecución y Responsables</h4>
                  <div className="execution-row-pro">
                    <div className="execution-box">
                      <span className="execution-label">Docente en Aula:</span>
                      <span className="execution-value">{selectedClass.docenteRealiza || 'No especificado'}</span>
                    </div>
                    <div className="execution-box secondary">
                      <span className="execution-label">Responsables:</span>
                      <span className="execution-value">{selectedClass.responsable || 'No asignados'}</span>
                    </div>
                  </div>
                </div>

                {/* Materiales */}
                {(selectedClass.canvaLink || selectedClass.pptLink || selectedClass.sitesLink) && (
                  <div className="premium-card-section">
                    <h4 className="section-header-modern"><LayoutGrid size={18} color="#8B5CF6" /> Materiales Pedagógicos</h4>
                    <div className="materials-grid-pro">
                      {selectedClass.canvaLink && (
                        <a href={ensureHttps(selectedClass.canvaLink)} target="_blank" rel="noopener noreferrer" className="material-btn-pro canva-style">
                          <MonitorPlay size={20} /> Ver en Canva
                        </a>
                      )}
                      {selectedClass.pptLink && (
                        <a href={ensureHttps(selectedClass.pptLink)} target="_blank" rel="noopener noreferrer" className="material-btn-pro canva-style ppt-variant">
                          <LayoutGrid size={20} /> Ver Presentación PPTX
                        </a>
                      )}
                      {selectedClass.sitesLink && (
                        <a href={ensureHttps(selectedClass.sitesLink)} target="_blank" rel="noopener noreferrer" className="material-btn-pro canva-style sites-variant">
                          <Globe size={20} /> Google Sites
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Contenido Pedagógico */}
                <div className="content-stack-pro">
                  <div className="content-card-premium">
                    <div className="content-card-header"><Target size={20} color="#8B5CF6" /><span>Objetivo de Aprendizaje</span></div>
                    <div className="content-card-body">{selectedClass.objetivo || 'Sin objetivo definido'}</div>
                  </div>

                  <div className="content-card-premium">
                    <div className="content-card-header"><BookOpen size={20} color="#8B5CF6" /><span>Contenido Curricular</span></div>
                    <div className="content-card-body">{selectedClass.contenido || 'Sin contenido definido'}</div>
                  </div>

                  <div className="content-card-premium">
                    <div className="content-card-header"><ClipboardList size={20} color="#8B5CF6" /><span>Actividad Programada</span></div>
                    <div className="content-card-body">{selectedClass.actividad || 'Sin actividad definida'}</div>
                  </div>

                  <div className="content-card-premium">
                    <div className="content-card-header"><Palette size={20} color="#8B5CF6" /><span>Diseño y Materiales</span></div>
                    <div className="content-card-body">{selectedClass.diseno || 'Sin especificaciones'}</div>
                  </div>
                </div>

                {/* Observaciones */}
                <div className="premium-card-section">
                  <h4 className="section-header-modern"><MessageSquare size={18} color="#8B5CF6" /> Observaciones de la Sesión</h4>
                  <textarea
                    className="modern-textarea"
                    placeholder="Escribe notas relevantes sobre el desarrollo de la clase..."
                    value={observations[`${activeCourse}-${selectedClass.clase}`] || ''}
                    onChange={(e) => setObservations(prev => ({
                      ...prev,
                      [`${activeCourse}-${selectedClass.clase}`]: e.target.value
                    }))}
                  />
                   <button 
                    className="btn-save-observation"
                    onClick={() => {
                      setSuccessInfo({
                        title: 'OBSERVACIÓN GUARDADA',
                        sub: 'Las notas pedagógicas se han registrado con éxito.'
                      });
                      setLastRegisteredColor('info');
                      setShowSuccess(true);
                      
                      // Volver a los recuadros anteriores (cerrar modal)
                      setTimeout(() => {
                        setShowSuccess(false);
                        setSelectedClass(null);
                        setLastRegisteredColor(null);
                      }, 2000);
                      
                      showToast('Observación guardada con éxito');
                    }}
                  >
                    <ClipboardCheck size={18} /> Guardar Observación
                  </button>
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
            <div className="success-icon-container" style={{ color: lastRegisteredColor === 'info' ? '#7c3aed' : '' }}>
              <CheckCircle2 size={70} />
            </div>
            <h2>{successInfo.title}</h2>
            <p>{successInfo.sub}</p>
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
