import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  Calendar,
  Clock,
  X,
  Target,
  BookOpen,
  GraduationCap,
  User,
  Plus,
  TrendingUp,
  LayoutGrid,
  ClipboardCheck,
  BarChart2
} from 'lucide-react';
import './indexPremium.css';

type Course = '1 Medio A' | '1 Medio B' | '1 Medio C' | '1 Medio D' |
  '2 Medio A' | '2 Medio B' | '2 Medio C' | '2 Medio D' | 'Resumen';

const courses1M: Course[] = ['1 Medio A', '1 Medio B', '1 Medio C', '1 Medio D'];
const courses2M: Course[] = ['2 Medio A', '2 Medio B', '2 Medio C', '2 Medio D'];

const parseGoogleDate = (dateStr: any) => {
  if (!dateStr) return null;
  const match = String(dateStr).match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
  }
  return null;
};

const getColumnIndices = (table: any, is1M: boolean) => {
  const findIdx = (label: string) => {
    if (!table || !table.cols) return -1;
    return table.cols.findIndex((col: any) => 
      col.label && col.label.toLowerCase().includes(label.toLowerCase())
    );
  };
  return {
    clase: findIdx('clase') !== -1 ? findIdx('clase') : 1,
    horario: findIdx('horario') !== -1 ? findIdx('horario') : (is1M ? 4 : 3),
    fecha: findIdx('fecha') !== -1 ? findIdx('fecha') : (is1M ? 5 : 4),
    objetivo: findIdx('objetivo') !== -1 ? findIdx('objetivo') : (is1M ? 7 : 6),
    contenido: findIdx('contenido') !== -1 ? findIdx('contenido') : (is1M ? 8 : 7),
    docente: findIdx('docente') !== -1 ? findIdx('docente') : (is1M ? 14 : 12),
  };
};

const AppPremium = () => {
  const [view, setView] = useState<'courses' | 'classes' | 'analytics' | 'calendar'>('courses');
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [is1MedioExpanded, setIs1MedioExpanded] = useState(true);
  const [is2MedioExpanded, setIs2MedioExpanded] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [registrations, setRegistrations] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('zenit_registrations');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  const PRIMERO_MEDIO_SHEET = '1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc';
  const SEGUNDO_MEDIO_SHEET = '1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo';

  useEffect(() => {
    localStorage.setItem('zenit_registrations', JSON.stringify(registrations));
  }, [registrations]);

  const handleCourseSelect = (courseName: string) => {
    setActiveCourse(courseName);
    setView('classes');
  };

  const handleBackToCourses = () => {
    setView('courses');
    setActiveCourse(null);
    setSelectedClass(null);
  };

  const handleClassClick = (session: any) => {
    setSelectedClass(session);
  };

  const handleRegisterStatus = (statusColor: string) => {
    if (!selectedClass || !activeCourse) return;
    const registrationId = `${activeCourse}-${selectedClass.clase}`;
    setRegistrations(prev => ({ ...prev, [registrationId]: statusColor }));
    setTimeout(() => setSelectedClass(null), 1500);
  };

  useEffect(() => {
    if (!activeCourse) return;
    const fetchSheetsInfo = async () => {
      setLoading(true);
      try {
        const sheetId = activeCourse.startsWith('1') ? PRIMERO_MEDIO_SHEET : SEGUNDO_MEDIO_SHEET;
        const url = activeCourse.startsWith('1')
          ? `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=1238478499`
          : `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

        const res = await fetch(url);
        const text = await res.text();
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonStr);

        const idx = getColumnIndices(data.table, activeCourse.startsWith('1'));
        const rows = data.table.rows
          .filter((row: any) => row && row.c && row.c[idx.clase]?.v !== null)
          .map((row: any) => ({
            clase: row.c[idx.clase]?.v || '',
            fecha: (row.c[idx.fecha]?.f || row.c[idx.fecha]?.v) || '',
            horario: row.c[idx.horario]?.v || '',
            objetivo: row.c[idx.objetivo]?.v || '',
            contenido: row.c[idx.contenido]?.v || '',
            docenteRealiza: row.c[idx.docente]?.v || '',
          }));
        setSheetData(rows);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchSheetsInfo();
  }, [activeCourse]);

  return (
    <div className="premium-mode relative">
      <div style={{ display: 'flex' }}>
        <aside className="p-sidebar" style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          <div className="brand" onClick={handleBackToCourses} style={{ cursor: 'pointer' }}>
            <div className="brand-logo-circle">
              <img src="/zenit_app_icon.png" alt="ZenitApp Logo" style={{ width: '100%' }} />
            </div>
            <div className="brand-info">
              <div className="brand-title-container">
                <h1 style={{ color: 'white', margin: 0, fontSize: '1.4rem' }}>ZenitApp</h1>
                <ChevronDown size={14} color="white" />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>Seguimiento Premium</span>
            </div>
          </div>

          <div className="nav-menu" style={{ flex: 1, marginTop: '2rem' }}>
            <div className={`p-nav-item ${view === 'courses' ? 'active' : ''}`} onClick={handleBackToCourses}>
              <LayoutGrid size={20} />
              <span>Dashboard</span>
            </div>
            <div className={`p-nav-item ${view === 'analytics' ? 'active' : ''}`} onClick={() => setView('analytics')}>
              <TrendingUp size={20} />
              <span>Insights</span>
            </div>
            <div className={`p-nav-item ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>
              <Calendar size={20} />
              <span>Calendario</span>
            </div>
            
            <div style={{ marginTop: '2rem', padding: '0 1rem', opacity: 0.5, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em', color: 'white' }}>NIVELES</div>
            
            <div className="p-nav-item" onClick={() => setIs1MedioExpanded(!is1MedioExpanded)}>
               <BookOpen size={20} />
               <span>1ros Medios</span>
               <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
            </div>
            {is1MedioExpanded && courses1M.map(c => (
              <div key={c} className={`p-nav-item ${activeCourse === c ? 'active' : ''}`} style={{ paddingLeft: '3rem', fontSize: '0.9rem' }} onClick={() => handleCourseSelect(c)}>{c}</div>
            ))}
            
            <div className="p-nav-item" onClick={() => setIs2MedioExpanded(!is2MedioExpanded)}>
               <GraduationCap size={20} />
               <span>2dos Medios</span>
               <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
            </div>
            {is2MedioExpanded && courses2M.map(c => (
              <div key={c} className={`p-nav-item ${activeCourse === c ? 'active' : ''}`} style={{ paddingLeft: '3rem', fontSize: '0.9rem' }} onClick={() => handleCourseSelect(c)}>{c}</div>
            ))}
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', marginBottom: '1.5rem' }}>
             <button 
               onClick={() => {
                 localStorage.setItem('zenit_mode', 'standard');
                 window.dispatchEvent(new Event('zenit_mode_change'));
               }} 
               style={{ width: '100%', background: 'white', color: '#2E1065', border: 'none', padding: '0.8rem', borderRadius: '12px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
             >
               Volver a Versión Estándar
             </button>
          </div>
        </aside>

        <main className="main-board" style={{ flex: 1, padding: 0, background: '#F8FAFC' }}>
          <header className="p-dashboard-header">
             <span className="p-welcome-tag">Panel de Control</span>
             <h2 className="p-welcome-title">Hola, Dr. Julian</h2>
             <p className="p-welcome-subtitle">Usted tiene {courses1M.length + courses2M.length} cursos activos para el ciclo 2026-A.</p>
             
             <div className="p-stats-grid">
                <div className="p-stat-card">
                   <div className="p-stat-icon"><Users size={20} /></div>
                   <div className="p-stat-value">1,248</div>
                   <div className="p-stat-label">Estudiantes</div>
                </div>
                <div className="p-stat-card" style={{ background: '#2E1065', color: 'white' }}>
                   <div className="p-stat-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}><TrendingUp size={20} /></div>
                   <div className="p-stat-value" style={{ color: 'white' }}>82%</div>
                   <div className="p-stat-label" style={{ color: 'rgba(255,255,255,0.6)' }}>Progreso Global</div>
                </div>
             </div>
          </header>

          {view === 'courses' && (
            <div className="p-course-grid">
              {[...courses1M, ...courses2M].map(course => (
                <div key={course} className="p-course-card" onClick={() => handleCourseSelect(course)}>
                  <div className="p-card-banner" style={{ background: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800')` }}>
                    <span className="p-category-tag">{course.startsWith('1') ? 'Nivel Inicial' : 'Nivel Avanzado'}</span>
                  </div>
                  <div className="p-card-info">
                    <h3>Matemáticas {course}</h3>
                    <div className="p-card-meta">
                      <Users size={14} />
                      <span>342 Estudiantes Inscritos</span>
                    </div>
                    <div className="p-progress-container">
                      <div className="p-progress-bar" style={{ width: '75%', background: '#8B5CF6' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === 'classes' && (
            <div style={{ padding: '0 3rem 3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                 <button onClick={handleBackToCourses} style={{ background: 'white', color: '#2E1065', border: 'none', padding: '0.5rem', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}><ChevronLeft size={24} /></button>
                 <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#2E1065' }}>{activeCourse}</h2>
              </div>
              <div className="p-course-grid">
                {sheetData.map((cls, idx) => (
                  <div key={idx} className="p-course-card" onClick={() => handleClassClick(cls)} style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#8B5CF6' }}>CLASE N° {cls.clase}</span>
                      <div className={`status-dot ${registrations[`${activeCourse}-${cls.clase}`] || 'pendiente'}`}></div>
                    </div>
                    <h4 style={{ margin: '1rem 0', fontSize: '1.3rem', color: '#2E1065' }}>{cls.objetivo}</h4>
                    <div className="p-card-meta">
                      <Calendar size={14} />
                      <span>{cls.fecha}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {selectedClass && (
        <div className="p-modal-overlay" onClick={() => setSelectedClass(null)}>
          <div className="p-modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-modal-handle"></div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2E1065' }}>Detalle de Clase</h2>
            <div className="p-status-row">
              <button className={`p-status-btn ${registrations[`${activeCourse}-${selectedClass.clase}`] === 'completa' ? 'active green' : ''}`} onClick={() => handleRegisterStatus('completa')}><CheckCircle2 size={24} /><span>Realizada</span></button>
              <button className={`p-status-btn ${registrations[`${activeCourse}-${selectedClass.clase}`] === 'incompleta' ? 'active yellow' : ''}`} onClick={() => handleRegisterStatus('incompleta')}><AlertCircle size={24} /><span>Incompleta</span></button>
              <button className={`p-status-btn ${registrations[`${activeCourse}-${selectedClass.clase}`] === 'no-realizada' ? 'active red' : ''}`} onClick={() => handleRegisterStatus('no-realizada')}><XCircle size={24} /><span>Pendiente</span></button>
            </div>
            <div className="p-info-box">
               <div className="p-info-label"><Calendar size={16} /> Fecha y Hora</div>
               <div style={{ fontWeight: 700 }}>{selectedClass.fecha} - {selectedClass.horario}</div>
            </div>
            <div className="p-info-box" style={{ background: 'white' }}>
               <div className="p-info-label"><Target size={16} /> Objetivo</div>
               <p style={{ fontSize: '0.9rem' }}>{selectedClass.objetivo}</p>
            </div>
            <button className="btn-create-event-premium" style={{ width: '100%', padding: '1.5rem', background: '#2E1065', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 800, cursor: 'pointer' }} onClick={() => setSelectedClass(null)}>Guardar Cambios</button>
          </div>
        </div>
      )}

      <nav className="p-bottom-nav">
         <div className={`p-bottom-item ${view === 'courses' ? 'active' : ''}`} onClick={handleBackToCourses}><LayoutGrid size={24} /><span>Proyectos</span></div>
         <div className={`p-bottom-item ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}><Calendar size={24} /><span>Hitos</span></div>
         <div className={`p-bottom-item ${view === 'analytics' ? 'active' : ''}`} onClick={() => setView('analytics')}><BarChart2 size={24} /><span>Insights</span></div>
         <div className="p-bottom-item"><User size={24} /><span>Perfil</span></div>
      </nav>
    </div>
  );
};

export default AppPremium;
