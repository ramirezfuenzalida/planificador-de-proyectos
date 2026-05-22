import React, { useState, useEffect } from 'react';
import { 
  Award,
  Users,
  User,
  Search,
  Check,
  Edit3,
  FileSpreadsheet,
  Info,
  TrendingUp,
  HelpCircle
} from 'lucide-react';
import { studentGroups2M } from '../utils/studentGroups';
import Toast from './Toast';

interface FormativeEvaluationViewProps {
  courses1M: string[];
  courses2M: string[];
  globalData: { pm: any[]; sm: any[] };
  formativeRegistrations: Record<string, any>;
  formativeEvaluations: Record<string, any>;
  setFormativeEvaluations: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  getCourseTag: (course: string) => string;
}

export default function FormativeEvaluationView({
  courses1M,
  courses2M,
  globalData,
  formativeRegistrations,
  formativeEvaluations,
  setFormativeEvaluations,
  getCourseTag
}: FormativeEvaluationViewProps) {
  const [selectedLevel, setSelectedLevel] = useState<'1M' | '2M'>('1M');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dynamicGroups, setDynamicGroups] = useState<Record<string, any>>(studentGroups2M);
  const [editingStudentKey, setEditingStudentKey] = useState<string | null>(null);
  const [tempComment, setTempComment] = useState<string>('');

  // Cargar grupos dinámicos guardados (sincronizados desde Sheets)
  useEffect(() => {
    const saved = localStorage.getItem('zenit_student_groups');
    if (saved) {
      try {
        setDynamicGroups(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const courses = selectedLevel === '1M' ? courses1M : courses2M;
  const levelClasses = selectedLevel === '1M' ? globalData.pm : globalData.sm;

  // Inicializar curso por defecto
  useEffect(() => {
    if (courses.length > 0 && !courses.includes(selectedCourse)) {
      setSelectedCourse(courses[0]);
    }
  }, [selectedLevel, courses]);

  if (selectedCourse === '' && courses.length > 0) {
    setSelectedCourse(courses[0]);
  }

  const courseTag = getCourseTag(selectedCourse);

  // 1. Obtener historial de evaluaciones para un alumno en particular
  const getStudentHistory = (groupId: number, studentId: string) => {
    const history: { classId: string; date: string; status: 'green' | 'yellow' | 'red' | 'none' }[] = [];

    levelClasses.forEach((clase) => {
      const classId = clase.clase;
      const trackingKey = `${courseTag}-C${classId}-G${groupId}`;
      const trackingData = formativeRegistrations[trackingKey];

      if (trackingData) {
        const studentStatus = trackingData.students?.[studentId] || 'none';
        const groupStatus = trackingData.group || 'none';

        // Heredar del grupo si es 'none' y el grupo tiene algo
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

  // 2. Calcular la nota propuesta según escala chilena del 60%
  const calculateProposedGrade = (history: any[]) => {
    const total = history.length;
    if (total === 0) return null;

    let points = 0;
    history.forEach((h) => {
      if (h.status === 'green') points += 1.0;
      else if (h.status === 'yellow') points += 0.5;
    });

    const ratio = points / total;
    let grade = 1.0;

    if (ratio < 0.6) {
      // Escala 1.0 a 4.0
      grade = 1.0 + 5.0 * (ratio / 0.6);
    } else {
      // Escala 4.0 a 7.0
      grade = 4.0 + 3.0 * ((ratio - 0.6) / 0.4);
    }

    // Asegurar límites
    grade = Math.max(1.0, Math.min(7.0, grade));
    return parseFloat(grade.toFixed(1));
  };

  // 3. Manejar cambio de nota final
  const handleGradeChange = (groupId: number, studentId: string, grade: string) => {
    const key = `${courseTag}-G${groupId}-${studentId}`;
    const prev = formativeEvaluations[key] || { grade: '', comment: '' };

    setFormativeEvaluations((old) => ({
      ...old,
      [key]: {
        ...prev,
        grade
      }
    }));

    setToastMessage('Nota actualizada');
    setTimeout(() => setToastMessage(null), 2000);
  };

  // 4. Iniciar y guardar comentarios de retroalimentación
  const startEditingComment = (key: string, currentComment: string) => {
    setEditingStudentKey(key);
    setTempComment(currentComment);
  };

  const saveComment = (groupId: number, studentId: string) => {
    const key = `${courseTag}-G${groupId}-${studentId}`;
    const prev = formativeEvaluations[key] || { grade: '', comment: '' };

    setFormativeEvaluations((old) => ({
      ...old,
      [key]: {
        ...prev,
        comment: tempComment
      }
    }));

    setEditingStudentKey(null);
    setToastMessage('Comentario guardado');
    setTimeout(() => setToastMessage(null), 2000);
  };

  // 5. Aplicar la nota propuesta como nota oficial
  const acceptProposedGrade = (groupId: number, studentId: string, proposedGrade: number) => {
    handleGradeChange(groupId, studentId, proposedGrade.toString());
  };

  // 6. Preparar todos los alumnos del curso actual para renderizado
  const studentsList: any[] = [];
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

      const history = getStudentHistory(groupId, sid);
      const proposed = calculateProposedGrade(history);
      const evalKey = `${courseTag}-G${groupId}-${sid}`;
      const currentEval = formativeEvaluations[evalKey] || { grade: '', comment: '' };

      // Conteo de estados
      const counts = { green: 0, yellow: 0, red: 0 };
      history.forEach((h) => {
        if (h.status === 'green') counts.green++;
        else if (h.status === 'yellow') counts.yellow++;
        else if (h.status === 'red') counts.red++;
      });

      studentsList.push({
        groupId,
        studentId: sid,
        name,
        role,
        history,
        proposed,
        grade: currentEval.grade,
        comment: currentEval.comment,
        counts,
        evalKey
      });
    });
  });

  // Filtrado por buscador
  const filteredStudents = studentsList.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `grupo ${s.groupId}`.includes(searchQuery.toLowerCase())
  );

  // 7. Calcular Estadísticas Consolidadas del Curso
  const stats = (() => {
    let totalEvaluated = 0;
    let totalWithGrade = 0;
    let gradesSum = 0;
    let distribution = { green: 0, yellow: 0, red: 0 };

    studentsList.forEach((s) => {
      if (s.history.length > 0) totalEvaluated++;
      if (s.grade && !isNaN(parseFloat(s.grade))) {
        totalWithGrade++;
        gradesSum += parseFloat(s.grade);
      }
      distribution.green += s.counts.green;
      distribution.yellow += s.counts.yellow;
      distribution.red += s.counts.red;
    });

    const average = totalWithGrade > 0 ? (gradesSum / totalWithGrade).toFixed(1) : '-';
    const totalLogros = distribution.green + distribution.yellow + distribution.red;
    const percentages = {
      green: totalLogros > 0 ? Math.round((distribution.green / totalLogros) * 100) : 0,
      yellow: totalLogros > 0 ? Math.round((distribution.yellow / totalLogros) * 100) : 0,
      red: totalLogros > 0 ? Math.round((distribution.red / totalLogros) * 100) : 0
    };

    return {
      average,
      totalEvaluated,
      totalStudents: studentsList.length,
      gradedCount: totalWithGrade,
      percentages,
      distribution
    };
  })();

  // 8. Exportación CSV de las calificaciones formativas
  const exportToCSV = () => {
    const headers = ['Curso', 'Grupo', 'Estudiante', 'Rol', 'Evaluaciones Registradas', 'L (Logrado)', 'PL (Por Lograr)', 'NL (No Logrado)', 'Nota Propuesta (60%)', 'Calificación Final', 'Retroalimentación/Observación'];
    const rows = studentsList.map((s) => [
      selectedCourse,
      `Grupo ${s.groupId}`,
      s.name,
      s.role,
      s.history.length,
      s.counts.green,
      s.counts.yellow,
      s.counts.red,
      s.proposed || '-',
      s.grade || 'Pendiente',
      s.comment || ''
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Evaluacion_Formativa_${courseTag}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage('Exportando calificaciones...');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const roleStyles: Record<string, any> = {
    'Coordinador': { bg: '#ffedd5', text: '#ea580c', border: '#fdba74' },
    'Investigador': { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
    'Mediador': { bg: '#dbeafe', text: '#2563eb', border: '#bfdbfe' },
    'Secretario': { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' }
  };

  return (
    <div className="formative-tracking-container">
      {/* ── HEADER GLASSMOPHIC ── */}
      <div className="formative-header-glass">
        <div className="fh-top">
          <div className="fh-title-box">
            <h1><Award size={32} color="#8B5CF6" /> Evaluación Formativa</h1>
            <p>Consolidación de logros (L / PL / NL) y asignación de calificaciones.</p>
          </div>
          <div className="fh-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              className="save-revision-btn-premium"
              style={{ 
                padding: '0.5rem 1rem', 
                height: 'auto', 
                minHeight: 'auto',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
              }}
              onClick={exportToCSV}
            >
              <FileSpreadsheet size={16} />
              Exportar CSV
            </button>
            <div className="level-toggle-premium">
              <button 
                className={selectedLevel === '1M' ? 'active' : ''} 
                onClick={() => setSelectedLevel('1M')}
              >
                1° Medios
              </button>
              <button 
                className={selectedLevel === '2M' ? 'active' : ''} 
                onClick={() => setSelectedLevel('2M')}
              >
                2° Medios
              </button>
            </div>
          </div>
        </div>

        <div className="fh-filters-grid">
          <div className="filter-group-premium main-select">
            <label><Users size={16} /> Curso Seleccionado</label>
            <div className="custom-select-wrapper">
              <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="filter-group-premium main-select search-filter">
            <label><Search size={16} /> Buscar Estudiante / Grupo</label>
            <div className="search-input-wrapper-premium" style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Nombre, rol o equipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem 0.6rem 2.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  background: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  color: '#1f2937'
                }}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8B5CF6' }} />
            </div>
          </div>

          <div className="class-stats-mini-card scorecards-evaluation">
            <div className="stat-pill green"><span>{stats.average}</span> Promedio General</div>
            <div className="stat-pill yellow"><span>{stats.gradedCount} / {stats.totalStudents}</span> Calificados</div>
            <div className="stat-pill violet"><span>{stats.totalEvaluated}</span> Evaluados</div>
          </div>
        </div>
      </div>

      {/* ── COURSE INSIGHTS CARDS ── */}
      <div className="evaluation-insights-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
        marginTop: '1rem',
        marginBottom: '1rem'
      }}>
        {/* Distribución de Notas / Hitos */}
        <div className="insight-card-premium" style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '1.25rem',
          border: '1px solid rgba(139, 92, 246, 0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
        }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 700, color: '#4b5563', marginBottom: '1rem' }}>
            <TrendingUp size={16} className="icon-purple" /> Distribución de Desempeño Acumulado
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                <span>Logrado (L)</span>
                <span>{stats.percentages.green}% ({stats.distribution.green})</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.percentages.green}%`, height: '100%', background: '#10B981', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                <span>Por Lograr (PL)</span>
                <span>{stats.percentages.yellow}% ({stats.distribution.yellow})</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.percentages.yellow}%`, height: '100%', background: '#F59E0B', borderRadius: '4px' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                <span>No Logrado (NL)</span>
                <span>{stats.percentages.red}% ({stats.distribution.red})</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.percentages.red}%`, height: '100%', background: '#EF4444', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Explicación Escala de Calificación */}
        <div className="insight-card-premium" style={{
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '1.25rem',
          border: '1px solid rgba(139, 92, 246, 0.1)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 700, color: '#4b5563', marginBottom: '0.5rem' }}>
            <Info size={16} className="icon-blue" /> Lógica y Escala de Calificación
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: '1.4', margin: 0 }}>
            La <strong>Nota Propuesta</strong> se calcula automáticamente en base a las sesiones de clases registradas en el Seguimiento Formativo. 
            Se otorga <strong>1.0 punto por Logrado (L)</strong>, <strong>0.5 puntos por Por Lograr (PL)</strong> y <strong>0.0 por No Logrado (NL)</strong>.
            La nota se genera mediante la escala estándar con <strong>60% de nivel de exigencia</strong> (Nota 4.0).
            Puedes aceptar la propuesta o ingresar una nota manualmente en la grilla.
          </p>
        </div>
      </div>

      {/* ── ALUMNOS GRID DE CALIFICACIONES ── */}
      <div className="formative-content-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          {filteredStudents.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'rgba(255, 255, 255, 0.6)',
              borderRadius: '16px',
              border: '1px dashed rgba(139, 92, 246, 0.2)',
              color: '#6b7280'
            }}>
              <HelpCircle size={40} style={{ margin: '0 auto 10px', color: '#8B5CF6', opacity: 0.7 }} />
              <h3>No se encontraron estudiantes</h3>
              <p>Prueba buscando con otro término de filtrado.</p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const normalizedRole = student.role.charAt(0).toUpperCase() + student.role.slice(1).toLowerCase();
              const roleStyle = roleStyles[normalizedRole] || { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' };
              const hasHistory = student.history.length > 0;

              return (
                <div 
                  key={student.evalKey}
                  className="student-evaluation-row-premium"
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    border: '1px solid rgba(139, 92, 246, 0.1)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.015)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  {/* Info e Identificación */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: '1 1 250px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #c7d2fe 0%, #e0e7ff 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#4f46e5'
                    }}>
                      <User size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1f2937' }}>{student.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '8px',
                          backgroundColor: roleStyle.bg,
                          color: roleStyle.text,
                          border: `1px solid ${roleStyle.border}`
                        }}>{student.role}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>
                          Grupo {student.groupId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visualización de Hitos / Historial de Clases */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px', minWidth: '180px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563' }}>Historial de Hitos ({student.history.length} Sesiones)</span>
                    {hasHistory ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '2px' }}>
                        {student.history.map((h: any, idx: number) => (
                          <div 
                            key={idx}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              backgroundColor: h.status === 'green' ? '#10B981' : h.status === 'yellow' ? '#F59E0B' : '#EF4444',
                              color: 'white'
                            }}
                            title={`Clase ${h.classId} (${h.date}) - ${h.status === 'green' ? 'Logrado (L)' : h.status === 'yellow' ? 'Por Lograr (PL)' : 'No Logrado (NL)'}`}
                          >
                            {h.status === 'green' ? 'L' : h.status === 'yellow' ? 'PL' : 'NL'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic' }}>Sin clases evaluadas en este nivel</span>
                    )}
                  </div>

                  {/* Nota Propuesta y Botón para Aceptar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: 'rgba(139, 92, 246, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.1)',
                    minWidth: '150px'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', display: 'block', color: '#6d28d9', fontWeight: 700 }}>Nota Propuesta</span>
                      <strong style={{ fontSize: '1.25rem', color: '#8B5CF6', fontWeight: 800 }}>{student.proposed || '-'}</strong>
                    </div>
                    {hasHistory && student.proposed && student.grade !== student.proposed.toString() && (
                      <button
                        type="button"
                        onClick={() => acceptProposedGrade(student.groupId, student.studentId, student.proposed)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: '#8B5CF6',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          boxShadow: '0 2px 6px rgba(139, 92, 246, 0.2)'
                        }}
                        title="Aplicar nota propuesta"
                      >
                        <Check size={10} /> Aceptar
                      </button>
                    )}
                  </div>

                  {/* Selección de Nota Oficial */}
                  <div style={{ minWidth: '140px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', display: 'block', marginBottom: '4px' }}>Nota Calificación</label>
                    <div className="custom-select-wrapper" style={{ minWidth: '120px' }}>
                      <select 
                        value={student.grade} 
                        onChange={(e) => handleGradeChange(student.groupId, student.studentId, e.target.value)}
                        style={{ padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.85rem', fontWeight: 700 }}
                      >
                        <option value="">Pendiente</option>
                        {Array.from({ length: 61 }).map((_, idx) => {
                          const val = (7.0 - idx * 0.1).toFixed(1);
                          return <option key={val} value={val}>{val}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Retroalimentación/Comentario */}
                  <div style={{ flex: '1 1 100%', marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: '10px' }}>
                    {editingStudentKey === student.evalKey ? (
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Escribe un comentario sobre el desempeño..."
                          value={tempComment}
                          onChange={(e) => setTempComment(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.85rem',
                            border: '1px solid #8B5CF6',
                            borderRadius: '8px',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          className="save-revision-btn-premium"
                          onClick={() => saveComment(student.groupId, student.studentId)}
                          style={{ padding: '0.5rem 1rem', height: 'auto', minHeight: 'auto', borderRadius: '8px', background: '#8B5CF6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStudentKey(null)}
                          style={{ padding: '0.5rem', background: '#f3f4f6', border: 'none', borderRadius: '8px', color: '#4b5563', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.8rem', color: student.comment ? '#374151' : '#9ca3af', fontStyle: student.comment ? 'normal' : 'italic' }}>
                          <strong>Retroalimentación:</strong> {student.comment || 'Sin comentarios registrados aún.'}
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditingComment(student.evalKey, student.comment)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            color: '#8B5CF6',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          <Edit3 size={12} /> {student.comment ? 'Editar' : 'Agregar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
