import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Users, 
  Settings, 
  Trash2, 
  Check, 
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
          padding: 32px 24px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: #1e1b4b;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .ap-container {
          width: 100%;
          max-width: 1200px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .ap-header {
          background: linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%);
          border-radius: 24px;
          padding: 32px;
          color: white;
          box-shadow: 0 20px 40px -15px rgba(76, 29, 149, 0.25);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          width: 100%;
          box-sizing: border-box;
        }

        .ap-header h1 {
          font-size: 1.85rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.03em;
          display: flex;
          align-items: center;
          gap: 14px;
          color: white;
        }

        .ap-header h1 svg {
          color: #fbbf24;
          filter: drop-shadow(0 2px 8px rgba(251, 191, 36, 0.4));
        }

        .ap-header p {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.75);
          margin: 6px 0 0 0;
          font-weight: 500;
        }

        .ap-back-btn {
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.1);
          padding: 12px 22px;
          border-radius: 14px;
          font-size: 0.9rem;
          font-weight: 700;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s ease;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .ap-back-btn:hover {
          background: white;
          color: #4c1d95;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .ap-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 28px;
          width: 100%;
        }

        /* ── RESPONSIVE MOBILE OPTIMIZATIONS ── */
        @media (max-width: 1024px) {
          .ap-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }

        @media (max-width: 768px) {
          .ap-wrapper {
            padding: 16px 12px;
          }
          .ap-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 24px 16px;
            border-radius: 18px;
            gap: 16px;
          }
          .ap-header h1 {
            font-size: 1.35rem;
            gap: 8px;
            justify-content: center;
          }
          .ap-header p {
            font-size: 0.85rem;
            margin: 6px 0 0 0;
            text-align: center;
          }
          .ap-back-btn {
            width: 100%;
            justify-content: center;
            padding: 10px 16px;
          }
          .ap-card {
            padding: 24px 16px !important;
            border-radius: 18px !important;
          }
          .ap-card h2 {
            justify-content: center;
            text-align: center;
            font-size: 1.15rem;
          }
          .ap-card-desc {
            text-align: center;
            font-size: 0.82rem;
            margin-bottom: 20px;
          }
          .ap-form-inline {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }
          .ap-input-group {
            width: 100%;
            min-width: 0;
          }
          .ap-add-btn {
            width: 100%;
            justify-content: center;
          }
          .ap-table th, .ap-table td {
            padding: 12px 10px !important;
            font-size: 0.8rem !important;
          }
          .ap-matrix-row {
            grid-template-columns: 1fr 75px 75px !important;
            padding: 14px 12px !important;
            font-size: 0.84rem !important;
          }
          .ap-matrix-row.head {
            font-size: 0.72rem !important;
          }
          .ap-check-icon-btn {
            width: 32px !important;
            height: 32px !important;
          }
        }

        @media (max-width: 480px) {
          .ap-table th, .ap-table td {
            padding: 10px 6px !important;
            font-size: 0.75rem !important;
          }
          .ap-matrix-row {
            grid-template-columns: 1fr 65px 65px !important;
            font-size: 0.78rem !important;
            padding: 12px 6px !important;
          }
          .ap-matrix-row.head {
            font-size: 0.65rem !important;
          }
          .ap-check-icon-btn {
            width: 28px !important;
            height: 28px !important;
          }
          .ap-check-icon-btn svg {
            width: 14px !important;
            height: 14px !important;
          }
        }

        .ap-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(124, 58, 237, 0.12);
          border-radius: 24px;
          padding: 32px 28px;
          box-shadow: 
            0 20px 40px -15px rgba(124, 58, 237, 0.08), 
            0 0 0 1px rgba(124, 58, 237, 0.02);
          margin-bottom: 0;
          transition: all 0.3s ease;
          box-sizing: border-box;
          width: 100%;
        }

        .ap-card h2 {
          font-size: 1.3rem;
          font-weight: 850;
          color: #4c1d95;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          letter-spacing: -0.02em;
        }

        .ap-card-desc {
          font-size: 0.88rem;
          color: #5b21b6;
          opacity: 0.75;
          font-weight: 500;
          margin: 0 0 24px 0;
          line-height: 1.4;
        }

        /* USERS TABLE & FORM */
        .ap-form-inline {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .ap-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
          min-width: 220px;
        }

        .ap-role-select-group {
          flex: 0 0 160px;
          min-width: 160px;
        }

        @media (max-width: 768px) {
          .ap-role-select-group {
            flex: 1;
            min-width: 0;
            width: 100%;
          }
        }

        .ap-input-group label {
          font-size: 0.72rem;
          font-weight: 850;
          color: #7c3aed;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .ap-input, .ap-select {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 16px;
          border-radius: 12px;
          border: 2px solid rgba(124, 58, 237, 0.15);
          background: #ffffff;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e1b4b;
          outline: none;
          transition: all 0.25s ease;
          box-shadow: 0 2px 4px rgba(124, 58, 237, 0.02);
        }

        .ap-input:focus, .ap-select:focus {
          border-color: #7c3aed;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15);
        }

        .ap-input::placeholder {
          color: #a0aec0;
        }

        .ap-select option {
          background: #ffffff;
          color: #1e1b4b;
        }

        .ap-add-btn {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 48px;
          box-sizing: border-box;
          box-shadow: 0 6px 15px rgba(124, 58, 237, 0.25);
          transition: all 0.25s ease;
        }

        .ap-add-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(124, 58, 237, 0.35);
        }

        .ap-add-btn:active {
          transform: translateY(0);
        }

        .ap-table-wrapper {
          overflow-x: auto;
          border: 1px solid rgba(124, 58, 237, 0.12);
          border-radius: 16px;
          background: #ffffff;
          box-shadow: inset 0 1px 3px rgba(124, 58, 237, 0.02);
          width: 100%;
        }

        .ap-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.88rem;
        }

        .ap-table th {
          background: rgba(124, 58, 237, 0.04);
          padding: 16px 20px;
          font-weight: 800;
          color: #5b21b6;
          border-bottom: 1px solid rgba(124, 58, 237, 0.12);
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.06em;
        }

        .ap-table td {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(124, 58, 237, 0.06);
          vertical-align: middle;
          color: #1e1b4b;
        }

        .ap-tr:hover {
          background: rgba(124, 58, 237, 0.02);
        }

        .ap-teacher-email {
          font-weight: 700;
          color: #1e1b4b;
          font-size: 0.9rem;
          word-break: break-all;
        }

        .ap-table-select {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(124, 58, 237, 0.2);
          background: #ffffff;
          font-size: 0.82rem;
          font-weight: 700;
          color: #4c1d95;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ap-table-select:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
        }

        .ap-trash-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .ap-trash-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .ap-matrix-wrapper {
          border: 1px solid rgba(124, 58, 237, 0.12);
          border-radius: 16px;
          overflow-x: auto;
          background: #ffffff;
          width: 100%;
          -webkit-overflow-scrolling: touch;
          box-shadow: inset 0 1px 3px rgba(124, 58, 237, 0.02);
        }

        /* MATRIX STYLE */
        .ap-matrix-row {
          display: grid;
          grid-template-columns: 1fr 110px 110px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(124, 58, 237, 0.06);
          align-items: center;
          font-size: 0.92rem;
          color: #1e1b4b;
          transition: background 0.2s ease;
        }

        .ap-matrix-row:hover {
          background: rgba(124, 58, 237, 0.02);
        }

        .ap-matrix-row.head {
          background: rgba(124, 58, 237, 0.04);
          font-weight: 850;
          color: #5b21b6;
          text-transform: uppercase;
          font-size: 0.72rem;
          letter-spacing: 0.06em;
          border-bottom: 2px solid rgba(124, 58, 237, 0.12);
          border-radius: 14px 14px 0 0;
        }

        .ap-matrix-col-check {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .ap-matrix-label {
          font-weight: 700;
          color: #1e1b4b;
          font-size: 0.92rem;
        }

        .ap-check-icon-btn {
          background: rgba(124, 58, 237, 0.04);
          border: 2px solid rgba(124, 58, 237, 0.2);
          cursor: pointer;
          color: transparent;
          padding: 0;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
        }

        .ap-check-icon-btn:hover {
          transform: scale(1.1);
          border-color: #7c3aed;
          background: rgba(124, 58, 237, 0.08);
          box-shadow: 0 0 12px rgba(124, 58, 237, 0.2);
        }

        .ap-check-icon-btn.checked-lector {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          border-color: #0284c7;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
        }

        .ap-check-icon-btn.checked-lector:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(2, 132, 199, 0.4);
        }

        .ap-check-icon-btn.checked-editor {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          border-color: #7c3aed;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
        }

        .ap-check-icon-btn.checked-editor:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
        }

        .ap-check-icon-btn svg {
          width: 18px;
          height: 18px;
          stroke-width: 3.5px;
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform: scale(0.6);
        }

        .ap-check-icon-btn.checked svg {
          transform: scale(1.1);
        }

        /* BANNER */
        .ap-info-banner {
          background: rgba(124, 58, 237, 0.04);
          border: 1px solid rgba(124, 58, 237, 0.12);
          color: #5b21b6;
          padding: 16px;
          border-radius: 16px;
          display: flex;
          gap: 12px;
          font-size: 0.82rem;
          font-weight: 550;
          margin-top: 24px;
          line-height: 1.5;
        }

        .ap-info-banner strong {
          color: #4c1d95;
          font-weight: 750;
        }

        .ap-info-banner svg {
          color: #7c3aed;
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* TOAST */
        .ap-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #1e1b4b;
          color: white;
          padding: 14px 24px;
          border-radius: 14px;
          font-size: 0.88rem;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(30, 27, 75, 0.25);
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 1000;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      <div className="ap-container">
        {/* ── HEADER CARD ── */}
        <div className="ap-header">
          <div>
            <h1><Settings size={28} /> Panel de Administración</h1>
            <p>Control de roles de docentes y configuración dinámica de accesos a la Sidebar.</p>
          </div>
          <button className="ap-back-btn" onClick={onBackToDashboard}>
            <ArrowLeft size={16} /> Volver al Dashboard
          </button>
        </div>

        <div className="ap-grid">
          {/* LEFT COLUMN: GESTIÓN DE DOCENTES */}
          <div className="ap-card">
            <h2><Users size={20} color="#7c3aed" /> Control de Acceso de Docentes</h2>
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
              
              <div className="ap-input-group ap-role-select-group">
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
                        <span className="ap-teacher-email">{email}</span>
                      </td>
                      <td>
                        <select 
                          value={teacherRoles[email]} 
                          onChange={(e) => handleRoleChange(email, e.target.value)}
                          className="ap-table-select"
                          disabled={email === 'exequiel.ramirez@cmwt.cl'}
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
            <h2><ShieldAlert size={20} color="#7c3aed" /> Permisos Dinámicos de la Sidebar</h2>
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
                    <div className="ap-matrix-label">{item.label}</div>
                    
                    {/* READER COL */}
                    <div className="ap-matrix-col-check">
                      <button 
                        type="button"
                        className={`ap-check-icon-btn ${hasReader ? 'checked checked-lector' : ''}`}
                        onClick={() => handleTogglePermission('reader', item.id)}
                        aria-label={`Permiso Lector para ${item.label}`}
                      >
                        <Check size={16} />
                      </button>
                    </div>

                    {/* EDITOR COL */}
                    <div className="ap-matrix-col-check">
                      <button 
                        type="button"
                        className={`ap-check-icon-btn ${hasEditor ? 'checked checked-editor' : ''}`}
                        onClick={() => handleTogglePermission('editor', item.id)}
                        aria-label={`Permiso Editor para ${item.label}`}
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ap-info-banner">
              <Sparkles size={18} />
              <span>
                <strong>Propagación Postgres Activa:</strong> El Administrador (<code>admin</code>) siempre tiene acceso total a todas las secciones y no puede ser deshabilitado. Los cambios en los checkboxes desactivarán o activarán el menú de los navegadores de los docentes online en vivo.
              </span>
            </div>
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
            <Activity size={16} className="icon-violet" style={{ color: '#7c3aed' }} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
