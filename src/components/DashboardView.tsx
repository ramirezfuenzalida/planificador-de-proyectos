import React, { useState, useEffect } from 'react';
import { ChevronDown, GraduationCap, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardViewProps {
  courses1M: string[];
  courses2M: string[];
  registrations: Record<string, string>;
  globalData: { pm: any[]; sm: any[] };
  getCourseTag: (courseName: string | null) => string;
  handleCourseSelect: (course: string) => void;
}

// Cuenta clases realizadas (verde) de un curso contra su planificación.
const courseStats = (
  course: string,
  levelData: any[],
  registrations: Record<string, string>,
  getCourseTag: (c: string | null) => string,
) => {
  const courseTag = getCourseTag(course);
  const total = levelData.length || 1;
  let realizadas = 0;
  levelData.forEach((clase: any) => {
    const clsId = String(clase.clase || '').replace(/[^0-9]/g, '');
    if (registrations[`${courseTag}-${clsId}`] === 'green') realizadas++;
  });
  return { total, realizadas, adherence: Math.round((realizadas / total) * 100) };
};

const DashboardView: React.FC<DashboardViewProps> = ({
  courses1M,
  courses2M,
  registrations,
  globalData,
  getCourseTag,
  handleCourseSelect,
}) => {
  const [open, setOpen] = useState<{ '1M': boolean; '2M': boolean }>({ '1M': false, '2M': false });
  const toggle = (g: '1M' | '2M') => setOpen((o) => ({ ...o, [g]: !o[g] }));

  // Pinta el shell (html/body/main-board/header) en oscuro cósmico SOLO mientras
  // esta portada está montada, para que en iPhone no asome blanco en bordes,
  // overscroll ni zonas seguras. Al salir de la vista se restaura el tema claro.
  useEffect(() => {
    document.documentElement.classList.add('dv-cosmic');
    document.body.classList.add('dv-cosmic');
    return () => {
      document.documentElement.classList.remove('dv-cosmic');
      document.body.classList.remove('dv-cosmic');
    };
  }, []);

  const groups = [
    {
      id: '1M' as const,
      title: 'Primeros Medios',
      courses: courses1M,
      levelData: globalData.pm,
      icon: <GraduationCap size={26} />,
    },
    {
      id: '2M' as const,
      title: 'Segundos Medios',
      courses: courses2M,
      levelData: globalData.sm,
      icon: <Layers size={26} />,
    },
  ];

  // Adherencia global (todos los cursos), para el encabezado.
  const allCourses = [...courses1M, ...courses2M];
  let gTotal = 0;
  let gReal = 0;
  allCourses.forEach((c) => {
    const s = courseStats(c, c.startsWith('1') ? globalData.pm : globalData.sm, registrations, getCourseTag);
    gTotal += s.total;
    gReal += s.realizadas;
  });
  const globalAdherence = gTotal > 0 ? Math.round((gReal / gTotal) * 100) : 0;

  const spring = { type: 'spring' as const, bounce: 0, duration: 0.45 };

  return (
    <div className="dv-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800;900&family=Manrope:wght@400;500;600;700;800&display=swap');

        /* Shell oscuro cósmico mientras la portada está activa (evita blancos en iPhone) */
        html.dv-cosmic, body.dv-cosmic { background: #070311 !important; }
        body.dv-cosmic .main-board { background: transparent !important; }
        body.dv-cosmic .main-board:before { display: none !important; }
        body.dv-cosmic .mobile-nav-header {
          background: rgba(10,7,22,0.72) !important;
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          backdrop-filter: blur(20px) saturate(160%);
          border-bottom: 1px solid rgba(255,255,255,0.07) !important;
          padding-top: env(safe-area-inset-top, 0px);
        }
        body.dv-cosmic .mobile-nav-brand { color: #fff !important; }
        body.dv-cosmic .mobile-menu-btn { background: rgba(255,255,255,0.08) !important; color: #5eead4 !important; }

        .dv-root {
          position: relative;
          min-height: 100vh;
          padding:
            max(32px, calc(env(safe-area-inset-top, 0px) + 16px))
            calc(20px + env(safe-area-inset-right, 0px))
            160px
            calc(20px + env(safe-area-inset-left, 0px));
          font-family: 'Manrope', sans-serif;
          background:
            radial-gradient(1200px 600px at 15% -10%, rgba(13,148,136,0.20), transparent 60%),
            radial-gradient(1000px 700px at 100% 0%, rgba(79,70,229,0.22), transparent 55%),
            radial-gradient(900px 900px at 50% 120%, rgba(6,182,212,0.12), transparent 60%),
            linear-gradient(180deg, #0a0716 0%, #0c0822 45%, #070311 100%);
          overflow-x: hidden;
        }
        /* Grano/estrellas sutiles */
        .dv-root::before {
          content: '';
          position: fixed; inset: 0; pointer-events: none;
          background-image:
            radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.35), transparent),
            radial-gradient(1.5px 1.5px at 45% 15%, rgba(165,243,252,0.4), transparent),
            radial-gradient(1px 1px at 85% 25%, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.25), transparent);
          opacity: 0.6;
        }

        .dv-shell { position: relative; z-index: 1; max-width: 660px; margin: 0 auto; }

        /* ── ENCABEZADO ── */
        .dv-head { text-align: center; margin-bottom: 34px; }
        .dv-eyebrow {
          font-size: 0.72rem; font-weight: 700; letter-spacing: 0.22em;
          text-transform: uppercase; color: rgba(165,243,252,0.6); margin-bottom: 12px;
        }
        .dv-title {
          font-family: 'Outfit', sans-serif; font-weight: 800;
          font-size: clamp(1.9rem, 6vw, 2.7rem); line-height: 1.05;
          letter-spacing: -0.03em; color: #fff; margin-bottom: 8px;
        }
        .dv-title span {
          background: linear-gradient(120deg, #5eead4, #22d3ee 55%, #818cf8);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .dv-sub { font-size: 0.92rem; color: rgba(255,255,255,0.45); font-weight: 500; }

        .dv-chips { display: flex; justify-content: center; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
        .dv-chip {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 16px; border-radius: 100px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-top-color: rgba(255,255,255,0.16);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
        }
        .dv-chip b { font-family: 'Outfit', sans-serif; font-size: 1.05rem; color: #fff; font-weight: 800; }
        .dv-chip span { font-size: 0.75rem; color: rgba(255,255,255,0.5); font-weight: 600; }

        /* ── COLUMNA DE GRUPOS ── */
        .dv-groups { display: flex; flex-direction: column; gap: 20px; }
        .dv-group-block { display: flex; flex-direction: column; }

        /* Tarjeta grande de grupo: vidrio gloss + relieve */
        .dv-group-card {
          position: relative; cursor: pointer; user-select: none;
          border-radius: 26px; padding: 26px 26px;
          display: flex; align-items: center; gap: 20px;
          background: linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(13,148,136,0.08) 40%, rgba(12,6,26,0.55) 100%);
          border: 1px solid rgba(13,148,136,0.22);
          border-top: 1px solid rgba(165,243,252,0.30);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          box-shadow:
            0 24px 50px rgba(0,0,0,0.55),
            0 0 40px rgba(13,148,136,0.10),
            inset 0 1px 0 rgba(255,255,255,0.20),
            inset 0 -1px 0 rgba(0,0,0,0.35);
          overflow: hidden;
          transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease;
        }
        .dv-group-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 52%;
          background: linear-gradient(180deg, rgba(255,255,255,0.10), transparent);
          pointer-events: none;
        }
        .dv-group-card::after {
          content: ''; position: absolute; top: 0; left: 14%; right: 14%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(165,243,252,0.7), transparent);
        }
        .dv-group-card:hover { transform: translateY(-3px); box-shadow: 0 30px 60px rgba(0,0,0,0.6), 0 0 60px rgba(13,148,136,0.18), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -1px 0 rgba(0,0,0,0.35); }
        .dv-group-card:active { transform: translateY(-1px) scale(0.994); }

        .dv-gicon {
          width: 58px; height: 58px; flex-shrink: 0; border-radius: 18px;
          display: flex; align-items: center; justify-content: center; color: #5eead4;
          background: rgba(6,3,18,0.4);
          border: 1px solid rgba(165,243,252,0.18);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 16px rgba(0,0,0,0.4);
        }
        .dv-ginfo { flex: 1; min-width: 0; }
        .dv-gname {
          font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.4rem;
          letter-spacing: -0.02em; color: #fff; margin-bottom: 6px; line-height: 1.1;
        }
        .dv-gmeta { font-size: 0.82rem; color: rgba(255,255,255,0.55); font-weight: 600; margin-bottom: 10px; }
        .dv-gmeta b { color: #5eead4; font-weight: 800; }
        .dv-gbar { height: 7px; border-radius: 100px; background: rgba(255,255,255,0.10); overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.4); }
        .dv-gbar-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, #5eead4, #22d3ee); box-shadow: 0 0 12px rgba(34,211,238,0.6); }

        .dv-chevron { flex-shrink: 0; color: rgba(255,255,255,0.5); display: flex; }

        /* ── SUB-GRILLA DE CURSOS ── */
        .dv-course-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
          padding: 16px 4px 4px;
        }
        .dv-course-card {
          position: relative; cursor: pointer; border-radius: 20px; padding: 18px;
          min-height: 150px; display: flex; flex-direction: column; justify-content: space-between;
          color: #fff; overflow: hidden;
          background: linear-gradient(140deg, var(--tint1) 0%, var(--tint2) 46%, rgba(9,5,20,0.62) 100%);
          border: 1px solid var(--edge-soft);
          border-top: 1px solid var(--edge);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          box-shadow:
            0 16px 34px rgba(0,0,0,0.45),
            0 0 30px var(--accent-glow),
            inset 0 1px 0 rgba(255,255,255,0.24),
            inset 0 -1px 0 rgba(0,0,0,0.40);
          transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease;
        }
        /* Glow de color desde arriba */
        .dv-course-card::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(135% 95% at 50% -25%, var(--accent-glow), transparent 62%);
          opacity: 0.95;
        }
        /* Barrido gloss superior (línea de luz del material) */
        .dv-course-card::after {
          content: ''; position: absolute; top: 0; left: 12%; right: 12%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--edge), transparent);
        }
        .dv-course-card:hover { transform: translateY(-4px); box-shadow: 0 26px 52px rgba(0,0,0,0.55), 0 0 48px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.40); }
        .dv-course-card:active { transform: translateY(-1px) scale(0.99); }

        /* Cada curso: vidrio gloss tintado con su propio color vivo */
        .dv-course-card.a { --accent: #bfdbfe; --accent-glow: rgba(59,130,246,0.50); --tint1: rgba(59,130,246,0.46); --tint2: rgba(59,130,246,0.12); --edge: rgba(191,219,254,0.62); --edge-soft: rgba(59,130,246,0.34); }
        .dv-course-card.b { --accent: #a7f3d0; --accent-glow: rgba(16,185,129,0.50); --tint1: rgba(16,185,129,0.46); --tint2: rgba(16,185,129,0.12); --edge: rgba(167,243,208,0.62); --edge-soft: rgba(16,185,129,0.34); }
        .dv-course-card.c { --accent: #fde68a; --accent-glow: rgba(245,158,11,0.48); --tint1: rgba(245,158,11,0.44); --tint2: rgba(245,158,11,0.12); --edge: rgba(253,230,138,0.62); --edge-soft: rgba(245,158,11,0.34); }
        .dv-course-card.d { --accent: #fbcfe8; --accent-glow: rgba(236,72,153,0.50); --tint1: rgba(236,72,153,0.46); --tint2: rgba(236,72,153,0.12); --edge: rgba(251,207,232,0.62); --edge-soft: rgba(236,72,153,0.34); }

        .dv-cc-head { display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1; }
        .dv-cc-tag {
          font-size: 0.62rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 100px; color: var(--accent); white-space: nowrap;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
        }
        .dv-cc-pct { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 1.05rem; color: #fff; }
        .dv-cc-name {
          font-family: 'Outfit', sans-serif; font-weight: 900;
          font-size: clamp(1.15rem, 3.4vw, 1.5rem);
          letter-spacing: -0.02em; line-height: 1.05; position: relative; z-index: 1;
        }
        .dv-cc-foot { position: relative; z-index: 1; }
        .dv-cc-stat { font-size: 0.74rem; color: rgba(255,255,255,0.68); font-weight: 600; margin-bottom: 7px; }
        .dv-cc-bar { height: 6px; border-radius: 100px; background: rgba(255,255,255,0.14); overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.4); }
        .dv-cc-bar-fill { height: 100%; border-radius: 100px; background: linear-gradient(90deg, var(--accent), #fff); box-shadow: 0 0 10px var(--accent-glow); }

        @media (min-width: 720px) {
          .dv-course-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (max-width: 380px) {
          .dv-group-card { padding: 20px; gap: 14px; }
          .dv-gicon { width: 48px; height: 48px; }
          .dv-gname { font-size: 1.2rem; }
          .dv-course-grid { gap: 10px; }
          .dv-course-card { padding: 15px; min-height: 138px; border-radius: 18px; }
          .dv-cc-tag { font-size: 0.56rem; padding: 3px 8px; }
          .dv-cc-stat { font-size: 0.7rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dv-group-card, .dv-course-card { transition: none; }
        }
      `}</style>

      <div className="dv-shell">
        {/* Encabezado */}
        <div className="dv-head">
          <div className="dv-eyebrow">ZenitApp · Seguimiento 2026</div>
          <h1 className="dv-title">Bienvenido al <span>sistema de seguimiento</span></h1>
          <p className="dv-sub">Liceo Bicentenario William Taylor de Alto Hospicio</p>
          <div className="dv-chips">
            <div className="dv-chip"><b>{allCourses.length}</b><span>Cursos activos</span></div>
            <div className="dv-chip"><b>{globalAdherence}%</b><span>Adherencia global</span></div>
          </div>
        </div>

        {/* Grupos */}
        <div className="dv-groups">
          {groups.map((g) => {
            const isOpen = open[g.id];
            // Agregado del grupo: total y realizadas sumadas de sus 4 cursos.
            let total = 0;
            let real = 0;
            g.courses.forEach((c) => {
              const s = courseStats(c, g.levelData, registrations, getCourseTag);
              total += s.total;
              real += s.realizadas;
            });
            const pct = total > 0 ? Math.round((real / total) * 100) : 0;

            return (
              <div className="dv-group-block" key={g.id}>
                <motion.div
                  className="dv-group-card"
                  onClick={() => toggle(g.id)}
                  whileTap={{ scale: 0.994 }}
                >
                  <div className="dv-gicon">{g.icon}</div>
                  <div className="dv-ginfo">
                    <div className="dv-gname">{g.title}</div>
                    <div className="dv-gmeta"><b>{real}</b> / {total} Clases Realizadas</div>
                    <div className="dv-gbar"><div className="dv-gbar-fill" style={{ width: `${pct}%` }} /></div>
                  </div>
                  <motion.div className="dv-chevron" animate={{ rotate: isOpen ? 180 : 0 }} transition={spring}>
                    <ChevronDown size={24} />
                  </motion.div>
                </motion.div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="grid"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={spring}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="dv-course-grid">
                        {g.courses.map((course, i) => {
                          const s = courseStats(course, g.levelData, registrations, getCourseTag);
                          const letter = course.split(' ').pop()?.toLowerCase();
                          return (
                            <motion.div
                              key={course}
                              className={`dv-course-card ${letter}`}
                              onClick={() => handleCourseSelect(course)}
                              initial={{ opacity: 0, y: 14, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ ...spring, delay: 0.04 * i }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="dv-cc-head">
                                <span className="dv-cc-tag">{course.startsWith('1') ? '1° Medio' : '2° Medio'}</span>
                                <span className="dv-cc-pct">{s.adherence}%</span>
                              </div>
                              <div className="dv-cc-name">{course}</div>
                              <div className="dv-cc-foot">
                                <div className="dv-cc-stat">{s.realizadas} / {s.total} Clases Realizadas</div>
                                <div className="dv-cc-bar"><div className="dv-cc-bar-fill" style={{ width: `${s.adherence}%` }} /></div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
