import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Menu, 
  CheckCircle2
} from 'lucide-react';
import './App.css';

// Components
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ClassListView from './components/ClassListView';
import ClassModal from './components/ClassModal';
import CalendarView from './components/CalendarView';
import ReportsView from './components/ReportsView';
import AnalyticsView from './components/AnalyticsView';
import FormativeTrackingView from './components/FormativeTrackingView';
import Toast from './components/Toast';

// Utils

type Course = '1 Medio A' | '1 Medio B' | '1 Medio C' | '1 Medio D' |
  '2 Medio A' | '2 Medio B' | '2 Medio C' | '2 Medio D' | 'Resumen';

const courses1M: Course[] = ['1 Medio A', '1 Medio B', '1 Medio C', '1 Medio D'];
const courses2M: Course[] = ['2 Medio A', '2 Medio B', '2 Medio C', '2 Medio D'];
const classesList = Array.from({ length: 32 }, (_, i) => `Clase ${i + 1}`);

export default function App() {
  const [view, setView] = useState('courses');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [registrations, setRegistrations] = useState<Record<string, string>>({});
  const [formativeRegistrations, setFormativeRegistrations] = useState<Record<string, any>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalData, setGlobalData] = useState<{ pm: any[], sm: any[] }>({ pm: [], sm: [] });
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: '', sub: '' });
  const [lastRegisteredColor, setLastRegisteredColor] = useState<string | null>(null);

  // Analytics & Calendar States
  const [analyticsLevel, setAnalyticsLevel] = useState('All');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('Anual');
  const [analyticsSubPeriod, setAnalyticsSubPeriod] = useState('Todos');
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
    const saved = localStorage.getItem('zenit_regs');
    if (saved) setRegistrations(jsonParseSafe(saved, {}));
    const savedFormative = localStorage.getItem('zenit_formative_regs');
    if (savedFormative) setFormativeRegistrations(jsonParseSafe(savedFormative, {}));
    const savedObservations = localStorage.getItem('zenit_observations');
    if (savedObservations) setObservations(jsonParseSafe(savedObservations, {}));
  }, []);

  useEffect(() => {
    localStorage.setItem('zenit_regs', JSON.stringify(registrations));
  }, [registrations]);

  useEffect(() => {
    localStorage.setItem('zenit_formative_regs', JSON.stringify(formativeRegistrations));
  }, [formativeRegistrations]);

  useEffect(() => {
    localStorage.setItem('zenit_observations', JSON.stringify(observations));
  }, [observations]);

  const jsonParseSafe = (str: string, fallback: any) => {
    try { return JSON.parse(str); } catch { return fallback; }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const PM_SHEET_ID = '1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc';
      const SM_SHEET_ID = '1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo';

      const fetchSheet = async (id: string) => {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`);
        const text = await response.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        const rows = json.table.rows;
        const cols = json.table.cols;

        return rows.map((r: any) => {
          const obj: any = {};
          r.c.forEach((cell: any, i: number) => {
            const val = cell ? (cell.f || cell.v || '') : '';
            if (cols[i] && cols[i].label) {
              const key = cols[i].label.toLowerCase().replace(/ /g, '_');
              obj[key] = val;
            } else {
              obj[`col_${i}`] = val;
            }
          });
          return obj;
        }).filter((clase: any) => 
          clase.clase && 
          clase.clase !== 'Clase' && 
          String(clase.clase).trim() !== ''
        );
      };

      const [pmData, smData] = await Promise.all([
        fetchSheet(PM_SHEET_ID),
        fetchSheet(SM_SHEET_ID)
      ]);

      const normalize = (data: any[], type: 'pm' | 'sm') => data.map(item => {
        // Specific column mapping per level
        // PM: Link is col_12, Docente is col_14
        // SM: Link is col_11, Docente is col_12
        const rawLink = type === 'pm' ? (item.link_clase || item.col_12 || '') : (item.link_clase || item.col_11 || '');
        const rawDocente = type === 'pm' ? (item.docente_que_realiza_la_clase || item.col_14 || '') : (item.docente_que_realiza_la_clase || item.col_12 || '');
        
        const links = {
          canva: rawLink.includes('canva.com') || rawLink.includes('canva.link') ? rawLink : null,
          sites: rawLink.includes('sites.google.com') ? rawLink : null,
          ppt: rawLink.includes('docs.google.com/presentation') ? rawLink : null
        };

        return {
          clase: (item.clase || item.col_1)?.toString() || '',
          fecha: item.fecha || item.col_4 || '',
          objetivo: item.objetivo || item.objetivo_de_la_clase || item.col_6 || '',
          etapa: item.etapa_de_proyecto || item.col_5 || '',
          rawDocente: rawDocente,
          contenido: item.contenido || item.col_7 || '',
          actividad: item.actividad || item.actividad_de_la_clase || item.col_8 || '',
          link: rawLink,
          canvaLink: links.canva,
          sitesLink: links.sites,
          pptLink: links.ppt,
          responsable: item.responsable || item.col_9 || '',
          horario: item.horario || item.horario_ || item.col_3 || '',
          dia: item.dia || item.dia_ || item.col_2 || '',
          hardware: item.solicitudes_informatica || item.col_11 || '',
          notes: type === 'pm' ? (item.col_15 || '') : (item.col_13 || '')
        };
      });

      const sortByDate = (arr: any[]) => arr.sort((a, b) => {
        const parse = (f: string) => {
          const p = f.split('/');
          return new Date(`${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1]}-${p[0]}T12:00:00`).getTime();
        };
        try {
          return parse(a.fecha) - parse(b.fecha);
        } catch { return 0; }
      });

      setGlobalData({
        pm: sortByDate(normalize(pmData, 'pm')),
        sm: sortByDate(normalize(smData, 'sm'))
      });
    } catch (e) {
      console.error("Fetch failed", e);
      setToastMessage("Error al sincronizar con Google Sheets");
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: string) => {
    setActiveCourse(course as Course);
    setView('class-list');
    setIsMobileSidebarOpen(false);
  };

  const handleBackToCourses = () => {
    setView('courses');
    setActiveCourse(null);
    setIsMobileSidebarOpen(false);
  };

  const getCourseTag = (course: string | null) => {
    if (!course) return '';
    if (course.includes('1 Medio A')) return '1MA';
    if (course.includes('1 Medio B')) return '1MB';
    if (course.includes('1 Medio C')) return '1MC';
    if (course.includes('1 Medio D')) return '1MD';
    if (course.includes('2 Medio A')) return '2MA';
    if (course.includes('2 Medio B')) return '2MB';
    if (course.includes('2 Medio C')) return '2MC';
    if (course.includes('2 Medio D')) return '2MD';
    return '';
  };

  const handleRegisterStatus = (statusColor: string) => {
    if (!selectedClass || !activeCourse) return;

    const courseTag = getCourseTag(activeCourse);
    const clsId = String(selectedClass.clase || "").replace(/[^0-9]/g, '');
    const registrationId = `${courseTag}-${clsId}`;

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

    setTimeout(() => {
      setShowSuccess(false);
      setSelectedClass(null);
      setLastRegisteredColor(null);
    }, 2000);
  };

  const getTeacherForCourse = (raw: any, course: string) => {
    if (!raw) return 'Sin asignar';
    const tag = getCourseTag(course);
    const rawStr = String(raw);
    
    // Improved logic: find the section starting with the tag
    const regex = /(1MA|1MB|1MC|1MD|2MA|2MB|2MC|2MD)\s*[:\-]/g;
    const segments: { tag: string, start: number }[] = [];
    let match;
    while ((match = regex.exec(rawStr)) !== null) {
      segments.push({ tag: match[1], start: match.index });
    }

    if (segments.length === 0) return rawStr.trim();

    const targetSeg = segments.find(s => s.tag === tag);
    if (!targetSeg) return 'Sin asignar';

    const nextSeg = segments[segments.indexOf(targetSeg) + 1];
    const end = nextSeg ? nextSeg.start : rawStr.length;
    
    let content = rawStr.substring(targetSeg.start, end);
    // Correctly strip the tag at the beginning (e.g., 1MA:, 1MB-, etc)
    content = content.replace(/^[12]M[A-D]\s*[:\-]\s*/i, '').trim();
    
    // According to rule: // separates courses, / separates teammates
    // Strip the course end separator if present
    const courseEndIndex = content.indexOf('//');
    if (courseEndIndex !== -1) {
      content = content.substring(0, courseEndIndex).trim();
    }
    
    return content.replace(/\/+$/, '').trim() || 'Sin asignar';
  };

  const handleSaveObservation = () => {
    setToastMessage("Observación guardada correctamente");
    setTimeout(() => setToastMessage(null), 3000);
  };


  return (
    <div className="app-window no-flicker">
      <Sidebar 
        view={view}
        setView={setView}
        activeCourse={activeCourse}
        setActiveCourse={(c) => setActiveCourse(c as Course | null)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        courses1M={courses1M}
        courses2M={courses2M}
        handleBackToCourses={handleBackToCourses}
        handleCourseSelect={handleCourseSelect}
      />

      <main className="main-board no-flicker">
        <header className="mobile-nav-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileSidebarOpen(true)}>
            <Menu size={28} />
          </button>
          <div className="mobile-nav-brand">ZenitApp</div>
        </header>

        {view === 'courses' ? (
          <DashboardView 
            key="courses"
            courses1M={courses1M}
            courses2M={courses2M}
            classesList={classesList}
            registrations={registrations}
            getCourseTag={getCourseTag}
            handleCourseSelect={handleCourseSelect}
          />
        ) : view === 'class-list' && activeCourse ? (
          <ClassListView 
            key="class-list"
            activeCourse={activeCourse}
            registrations={registrations}
            getCourseTag={getCourseTag}
            globalData={globalData}
            onClassSelect={setSelectedClass}
            onBack={handleBackToCourses}
            getTeacherForCourse={getTeacherForCourse}
          />
        ) : view === 'analytics' ? (
          <AnalyticsView 
            key="analytics"
            analyticsLevel={analyticsLevel}
            setAnalyticsLevel={setAnalyticsLevel}
            analyticsPeriod={analyticsPeriod}
            setAnalyticsPeriod={setAnalyticsPeriod}
            analyticsSubPeriod={analyticsSubPeriod}
            setAnalyticsSubPeriod={setAnalyticsSubPeriod}
            analyticsLoading={loading}
            globalData={globalData}
            courses1M={courses1M}
            courses2M={courses2M}
            registrations={registrations}
            observations={observations}
            getCourseTag={getCourseTag}
            getTeacherForCourse={getTeacherForCourse}
          />
        ) : view === 'calendar' ? (
          <CalendarView 
            key="calendar"
            currentCalendarDate={currentCalendarDate}
            setCurrentCalendarDate={setCurrentCalendarDate}
            selectedCalendarDay={selectedCalendarDay}
            setSelectedCalendarDay={setSelectedCalendarDay}
            globalData={globalData}
            registrations={registrations}
            getTeacherForCourse={getTeacherForCourse}
            getCourseTag={getCourseTag}
          />
        ) : view === 'reports' ? (
          <ReportsView 
            key="reports"
            registrations={registrations}
            courses1M={courses1M}
            courses2M={courses2M}
            getCourseTag={getCourseTag}
            globalData={globalData}
          />
        ) : view === 'formative-tracking' ? (
          <FormativeTrackingView 
            key="formative"
            courses1M={courses1M}
            courses2M={courses2M}
            globalData={globalData}
            formativeRegistrations={formativeRegistrations}
            setFormativeRegistrations={setFormativeRegistrations}
            getCourseTag={getCourseTag}
          />
        ) : null}
      </main>

      <AnimatePresence>
        {selectedClass && (
          <ClassModal 
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            activeCourse={activeCourse}
            registrations={registrations}
            handleRegisterStatus={handleRegisterStatus}
            getCourseTag={getCourseTag}
            observations={observations}
            setObservations={setObservations}
            handleSaveObservation={handleSaveObservation}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              background: lastRegisteredColor === 'green' ? 'rgba(6, 95, 70, 0.2)' : 
                          lastRegisteredColor === 'yellow' ? 'rgba(146, 64, 14, 0.2)' : 
                          'rgba(153, 27, 27, 0.2)'
            }}
          >
            <motion.div 
              className={`success-card ${lastRegisteredColor}`}
              initial={{ scale: 0.8, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
            >
              <div className="success-icon-wrapper">
                <CheckCircle2 size={56} className="success-icon" style={{ marginBottom: 0 }} />
              </div>
              <h2>{successInfo.title}</h2>
              <p>{successInfo.sub}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
