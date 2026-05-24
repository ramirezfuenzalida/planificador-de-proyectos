import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Search, 
  Bookmark, 
  Sparkles, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  PlusCircle, 
  Trash2, 
  X,
  Smile,
  ShieldAlert
} from 'lucide-react';
import { studentGroups2M } from '../utils/studentGroups';

export interface Intervention {
  id: string;
  date: string;
  type: string;
  description: string;
  responsible: string;
  completed: boolean;
}

interface StudentRiskRadarViewProps {
  courses1M: string[];
  courses2M: string[];
  globalData: { pm: any[]; sm: any[] };
  formativeRegistrations: Record<string, any>;
  formativeEvaluations: Record<string, any>;
  setFormativeEvaluations: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  getCourseTag: (course: string) => string;
  onBackToDashboard: () => void;
}

// Lógica de cálculo de nota propuesta sugerida por escala institucional
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

export default function StudentRiskRadarView({
  courses1M,
  courses2M,
  globalData,
  formativeRegistrations,
  formativeEvaluations,
  setFormativeEvaluations,
  getCourseTag,
  onBackToDashboard
}: StudentRiskRadarViewProps) {
  // Filtros reactivos
  const [selectedLevel, setSelectedLevel] = useState<'All' | '1M' | '2M'>('All');
  const [selectedCourse, setSelectedCourse] = useState<string>('All');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'All' | 'critical' | 'medium' | 'stable'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Grupos dinámicos de estudiantes
  const [dynamicGroups, setDynamicGroups] = useState<Record<string, any>>(studentGroups2M);

  // Modal de intervenciones pedagógicas
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [newActionType, setNewActionType] = useState<string>('Cambio de Rol');
  const [newActionDesc, setNewActionDesc] = useState<string>('');
  const [newActionResp, setNewActionResp] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cargar grupos guardados de localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zenit_student_groups');
    if (saved) {
      try {
        setDynamicGroups(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const availableCourses = (() => {
    if (selectedLevel === '1M') return courses1M;
    if (selectedLevel === '2M') return courses2M;
    return [...courses1M, ...courses2M];
  })();

  // Reset del curso si se cambia el nivel
  useEffect(() => {
    setSelectedCourse('All');
  }, [selectedLevel]);

  // 1. Obtener historial para un estudiante en particular
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

  // 2. Procesar base completa de alumnos y calcular riesgos/predicciones
  const studentsRiskList: any[] = [];

  const processCourse = (course: string) => {
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
        const currentEval = formativeEvaluations[evalKey] || { grade: '', comment: '', interventions: [] };
        
        // Historial completo de intervenciones pedagógicas
        const interventions: Intervention[] = currentEval.interventions || [];

        // Contadores
        const counts = { green: 0, yellow: 0, red: 0 };
        history.forEach((h) => {
          if (h.status === 'green') counts.green++;
          else if (h.status === 'yellow') counts.yellow++;
          else if (h.status === 'red') counts.red++;
        });

        // Cálculo de Racha de NL (No Logrado) consecutivos
        let currentStreak = 0;
        let maxStreak = 0;
        // Ordenamos por clase ID descendente para ver las más recientes
        const sortedHistory = [...history].sort((a, b) => parseInt(b.classId) - parseInt(a.classId));
        
        // Racha activa actual (últimas clases evaluadas)
        let activeStreak = 0;
        let foundNonRed = false;

        sortedHistory.forEach((h) => {
          if (h.status === 'red') {
            if (!foundNonRed) activeStreak++;
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
          } else {
            foundNonRed = true;
            currentStreak = 0;
          }
        });

        // ── MOTOR DE RIESGO HÍBRIDO (Propuesta 1) ──
        let riskLevel: 'critical' | 'medium' | 'stable' = 'stable';
        let riskReason = 'Desempeño curricular adecuado';
        const currentGrade = currentEval.grade ? parseFloat(currentEval.grade) : (proposed || 7.0);

        // Algoritmo predictivo de nota de cierre a 32 clases
        // Castiga fuertemente la inasistencia o rachas negativas
        let projectedGrade = currentGrade;
        if (activeStreak >= 3) {
          projectedGrade = Math.max(1.0, currentGrade - 0.8);
        } else if (activeStreak === 2) {
          projectedGrade = Math.max(1.0, currentGrade - 0.4);
        }

        // Si no hay historial evaluado, asumimos estable temporal
        if (history.length > 0) {
          if (activeStreak >= 3 || projectedGrade < 4.0 || currentGrade < 4.0) {
            riskLevel = 'critical';
            riskReason = activeStreak >= 3 
              ? `Racha crítica activa de ${activeStreak} N/L seguidos.` 
              : `Proyección deficiente al cierre: Nota ${projectedGrade.toFixed(1)}`;
          } else if (activeStreak === 2 || (projectedGrade >= 4.0 && projectedGrade <= 4.8) || currentGrade <= 4.9) {
            riskLevel = 'medium';
            riskReason = activeStreak === 2 
              ? 'Racha de 2 N/L seguidos en clases recientes.' 
              : `En observación: Proyección al límite (Nota ${projectedGrade.toFixed(1)})`;
          }
        } else {
          riskReason = 'Sin clases formativas registradas aún.';
        }

        studentsRiskList.push({
          key: evalKey,
          studentId: sid,
          groupId,
          course,
          courseTag,
          level: course.startsWith('1') ? '1M' : '2M',
          name,
          role,
          history,
          counts,
          proposed,
          grade: currentEval.grade ? parseFloat(currentEval.grade) : null,
          comment: currentEval.comment || '',
          interventions,
          activeStreak,
          projectedGrade,
          riskLevel,
          riskReason
        });
      });
    });
  };

  // Procesar según filtros de cursos
  if (selectedCourse !== 'All') {
    processCourse(selectedCourse);
  } else {
    availableCourses.forEach(c => processCourse(c));
  }

  // Filtrado final para la interfaz
  const filteredStudents = studentsRiskList.filter(s => {
    if (selectedLevel !== 'All' && s.level !== selectedLevel) return false;
    if (selectedCourse !== 'All' && s.course !== selectedCourse) return false;
    if (selectedRiskFilter !== 'All' && s.riskLevel !== selectedRiskFilter) return false;
    
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(query) || s.course.toLowerCase().includes(query);
    }
    
    return true;
  });

  // Estadísticas del Radar
  const criticalCount = filteredStudents.filter(s => s.riskLevel === 'critical').length;
  const mediumCount = filteredStudents.filter(s => s.riskLevel === 'medium').length;
  const stableCount = filteredStudents.filter(s => s.riskLevel === 'stable').length;
  const activeInterventionsCount = filteredStudents.filter(s => s.interventions.length > 0).length;

  // Intervención Pedagógica: Registrar acción en Supabase (Guardar en formativeEvaluations local/remoto)
  const handleAddIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!newActionDesc.trim()) {
      setToastMessage('Por favor ingresa la descripción del plan.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const newAction: Intervention = {
      id: `act-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: newActionType,
      description: newActionDesc.trim(),
      responsible: newActionResp.trim() || 'Equipo Pedagógico',
      completed: false
    };

    const studentKey = selectedStudent.key;
    const prevEval = formativeEvaluations[studentKey] || { grade: '', comment: '', interventions: [] };
    const updatedInterventions = [...(prevEval.interventions || []), newAction];

    setFormativeEvaluations(prev => ({
      ...prev,
      [studentKey]: {
        ...prevEval,
        interventions: updatedInterventions
      }
    }));

    // Actualizar estado del modal
    setSelectedStudent((old: any) => {
      if (!old) return null;
      return {
        ...old,
        interventions: updatedInterventions
      };
    });

    setNewActionDesc('');
    setNewActionResp('');
    setToastMessage('Plan de acompañamiento agregado correctamente');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Eliminar intervención
  const handleDeleteIntervention = (actionId: string) => {
    if (!selectedStudent) return;
    if (!window.confirm('¿Está seguro de que desea eliminar esta acción de acompañamiento?')) return;

    const studentKey = selectedStudent.key;
    const prevEval = formativeEvaluations[studentKey] || { grade: '', comment: '', interventions: [] };
    const updatedInterventions = (prevEval.interventions || []).filter((i: Intervention) => i.id !== actionId);

    setFormativeEvaluations(prev => ({
      ...prev,
      [studentKey]: {
        ...prevEval,
        interventions: updatedInterventions
      }
    }));

    setSelectedStudent((old: any) => {
      if (!old) return null;
      return {
        ...old,
        interventions: updatedInterventions
      };
    });

    setToastMessage('Acción eliminada');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Marcar intervención como completada
  const handleToggleCompleted = (actionId: string) => {
    if (!selectedStudent) return;

    const studentKey = selectedStudent.key;
    const prevEval = formativeEvaluations[studentKey] || { grade: '', comment: '', interventions: [] };
    const updatedInterventions = (prevEval.interventions || []).map((i: Intervention) => {
      if (i.id === actionId) {
        return { ...i, completed: !i.completed };
      }
      return i;
    });

    setFormativeEvaluations(prev => ({
      ...prev,
      [studentKey]: {
        ...prevEval,
        interventions: updatedInterventions
      }
    }));

    setSelectedStudent((old: any) => {
      if (!old) return null;
      return {
        ...old,
        interventions: updatedInterventions
      };
    });
  };

  return (
    <div className="srr-view-wrapper">
      <style>{`
        .srr-view-wrapper {
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          width: 100%;
          box-sizing: border-box;
        }

        .srr-header-card {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(148, 163, 184, 0.12);
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .srr-header-info h1 {
          font-size: 1.8rem;
          font-weight: 850;
          margin: 0;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #0f172a;
        }

        .srr-header-info p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 4px 0 0 0;
          font-weight: 500;
        }

        .srr-back-btn {
          border: 1px solid #e2e8f0;
          background: white;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .srr-back-btn:hover {
          background: #f1f5f9;
          color: #1e293b;
          border-color: #cbd5e1;
        }

        /* METRICS PANELS */
        .srr-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .srr-metric-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.015);
          border: 1px solid rgba(148, 163, 184, 0.1);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.25s ease;
        }

        .srr-metric-card:hover {
          transform: translateY(-2px);
        }

        .srr-metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .srr-metric-icon.red { background: #fee2e2; color: #ef4444; }
        .srr-metric-icon.yellow { background: #fef3c7; color: #f59e0b; }
        .srr-metric-icon.blue { background: #e0f2fe; color: #0284c7; }
        .srr-metric-icon.purple { background: #f3e8ff; color: #7c3aed; }

        .srr-metric-value {
          font-size: 1.6rem;
          font-weight: 850;
          color: #0f172a;
          line-height: 1.1;
        }

        .srr-metric-label {
          font-size: 0.76rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 2px;
        }

        /* FILTERS ROW */
        .srr-filters-bar {
          background: white;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.01);
          border: 1px solid rgba(148, 163, 184, 0.1);
          margin-bottom: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }

        .srr-filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .srr-filter-group label {
          font-size: 0.72rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .srr-select, .srr-input {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 0.82rem;
          font-weight: 600;
          color: #334155;
          outline: none;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .srr-input {
          cursor: text;
        }

        .srr-select:focus, .srr-input:focus {
          border-color: #4f46e5;
          background: white;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
        }

        /* MAIN RADAR TABLE */
        .srr-table-card {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }

        .srr-table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .srr-table-header h2 {
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }

        .srr-badge-count {
          background: #f1f5f9;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 750;
          padding: 4px 10px;
          border-radius: 100px;
        }

        .srr-table-wrapper {
          overflow-x: auto;
          width: 100%;
        }

        .srr-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .srr-table th {
          padding: 14px 16px;
          font-size: 0.72rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #f1f5f9;
        }

        .srr-table td {
          padding: 16px;
          font-size: 0.85rem;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .srr-row {
          transition: all 0.15s ease;
        }

        .srr-row:hover {
          background: #f8fafc;
        }

        .srr-student-cell {
          display: flex;
          flex-direction: column;
        }

        .srr-student-name {
          font-weight: 800;
          color: #0f172a;
          font-size: 0.88rem;
        }

        .srr-student-role {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 2px;
        }

        /* RISK ALERTS STYLE */
        .srr-alert-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .srr-alert-badge.critical {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid rgba(153, 27, 27, 0.15);
        }

        .srr-alert-badge.medium {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid rgba(146, 64, 14, 0.15);
        }

        .srr-alert-badge.stable {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid rgba(6, 95, 70, 0.15);
        }

        .srr-reason-text {
          font-size: 0.76rem;
          color: #64748b;
          font-weight: 550;
          display: block;
          margin-top: 4px;
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* PILLS GRAPHIC indicator */
        .srr-pills-row {
          display: flex;
          gap: 3px;
        }

        .srr-pill-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .srr-pill-dot.green { background-color: #10b981; }
        .srr-pill-dot.yellow { background-color: #f59e0b; }
        .srr-pill-dot.red { background-color: #ef4444; }

        .srr-empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #94a3b8;
        }

        .srr-action-btn-p3 {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 0.78rem;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(124, 58, 237, 0.15);
        }

        .srr-action-btn-p3:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(124, 58, 237, 0.25);
        }

        /* INTERVENTION MODAL */
        .srr-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .srr-modal-card {
          background: white;
          border-radius: 24px;
          width: 100%;
          max-width: 650px;
          max-height: 90vh;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(148, 163, 184, 0.12);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .srr-modal-header {
          padding: 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .srr-modal-title h3 {
          font-size: 1.25rem;
          font-weight: 850;
          margin: 0;
          color: #0f172a;
        }

        .srr-modal-title p {
          font-size: 0.82rem;
          color: #64748b;
          margin: 4px 0 0 0;
          font-weight: 550;
        }

        .srr-close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .srr-close-btn:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .srr-modal-body {
          padding: 24px;
          flex: 1;
        }

        /* INFO GRID */
        .srr-modal-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .srr-info-box {
          display: flex;
          flex-direction: column;
        }

        .srr-info-box label {
          font-size: 0.68rem;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .srr-info-box span {
          font-size: 0.85rem;
          font-weight: 750;
          color: #334155;
          margin-top: 4px;
        }

        /* LOG INTERVENTIONS */
        .srr-actions-log {
          margin-bottom: 24px;
        }

        .srr-log-header {
          font-size: 0.9rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .srr-log-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 200px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .srr-log-item {
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .srr-log-item.completed {
          background: #f0fdf4;
          border-color: #bbf7d0;
          opacity: 0.8;
        }

        .srr-log-content {
          flex: 1;
        }

        .srr-log-title {
          font-weight: 750;
          font-size: 0.8rem;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .srr-log-title .date {
          font-size: 0.7rem;
          color: #94a3b8;
          font-weight: 550;
        }

        .srr-log-desc {
          font-size: 0.78rem;
          color: #475569;
          margin: 4px 0 0 0;
          line-height: 1.4;
        }

        .srr-log-resp {
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 700;
          margin-top: 4px;
          display: block;
        }

        .srr-log-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .srr-checkbox {
          cursor: pointer;
          width: 16px;
          height: 16px;
          accent-color: #10b981;
        }

        .srr-trash-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .srr-trash-btn:hover {
          background: #fee2e2;
        }

        /* REGISTER PLAN FORM */
        .srr-plan-form {
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
        }

        .srr-plan-form h4 {
          font-size: 0.9rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 12px 0;
        }

        .srr-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .srr-form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .srr-form-group.full-width {
          grid-column: span 2;
        }

        .srr-form-group label {
          font-size: 0.68rem;
          font-weight: 800;
          color: #64748b;
        }

        .srr-submit-btn {
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
          justify-content: center;
          gap: 6px;
          width: 100%;
          margin-top: 12px;
          transition: all 0.2s;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15);
        }

        .srr-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(16, 185, 129, 0.25);
        }

        /* TOAST ABSOLUTE */
        .srr-toast-absolute {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1001;
        }

        @media (max-width: 600px) {
          .srr-modal-info-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .srr-form-grid {
            grid-template-columns: 1fr;
          }
          .srr-form-group.full-width {
            grid-column: span 1;
          }
        }
      `}</style>

      {/* ── HEADER CARD ── */}
      <div className="srr-header-card">
        <div className="srr-header-info">
          <h1><Activity size={28} color="#ef4444" /> Zenit Risk Radar & Acompañamiento</h1>
          <p>Detección de inasistencias/NL acumulados y bitácora colaborativa de acciones pedagógicas.</p>
        </div>
        <button className="srr-back-btn" onClick={onBackToDashboard}>
          <ArrowLeft size={16} /> Volver al Dashboard
        </button>
      </div>

      {/* ── METRICS GRID ── */}
      <div className="srr-metrics-grid">
        <div className="srr-metric-card">
          <div className="srr-metric-icon red">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="srr-metric-value">{criticalCount}</div>
            <div className="srr-metric-label">Riesgo Crítico</div>
          </div>
        </div>

        <div className="srr-metric-card">
          <div className="srr-metric-icon yellow">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="srr-metric-value">{mediumCount}</div>
            <div className="srr-metric-label">Riesgo Medio</div>
          </div>
        </div>

        <div className="srr-metric-card">
          <div className="srr-metric-icon blue">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="srr-metric-value">{stableCount}</div>
            <div className="srr-metric-label">Desempeño Estable</div>
          </div>
        </div>

        <div className="srr-metric-card">
          <div className="srr-metric-icon purple">
            <Bookmark size={24} />
          </div>
          <div>
            <div className="srr-metric-value">{activeInterventionsCount}</div>
            <div className="srr-metric-label">Alumnos en Acompañamiento</div>
          </div>
        </div>
      </div>

      {/* ── FILTERS BAR ── */}
      <div className="srr-filters-bar">
        <div className="srr-filter-group">
          <label>Nivel Curricular</label>
          <select 
            value={selectedLevel} 
            onChange={(e) => setSelectedLevel(e.target.value as any)}
            className="srr-select"
          >
            <option value="All">Ambos Niveles (1M y 2M)</option>
            <option value="1M">1° Medios</option>
            <option value="2M">2° Medios</option>
          </select>
        </div>

        <div className="srr-filter-group">
          <label>Curso Específico</label>
          <select 
            value={selectedCourse} 
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="srr-select"
          >
            <option value="All">Todos los cursos</option>
            {availableCourses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="srr-filter-group">
          <label>Filtro de Riesgo</label>
          <select 
            value={selectedRiskFilter} 
            onChange={(e) => setSelectedRiskFilter(e.target.value as any)}
            className="srr-select"
          >
            <option value="All">Todos los estados</option>
            <option value="critical">🔴 Riesgo Crítico</option>
            <option value="medium">🟡 Riesgo Medio</option>
            <option value="stable">🟢 Estable</option>
          </select>
        </div>

        <div className="srr-filter-group">
          <label>Buscar Alumno</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Buscar estudiante..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="srr-input"
              style={{ paddingLeft: '32px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
          </div>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="srr-table-card">
        <div className="srr-table-header">
          <h2>Lista General de Vulnerabilidad Académica</h2>
          <span className="srr-badge-count">{filteredStudents.length} Alumnos en pantalla</span>
        </div>

        <div className="srr-table-wrapper">
          {filteredStudents.length > 0 ? (
            <table className="srr-table">
              <thead>
                <tr>
                  <th>Estudiante / Rol</th>
                  <th>Curso</th>
                  <th>Historial L/PL/NL</th>
                  <th>Nota Propuesta</th>
                  <th>Proyección Cierre</th>
                  <th>Estado Riesgo</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.key} className="srr-row">
                    <td>
                      <div className="srr-student-cell">
                        <span className="srr-student-name">{s.name}</span>
                        <span className="srr-student-role">{s.role}</span>
                      </div>
                    </td>
                    <td><strong style={{ color: '#0f172a' }}>{s.course}</strong></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="srr-pills-row">
                          {s.history.map((h: any, idx: number) => (
                            <span 
                              key={idx} 
                              className={`srr-pill-dot ${h.status}`} 
                              title={`Clase ${h.classId}: ${h.status === 'green' ? 'Logrado' : h.status === 'yellow' ? 'Por Lograr' : 'No Logrado'}`}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          {s.counts.green} L | {s.counts.yellow} PL | {s.counts.red} NL
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.9rem', color: '#4f46e5' }}>
                        {s.proposed ? s.proposed.toFixed(1) : '—'}
                      </strong>
                    </td>
                    <td>
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 800, 
                        color: s.projectedGrade >= 4.0 ? '#10b981' : '#ef4444' 
                      }}>
                        {s.projectedGrade.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className={`srr-alert-badge ${s.riskLevel}`}>
                          {s.riskLevel === 'critical' ? '🔴 Crítico' : s.riskLevel === 'medium' ? '🟡 Medio' : '🟢 Estable'}
                        </span>
                        <span className="srr-reason-text" title={s.riskReason}>
                          {s.riskReason}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button 
                        className="srr-action-btn-p3"
                        onClick={() => setSelectedStudent(s)}
                      >
                        <Bookmark size={14} /> 
                        Plan ({s.interventions.length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="srr-empty-state">
              <Smile size={32} style={{ marginBottom: '8px' }} />
              <p>No se encontraron estudiantes que coincidan con los filtros seleccionados.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── COOPERATIVE INTERVENTION MODAL ── */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="srr-modal-overlay">
            <motion.div 
              className="srr-modal-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="srr-modal-header">
                <div className="srr-modal-title">
                  <h3>Bitácora de Acompañamiento Pedagógico</h3>
                  <p>Establece y monitorea acuerdos del equipo directivo y docente.</p>
                </div>
                <button className="srr-close-btn" onClick={() => setSelectedStudent(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="srr-modal-body">
                {/* Profile header */}
                <div className="srr-modal-info-grid">
                  <div className="srr-info-box">
                    <label>Estudiante</label>
                    <span>{selectedStudent.name}</span>
                  </div>
                  <div className="srr-info-box">
                    <label>Curso / Rol</label>
                    <span>{selectedStudent.course} - {selectedStudent.role}</span>
                  </div>
                  <div className="srr-info-box">
                    <label>Proyección Cierre</label>
                    <span style={{ color: selectedStudent.projectedGrade >= 4.0 ? '#10b981' : '#ef4444' }}>
                      Nota {selectedStudent.projectedGrade.toFixed(1)} ({selectedStudent.riskLevel === 'critical' ? 'Riesgo Crítico' : selectedStudent.riskLevel === 'medium' ? 'Riesgo Medio' : 'Estable'})
                    </span>
                  </div>
                </div>

                {/* Timeline status of classes */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Historial de Desempeño Diario ({selectedStudent.history.length} evaluados)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedStudent.history.map((h: any, i: number) => (
                      <span 
                        key={i} 
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: h.status === 'green' ? '#d1fae5' : h.status === 'yellow' ? '#fef3c7' : '#fee2e2',
                          color: h.status === 'green' ? '#065f46' : h.status === 'yellow' ? '#92400e' : '#991b1b',
                        }}
                      >
                        C{h.classId}: {h.status === 'green' ? 'L' : h.status === 'yellow' ? 'PL' : 'NL'}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Interventions Log List */}
                <div className="srr-actions-log">
                  <div className="srr-log-header">
                    <Bookmark size={16} color="#7c3aed" /> Planes de Acción y Acuerdos Activos
                  </div>
                  
                  {selectedStudent.interventions && selectedStudent.interventions.length > 0 ? (
                    <div className="srr-log-list">
                      {selectedStudent.interventions.map((action: Intervention) => (
                        <div key={action.id} className={`srr-log-item ${action.completed ? 'completed' : ''}`}>
                          <div className="srr-log-content">
                            <div className="srr-log-title">
                              <span style={{ color: '#7c3aed', fontWeight: 800 }}>{action.type}</span>
                              <span className="date">Registrado el: {action.date}</span>
                            </div>
                            <p className="srr-log-desc">{action.description}</p>
                            <span className="srr-log-resp">Resp: {action.responsible}</span>
                          </div>
                          
                          <div className="srr-log-actions">
                            <input 
                              type="checkbox" 
                              checked={action.completed}
                              onChange={() => handleToggleCompleted(action.id)}
                              className="srr-checkbox"
                              title="Marcar como Completado"
                            />
                            <button 
                              className="srr-trash-btn"
                              onClick={() => handleDeleteIntervention(action.id)}
                              title="Eliminar Plan"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
                      No se han registrado planes de acción aún para este estudiante.
                    </div>
                  )}
                </div>

                {/* Form to add action */}
                <form className="srr-plan-form" onSubmit={handleAddIntervention}>
                  <h4>Registrar Acción Pedagógica de Mitigación</h4>
                  <div className="srr-form-grid">
                    <div className="srr-form-group">
                      <label>Tipo de Acción</label>
                      <select 
                        value={newActionType}
                        onChange={(e) => setNewActionType(e.target.value)}
                        className="srr-select"
                      >
                        <option value="Cambio de Rol">🔄 Cambio de Rol en Grupo</option>
                        <option value="Refuerzo en Aula">📖 Refuerzo en Aula de Recursos</option>
                        <option value="Citación Apoderado">📞 Citación a Apoderado</option>
                        <option value="Adecuación Curricular">✏️ Adecuación Curricular</option>
                        <option value="Compromiso Alumno">🤝 Compromiso Escrito del Estudiante</option>
                      </select>
                    </div>

                    <div className="srr-form-group">
                      <label>Docente / Coordinador Responsable</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Lucy C. / Marco R." 
                        value={newActionResp}
                        onChange={(e) => setNewActionResp(e.target.value)}
                        className="srr-input"
                      />
                    </div>

                    <div className="srr-form-group full-width">
                      <label>Descripción detallada del Plan de Acción</label>
                      <textarea 
                        rows={2}
                        placeholder="Describa el acuerdo y fecha límite para recuperar clases..." 
                        value={newActionDesc}
                        onChange={(e) => setNewActionDesc(e.target.value)}
                        className="srr-input"
                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  <button type="submit" className="srr-submit-btn">
                    <PlusCircle size={16} /> Registrar y Sincronizar en Tiempo Real
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <div className="srr-toast-absolute">
            <div style={{ background: '#0f172a', color: 'white', padding: '12px 24px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: 700, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} className="icon-violet" />
              {toastMessage}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
