import React, { useLayoutEffect } from 'react';
import { ChevronLeft, X, MonitorPlay, Users, Calendar, Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ClassListViewProps {
  activeCourse: string;
  registrations: Record<string, string>;
  getCourseTag: (courseName: string | null) => string;
  globalData: { pm: any[]; sm: any[] };
  onClassSelect: (session: any) => void;
  onBack: () => void;
  getTeacherForCourse: (raw: any, course: string) => string;
}

const ClassListView: React.FC<ClassListViewProps> = ({
  activeCourse,
  registrations,
  getCourseTag,
  globalData,
  onClassSelect,
  onBack,
  getTeacherForCourse,
}) => {
  const is1M = activeCourse.startsWith('1');
  const levelData = is1M ? globalData.pm : globalData.sm;

  // Pinta el shell oscuro ANTES de pintar (useLayoutEffect), sin flasheo.
  useLayoutEffect(() => {
    document.documentElement.classList.add('cl-cosmic');
    document.body.classList.add('cl-cosmic');
    return () => {
      document.documentElement.classList.remove('cl-cosmic');
      document.body.classList.remove('cl-cosmic');
    };
  }, []);

  const spring = { type: 'spring' as const, bounce: 0, duration: 0.45 };

  return (
    <div className="cl-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&family=Manrope:wght@400;500;600;700;800&display=swap');

        /* Shell oscuro cósmico mientras se ve la lista de clases */
        html.cl-cosmic, body.cl-cosmic { background: #05030f !important; }
        body.cl-cosmic .main-board { background: transparent !important; }
        body.cl-cosmic .main-board:before { display: none !important; }
        body.cl-cosmic .mobile-nav-header {
          background: rgba(6,4,18,0.55) !important;
          -webkit-backdrop-filter: blur(20px) saturate(160%); backdrop-filter: blur(20px) saturate(160%);
          border-bottom: none !important; padding-top: env(safe-area-inset-top, 0px);
        }
        body.cl-cosmic .mobile-nav-brand { color: #fff !important; }
        body.cl-cosmic .mobile-menu-btn { background: rgba(255,255,255,0.08) !important; color: #5eead4 !important; }

        .cl-root {
          position: relative; min-height: 100vh; font-family: 'Manrope', sans-serif; color: #fff;
          padding:
            max(24px, calc(env(safe-area-inset-top,0px) + 12px))
            calc(20px + env(safe-area-inset-right,0px))
            160px
            calc(20px + env(safe-area-inset-left,0px));
          overflow-x: hidden;
        }
        /* ── FONDO DE UNIVERSO (imagen premium) ── */
        .cl-root::before {
          content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=2400&q=90&auto=format&fit=crop');
          background-size: cover; background-position: center;
          filter: brightness(0.55) saturate(1.25) contrast(1.05);
          animation: cl-drift 60s ease-in-out infinite alternate;
        }
        @keyframes cl-drift {
          0% { transform: scale(1.06) translate(0,0); }
          100% { transform: scale(1.12) translate(-1.5%, 1%); }
        }
        /* Velo para legibilidad + tinte cósmico */
        .cl-root::after {
          content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(1000px 700px at 20% -10%, rgba(13,148,136,0.18), transparent 60%),
            radial-gradient(900px 700px at 100% 0%, rgba(79,70,229,0.22), transparent 55%),
            linear-gradient(180deg, rgba(5,3,15,0.35) 0%, rgba(5,3,15,0.75) 100%);
        }
        .cl-shell { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; }

        /* ── ENCABEZADO ── */
        .cl-header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
        .cl-back {
          display: flex; align-items: center; gap: 6px; cursor: pointer;
          padding: 10px 16px; border-radius: 100px; color: #fff; font-weight: 700; font-size: 0.85rem;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14);
          border-top-color: rgba(255,255,255,0.24);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14);
          transition: transform 0.18s, background 0.2s;
        }
        .cl-back:hover { transform: translateX(-3px); background: rgba(255,255,255,0.12); }
        .cl-ctx { flex: 1; min-width: 0; }
        .cl-ctx p { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(165,243,252,0.6); margin-bottom: 4px; }
        .cl-ctx h2 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: clamp(1.8rem, 5vw, 2.6rem); letter-spacing: -0.03em; line-height: 1.05; margin: 0; }
        .cl-ctx h2 span { background: linear-gradient(120deg, #5eead4, #22d3ee 55%, #818cf8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .cl-close { flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); }

        /* ── GRILLA DE CLASES ── */
        .cl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
        @media (max-width: 640px) { .cl-grid { grid-template-columns: 1fr; } }

        /* Tarjeta de clase: vidrio gloss + relieve */
        .cl-card {
          position: relative; cursor: pointer; border-radius: 22px; padding: 20px; overflow: hidden;
          display: flex; flex-direction: column; gap: 14px; --accent: #5eead4; --glow: rgba(13,148,136,0.22);
          background: linear-gradient(150deg, rgba(255,255,255,0.13) 0%, rgba(13,148,136,0.07) 38%, rgba(9,5,22,0.72) 100%);
          border: 1px solid rgba(13,148,136,0.20); border-top: 1px solid rgba(165,243,252,0.30);
          backdrop-filter: blur(28px) saturate(185%); -webkit-backdrop-filter: blur(28px) saturate(185%);
          box-shadow:
            0 22px 48px rgba(0,0,0,0.55),
            0 0 34px var(--glow),
            inset 0 1px 0 rgba(255,255,255,0.24),
            inset 0 -1px 0 rgba(0,0,0,0.42);
          transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease;
        }
        /* Gloss superior */
        .cl-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 48%; background: linear-gradient(180deg, rgba(255,255,255,0.10), transparent); pointer-events: none; }
        /* Línea de luz (relieve del borde) */
        .cl-card::after { content: ''; position: absolute; top: 0; left: 14%; right: 14%; height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: 0.7; }
        .cl-card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(0,0,0,0.6), 0 0 50px var(--glow), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.42); }
        .cl-card:active { transform: translateY(-2px) scale(0.995); }

        /* Estado de registro: vidrio oscuro con TINTE del color (no sólido), para
           que el texto blanco siga legible. Se sobrescribe la regla global vieja
           que los pintaba de color saturado. El color se lee en número/glow/píldora. */
        .cl-card.status-green, .cl-card.status-yellow, .cl-card.status-red {
          border: 1px solid rgba(255,255,255,0.14) !important;
          border-top: 1px solid rgba(255,255,255,0.30) !important;
        }
        /* Pintado suave: base oscura del MISMO color (para que el rojo sea rojo y
           no rosado sobre el fondo púrpura), con el color visible pero atenuado. */
        .cl-card.status-green {
          --accent: #ffffff; --glow: rgba(16,185,129,0.45);
          background: linear-gradient(155deg, rgba(16,185,129,0.62) 0%, rgba(6,78,59,0.93) 58%, rgba(4,52,39,0.96) 100%) !important;
          box-shadow: 0 22px 48px rgba(0,0,0,0.5), 0 0 40px rgba(16,185,129,0.42), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.4) !important;
        }
        .cl-card.status-yellow {
          --accent: #ffffff; --glow: rgba(217,119,6,0.45);
          background: linear-gradient(155deg, rgba(217,119,6,0.66) 0%, rgba(120,66,8,0.93) 58%, rgba(74,42,6,0.96) 100%) !important;
          box-shadow: 0 22px 48px rgba(0,0,0,0.5), 0 0 40px rgba(217,119,6,0.42), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.4) !important;
        }
        .cl-card.status-red {
          --accent: #ffffff; --glow: rgba(220,38,38,0.45);
          background: linear-gradient(155deg, rgba(220,38,38,0.64) 0%, rgba(120,20,20,0.94) 55%, rgba(74,12,12,0.97) 100%) !important;
          box-shadow: 0 22px 48px rgba(0,0,0,0.5), 0 0 40px rgba(220,38,38,0.42), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.4) !important;
        }
        /* Texto legible sobre el pintado */
        .cl-card.status-green .cl-num, .cl-card.status-yellow .cl-num, .cl-card.status-red .cl-num { color: #fff; }
        .cl-card.status-green .cl-fitem, .cl-card.status-yellow .cl-fitem, .cl-card.status-red .cl-fitem,
        .cl-card.status-green .cl-fitem.doc, .cl-card.status-yellow .cl-fitem.doc, .cl-card.status-red .cl-fitem.doc { color: rgba(255,255,255,0.92); }
        .cl-card.status-green .cl-foot, .cl-card.status-yellow .cl-foot, .cl-card.status-red .cl-foot { border-top-color: rgba(255,255,255,0.18); }
        .cl-card.status-green .cl-label, .cl-card.status-yellow .cl-label, .cl-card.status-red .cl-label { color: rgba(255,255,255,0.75); }
        /* Píldora de estado: sólido neón del color, para leerse al instante */
        .cl-card.status-green .cl-status-pill { background: #10e39a; color: #052b1e; box-shadow: 0 0 16px rgba(16,227,154,0.6); }
        .cl-card.status-yellow .cl-status-pill { background: #ffc31a; color: #3a2500; box-shadow: 0 0 16px rgba(255,195,26,0.55); }
        .cl-card.status-red .cl-status-pill { background: #ff4757; color: #fff; box-shadow: 0 0 16px rgba(255,71,87,0.6); }

        .cl-top { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; }
        .cl-num { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.6rem; letter-spacing: -0.02em; color: var(--accent); }
        .cl-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; padding: 4px 9px; border-radius: 100px; color: #a5f3fc; background: rgba(6,182,212,0.16); border: 1px solid rgba(165,243,252,0.28); }
        .cl-main { position: relative; z-index: 1; }
        .cl-label { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 5px; }
        .cl-obj { display: block; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.02rem; line-height: 1.28; color: #fff; letter-spacing: -0.01em; }
        .cl-status-pill { display: inline-block; margin-top: 10px; font-size: 0.72rem; font-weight: 800; padding: 5px 12px; border-radius: 100px; color: #05030f; background: var(--accent); }
        .cl-foot { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 8px 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
        .cl-fitem { display: inline-flex; align-items: center; gap: 6px; font-size: 0.76rem; font-weight: 600; color: rgba(255,255,255,0.7); }
        .cl-fitem.doc { color: #5eead4; }
        .cl-etapa { display: inline-flex; align-items: center; gap: 5px; font-size: 0.66rem; font-weight: 700; padding: 3px 10px; border-radius: 100px; color: #ddd6fe; background: rgba(129,140,248,0.18); border: 1px solid rgba(129,140,248,0.3); }

        @media (prefers-reduced-motion: reduce) { .cl-card { transition: none; } .cl-root::before { animation: none; } }
      `}</style>

      <div className="cl-shell">
        <div className="cl-header">
          <button className="cl-back" onClick={onBack}><ChevronLeft size={18} /><span>Cursos</span></button>
          <div className="cl-ctx">
            <p>Sesiones de seguimiento pedagógico</p>
            <h2><span>{activeCourse}</span></h2>
          </div>
          <button className="cl-close" onClick={onBack}><X size={22} /></button>
        </div>

        <div className="cl-grid">
          {levelData.map((session, idx) => {
            const courseTag = getCourseTag(activeCourse);
            const clsId = session.clase;
            const registrationId = `${courseTag}-${clsId}`;
            const registeredStatus = registrations[registrationId];
            const teacherName = getTeacherForCourse(session.rawDocente, activeCourse);

            return (
              <motion.div
                key={idx}
                className={`cl-card ${registeredStatus ? `status-${registeredStatus}` : ''}`}
                onClick={() => onClassSelect({ ...session, rawDocente: teacherName, titulo: `Clase ${clsId}` })}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...spring, delay: Math.min(idx * 0.02, 0.3) }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="cl-top">
                  <span className="cl-num">#{clsId}</span>
                  {session.canvaLink && (
                    <span className="cl-badge"><MonitorPlay size={12} /> CANVA</span>
                  )}
                </div>

                <div className="cl-main">
                  <span className="cl-label">Clase {clsId}</span>
                  <span className="cl-obj">
                    {session.objetivo ? `${session.objetivo.substring(0, 90)}${session.objetivo.length > 90 ? '…' : ''}` : 'Sin objetivo definido'}
                  </span>
                  {registeredStatus && (
                    <span className="cl-status-pill">
                      {registeredStatus === 'green' ? '★ Realizada' : registeredStatus === 'yellow' ? '⚠ Incompleta' : '✖ No realizada'}
                    </span>
                  )}
                </div>

                <div className="cl-foot">
                  <span className="cl-fitem doc"><Users size={13} />{teacherName || 'Sin docente'}</span>
                  <span className="cl-fitem"><Calendar size={13} />{session.fecha}</span>
                  <span className="cl-fitem"><Clock size={13} />90 min</span>
                  {session.etapa && <span className="cl-etapa"><Sparkles size={11} />{session.etapa}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClassListView;
