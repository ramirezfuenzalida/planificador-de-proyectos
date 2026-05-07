import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  TrendingUp, 
  ClipboardCheck, 
  BookOpen, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Menu,
  History,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface SidebarProps {
  view: string;
  setView: (view: string) => void;
  activeCourse: string | null;
  setActiveCourse: (course: string | null) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  courses1M: string[];
  courses2M: string[];
  handleBackToCourses: () => void;
  handleCourseSelect: (courseName: string) => void;
  isSyncing?: boolean;
  lastSyncTime?: Date;
}

const Sidebar: React.FC<SidebarProps> = ({
  view,
  setView,
  activeCourse,
  setActiveCourse,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  courses1M,
  courses2M,
  handleBackToCourses,
  handleCourseSelect,
  isSyncing,
  lastSyncTime
}) => {
  const [is1MedioExpanded, setIs1MedioExpanded] = useState(true);
  const [is2MedioExpanded, setIs2MedioExpanded] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  return (
    <>
      <AnimatePresence>
        {isMobileSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            className="sidebar-overlay open"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}
        initial={false}
        animate={{ 
          x: isMobile ? (isMobileSidebarOpen ? 0 : '-100%') : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="sidebar-mobile-header">
          <div className="brand" onClick={handleBackToCourses} style={{ cursor: 'pointer' }}>
            <div className="brand-logo-circle">
              <img src="/zenit_app_icon.png" alt="ZenitApp Logo" className="brand-logo-img" />
            </div>
            <div className="brand-info">
              <div className="brand-title-container">
                <h1>ZenitApp</h1>
                <ChevronDown size={14} className="brand-chevron" />
              </div>
              <span className="brand-tagline">Seguimiento 2026</span>
            </div>
          </div>
          {isMobile && (
            <button className="sidebar-close-btn" onClick={() => setIsMobileSidebarOpen(false)}>
              <Menu size={24} />
            </button>
          )}
        </div>

        <div className="nav-menu">
          <div className="nav-section-header">GENERAL</div>

          <div 
            className={`nav-item ${view === 'courses' ? 'active' : ''}`}
            onClick={handleBackToCourses}
          >
            <div className="nav-item-left">
              <LayoutGrid size={18} className="icon-sky" />
              <span>Cursos</span>
            </div>
          </div>

          <div
            className={`nav-item ${view === 'analytics' ? 'active' : ''}`}
            onClick={() => { setView('analytics'); setIsMobileSidebarOpen(false); }}
          >
            <div className="nav-item-left">
              <TrendingUp size={18} className="icon-blue" />
              <span>Analítica Avanzada</span>
            </div>
          </div>

          <div 
            className={`nav-item ${view === 'reports' ? 'active' : ''}`}
            onClick={() => { setView('reports'); setActiveCourse(null); setIsMobileSidebarOpen(false); }}
          >
            <div className="nav-item-left">
              <ClipboardCheck size={18} className="icon-emerald" />
              <span>Reportes</span>
            </div>
          </div>

          <div 
            className={`nav-item ${view === 'formative-tracking' ? 'active' : ''}`}
            onClick={() => { setView('formative-tracking'); setIsMobileSidebarOpen(false); }}
          >
            <div className="nav-item-left">
              <Sparkles size={18} className="icon-violet" />
              <span>Seguimiento Formativo</span>
            </div>
          </div>

          <div 
            className={`nav-item ${view === 'tracking-history' ? 'active' : ''}`}
            onClick={() => { setView('tracking-history'); setActiveCourse(null); setIsMobileSidebarOpen(false); }}
          >
            <div className="nav-item-left">
              <History size={18} className="icon-amber" />
              <span>Historial de Seguimiento</span>
            </div>
          </div>

          <div className="nav-section-header" style={{ marginTop: '1.5rem' }}>NIVELES</div>

          <div className="accordion-content expanded">
            <div
              className="sidebar-category"
              onClick={() => setIs1MedioExpanded(!is1MedioExpanded)}
            >
              <div className="nav-item-left">
                <BookOpen size={18} className="icon-pink" />
                <span>Primeros Medios</span>
              </div>
              {is1MedioExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {is1MedioExpanded && courses1M.map((course) => (
              <div
                key={course}
                className={`sub-nav-item ${activeCourse === course ? 'active' : ''}`}
                onClick={() => handleCourseSelect(course)}
              >
                <span>{course}</span>
              </div>
            ))}

            <div
              className="sidebar-category"
              onClick={() => setIs2MedioExpanded(!is2MedioExpanded)}
              style={{ marginTop: '0.5rem' }}
            >
              <div className="nav-item-left">
                <ShieldCheck size={18} className="icon-amber" />
                <span>Segundos Medios</span>
              </div>
              {is2MedioExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {is2MedioExpanded && courses2M.map((course) => (
              <div
                key={course}
                className={`sub-nav-item ${activeCourse === course ? 'active' : ''}`}
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
          
          <div className="sidebar-sync-status">
            <div className={`sync-pill ${isSyncing ? 'syncing' : 'synced'}`}>
              {isSyncing ? <RefreshCw size={12} className="spin" /> : <Cloud size={12} />}
              <span>{isSyncing ? 'Sincronizando...' : 'Nube Actualizada'}</span>
            </div>
            {lastSyncTime && !isSyncing && (
              <span className="last-sync-text">
                Hoy {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="sidebar-version">
            ZenitApp versión 1.2.03
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
