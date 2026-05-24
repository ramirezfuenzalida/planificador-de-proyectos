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
  Wifi,
  Award,
  Calendar,
  LogOut,
  Settings,
  KeyRound,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  onRefreshData?: () => void;
  isLoadingData?: boolean;
  // Auth props
  currentUserRole?: string;
  userEmail?: string;
  menuPermissions?: Record<string, string[]>;
  onSignOut?: () => void;
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
  lastSyncTime,
  onRefreshData,
  isLoadingData,
  currentUserRole = 'reader',
  userEmail = '',
  menuPermissions = {},
  onSignOut,
}) => {
  const [is1MedioExpanded, setIs1MedioExpanded] = useState(false);
  const [is2MedioExpanded, setIs2MedioExpanded] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangePwModal, setShowChangePwModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!newPassword) { setPasswordStrength(0); return; }
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (newPassword.length >= 12) score++;
    setPasswordStrength(score);
  }, [newPassword]);

  const isMobile = windowWidth < 768;
  const isAdmin = currentUserRole === 'admin';

  const hasPermission = (viewId: string): boolean => {
    if (isAdmin) return true;
    const allowed = menuPermissions[currentUserRole] || [];
    return allowed.includes(viewId);
  };

  const getRoleLabel = () => {
    if (currentUserRole === 'admin') return { label: 'Administrador', color: '#fbbf24', bg: 'rgba(234, 179, 8, 0.12)', icon: '🛡️' };
    if (currentUserRole === 'editor') return { label: 'Editor', color: '#a78bfa', bg: 'rgba(139, 92, 246, 0.12)', icon: '🔄' };
    return { label: 'Lector', color: '#818cf8', bg: 'rgba(99, 102, 241, 0.1)', icon: '📖' };
  };

  const getStrengthInfo = () => {
    if (passwordStrength <= 1) return { label: 'Muy débil', color: '#ef4444' };
    if (passwordStrength === 2) return { label: 'Débil', color: '#f97316' };
    if (passwordStrength === 3) return { label: 'Moderada', color: '#eab308' };
    if (passwordStrength === 4) return { label: 'Fuerte', color: '#22c55e' };
    return { label: 'Muy fuerte', color: '#10b981' };
  };

  const handleChangePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!newPassword || newPassword.length < 8) { setPwError('La contraseña debe tener mínimo 8 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Las contraseñas no coinciden.'); return; }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      setPwSuccess(true);
      setTimeout(() => {
        setShowChangePwModal(false);
        setPwSuccess(false);
        setNewPassword('');
        setConfirmPassword('');
      }, 2200);
    } catch (err: any) {
      setPwError(err.message || 'Error al cambiar contraseña.');
    } finally {
      setPwLoading(false);
    }
  };

  const roleInfo = getRoleLabel();
  const strengthInfo = getStrengthInfo();
  const displayEmail = userEmail.length > 26 ? userEmail.substring(0, 24) + '…' : userEmail;

  const allNavItems = [
    { id: 'courses', label: 'Cursos', icon: <LayoutGrid size={17} />, onClick: handleBackToCourses, colorClass: 'icon-sky' },
    { id: 'analytics', label: 'Analítica Avanzada', icon: <TrendingUp size={17} />, onClick: () => { setView('analytics'); setIsMobileSidebarOpen(false); }, colorClass: 'icon-blue' },
    { id: 'reports', label: 'Reportes', icon: <ClipboardCheck size={17} />, onClick: () => { setView('reports'); setActiveCourse(null); setIsMobileSidebarOpen(false); }, colorClass: 'icon-emerald' },
    { id: 'formative-tracking', label: 'Seguimiento Formativo', icon: <Sparkles size={17} />, onClick: () => { setView('formative-tracking'); setIsMobileSidebarOpen(false); }, colorClass: 'icon-violet' },
    { id: 'tracking-history', label: 'Historial', icon: <History size={17} />, onClick: () => { setView('tracking-history'); setActiveCourse(null); setIsMobileSidebarOpen(false); }, colorClass: 'icon-amber' },
    { id: 'smart-calendar', label: 'Calendario Inteligente', icon: <Calendar size={17} />, onClick: () => { setView('smart-calendar'); setActiveCourse(null); setIsMobileSidebarOpen(false); }, colorClass: 'icon-blue' },
  ];

  const navItems = allNavItems.filter(item => hasPermission(item.id));

  const allEvalItems = [
    { id: 'formative-evaluation', label: 'Evaluación Formativa', icon: <Award size={17} />, onClick: () => { setView('formative-evaluation'); setActiveCourse(null); setIsMobileSidebarOpen(false); }, colorClass: 'icon-violet' },
    { id: 'dashboard-general', label: 'Dashboard', icon: <LayoutGrid size={17} />, onClick: () => { setView('dashboard-general'); setActiveCourse(null); setIsMobileSidebarOpen(false); }, colorClass: 'icon-sky' },
    { id: 'student-risk-radar', label: 'Radar de Alerta', icon: <Shield size={17} />, onClick: () => { setView('student-risk-radar'); setActiveCourse(null); setIsMobileSidebarOpen(false); }, colorClass: 'icon-amber' },
  ];

  const evalItems = allEvalItems.filter(item => hasPermission(item.id));

  return (
    <>
      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePwModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowChangePwModal(false); setPwError(null); setPwSuccess(false); setNewPassword(''); setConfirmPassword(''); }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(6px)', zIndex: 9998,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(12, 8, 32, 0.92)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderTop: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '24px',
                padding: '36px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
                fontFamily: 'Inter, sans-serif',
                color: 'white',
                position: 'relative',
              }}
            >
              <button
                onClick={() => { setShowChangePwModal(false); setPwError(null); setPwSuccess(false); setNewPassword(''); setConfirmPassword(''); }}
                style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', color: '#64748b', cursor: 'pointer',
                  padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <X size={16} />
              </button>

              {pwSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{
                    width: '70px', height: '70px', borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.1)', border: '2px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#34d399', margin: '0 auto 16px',
                    boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)'
                  }}>
                    <CheckCircle2 size={34} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px' }}>¡Contraseña actualizada!</h3>
                  <p style={{ color: '#64748b', fontSize: '0.84rem' }}>Tu nueva contraseña ha sido guardada exitosamente.</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24'
                      }}>
                        <KeyRound size={18} />
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Cambiar Contraseña</h3>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>
                      Crea una nueva contraseña segura para tu cuenta <strong style={{ color: '#94a3b8' }}>{userEmail}</strong>
                    </p>
                  </div>

                  {pwError && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '12px', padding: '12px 14px', color: '#f87171',
                      fontSize: '0.8rem', fontWeight: 500, marginBottom: '16px', lineHeight: 1.5
                    }}>
                      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{pwError}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Nueva contraseña
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          placeholder="Mínimo 8 caracteres"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={pwLoading}
                          style={{
                            width: '100%', background: 'rgba(8, 5, 22, 0.6)',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                            padding: '12px 42px 12px 14px', fontSize: '0.86rem',
                            color: 'white', outline: 'none', fontFamily: 'Inter, sans-serif',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={(e) => { e.target.style.borderColor = 'rgba(234, 179, 8, 0.4)'; }}
                          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                        />
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                            display: 'flex', alignItems: 'center'
                          }}>
                          {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {newPassword && (
                        <div>
                          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', overflow: 'hidden', marginBottom: '4px' }}>
                            <div style={{ height: '100%', borderRadius: '100px', transition: 'width 0.3s, background 0.3s', width: `${(passwordStrength / 5) * 100}%`, background: strengthInfo.color }} />
                          </div>
                          <span style={{ fontSize: '0.67rem', fontWeight: 700, color: strengthInfo.color }}>
                            Seguridad: {strengthInfo.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Confirmar contraseña
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirmPw ? 'text' : 'password'}
                          placeholder="Repite la nueva contraseña"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={pwLoading}
                          style={{
                            width: '100%', background: 'rgba(8, 5, 22, 0.6)',
                            border: `1px solid ${confirmPassword && newPassword !== confirmPassword ? 'rgba(239,68,68,0.4)' : confirmPassword && newPassword === confirmPassword ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: '12px', padding: '12px 42px 12px 14px',
                            fontSize: '0.86rem', color: 'white', outline: 'none',
                            fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
                          }}
                        />
                        <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                            display: 'flex', alignItems: 'center'
                          }}>
                          {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={pwLoading || !newPassword || !confirmPassword}
                      style={{
                        background: 'linear-gradient(135deg, #FFE082 0%, #fbbf24 45%, #f59e0b 100%)',
                        color: '#0c0822', border: 'none', borderRadius: '12px',
                        padding: '13px 20px', fontSize: '0.86rem', fontWeight: 800,
                        fontFamily: 'Inter, sans-serif', cursor: pwLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        width: '100%', transition: 'all 0.2s',
                        opacity: pwLoading || !newPassword || !confirmPassword ? 0.5 : 1,
                        boxShadow: '0 6px 20px rgba(245, 158, 11, 0.25)',
                      }}
                    >
                      {pwLoading ? (
                        <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /><span>Guardando...</span></>
                      ) : (
                        <><KeyRound size={15} /><span>Actualizar Contraseña</span></>
                      )}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        animate={{ x: isMobile ? (isMobileSidebarOpen ? 0 : '-100%') : 0 }}
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
          {navItems.length > 0 && (
            <>
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
            </>
          )}

          {/* NIVELES section — solo si tiene permisos de cursos */}
          {hasPermission('courses') && (
            <>
              <div className="sb2-section-label" style={{ marginTop: '1.75rem' }}>NIVELES</div>

              {/* Primeros Medios */}
              <div className="sb2-accordion">
                <button className="sb2-accordion-trigger" onClick={() => setIs1MedioExpanded(!is1MedioExpanded)}>
                  <span className="sb2-nav-icon icon-pink"><BookOpen size={17} /></span>
                  <span className="sb2-nav-label">Primeros Medios</span>
                  <motion.span animate={{ rotate: is1MedioExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="sb2-chevron">
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
                <button className="sb2-accordion-trigger" onClick={() => setIs2MedioExpanded(!is2MedioExpanded)}>
                  <span className="sb2-nav-icon icon-amber"><ShieldCheck size={17} /></span>
                  <span className="sb2-nav-label">Segundos Medios</span>
                  <motion.span animate={{ rotate: is2MedioExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="sb2-chevron">
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
            </>
          )}

          {/* EVALUACIÓN section */}
          {evalItems.length > 0 && (
            <>
              <div className="sb2-section-label" style={{ marginTop: '1.75rem' }}>EVALUACIÓN</div>
              <nav className="sb2-nav">
                {evalItems.map(item => (
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
            </>
          )}

          {/* ADMINISTRACIÓN — solo admin */}
          {isAdmin && (
            <>
              <div className="sb2-section-label" style={{ marginTop: '1.75rem' }}>ADMINISTRACIÓN</div>
              <nav className="sb2-nav">
                <button
                  className={`sb2-nav-item ${view === 'admin-panel' ? 'active' : ''}`}
                  onClick={() => { setView('admin-panel'); setIsMobileSidebarOpen(false); }}
                >
                  <span className="sb2-nav-icon icon-amber"><Settings size={17} /></span>
                  <span className="sb2-nav-label">Panel de Admin</span>
                  {view === 'admin-panel' && <span className="sb2-nav-dot" />}
                </button>
              </nav>
            </>
          )}

          {/* Botón actualizar planilla — solo editors y admins */}
          {(currentUserRole === 'admin' || currentUserRole === 'editor') && (
            <div style={{ padding: '0 0.85rem', marginTop: '1.5rem' }}>
              <button
                onClick={onRefreshData}
                disabled={isLoadingData}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '0.65rem 1rem',
                  background: isLoadingData
                    ? 'rgba(139, 92, 246, 0.08)'
                    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '12px',
                  color: '#a78bfa', fontSize: '0.78rem', fontWeight: 600,
                  cursor: isLoadingData ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.05)'
                }}
                className="sb2-refresh-btn"
                onMouseEnter={(e) => {
                  if (!isLoadingData) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoadingData) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.25)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <RefreshCw size={14} className={isLoadingData ? 'spin' : ''} style={{ animationDuration: '1.5s' }} />
                <span>{isLoadingData ? 'Actualizando...' : 'Actualizar Planilla'}</span>
              </button>
            </div>
          )}

          <div className="sb2-divider" />

          {/* ── PERFIL DE USUARIO ── */}
          <div style={{ padding: '0 0.7rem 0.5rem', position: 'relative' }}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '14px',
                background: showProfileMenu ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (!showProfileMenu) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={(e) => { if (!showProfileMenu) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              {/* Avatar */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${roleInfo.bg} 0%, rgba(139, 92, 246, 0.15) 100%)`,
                border: `1.5px solid ${roleInfo.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem',
              }}>
                {roleInfo.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.72rem', fontWeight: 700, color: '#e2e8f0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  lineHeight: 1.3
                }}>
                  {displayEmail}
                </div>
                <div style={{
                  fontSize: '0.65rem', fontWeight: 700,
                  color: roleInfo.color,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px'
                }}>
                  {roleInfo.label}
                </div>
              </div>

              <ChevronDown size={13} style={{
                color: '#64748b', flexShrink: 0,
                transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} />
            </button>

            {/* Profile dropdown menu */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: 'absolute', bottom: '100%', left: '0.7rem', right: '0.7rem',
                    marginBottom: '6px',
                    background: 'rgba(12, 8, 32, 0.97)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderTop: '1px solid rgba(234, 179, 8, 0.25)',
                    borderRadius: '14px',
                    padding: '6px',
                    boxShadow: '0 -20px 40px rgba(0,0,0,0.5)',
                    zIndex: 100,
                  }}
                >
                  <button
                    onClick={() => { setShowProfileMenu(false); setShowChangePwModal(true); setPwError(null); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '10px', border: 'none',
                      background: 'none', color: '#e2e8f0', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                      transition: 'background 0.15s', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(234, 179, 8, 0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    <KeyRound size={15} style={{ color: '#fbbf24' }} />
                    Cambiar Contraseña
                  </button>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />

                  <button
                    onClick={() => { setShowProfileMenu(false); onSignOut?.(); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '10px', border: 'none',
                      background: 'none', color: '#f87171', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 600, fontFamily: 'Inter, sans-serif',
                      transition: 'background 0.15s', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  >
                    <LogOut size={15} style={{ color: '#ef4444' }} />
                    Cerrar Sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── INSTITUTION CARD ── */}
          <div className="sb2-institution-card">
            <div className="sb2-inst-logo">
              <img src="/logo-liceo.png" alt="Liceo William Taylor" />
            </div>
            <div className="sb2-inst-info">
              <span className="sb2-inst-name">Liceo William Taylor</span>
              <span className="sb2-inst-role" style={{ color: roleInfo.color }}>{roleInfo.label}</span>
            </div>
          </div>

          {/* ── STATUS BAR ── */}
          <div className="sb2-status-bar">
            <div className={`sb2-sync-pill ${isSyncing ? 'syncing' : 'synced'}`}>
              {isSyncing ? <RefreshCw size={9} className="spin" /> : <Wifi size={9} />}
              <span>{isSyncing ? 'Sincronizando…' : 'Online'}</span>
            </div>
            <div className="sb2-meta-right">
              {lastSyncTime && !isSyncing && (
                <span className="sb2-meta-time">
                  {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <span className="sb2-version">1.02.07</span>
            </div>
          </div>

        </div>{/* /sb2-scroll */}
      </motion.aside>
    </>
  );
};

export default Sidebar;
