import React, { useLayoutEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Search, User, ArrowLeft, Users, Award, TrendingUp, Calendar, Sparkles,
  ClipboardList, Plus, Trash2, Check, Target, GraduationCap, FileDown,
} from 'lucide-react';

interface Props {
  courses1M: string[];
  courses2M: string[];
  globalData: { pm: any[]; sm: any[] };
  formativeRegistrations: Record<string, any>;
  formativeEvaluations: Record<string, any>;
  setFormativeEvaluations: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  getCourseTag: (course: string) => string;
  dynamicGroups: Record<string, any>;
}

interface Intervention {
  id: string;
  date: string;
  type: string;
  description: string;
  responsible: string;
  completed: boolean;
}

const ROLES = ['Coordinador', 'Investigador', 'Mediador', 'Secretario'];
const TIPOS_PLAN = [
  'Refuerzo académico', 'Cambio de rol', 'Contacto apoderado', 'Derivación',
  'Reunión de equipo', 'Compromiso del estudiante', 'Acompañamiento',
  'Tutoría individual', 'Tutoría grupal', 'Plan restaurativo', 'Otro',
];

// Nota propuesta según escala institucional (promedio de hitos formativos).
const calcularNotaPropuesta = (history: any[]): number | null => {
  const total = history.length;
  if (total === 0) return null;
  let pts = 0;
  history.forEach(h => { if (h.status === 'green') pts += 1; else if (h.status === 'yellow') pts += 0.5; });
  const pct = (pts / total) * 100;
  let g: number;
  if (pct >= 86) g = 7; else if (pct >= 73) g = 6; else if (pct >= 67) g = 5;
  else if (pct >= 50) g = 4; else if (pct >= 26) g = 3; else if (pct >= 1) g = 2; else g = 1;
  return parseFloat(g.toFixed(1));
};

const nuevoId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `iv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const StudentProfileView: React.FC<Props> = ({
  courses1M, courses2M, globalData, formativeRegistrations,
  formativeEvaluations, setFormativeEvaluations, getCourseTag, dynamicGroups,
}) => {
  useLayoutEffect(() => {
    document.documentElement.classList.add('sp-cosmic');
    document.body.classList.add('sp-cosmic');
    return () => {
      document.documentElement.classList.remove('sp-cosmic');
      document.body.classList.remove('sp-cosmic');
    };
  }, []);

  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pType, setPType] = useState(TIPOS_PLAN[0]);
  const [pDesc, setPDesc] = useState('');
  const [pResp, setPResp] = useState('');

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  // Historial de hitos de un estudiante (mismo cálculo del Radar/Formativa).
  const getStudentHistory = (course: string, groupId: number, studentId: string) => {
    const courseTag = getCourseTag(course);
    const levelClasses = course.startsWith('1') ? globalData.pm : globalData.sm;
    const history: { classId: string; date: string; status: 'green' | 'yellow' | 'red' }[] = [];
    levelClasses.forEach((clase: any) => {
      const classId = clase.clase;
      const td = formativeRegistrations[`${courseTag}-C${classId}-G${groupId}`];
      if (!td) return;
      let st: 'green' | 'yellow' | 'red' | 'none' = td.students?.[studentId] || 'none';
      if (st === 'none' && td.group && td.group !== 'none') st = td.group;
      if (st !== 'none') history.push({ classId, date: clase.fecha, status: st });
    });
    return history;
  };

  // Base completa de estudiantes (10 equipos × 4, reales del Sheets).
  const allStudents = useMemo(() => {
    const list: any[] = [];
    [...courses1M, ...courses2M].forEach(course => {
      const courseTag = getCourseTag(course);
      const level = course.startsWith('1') ? '1M' : '2M';
      Array.from({ length: 10 }).forEach((_, i) => {
        const groupId = i + 1;
        const groupInfo = dynamicGroups[`${courseTag}-G${groupId}`] || [];
        ['s1', 's2', 's3', 's4'].forEach((sid, idx) => {
          const isReal = !!(groupInfo[idx] && groupInfo[idx].name && String(groupInfo[idx].name).trim());
          if (!isReal) return;
          const name = groupInfo[idx].name;
          const role = groupInfo[idx].role || ROLES[idx];
          const history = getStudentHistory(course, groupId, sid);
          const evalKey = `${courseTag}-G${groupId}-${sid}`;
          const ev = formativeEvaluations[evalKey] || { grade: '', comment: '', interventions: [] };
          const counts = { green: 0, yellow: 0, red: 0 };
          history.forEach(h => { (counts as any)[h.status]++; });
          list.push({
            key: evalKey, evalKey, course, level, groupId, studentId: sid, name, role,
            history, counts, proposed: calcularNotaPropuesta(history),
            grade: ev.grade || '', comment: ev.comment || '',
            interventions: (ev.interventions || []) as Intervention[],
          });
        });
      });
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses1M, courses2M, globalData, formativeRegistrations, formativeEvaluations, dynamicGroups]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? allStudents.filter(s => s.name.toLowerCase().includes(q) || s.course.toLowerCase().includes(q)) : allStudents;
    return [...base].sort((a, b) => a.course.localeCompare(b.course) || a.name.localeCompare(b.name));
  }, [allStudents, query]);

  const selected = selectedKey ? allStudents.find(s => s.key === selectedKey) : null;

  // ── Plan de acción (intervenciones) ──
  const updateInterventions = (evalKey: string, next: Intervention[]) => {
    setFormativeEvaluations(old => {
      const prev = old[evalKey] || { grade: '', comment: '' };
      return { ...old, [evalKey]: { ...prev, interventions: next } };
    });
  };
  const addIntervention = () => {
    if (!selected) return;
    if (!pDesc.trim()) { flash('Escribe la descripción del plan'); return; }
    const nueva: Intervention = {
      id: nuevoId(), date: new Date().toISOString().slice(0, 10),
      type: pType, description: pDesc.trim(), responsible: pResp.trim(), completed: false,
    };
    updateInterventions(selected.evalKey, [...selected.interventions, nueva]);
    setPDesc(''); setPResp('');
    flash('Acción agregada al plan');
  };
  const toggleIntervention = (id: string) => {
    if (!selected) return;
    updateInterventions(selected.evalKey, selected.interventions.map((iv: Intervention) => iv.id === id ? { ...iv, completed: !iv.completed } : iv));
  };
  const deleteIntervention = (id: string) => {
    if (!selected) return;
    updateInterventions(selected.evalKey, selected.interventions.filter((iv: Intervention) => iv.id !== id));
    flash('Acción eliminada');
  };

  // ── Exportar / compartir PDF del perfil ──
  const exportarPerfilPDF = () => {
    if (!selected) return;
    const s = selected;
    const estado = (st: string) => (st === 'green' ? 'Logrado' : st === 'yellow' ? 'Por lograr' : 'No logrado');
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 16;

    doc.setFillColor(13, 148, 136); doc.rect(0, 0, pageW, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(15, 23, 42);
    doc.text(s.name, margin, 20);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text(`${s.course}  ·  Rol: ${s.role}  ·  Equipo N° ${s.groupId}  ·  ${new Date().toLocaleDateString('es-CL')}`, margin, 26);

    // Resumen
    autoTable(doc, {
      startY: 32,
      head: [['Clases eval.', 'Logrados', 'Por lograr', 'No logrados', 'Nota Propuesta', 'Calificación']],
      body: [[
        String(s.history.length), String(s.counts.green), String(s.counts.yellow), String(s.counts.red),
        s.proposed != null ? s.proposed.toFixed(1) : '—', s.grade || 'Pendiente',
      ]],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8.5 },
      bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 12, textColor: [15, 23, 42] },
      margin: { left: margin, right: margin },
    });

    // Seguimientos (línea de tiempo)
    const hist = [...s.history].sort((a: any, b: any) => parseInt(a.classId) - parseInt(b.classId));
    if (hist.length) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [['Seguimientos — Clase', 'Fecha', 'Estado']],
        body: hist.map((h: any) => [`Clase N° ${h.classId}`, h.date || '—', estado(h.status)]),
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });
    }

    // Retroalimentación
    let y = (doc as any).lastAutoTable.finalY + 8;
    if (y > pageH - 30) { doc.addPage(); y = 16; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
    doc.text('Retroalimentación global', margin, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
    const fb = doc.splitTextToSize(s.comment || 'Sin comentarios registrados.', pageW - margin * 2);
    doc.text(fb, margin, y + 6);
    y += 6 + fb.length * 5 + 6;

    // Plan de acción
    if (s.interventions.length) {
      autoTable(doc, {
        startY: y,
        head: [['Plan de acción — Tipo', 'Descripción', 'Responsable', 'Fecha', 'Estado']],
        body: s.interventions.map((iv: Intervention) => [iv.type, iv.description, iv.responsible || '—', iv.date, iv.completed ? 'Cumplida' : 'Pendiente']),
        theme: 'striped',
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5 },
        columnStyles: { 1: { cellWidth: 'auto' } },
        margin: { left: margin, right: margin },
      });
    }

    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
      doc.text('Ficha del Estudiante · ZenitApp · Seguimiento 2026', margin, pageH - 8);
      doc.text(`Página ${i} de ${total}`, pageW - margin, pageH - 8, { align: 'right' });
    }

    const nombre = `Ficha_${s.name}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '.pdf';
    const blob = doc.output('blob');
    const file = new File([blob], nombre, { type: 'application/pdf' });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      nav.share({ files: [file], title: `Ficha de ${s.name}` }).catch(() => doc.save(nombre));
    } else {
      doc.save(nombre);
    }
  };

  const totalReales = allStudents.length;

  return (
    <div className="sp-root">
      <style>{styles}</style>

      {toast && (
        <motion.div className="sp-toast" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          <Check size={15} /> {toast}
        </motion.div>
      )}

      <div className="sp-shell">
        <AnimatePresence mode="wait">
          {!selected ? (
            // ─────────── BUSCADOR ───────────
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="sp-head">
                <div className="sp-head-icon"><Users size={24} /></div>
                <div>
                  <div className="sp-eyebrow">SEGUIMIENTO INDIVIDUAL</div>
                  <h1 className="sp-title">Ficha del <span>Estudiante</span></h1>
                  <p className="sp-sub">Busca a cualquier estudiante y revisa todo su seguimiento formativo y plan de acción.</p>
                </div>
              </div>

              <div className="sp-searchbar">
                <Search size={18} />
                <input
                  autoFocus
                  placeholder="Buscar por nombre o curso…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                {query && <button className="sp-clear" onClick={() => setQuery('')}>Limpiar</button>}
              </div>

              <div className="sp-count">{results.length} de {totalReales} estudiantes</div>

              <div className="sp-list">
                {results.length === 0 && <div className="sp-empty">No se encontraron estudiantes con “{query}”.</div>}
                {results.map(s => (
                  <button key={s.key} className="sp-list-item" onClick={() => setSelectedKey(s.key)}>
                    <div className="sp-li-avatar"><User size={18} /></div>
                    <div className="sp-li-info">
                      <div className="sp-li-name">{s.name}</div>
                      <div className="sp-li-meta">{s.course} · {s.role} · Equipo N° {s.groupId}</div>
                    </div>
                    <div className="sp-li-grade">
                      {s.proposed != null ? <><strong>{s.proposed.toFixed(1)}</strong><span>propuesta</span></> : <span className="sp-li-nodata">sin clases</span>}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            // ─────────── PERFIL ───────────
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="sp-profile-actions">
                <button className="sp-back" onClick={() => setSelectedKey(null)}><ArrowLeft size={16} /> Volver al buscador</button>
                <button className="sp-export-btn" onClick={exportarPerfilPDF}><FileDown size={16} /> Exportar / Compartir PDF</button>
              </div>

              {/* Identidad */}
              <div className="sp-profile-head">
                <div className="sp-avatar-lg"><User size={30} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 className="sp-name-lg">{selected.name}</h2>
                  <div className="sp-badges">
                    <span className="sp-badge course"><GraduationCap size={13} /> {selected.course}</span>
                    <span className="sp-badge role"><Award size={13} /> {selected.role}</span>
                    <span className="sp-badge group"><Users size={13} /> Equipo N° {selected.groupId}</span>
                  </div>
                </div>
              </div>

              {/* Resumen */}
              <div className="sp-cards">
                <div className="sp-card violet"><span className="sp-c-l">Clases evaluadas</span><strong className="sp-c-v">{selected.history.length}</strong></div>
                <div className="sp-card green"><span className="sp-c-l">Logrados</span><strong className="sp-c-v">{selected.counts.green}</strong></div>
                <div className="sp-card amber"><span className="sp-c-l">Por lograr</span><strong className="sp-c-v">{selected.counts.yellow}</strong></div>
                <div className="sp-card red"><span className="sp-c-l">No logrados</span><strong className="sp-c-v">{selected.counts.red}</strong></div>
                <div className="sp-card sky"><span className="sp-c-l">Nota Propuesta</span><strong className="sp-c-v">{selected.proposed != null ? selected.proposed.toFixed(1) : '—'}</strong></div>
                <div className="sp-card teal"><span className="sp-c-l">Calificación</span><strong className="sp-c-v">{selected.grade || 'Pend.'}</strong></div>
              </div>

              {/* Curva de evolución */}
              <div className="sp-section">
                <h3 className="sp-sec-title"><TrendingUp size={18} /> Curva de evolución</h3>
                {selected.history.length === 0 ? (
                  <div className="sp-none">Sin clases evaluadas para trazar la curva.</div>
                ) : (() => {
                  const hist = [...selected.history].sort((a: any, b: any) => parseInt(a.classId) - parseInt(b.classId));
                  const yOf = (s: string) => (s === 'green' ? 34 : s === 'yellow' ? 92 : 150);
                  const W = Math.max(520, hist.length * 74 + 130);
                  const H = 190;
                  const pts = hist.map((h: any, i: number) => ({ x: 118 + i * 74, y: yOf(h.status), ...h }));
                  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  const col = (s: string) => (s === 'green' ? '#10e39a' : s === 'yellow' ? '#ffc31a' : '#ff4757');
                  return (
                    <div className="sp-chart-wrap">
                      <svg width={W} height={H} style={{ display: 'block' }}>
                        <defs>
                          <linearGradient id="spLine" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#5eead4" /><stop offset="55%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#818cf8" />
                          </linearGradient>
                        </defs>
                        {[34, 92, 150].map((y, i) => (
                          <g key={y}>
                            <line x1="110" y1={y} x2={W - 20} y2={y} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                            <text x="102" y={y + 4} textAnchor="end" fontSize="10.5" fontWeight="800"
                              fill={i === 0 ? '#10e39a' : i === 1 ? '#ffc31a' : '#ff4757'}>
                              {i === 0 ? 'L' : i === 1 ? 'PL' : 'NL'}
                            </text>
                          </g>
                        ))}
                        {pts.length > 1 && <path d={line} fill="none" stroke="url(#spLine)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
                        {pts.map((p, i) => (
                          <g key={i}>
                            <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#f1f5f9">C{p.classId}</text>
                            <circle cx={p.x} cy={p.y} r="7" fill={col(p.status)} stroke="#0a0716" strokeWidth="2.5" />
                            <circle cx={p.x} cy={p.y} r="2.5" fill="#fff" />
                            <text x={p.x} y={175} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="rgba(255,255,255,0.5)">{p.date}</text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}
              </div>

              {/* Línea de tiempo de seguimientos */}
              <div className="sp-section">
                <h3 className="sp-sec-title"><TrendingUp size={18} /> Línea de tiempo de seguimientos</h3>
                {selected.history.length === 0 ? (
                  <div className="sp-none">Aún no hay clases evaluadas para este estudiante.</div>
                ) : (
                  <div className="sp-timeline">
                    {[...selected.history].sort((a: any, b: any) => parseInt(a.classId) - parseInt(b.classId)).map((h: any, i: number) => (
                      <div key={i} className={`sp-tl-item ${h.status}`}>
                        <span className="sp-tl-dot" />
                        <div className="sp-tl-body">
                          <div className="sp-tl-top">
                            <span className="sp-tl-clase">Clase N° {h.classId}</span>
                            <span className={`sp-tl-pill ${h.status}`}>
                              {h.status === 'green' ? 'Logrado' : h.status === 'yellow' ? 'Por lograr' : 'No logrado'}
                            </span>
                          </div>
                          <span className="sp-tl-date"><Calendar size={11} /> {h.date || 'Sin fecha'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Retroalimentación global */}
              <div className="sp-section">
                <h3 className="sp-sec-title"><Sparkles size={18} /> Retroalimentación global</h3>
                <div className="sp-feedback">{selected.comment || 'Sin comentarios globales registrados por el docente.'}</div>
              </div>

              {/* Plan de acción */}
              <div className="sp-section">
                <h3 className="sp-sec-title"><ClipboardList size={18} /> Plan de acción ({selected.interventions.length})</h3>

                <div className="sp-plan-form">
                  <div className="sp-plan-row">
                    <select value={pType} onChange={e => setPType(e.target.value)} className="sp-input">
                      {TIPOS_PLAN.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input className="sp-input" placeholder="Responsable (opcional)" value={pResp} onChange={e => setPResp(e.target.value)} />
                  </div>
                  <div className="sp-plan-row2">
                    <input className="sp-input" placeholder="Descripción de la acción…" value={pDesc}
                      onChange={e => setPDesc(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addIntervention(); }} />
                    <button className="sp-add-btn" onClick={addIntervention}><Plus size={16} /> Agregar</button>
                  </div>
                </div>

                {selected.interventions.length === 0 ? (
                  <div className="sp-none">Sin acciones registradas. Agrega la primera con el formulario de arriba.</div>
                ) : (
                  <div className="sp-plan-list">
                    {[...selected.interventions].reverse().map((iv: Intervention) => (
                      <div key={iv.id} className={`sp-plan-item ${iv.completed ? 'done' : ''}`}>
                        <button className="sp-plan-check" onClick={() => toggleIntervention(iv.id)} title={iv.completed ? 'Marcar pendiente' : 'Marcar cumplida'}>
                          {iv.completed ? <Check size={14} /> : null}
                        </button>
                        <div className="sp-plan-body">
                          <div className="sp-plan-top">
                            <span className="sp-plan-type"><Target size={12} /> {iv.type}</span>
                            <span className="sp-plan-date"><Calendar size={11} /> {iv.date}</span>
                          </div>
                          <div className="sp-plan-desc">{iv.description}</div>
                          {iv.responsible && <div className="sp-plan-resp">Responsable: <strong>{iv.responsible}</strong></div>}
                        </div>
                        <button className="sp-plan-del" onClick={() => deleteIntervention(iv.id)} title="Eliminar"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800;900&family=Manrope:wght@400;500;600;700;800&display=swap');

html.sp-cosmic, body.sp-cosmic {
  background:
    radial-gradient(1200px 600px at 12% -10%, rgba(124,58,237,0.20), transparent 60%),
    radial-gradient(1000px 700px at 100% 0%, rgba(6,182,212,0.18), transparent 55%),
    radial-gradient(900px 900px at 50% 120%, rgba(217,70,239,0.10), transparent 60%),
    linear-gradient(180deg, #0a0716 0%, #0c0822 45%, #070311 100%) !important;
}
body.sp-cosmic .app-window { background: transparent !important; }
body.sp-cosmic .main-board { background: transparent !important; }
body.sp-cosmic .main-board:before { display: none !important; }
body.sp-cosmic .mobile-nav-header {
  background: transparent !important; border-bottom: none !important;
  -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
  padding: calc(env(safe-area-inset-top,0px) + 1rem) 1.25rem 1rem 1.25rem !important; gap: .9rem !important;
}
body.sp-cosmic .mobile-nav-brand { color: #fff !important; }
body.sp-cosmic .mobile-menu-btn { background: rgba(255,255,255,0.07) !important; color: #5eead4 !important; border: 1px solid rgba(165,243,252,0.16) !important; }

.sp-root {
  position: relative; min-height: 100vh; font-family: 'Manrope', sans-serif; background: transparent;
  padding: max(20px, calc(env(safe-area-inset-top,0px) + 8px)) calc(24px + env(safe-area-inset-right,0px)) 160px calc(24px + env(safe-area-inset-left,0px));
  overflow-x: hidden;
}
.sp-shell { position: relative; z-index: 1; max-width: 940px; margin: 0 auto; }

.sp-toast { position: fixed; left: 50%; bottom: calc(2rem + env(safe-area-inset-bottom,0px)); transform: translateX(-50%); z-index: 3000; display: flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 100px; background: linear-gradient(135deg,#10b981,#059669); color: #fff; font-weight: 700; font-size: .85rem; box-shadow: 0 12px 30px rgba(16,185,129,.4); }

/* Encabezado buscador */
.sp-head { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 22px; }
.sp-head-icon { width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0; background: linear-gradient(150deg,#8b5cf6,#6d28d9); color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 10px 24px rgba(109,40,217,.45); }
.sp-eyebrow { font-size: .68rem; font-weight: 800; letter-spacing: .18em; color: rgba(165,243,252,.6); margin-bottom: 5px; }
.sp-title { font-family: 'Outfit',sans-serif; font-weight: 800; font-size: clamp(1.6rem,4.5vw,2.2rem); line-height: 1.05; color: #fff; margin: 0; }
.sp-title span { background: linear-gradient(120deg,#5eead4,#22d3ee 55%,#818cf8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.sp-sub { font-size: .88rem; color: rgba(255,255,255,.5); margin: 6px 0 0; }

.sp-searchbar { display: flex; align-items: center; gap: 10px; padding: 4px 6px 4px 16px; border-radius: 14px; background: rgba(8,5,22,.55); border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.5); }
.sp-searchbar input { flex: 1; background: none; border: none; outline: none; color: #fff; font-size: .95rem; padding: 13px 0; font-family: 'Manrope',sans-serif; }
.sp-searchbar input::placeholder { color: rgba(255,255,255,.35); }
.sp-clear { padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: rgba(255,255,255,.7); font-size: .78rem; font-weight: 700; cursor: pointer; }
.sp-count { font-size: .76rem; color: rgba(255,255,255,.45); font-weight: 700; margin: 12px 2px; }

.sp-list { display: flex; flex-direction: column; gap: 9px; }
.sp-empty, .sp-none { font-size: .86rem; color: rgba(255,255,255,.5); padding: 16px; text-align: center; background: rgba(255,255,255,.03); border: 1px dashed rgba(255,255,255,.12); border-radius: 14px; }
.sp-list-item { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; padding: 12px 14px; border-radius: 14px; cursor: pointer; background: linear-gradient(160deg, rgba(255,255,255,.055), rgba(255,255,255,.02)); border: 1px solid rgba(255,255,255,.09); transition: transform .15s, border-color .2s; }
.sp-list-item:hover { transform: translateY(-2px); border-color: rgba(94,234,212,.4); }
.sp-li-avatar { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#0d9488,#0284c7); color: #fff; }
.sp-li-info { flex: 1; min-width: 0; }
.sp-li-name { font-size: .95rem; font-weight: 700; color: #f1f5f9; }
.sp-li-meta { font-size: .76rem; color: rgba(255,255,255,.55); margin-top: 2px; }
.sp-li-grade { text-align: right; flex-shrink: 0; }
.sp-li-grade strong { display: block; font-family: 'Outfit',sans-serif; font-size: 1.2rem; font-weight: 900; color: #5eead4; line-height: 1; }
.sp-li-grade span { font-size: .62rem; color: rgba(255,255,255,.45); text-transform: uppercase; letter-spacing: .05em; }
.sp-li-nodata { font-size: .72rem; color: rgba(255,255,255,.35); font-style: italic; }

/* Perfil */
.sp-back { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 100px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); color: #fff; font-weight: 700; font-size: .82rem; cursor: pointer; margin-right: auto; }
.sp-back:hover { background: rgba(255,255,255,.12); }

.sp-profile-head { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.sp-avatar-lg { width: 62px; height: 62px; border-radius: 20px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#0d9488,#0284c7); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 10px 26px rgba(2,132,199,.4); }
.sp-name-lg { font-family: 'Outfit',sans-serif; font-weight: 900; font-size: clamp(1.4rem,4vw,2rem); color: #fff; margin: 0; letter-spacing: -.02em; }
.sp-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.sp-badge { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 100px; font-size: .92rem; font-weight: 800; }
.sp-badge svg { width: 16px; height: 16px; }
.sp-badge.course { color: #5eead4; background: rgba(45,212,191,.14); border: 1px solid rgba(45,212,191,.3); }
.sp-badge.role { color: #7dd3fc; background: rgba(56,189,248,.14); border: 1px solid rgba(56,189,248,.3); }
.sp-badge.group { color: #c4b5fd; background: rgba(139,92,246,.16); border: 1px solid rgba(139,92,246,.32); }

.sp-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(162px,1fr)); gap: 15px; margin-bottom: 24px; }
.sp-card { position: relative; border-radius: 20px; padding: 1.35rem 1.4rem; display: flex; flex-direction: column; gap: .5rem; overflow: hidden; }
.sp-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 45%; background: linear-gradient(180deg, rgba(255,255,255,.28), transparent); pointer-events: none; }
.sp-c-l { position: relative; font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; font-weight: 800; color: rgba(255,255,255,.9); }
.sp-c-v { position: relative; font-size: 2.3rem; font-weight: 900; font-family: 'Outfit',sans-serif; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.35); line-height: 1; }
.sp-card.violet { background: linear-gradient(150deg,#8b5cf6,#6d28d9); box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -6px 14px rgba(49,10,101,.55), 0 12px 26px rgba(109,40,217,.4); }
.sp-card.green { background: linear-gradient(150deg,#10b981,#047857); box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -6px 14px rgba(3,52,39,.55), 0 12px 26px rgba(16,185,129,.4); }
.sp-card.amber { background: linear-gradient(150deg,#fbbf24,#d97706); box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -6px 14px rgba(120,53,15,.5), 0 12px 26px rgba(245,158,11,.42); }
.sp-card.red { background: linear-gradient(150deg,#f43f5e,#b91c1c); box-shadow: inset 0 1px 0 rgba(255,255,255,.42), inset 0 -6px 14px rgba(74,12,12,.55), 0 12px 26px rgba(239,68,68,.42); }
.sp-card.sky { background: linear-gradient(150deg,#38bdf8,#0369a1); box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -6px 14px rgba(8,47,73,.55), 0 12px 26px rgba(14,165,233,.4); }
.sp-card.teal { background: linear-gradient(150deg,#22d3ee,#0e7490); box-shadow: inset 0 1px 0 rgba(255,255,255,.45), inset 0 -6px 14px rgba(8,51,68,.55), 0 12px 26px rgba(6,182,212,.4); }

.sp-section { background: linear-gradient(160deg, rgba(255,255,255,.055), rgba(255,255,255,.02)); border: 1px solid rgba(255,255,255,.09); border-radius: 22px; padding: 1.35rem; margin-bottom: 18px; box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 18px 40px rgba(5,3,20,.35); }
.sp-sec-title { display: flex; align-items: center; gap: 8px; font-size: .95rem; font-weight: 800; color: #7dd3fc; margin: 0 0 14px; }

.sp-timeline { display: flex; flex-direction: column; gap: 0; }
.sp-tl-item { display: flex; gap: 14px; padding: 0 0 16px 0; position: relative; }
.sp-tl-item:not(:last-child)::before { content: ''; position: absolute; left: 6px; top: 16px; bottom: 0; width: 2px; background: rgba(255,255,255,.1); }
.sp-tl-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; border: 2px solid rgba(255,255,255,.2); }
.sp-tl-item.green .sp-tl-dot { background: #10e39a; box-shadow: 0 0 10px rgba(16,227,154,.6); }
.sp-tl-item.yellow .sp-tl-dot { background: #ffc31a; box-shadow: 0 0 10px rgba(255,195,26,.6); }
.sp-tl-item.red .sp-tl-dot { background: #ff4757; box-shadow: 0 0 10px rgba(255,71,87,.6); }
.sp-tl-body { flex: 1; min-width: 0; }
.sp-tl-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sp-tl-clase { font-weight: 800; color: #f1f5f9; font-size: .88rem; }
.sp-tl-pill { font-size: .62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; padding: 3px 9px; border-radius: 100px; border: 1px solid rgba(255,255,255,.3); }
.sp-tl-pill.green { color: #052e1c; background: #10e39a; }
.sp-tl-pill.yellow { color: #3a2402; background: #ffc31a; }
.sp-tl-pill.red { color: #fff; background: #ff4757; }
.sp-tl-date { display: inline-flex; align-items: center; gap: 4px; font-size: .74rem; color: rgba(255,255,255,.55); margin-top: 3px; }

.sp-feedback { font-size: .9rem; color: rgba(255,255,255,.9); line-height: 1.5; font-weight: 500; }

.sp-chart-wrap { overflow-x: auto; border-radius: 16px; background: linear-gradient(180deg, rgba(9,7,24,.55), rgba(20,14,44,.45)); border: 1px solid rgba(255,255,255,.08); box-shadow: inset 0 3px 14px rgba(0,0,0,.4); padding: 14px 0; }
.sp-chart-wrap::-webkit-scrollbar { height: 6px; }
.sp-chart-wrap::-webkit-scrollbar-thumb { background: rgba(94,234,212,.25); border-radius: 10px; }

.sp-profile-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
.sp-export-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 100px; border: none; background: linear-gradient(135deg,#0d9488,#0369a1); color: #fff; font-weight: 800; font-size: .82rem; cursor: pointer; box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 6px 18px rgba(2,132,199,.35); }
.sp-export-btn:hover { transform: translateY(-2px); }

/* Plan de acción */
.sp-plan-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.sp-plan-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sp-plan-row2 { display: flex; gap: 10px; }
.sp-input { box-sizing: border-box; background: rgba(8,5,22,.55); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 11px 14px; color: #fff; font-size: .88rem; font-family: 'Manrope',sans-serif; outline: none; color-scheme: dark; width: 100%; }
.sp-input:focus { border-color: rgba(94,234,212,.5); box-shadow: 0 0 0 3px rgba(45,212,191,.12); }
.sp-input::placeholder { color: rgba(255,255,255,.35); }
.sp-plan-row2 .sp-input { flex: 1; }
.sp-add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 18px; border-radius: 12px; border: none; background: linear-gradient(135deg,#10b981,#059669); color: #fff; font-weight: 800; font-size: .85rem; cursor: pointer; white-space: nowrap; box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 6px 16px rgba(16,185,129,.35); }

.sp-plan-list { display: flex; flex-direction: column; gap: 10px; }
.sp-plan-item { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 14px; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.09); }
.sp-plan-item.done { opacity: .6; }
.sp-plan-item.done .sp-plan-desc { text-decoration: line-through; }
.sp-plan-check { width: 24px; height: 24px; flex-shrink: 0; border-radius: 7px; border: 1.5px solid rgba(94,234,212,.5); background: rgba(45,212,191,.1); color: #052e1c; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.sp-plan-item.done .sp-plan-check { background: linear-gradient(135deg,#5eead4,#22d3ee); border-color: transparent; }
.sp-plan-body { flex: 1; min-width: 0; }
.sp-plan-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
.sp-plan-type { display: inline-flex; align-items: center; gap: 4px; font-size: .72rem; font-weight: 800; color: #a78bfa; background: rgba(139,92,246,.16); border: 1px solid rgba(139,92,246,.3); padding: 2px 9px; border-radius: 100px; }
.sp-plan-date { display: inline-flex; align-items: center; gap: 4px; font-size: .72rem; color: rgba(255,255,255,.5); }
.sp-plan-desc { font-size: .88rem; color: #fff; font-weight: 600; line-height: 1.4; }
.sp-plan-resp { font-size: .76rem; color: rgba(255,255,255,.6); margin-top: 4px; }
.sp-plan-resp strong { color: #7dd3fc; }
.sp-plan-del { width: 32px; height: 32px; flex-shrink: 0; border-radius: 9px; border: 1px solid rgba(239,68,68,.3); background: rgba(239,68,68,.1); color: #fca5a5; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.sp-plan-del:hover { background: rgba(239,68,68,.2); }

.sp-list::-webkit-scrollbar, .sp-timeline::-webkit-scrollbar { width: 6px; }
.sp-list::-webkit-scrollbar-thumb { background: rgba(94,234,212,.25); border-radius: 10px; }

@media (max-width: 560px) {
  .sp-root { padding-left: 14px; padding-right: 14px; }
  .sp-section { padding: 16px; }
  .sp-plan-row { grid-template-columns: 1fr; }
  .sp-plan-row2 { flex-direction: column; }
  .sp-add-btn { justify-content: center; padding: 12px; }
  .sp-cards { grid-template-columns: repeat(2, 1fr); }
}
`;

export default StudentProfileView;
