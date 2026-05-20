import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  TrendingUp, 
  ClipboardCheck, 
  BookOpen, 
  ChevronDown, 
  ShieldCheck,
  Sparkles,
  Menu,
  History,
  RefreshCw,
  Wifi
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

  const navItems = [
    { id: 'courses', label: 'Cursos', icon: <LayoutGrid size={17} />, onClick: handleBackToCourses, colorClass: 'icon-sky' },
    { id: 'analytics', label: 'Analítica Avanzada', icon: <TrendingUp size={17} />, onClick: () => { setView('analytics'); setIsMobileSidebarOpen(false); }, colorClass: 'icon-blue' },
    { id: 'reports', label: 'Reportes', icon: <ClipboardCheck size={17} />, onClick: () => { setView('reports'); setActiveCourse(null); setIsMobileSidebarOpen(false); }, colorClass: 'icon-emerald' },
    { id: 'formative-tracking', label: 'Seguimiento Formativo', icon: <Sparkles size={17} />, onClick: () => { setView('formative-tracking'); setIsMobileSidebarOpen(false); }, colorClass: 'icon-violet' },
    { id: 'tracking-history', label: 'Historial', icon: <History size={17} />, onClick: () => { setView('tracking-history'); setActiveCourse(null); setIsMobileSidebarOpen(false); }, colorClass: 'icon-amber' },
  ];

  return (
    <>
      <AnimatePresence>
        {isMobileSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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
        {/* ── HEADER ── */}
        <div className="sb2-header">
          <div className="sb2-brand" onClick={handleBackToCourses}>
            <div className="sb2-logo-wrap">
              <img src="/zenit_app_icon.png" alt="ZenitApp" className="sb2-logo-img" />
              <span className="sb2-logo-pulse" />
            </div>
            <div className="sb2-brand-text">
              <span className="sb2-app-name">ZenitApp</span>
              <span className="sb2-app-sub">Seguimiento 2026</span>
            </div>
            <ChevronDown size={13} className="sb2-brand-chevron" />
          </div>
          {isMobile && (
            <button className="sb2-close-btn" onClick={() => setIsMobileSidebarOpen(false)}>
              <Menu size={20} />
            </button>
          )}
        </div>

        {/* ── SCROLLABLE NAV ── */}
        <div className="sb2-scroll">

          {/* GENERAL section */}
          <div className="sb2-section-label">GENERAL</div>
          <nav className="sb2-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`sb2-nav-item ${view === item.id ? 'active' : ''}`}
                onClick={item.onClick}
              >
                <span className={`sb2-nav-icon ${item.colorClass}`}>{item.icon}</span>
                <span className="sb2-nav-label">{item.label}</span>
                {view === item.id && <span className="sb2-nav-dot" />}
              </button>
            ))}
          </nav>

          {/* NIVELES section */}
          <div className="sb2-section-label" style={{ marginTop: '1.75rem' }}>NIVELES</div>

          {/* Primeros Medios */}
          <div className="sb2-accordion">
            <button
              className="sb2-accordion-trigger"
              onClick={() => setIs1MedioExpanded(!is1MedioExpanded)}
            >
              <span className="sb2-nav-icon icon-pink"><BookOpen size={17} /></span>
              <span className="sb2-nav-label">Primeros Medios</span>
              <motion.span
                animate={{ rotate: is1MedioExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="sb2-chevron"
              >
                <ChevronDown size={14} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {is1MedioExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="sb2-sub-list">
                    {courses1M.map((course) => (
                      <button
                        key={course}
                        className={`sb2-sub-item ${activeCourse === course ? 'active' : ''}`}
                        onClick={() => handleCourseSelect(course)}
                      >
                        <span className="sb2-sub-dot" />
                        {course}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Segundos Medios */}
          <div className="sb2-accordion">
            <button
              className="sb2-accordion-trigger"
              onClick={() => setIs2MedioExpanded(!is2MedioExpanded)}
            >
              <span className="sb2-nav-icon icon-amber"><ShieldCheck size={17} /></span>
              <span className="sb2-nav-label">Segundos Medios</span>
              <motion.span
                animate={{ rotate: is2MedioExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="sb2-chevron"
              >
                <ChevronDown size={14} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {is2MedioExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="sb2-sub-list">
                    {courses2M.map((course) => (
                      <button
                        key={course}
                        className={`sb2-sub-item ${activeCourse === course ? 'active' : ''}`}
                        onClick={() => handleCourseSelect(course)}
                      >
                        <span className="sb2-sub-dot" />
                        {course}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── INSTITUTION CARD (inline, not fixed) ── */}
          <div className="sb2-divider" />

          <div className="sb2-institution-card">
            <div className="sb2-inst-logo">
              <img src="/logo-liceo.png" alt="Liceo William Taylor" />
            </div>
            <div className="sb2-inst-info">
              <span className="sb2-inst-name">Liceo William Taylor</span>
              <span className="sb2-inst-role">Administrador</span>
            </div>
          </div>

          {/* ── STATUS BAR ── */}
          <div className="sb2-status-bar">
            <div className={`sb2-sync-pill ${isSyncing ? 'syncing' : 'synced'}`}>
              {isSyncing
                ? <RefreshCw size={9} className="spin" />
                : <Wifi size={9} />}
              <span>{isSyncing ? 'Sincronizando…' : 'Online'}</span>
            </div>
            <div className="sb2-meta-right">
              {lastSyncTime && !isSyncing && (
                <span className="sb2-meta-time">
                  {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <span className="sb2-version">1.02.06 ExeApp</span>
            </div>
          </div>

        </div>{/* /sb2-scroll */}
      </motion.aside>
    </>
  );
};

export default Sidebar;
