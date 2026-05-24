import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Users, 
  Settings, 
  Trash2, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Activity, 
  UserPlus, 
  ArrowLeft
} from 'lucide-react';

interface AdminPanelViewProps {
  teacherRoles: Record<string, string>;
  setTeacherRoles: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  menuPermissions: Record<string, string[]>;
  setMenuPermissions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  onBackToDashboard: () => void;
}

export default function AdminPanelView({
  teacherRoles,
  setTeacherRoles,
  menuPermissions,
  setMenuPermissions,
  onBackToDashboard
}: AdminPanelViewProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // List of all customizable sidebar sections
  const menuItems = [
    { id: 'courses', label: '📂 Módulos de Cursos (1M y 2M)' },
    { id: 'analytics', label: '📈 Analítica Avanzada (Zenit Analytics)' },
    { id: 'reports', label: '📋 Reportes de Avance ABP' },
    { id: 'formative-tracking', label: '✨ Seguimiento Formativo ABP' },
    { id: 'tracking-history', label: '📜 Historial de Registros Diario' },
    { id: 'smart-calendar', label: '📅 Calendario Inteligente & Muestra' },
    { id: 'formative-evaluation', label: '🏆 Evaluación Formativa (Rúbricas y Notas)' },
    { id: 'dashboard-general', label: '📊 Dashboard Ejecutivo General' },
    { id: 'student-risk-radar', label: '🔴 Radar de Alerta Temprana & Bitácora' },
  ];

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();

    if (!email) {
      triggerToast('Ingresa un correo electrónico.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      triggerToast('Ingresa un correo electrónico válido.');
      return;
    }
    if (teacherRoles[email]) {
      triggerToast('Este docente ya está registrado.');
      return;
    }

    setTeacherRoles(prev => ({
      ...prev,
      [email]: newRole
    }));

    setNewEmail('');
    triggerToast(`Docente ${email} agregado como ${newRole === 'editor' ? 'Editor' : newRole === 'admin' ? 'Administrador' : 'Lector'}`);
  };

  const handleRemoveTeacher = (email: string) => {
    if (email === 'exequiel.ramirez@cmwt.cl') {
      triggerToast('No se puede revocar el acceso al administrador principal.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas revocar el acceso a ${email}?`)) {
      return;
    }

    setTeacherRoles(prev => {
      const copy = { ...prev };
      delete copy[email];
      return copy;
    });

    triggerToast(`Acceso revocado a ${email}`);
  };

  const handleRoleChange = (email: string, role: string) => {
    if (email === 'exequiel.ramirez@cmwt.cl' && role !== 'admin') {
      triggerToast('No se puede degradar al administrador principal.');
      return;
    }

    setTeacherRoles(prev => ({
      ...prev,
      [email]: role
    }));

    triggerToast(`Rol de ${email} actualizado a ${role === 'editor' ? 'Editor' : role === 'admin' ? 'Administrador' : 'Lector'}`);
  };

  const handleTogglePermission = (role: 'reader' | 'editor', viewId: string) => {
    setMenuPermissions(prev => {
      const currentPerms = prev[role] || [];
      let updatedPerms: string[];

      if (currentPerms.includes(viewId)) {
        updatedPerms = currentPerms.filter(id => id !== viewId);
      } else {
        updatedPerms = [...currentPerms, viewId];
      }

      return {
        ...prev,
        [role]: updatedPerms
      };
    });

    triggerToast(`Permiso actualizado en tiempo real`);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="ap-wrapper">
      <style>{`
        .ap-wrapper {
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          width: 100%;
          box-sizing: border-box;
        }

        .ap-header {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border-radius: 20px;
          padding: 28px;
          color: white;
          margin-bottom: 24px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          position: relative;
          overflow: hidden;
          border-top: 2px solid rgba(234, 179, 8, 0.3); /* Gold border indicator */
        }

        .ap-header h1 {
          font-size: 1.6rem;
          font-weight: 850;
          margin: 0;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
        }

        .ap-header h1 span {
          color: #fbbf24;
        }

        .ap-header p {
          font-size: 0.88rem;
          color: #94a3b8;
          margin: 4px 0 0 0;
          font-weight: 500;
        }

        .ap-back-btn {
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05);
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .ap-back-btn:hover {
          background: white;
          color: #0f172a;
        }

        .ap-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 24px;
        }

        @media (max-width: 900px) {
          .ap-grid {
            grid-template-columns: 1fr;
          }
        }

        /* ── RESPONSIVE MOBILE OPTIMIZATIONS ── */
        @media (max-width: 768px) {
          .ap-wrapper {
            padding: 12px;
          }
          .ap-header {
            padding: 20px;
            border-radius: 16px;
            gap: 12px;
          }
          .ap-header h1 {
            font-size: 1.3rem;
            gap: 8px;
          }
          .ap-card {
            padding: 16px;
            border-radius: 16px;
            margin-bottom: 16px;
          }
          .ap-form-inline {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .ap-input-group {
            width: 100%;
            min-width: 0;
          }
          .ap-add-btn {
            width: 100%;
            justify-content: center;
          }
          .ap-matrix-row {
            grid-template-columns: 1fr 80px 80px;
            padding: 10px 8px;
            font-size: 0.78rem;
          }
          .ap-matrix-row.head {
            font-size: 0.65rem;
          }
          .ap-table th, .ap-table td {
            padding: 10px 8px;
            font-size: 0.76rem;
          }
        }

        @media (max-width: 480px) {
          .ap-header {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
          .ap-header h1 {
            justify-content: center;
          }
          .ap-header p {
            font-size: 0.78rem;
          }
          .ap-back-btn {
            width: 100%;
            justify-content: center;
            padding: 8px 14px;
          }
          .ap-matrix-row {
            grid-template-columns: 1.1fr 65px 65px;
            font-size: 0.72rem;
            padding: 8px 4px;
          }
          .ap-matrix-row.head {
            font-size: 0.6rem;
          }
          .ap-check-icon-btn svg {
            width: 16px;
            height: 16px;
          }
        }

        .ap-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(148, 163, 184, 0.1);
          margin-bottom: 24px;
        }

        .ap-card h2 {
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ap-card-desc {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
          margin: 0 0 20px 0;
        }

        /* USERS TABLE */
        .ap-form-inline {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .ap-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 180px;
        }

        .ap-input-group label {
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .ap-input, .ap-select {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
          outline: none;
          transition: all 0.2s;
        }

        .ap-input:focus, .ap-select:focus {
          border-color: #fbbf24;
          background: white;
        }

        .ap-add-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          height: 40px;
          box-sizing: border-box;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15);
        }

        .ap-add-btn:hover {
          transform: translateY(-1px);
        }

        .ap-table-wrapper {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }

        .ap-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.82rem;
        }

        .ap-table th {
          background: #f8fafc;
          padding: 12px 14px;
          font-weight: 750;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          font-size: 0.68rem;
          letter-spacing: 0.05em;
        }

        .ap-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .ap-tr:hover {
          background: #f8fafc;
        }

        .ap-role-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 100px;
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .ap-role-badge.admin { background: #fee2e2; color: #991b1b; }
        .ap-role-badge.editor { background: #f3e8ff; color: #6b21a8; }
        .ap-role-badge.reader { background: #e0f2fe; color: #075985; }

        .ap-trash-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 5px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .ap-trash-btn:hover {
          background: #fee2e2;
        }

        .ap-matrix-wrapper {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow-x: auto;
          background: white;
          width: 100%;
          -webkit-overflow-scrolling: touch;
        }

        /* MATRIX STYLE */
        .ap-matrix-row {
          display: grid;
          grid-template-columns: 1fr 100px 100px;
          padding: 12px 14px;
          border-bottom: 1px solid #f1f5f9;
          align-items: center;
          font-size: 0.84rem;
        }

        .ap-matrix-row.head {
          background: #f8fafc;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          font-size: 0.68rem;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e2e8f0;
          border-radius: 12px 12px 0 0;
        }

        .ap-matrix-col-check {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .ap-check-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ap-check-icon-btn.checked {
          color: #fbbf24;
        }

        .ap-check-icon-btn:hover {
          background: #f1f5f9;
        }

        /* TOAST */
        .ap-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #0f172a;
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 0.82rem;
          font-weight: 700;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
        }
      `}</style>

      {/* ── HEADER CARD ── */}
      <div className="ap-header">
        <div>
          <h1><Settings size={28} /> Panel de Administración <span>Soberano</span></h1>
          <p>Control de roles de docentes y configuración dinámica de accesos a la Sidebar.</p>
        </div>
        <button className="ap-back-btn" onClick={onBackToDashboard}>
          <ArrowLeft size={16} /> Volver al Dashboard
        </button>
      </div>

      <div className="ap-grid">
        {/* LEFT COLUMN: GESTIÓN DE DOCENTES */}
        <div className="ap-card">
          <h2><Users size={20} color="#fbbf24" /> Control de Acceso de Docentes</h2>
          <p className="ap-card-desc">Registra los correos autorizados y asígnales rol de Administrador, Editor o Lector.</p>

          <form className="ap-form-inline" onSubmit={handleAddTeacher}>
            <div className="ap-input-group">
              <label>Correo del Docente</label>
              <input 
                type="email" 
                placeholder="ej: profesor@williamtaylor.cl" 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="ap-input"
              />
            </div>
            
            <div className="ap-input-group" style={{ flex: '0 0 130px', minWidth: '130px' }}>
              <label>Rol Inicial</label>
              <select 
                value={newRole} 
                onChange={(e) => setNewRole(e.target.value)}
                className="ap-select"
              >
                <option value="reader">📖 Lector</option>
                <option value="editor">🔄 Editor</option>
                <option value="admin">🛡️ Admin</option>
              </select>
            </div>

            <button type="submit" className="ap-add-btn">
              <UserPlus size={16} /> Agregar
            </button>
          </form>

          <div className="ap-table-wrapper">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Correo Autorizado</th>
                  <th>Rol</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(teacherRoles).map((email) => (
                  <tr key={email} className="ap-tr">
                    <td>
                      <strong style={{ color: '#0f172a' }}>{email}</strong>
                    </td>
                    <td>
                      <select 
                        value={teacherRoles[email]} 
                        onChange={(e) => handleRoleChange(email, e.target.value)}
                        className="ap-select"
                        style={{ padding: '4px 8px', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        <option value="reader">📖 Lector</option>
                        <option value="editor">🔄 Editor</option>
                        <option value="admin">🛡️ Admin</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="ap-trash-btn"
                        onClick={() => handleRemoveTeacher(email)}
                        disabled={email === 'exequiel.ramirez@cmwt.cl'}
                        style={{ opacity: email === 'exequiel.ramirez@cmwt.cl' ? 0.3 : 1 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: GESTIÓN DINÁMICA DE LA SIDEBAR */}
        <div className="ap-card">
          <h2><ShieldAlert size={20} color="#a78bfa" /> Permisos Dinámicos de la Sidebar</h2>
          <p className="ap-card-desc">Controla exactamente qué secciones tiene permitido ver y usar cada rol. Los cambios se propagan en tiempo real.</p>

          <div className="ap-matrix-wrapper">
            <div className="ap-matrix-row head">
              <div>Sección de la Barra Lateral</div>
              <div className="ap-matrix-col-check">Lector</div>
              <div className="ap-matrix-col-check">Editor</div>
            </div>

            {menuItems.map((item) => {
              const hasReader = (menuPermissions.reader || []).includes(item.id);
              const hasEditor = (menuPermissions.editor || []).includes(item.id);

              return (
                <div key={item.id} className="ap-matrix-row">
                  <div style={{ fontWeight: 650, color: '#334155' }}>{item.label}</div>
                  
                  {/* READER COL */}
                  <div className="ap-matrix-col-check">
                    <button 
                      className={`ap-check-icon-btn ${hasReader ? 'checked' : ''}`}
                      onClick={() => handleTogglePermission('reader', item.id)}
                    >
                      {hasReader ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </div>

                  {/* EDITOR COL */}
                  <div className="ap-matrix-col-check">
                    <button 
                      className={`ap-check-icon-btn ${hasEditor ? 'checked' : ''}`}
                      onClick={() => handleTogglePermission('editor', item.id)}
                    >
                      {hasEditor ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ap-error-box" style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.1)', color: '#7c3aed', padding: '12px 16px', borderRadius: '12px', display: 'flex', gap: '10px', fontSize: '0.78rem', fontWeight: 550, marginTop: '20px', lineHeight: 1.4 }}>
            <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Propagación Postgres Activa:</strong> El Administrador (`admin`) siempre tiene acceso total a todas las secciones y no puede ser deshabilitado. Los cambios en los checkboxes desactivarán o activarán el menú de los navegadores de los docentes online en vivo.
            </span>
          </div>
        </div>
      </div>

      {/* Floating Sync Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            className="ap-toast"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            <Activity size={16} className="icon-violet" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
