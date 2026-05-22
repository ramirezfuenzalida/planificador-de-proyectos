import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutGrid, 
  TrendingUp, 
  Users, 
  Award, 
  BookOpen, 
  Info, 
  ArrowLeft, 
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { studentGroups2M } from '../utils/studentGroups';

interface DashboardGeneralViewProps {
  courses1M: string[];
  courses2M: string[];
  globalData: { pm: any[]; sm: any[] };
  formativeRegistrations: Record<string, any>;
  formativeEvaluations: Record<string, any>;
  getCourseTag: (course: string) => string;
}


// 2. Lógica del cálculo de nota propuesta según tabla oficial
const calculateProposedGrade = (history: any[]) => {
  const total = history.length;
  if (total === 0) return null;

  let points = 0;
  history.forEach((h) => {
    if (h.status === 'green') points += 1.0;
    else if (h.status === 'yellow') points += 0.5;
  });

  const pct = total > 0 ? (points / total) * 100 : 0;

  let grade: number;
  if (pct >= 86)      grade = 7;
  else if (pct >= 73) grade = 6;
  else if (pct >= 67) grade = 5;
  else if (pct >= 50) grade = 4;
  else if (pct >= 26) grade = 3;
  else if (pct >= 1)  grade = 2;
  else                grade = 1;

  return parseFloat(grade.toFixed(1));
};

export default function DashboardGeneralView({
  courses1M,
  courses2M,
  globalData,
  formativeRegistrations,
  formativeEvaluations,
  getCourseTag
}: DashboardGeneralViewProps) {
  // Filtros principales
  const [levelFilter, setLevelFilter] = useState<'All' | '1M' | '2M'>('All');
  const [courseFilter, setCourseFilter] = useState<string>('All');
  const [selectedStudentKey, setSelectedStudentKey] = useState<string>('All');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');

  const [dynamicGroups, setDynamicGroups] = useState<Record<string, any>>(studentGroups2M);

  // Cargar grupos dinámicos guardados
  useEffect(() => {
    const saved = localStorage.getItem('zenit_student_groups');
    if (saved) {
      try {
        setDynamicGroups(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Ajustar filtro de curso si cambia el nivel
  useEffect(() => {
    setCourseFilter('All');
    setSelectedStudentKey('All');
  }, [levelFilter]);

  // Limpiar filtro de estudiante si cambia el curso
  useEffect(() => {
    setSelectedStudentKey('All');
  }, [courseFilter]);

  // Lista de cursos disponibles según el nivel seleccionado
  const availableCourses = (() => {
    if (levelFilter === '1M') return courses1M;
    if (levelFilter === '2M') return courses2M;
    return [...courses1M, ...courses2M];
  })();

  // 1. Obtener historial para un alumno específico
  const getStudentHistory = (course: string, groupId: number, studentId: string) => {
    const courseTag = getCourseTag(course);
    const levelClasses = course.startsWith('1') ? globalData.pm : globalData.sm;
    const history: { classId: string; date: string; status: 'green' | 'yellow' | 'red' | 'none' }[] = [];

    levelClasses.forEach((clase) => {
      const classId = clase.clase;
      const trackingKey = `${courseTag}-C${classId}-G${groupId}`;
      const trackingData = formativeRegistrations[trackingKey];

      if (trackingData) {
        const studentStatus = trackingData.students?.[studentId] || 'none';
        const groupStatus = trackingData.group || 'none';

        let finalStatus: 'green' | 'yellow' | 'red' | 'none' = studentStatus;
        if (finalStatus === 'none' && groupStatus !== 'none') {
          finalStatus = groupStatus;
        }

        if (finalStatus !== 'none') {
          history.push({
            classId,
            date: clase.fecha,
            status: finalStatus
          });
        }
      }
    });

    return history;
  };

  // 2. Procesar base completa de alumnos y sus métricas
  const allStudentsList: any[] = [];
  
  const processStudentsForCourse = (course: string) => {
    const courseTag = getCourseTag(course);
    Array.from({ length: 10 }).forEach((_, i) => {
      const groupId = i + 1;
      const groupKey = `${courseTag}-G${groupId}`;
      const groupInfo = dynamicGroups[groupKey] || [];

      ['s1', 's2', 's3', 's4'].forEach((sid, idx) => {
        let name = `Estudiante ${idx + 1}`;
        let role = ['Coordinador', 'Investigador', 'Mediador', 'Secretario'][idx];

        if (groupInfo[idx]) {
          name = groupInfo[idx].name;
          role = groupInfo[idx].role;
        }

        const history = getStudentHistory(course, groupId, sid);
        const proposed = calculateProposedGrade(history);
        const evalKey = `${courseTag}-G${groupId}-${sid}`;
        const currentEval = formativeEvaluations[evalKey] || { grade: '', comment: '' };

        const counts = { green: 0, yellow: 0, red: 0 };
        history.forEach((h) => {
          if (h.status === 'green') counts.green++;
          else if (h.status === 'yellow') counts.yellow++;
          else if (h.status === 'red') counts.red++;
        });

        allStudentsList.push({
          key: `${courseTag}-${groupId}-${sid}`,
          course,
          level: course.startsWith('1') ? '1M' : '2M',
          groupId,
          studentId: sid,
          name,
          role,
          history,
          proposed,
          grade: currentEval.grade ? parseFloat(currentEval.grade) : null,
          comment: currentEval.comment,
          counts,
        });
      });
    });
  };

  // Procesar según el nivel o curso seleccionado
  if (courseFilter !== 'All') {
    processStudentsForCourse(courseFilter);
  } else {
    availableCourses.forEach(c => processStudentsForCourse(c));
  }

  // Alumnos filtrados por los controles de selección
  const filteredStudents = allStudentsList.filter(s => {
    if (levelFilter !== 'All' && s.level !== levelFilter) return false;
    if (courseFilter !== 'All' && s.course !== courseFilter) return false;
    return true;
  });

  // Lista de estudiantes para el dropdown de selección individual
  const studentDropdownList = filteredStudents.filter(s => 
    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  // Datos del estudiante individual seleccionado (si aplica)
  const selectedStudentData = selectedStudentKey !== 'All' 
    ? allStudentsList.find(s => s.key === selectedStudentKey)
    : null;

  // 3. Métricas Globales / Consolidadas para los filtros activos
  const totalStudents = filteredStudents.length;
  const studentsWithGrades = filteredStudents.filter(s => s.grade !== null);
  const averageGrade = studentsWithGrades.length > 0
    ? (studentsWithGrades.reduce((sum, s) => sum + (s.grade || 0), 0) / studentsWithGrades.length)
    : 0;

  const totalClassesTracked = (() => {
    let classesSum = 0;
    if (courseFilter !== 'All') {
      const levelClasses = courseFilter.startsWith('1') ? globalData.pm : globalData.sm;
      classesSum = levelClasses.length;
    } else {
      const pmClasses = globalData.pm.length;
      const smClasses = globalData.sm.length;
      
      const numPM = levelFilter === '2M' ? 0 : courses1M.length;
      const numSM = levelFilter === '1M' ? 0 : courses2M.length;
      
      classesSum = (numPM * pmClasses) + (numSM * smClasses);
    }
    return classesSum;
  })();

  const globalCounts = { green: 0, yellow: 0, red: 0 };
  filteredStudents.forEach(s => {
    globalCounts.green += s.counts.green;
    globalCounts.yellow += s.counts.yellow;
    globalCounts.red += s.counts.red;
  });
  const totalIndicators = globalCounts.green + globalCounts.yellow + globalCounts.red || 1;
  const pctLogrado = Math.round((globalCounts.green / totalIndicators) * 100);
  const pctPorLograr = Math.round((globalCounts.yellow / totalIndicators) * 100);
  const pctNoLogrado = Math.round((globalCounts.red / totalIndicators) * 100);

  // Distribución de Notas
  const gradeDistribution = {
    excelente: filteredStudents.filter(s => s.grade && s.grade >= 6.0).length,
    bueno: filteredStudents.filter(s => s.grade && s.grade >= 5.0 && s.grade < 6.0).length,
    suficiente: filteredStudents.filter(s => s.grade && s.grade >= 4.0 && s.grade < 5.0).length,
    insuficiente: filteredStudents.filter(s => s.grade && s.grade < 4.0).length,
    sinNota: filteredStudents.filter(s => s.grade === null).length,
  };

  // Agrupación por cursos para la vista comparativa general
  const courseSummaries = availableCourses.map(course => {
    const studentsInCourse = allStudentsList.filter(s => s.course === course);
    const graded = studentsInCourse.filter(s => s.grade !== null);
    const avg = graded.length > 0 
      ? graded.reduce((sum, s) => sum + (s.grade || 0), 0) / graded.length 
      : 0;
    
    let lCount = 0;
    let plCount = 0;
    let nlCount = 0;
    studentsInCourse.forEach(s => {
      lCount += s.counts.green;
      plCount += s.counts.yellow;
      nlCount += s.counts.red;
    });
    const totalInd = lCount + plCount + nlCount || 1;
    const lPct = Math.round((lCount / totalInd) * 100);

    return {
      course,
      average: avg,
      lPct,
      gradedCount: graded.length,
      totalCount: studentsInCourse.length
    };
  });

  return (
    <motion.div 
      className="dashboard-general-container"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <style>{`
        .dashboard-general-container {
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .dashboard-general-container * {
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .dashboard-general-container {
            padding: 12px;
          }
        }

        .dg-header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 20px;
          padding: 30px;
          color: white;
          margin-bottom: 24px;
          box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        
        .dg-header::after {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          top: -100px;
          right: -100px;
          pointer-events: none;
        }

        .dg-header-info h1 {
          font-size: 2.1rem;
          font-weight: 850;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dg-header-info p {
          font-size: 0.95rem;
          opacity: 0.9;
          margin: 0;
        }

        /* FILTERS BAR */
        .dg-filters-bar {
          background: white;
          border-radius: 16px;
          padding: 18px 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(148, 163, 184, 0.12);
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: 1fr 1fr 2fr;
          gap: 20px;
          width: 100%;
          max-width: 100%;
        }

        .dg-filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          width: 100%;
        }

        @media (max-width: 900px) {
          .dg-filters-bar {
            grid-template-columns: 1fr 1fr;
          }
          .dg-filter-group-student {
            grid-column: span 2;
          }
        }

        @media (max-width: 600px) {
          .dg-filters-bar {
            grid-template-columns: 1fr;
          }
          .dg-filter-group-student {
            grid-column: span 1;
          }
        }

        .dg-filter-group label {
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .dg-select {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 0.85rem;
          font-weight: 600;
          color: #334155;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dg-select:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
          background: white;
        }

        /* METRICS ROW */
        .dg-metrics-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .dg-metric-card {
          background: white;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.015);
          border: 1px solid rgba(148, 163, 184, 0.1);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s ease;
        }

        .dg-metric-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.03);
        }

        .dg-metric-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dg-metric-value {
          font-size: 1.8rem;
          font-weight: 850;
          color: #0f172a;
          line-height: 1;
        }

        .dg-metric-label {
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 3px;
        }

        /* GRID LAYOUTS */
        .dg-main-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .dg-main-grid > div {
          min-width: 0;
        }

        @media (max-width: 1200px) {
          .dg-main-grid {
            grid-template-columns: 1fr;
          }
        }

        .dg-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.01);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .dg-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 12px;
        }

        .dg-card-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* CHARTS ELEMENTS */
        .dg-progress-bar-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }

        .dg-progress-bar-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 600;
          color: #475569;
        }

        .dg-progress-bar-track {
          height: 10px;
          background: #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .dg-progress-bar-fill {
          height: 100%;
          border-radius: 10px;
          transition: width 0.8s ease-out;
        }

        /* STUDENT VIEW SPECIFIC */
        .dg-student-profile {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .dg-student-badge {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 20px;
          border-radius: 16px;
          position: relative;
          overflow: hidden;
        }

        .dg-student-badge h2 {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 6px 0;
        }

        .dg-student-badge-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 14px;
          font-size: 0.8rem;
          background: rgba(255, 255, 255, 0.12);
          padding: 10px 14px;
          border-radius: 10px;
          backdrop-filter: blur(4px);
        }

        @media (max-width: 480px) {
          .dg-student-badge-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        .dg-filter-row {
          display: flex;
          gap: 8px;
          width: 100%;
        }

        @media (max-width: 640px) {
          .dg-filter-row {
            flex-direction: column;
            gap: 10px;
          }
          .dg-filter-row input,
          .dg-filter-row select {
            width: 100%;
            min-width: 0 !important;
          }
        }

        .dg-student-badge-item {
          display: flex;
          flex-direction: column;
        }

        .dg-student-badge-item span:first-child {
          opacity: 0.75;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 600;
        }

        .dg-student-badge-item span:last-child {
          font-weight: 700;
        }

        .dg-timeline {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .dg-timeline-pill {
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dg-timeline-pill.green { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .dg-timeline-pill.yellow { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .dg-timeline-pill.red { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

        .dg-grade-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid #8b5cf6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 900;
          color: #8b5cf6;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.15);
          margin: 0 auto;
        }

        .dg-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.82rem;
        }

        .dg-table th {
          text-align: left;
          padding: 10px 12px;
          background: #f8fafc;
          color: #64748b;
          font-weight: 700;
          border-bottom: 2px solid #edf2f7;
        }

        .dg-table td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-weight: 600;
        }

        .dg-table tr:hover td {
          background: #f8fafc;
        }

        .dg-ranking-pill {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 800;
        }

        .dg-ranking-pill.gold { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
        .dg-ranking-pill.silver { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .dg-ranking-pill.bronze { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
        .dg-ranking-pill.default { background: #f1f5f9; color: #64748b; }
      `}</style>

      {/* ── HEADER ── */}
      <div className="dg-header">
        <div className="dg-header-info">
          <h1><GraduationCap size={36} /> Dashboard Ejecutivo</h1>
          <p>Visión global y analítica consolidada de los aprendizajes y evaluaciones.</p>
        </div>
        <Sparkles size={70} style={{ opacity: 0.25 }} />
      </div>

      {/* ── FILTROS ── */}
      <div className="dg-filters-bar">
        <div className="dg-filter-group">
          <label>Nivel Académico</label>
          <select 
            value={levelFilter} 
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="dg-select"
          >
            <option value="All">Todos los niveles</option>
            <option value="1M">1° Medio</option>
            <option value="2M">2° Medio</option>
          </select>
        </div>

        <div className="dg-filter-group">
          <label>Curso</label>
          <select 
            value={courseFilter} 
            onChange={(e) => setCourseFilter(e.target.value)}
            className="dg-select"
          >
            <option value="All">Todos los cursos</option>
            {availableCourses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="dg-filter-group dg-filter-group-student">
          <label>Buscar / Filtrar Estudiante</label>
          <div className="dg-filter-row">
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="dg-select"
              style={{ flex: 1, minWidth: '80px', maxWidth: '200px' }}
            />
            <select
              value={selectedStudentKey}
              onChange={(e) => setSelectedStudentKey(e.target.value)}
              className="dg-select"
              style={{ flex: 1.5, minWidth: '100px', maxWidth: '280px' }}
            >
              <option value="All">Ver consolidado grupal (Todos)</option>
              {studentDropdownList.map(s => (
                <option key={s.key} value={s.key}>
                  [{s.course}] {s.name}
                </option>
              ))}
            </select>
            {selectedStudentKey !== 'All' && (
              <button 
                onClick={() => {
                  setSelectedStudentKey('All');
                  setStudentSearchQuery('');
                }}
                className="dg-select"
                style={{ padding: '10px 12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SECCIÓN A: SI ESTÁ SELECCIONADO UN ESTUDIANTE INDIVIDUAL ── */}
      <AnimatePresence mode="wait">
        {selectedStudentData ? (
          <motion.div 
            key={selectedStudentKey}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="dg-main-grid"
          >
            {/* Perfil del Estudiante */}
            <div className="dg-card dg-student-profile">
              <div className="dg-student-badge">
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, opacity: 0.9, letterSpacing: '0.05em' }}>Ficha del Alumno</span>
                <h2>{selectedStudentData.name}</h2>
                
                <div className="dg-student-badge-grid">
                  <div className="dg-student-badge-item">
                    <span>Curso</span>
                    <span>{selectedStudentData.course}</span>
                  </div>
                  <div className="dg-student-badge-item">
                    <span>Grupo de Trabajo</span>
                    <span>Grupo {selectedStudentData.groupId}</span>
                  </div>
                  <div className="dg-student-badge-item">
                    <span>Rol en el Grupo</span>
                    <span>{selectedStudentData.role}</span>
                  </div>
                  <div className="dg-student-badge-item">
                    <span>Clases Evaluadas</span>
                    <span>{selectedStudentData.history.length}</span>
                  </div>
                </div>
              </div>

              {/* Historial de seguimiento */}
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#334155', marginBottom: '12px' }}>
                  Línea de Progreso Formativo (Por Clase)
                </h3>
                {selectedStudentData.history.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                    Aún no se registran seguimientos para este estudiante.
                  </p>
                ) : (
                  <div className="dg-timeline">
                    {selectedStudentData.history.map((h: any, i: number) => (
                      <div key={i} className={`dg-timeline-pill ${h.status}`}>
                        <strong>C{h.classId}</strong>
                        <span>{h.status === 'green' ? 'Logrado' : h.status === 'yellow' ? 'Por Lograr' : 'No Logrado'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comentarios del docente */}
              {selectedStudentData.comment && (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', borderLeft: '4px solid #8b5cf6' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>Observación del Docente</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', fontStyle: 'italic' }}>"{selectedStudentData.comment}"</p>
                </div>
              )}
            </div>

            {/* Ficha Calificación y Rendimiento */}
            <div className="dg-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              <div className="dg-card-header">
                <div className="dg-card-title"><Award size={18} className="icon-violet" /> Rendimiento & Nota</div>
              </div>

              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div className="dg-grade-circle" style={{ borderColor: selectedStudentData.grade ? '#10B981' : '#8B5CF6', color: selectedStudentData.grade ? '#10B981' : '#8B5CF6' }}>
                  {selectedStudentData.grade ? selectedStudentData.grade.toFixed(1) : '-.-'}
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>
                  {selectedStudentData.grade ? 'Calificación Oficial Guardada' : 'Sin Calificación Oficial'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Nota Propuesta sugerida:</span>
                  <strong style={{ color: '#4f46e5' }}>{selectedStudentData.proposed ? `${selectedStudentData.proposed.toFixed(1)}` : '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Clases Logradas (L):</span>
                  <strong style={{ color: '#10b981' }}>{selectedStudentData.counts.green}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Clases Por Lograr (PL):</span>
                  <strong style={{ color: '#f59e0b' }}>{selectedStudentData.counts.yellow}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: '#64748b' }}>Clases No Logradas (NL):</span>
                  <strong style={{ color: '#ef4444' }}>{selectedStudentData.counts.red}</strong>
                </div>
              </div>

              {/* Botón para volver al consolidado */}
              <button 
                onClick={() => setSelectedStudentKey('All')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <ArrowLeft size={16} /> Volver al Consolidado
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── SECCIÓN B: VISIÓN CONSOLIDADA GENERAL / FILTROS GLOBALES ── */
          <motion.div 
            key="consolidated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="dg-main-view"
          >
            {/* Tarjetas de Métricas Rápidas */}
            <div className="dg-metrics-row">
              <div className="dg-metric-card">
                <div className="dg-metric-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                  <Users size={26} />
                </div>
                <div>
                  <div className="dg-metric-value">{totalStudents}</div>
                  <div className="dg-metric-label">Alumnos Monitoreados</div>
                </div>
              </div>

              <div className="dg-metric-card">
                <div className="dg-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Award size={26} />
                </div>
                <div>
                  <div className="dg-metric-value">{averageGrade > 0 ? averageGrade.toFixed(2) : '—'}</div>
                  <div className="dg-metric-label">Promedio de Notas</div>
                </div>
              </div>

              <div className="dg-metric-card">
                <div className="dg-metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <BookOpen size={26} />
                </div>
                <div>
                  <div className="dg-metric-value">{totalClassesTracked}</div>
                  <div className="dg-metric-label">Clases Totales</div>
                </div>
              </div>

              <div className="dg-metric-card">
                <div className="dg-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  <TrendingUp size={26} />
                </div>
                <div>
                  <div className="dg-metric-value">{pctLogrado}%</div>
                  <div className="dg-metric-label">Porcentaje de Logro (L)</div>
                </div>
              </div>
            </div>

            {/* Grid Principal de Consolidación */}
            <div className="dg-main-grid">
              {/* Tarjeta de Gráficos de Indicadores de Logro */}
              <div className="dg-card">
                <div className="dg-card-header">
                  <div className="dg-card-title"><TrendingUp size={18} className="icon-blue" /> Desglose Formativo Consolidador</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="dg-progress-bar-container">
                    <div className="dg-progress-bar-info">
                      <span>Logrado (L)</span>
                      <strong>{pctLogrado}% ({globalCounts.green} registros)</strong>
                    </div>
                    <div className="dg-progress-bar-track">
                      <div className="dg-progress-bar-fill" style={{ width: `${pctLogrado}%`, background: '#10b981' }}></div>
                    </div>
                  </div>

                  <div className="dg-progress-bar-container">
                    <div className="dg-progress-bar-info">
                      <span>Por Lograr (PL)</span>
                      <strong>{pctPorLograr}% ({globalCounts.yellow} registros)</strong>
                    </div>
                    <div className="dg-progress-bar-track">
                      <div className="dg-progress-bar-fill" style={{ width: `${pctPorLograr}%`, background: '#f59e0b' }}></div>
                    </div>
                  </div>

                  <div className="dg-progress-bar-container">
                    <div className="dg-progress-bar-info">
                      <span>No Logrado (NL)</span>
                      <strong>{pctNoLogrado}% ({globalCounts.red} registros)</strong>
                    </div>
                    <div className="dg-progress-bar-track">
                      <div className="dg-progress-bar-fill" style={{ width: `${pctNoLogrado}%`, background: '#ef4444' }}></div>
                    </div>
                  </div>
                </div>

                {/* Explicación de estados */}
                <div style={{ marginTop: '24px', background: '#f8fafc', padding: '14px', borderRadius: '12px', fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Info size={16} color="#3b82f6" />
                  <span>
                    Este desglose suma la totalidad de los indicadores marcados por clase de todos los alumnos incluidos bajo el filtro activo.
                  </span>
                </div>
              </div>

              {/* Tarjeta de Distribución de Calificaciones */}
              <div className="dg-card">
                <div className="dg-card-header">
                  <div className="dg-card-title"><Award size={18} className="icon-pink" /> Distribución de Calificaciones</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#10b981' }}></div>
                      <span style={{ fontWeight: 700 }}>Sobresalientes (6.0 - 7.0)</span>
                    </div>
                    <strong>{gradeDistribution.excelente} alumnos</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#3b82f6' }}></div>
                      <span style={{ fontWeight: 700 }}>Buenos (5.0 - 5.9)</span>
                    </div>
                    <strong>{gradeDistribution.bueno} alumnos</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#f59e0b' }}></div>
                      <span style={{ fontWeight: 700 }}>Suficientes (4.0 - 4.9)</span>
                    </div>
                    <strong>{gradeDistribution.suficiente} alumnos</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#ef4444' }}></div>
                      <span style={{ fontWeight: 700 }}>Insuficientes (1.0 - 3.9)</span>
                    </div>
                    <strong>{gradeDistribution.insuficiente} alumnos</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#94a3b8' }}></div>
                      <span style={{ fontWeight: 700, color: '#64748b' }}>Sin Nota Registrada</span>
                    </div>
                    <strong style={{ color: '#64748b' }}>{gradeDistribution.sinNota} alumnos</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN C: TABLA DE RENDIMIENTO POR CURSO */}
            <div className="dg-card">
              <div className="dg-card-header">
                <div className="dg-card-title"><LayoutGrid size={18} className="icon-sky" /> Comparativa y Resumen de Cursos</div>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="dg-table">
                  <thead>
                    <tr>
                      <th>Curso</th>
                      <th>Promedio General</th>
                      <th>Porcentaje Logro (L)</th>
                      <th>Alumnos Calificados</th>
                      <th>Estado del Rendimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseSummaries.map((summary) => (
                      <tr key={summary.course}>
                        <td style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 800 }}>{summary.course}</td>
                        <td style={{ fontSize: '0.9rem', color: summary.average >= 4.0 ? '#10b981' : '#ef4444' }}>
                          {summary.average > 0 ? summary.average.toFixed(2) : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${summary.lPct}%`, background: '#10b981' }}></div>
                            </div>
                            <span>{summary.lPct}%</span>
                          </div>
                        </td>
                        <td>{summary.gradedCount} / {summary.totalCount}</td>
                        <td>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '100px', 
                            fontSize: '0.72rem', 
                            fontWeight: 700,
                            background: summary.average >= 6.0 ? '#d1fae5' : summary.average >= 5.0 ? '#dbeafe' : summary.average >= 4.0 ? '#fef3c7' : '#fee2e2',
                            color: summary.average >= 6.0 ? '#065f46' : summary.average >= 5.0 ? '#1d4ed8' : summary.average >= 4.0 ? '#92400e' : '#991b1b',
                          }}>
                            {summary.average >= 6.0 ? 'Sobresaliente' : summary.average >= 5.0 ? 'Muy Bueno' : summary.average >= 4.0 ? 'Aprobado' : summary.average > 0 ? 'Reprobado' : 'Sin datos'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
