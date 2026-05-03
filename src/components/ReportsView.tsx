
import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart2, Printer, TrendingUp, CheckCircle2, 
  AlertCircle, XCircle, Users 
} from 'lucide-react';

interface ReportsViewProps {
  courses1M: string[];
  courses2M: string[];
  registrations: Record<string, string>;
  getCourseTag: (course: string) => string;
  globalData: { pm: any[]; sm: any[] };
}

const ReportsView: React.FC<ReportsViewProps> = ({
  courses1M,
  courses2M,
  registrations,
  getCourseTag,
  globalData
}) => {
  const allCourses = [...courses1M, ...courses2M];
  
  let globales = { realizadas: 0, incompletas: 0, noRealizadas: 0, totalPossible: 0 };

  const calculateGlobal = (data: any[], courses: string[]) => {
    courses.forEach(course => {
      const courseTag = getCourseTag(course);
      data.forEach(clase => {
        const clsId = String(clase.clase || "").replace(/[^0-9]/g, '');
        if (!clsId) return;
        
        globales.totalPossible++;
        const status = registrations[`${courseTag}-${clsId}`];
        if (status === 'green') globales.realizadas++;
        else if (status === 'yellow') globales.incompletas++;
        else if (status === 'red') globales.noRealizadas++;
      });
    });
  };

  calculateGlobal(globalData.pm, courses1M);
  calculateGlobal(globalData.sm, courses2M);

  const totalPossible = globales.totalPossible;
  const avanceGlobal = totalPossible > 0 ? Math.round((globales.realizadas / totalPossible) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 1, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="reports-view-modern" 
      id="premium-report-root"
    >
      <div className="reports-header-glass">
        <div className="reports-header-title-box">
          <h1><BarChart2 size={32} color="#8B5CF6" /> Rendimiento General</h1>
          <p className="reports-subtitle">Datos procesados en tiempo real basados en los registros de avance curricular.</p>
        </div>
        <button className="export-pdf-btn" onClick={() => window.print()}
          style={{
            background: '#1e293b',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Printer size={18} /> Imprimir Reporte
        </button>
      </div>

      <div className="stats-grid-glass">
        <div className="stat-card-premium stat-blue">
          <div className="stat-icon-wrapper"><TrendingUp size={28} /></div>
          <div className="stat-title">Total Planificadas</div>
          <div className="stat-value">{totalPossible}</div>
        </div>
        <div className="stat-card-premium stat-green">
          <div className="stat-icon-wrapper"><CheckCircle2 size={28} /></div>
          <div className="stat-title">Completadas</div>
          <div className="stat-value">{globales.realizadas}</div>
        </div>
        <div className="stat-card-premium stat-yellow">
          <div className="stat-icon-wrapper"><AlertCircle size={28} /></div>
          <div className="stat-title">En Proceso</div>
          <div className="stat-value">{globales.incompletas}</div>
        </div>
        <div className="stat-card-premium stat-red">
          <div className="stat-icon-wrapper"><XCircle size={28} /></div>
          <div className="stat-title">No Realizadas</div>
          <div className="stat-value">{globales.noRealizadas}</div>
        </div>
        <div className="stat-card-premium stat-purple" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white' }}>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(255,255,255,0.2)' }}><TrendingUp size={28} /></div>
          <div className="stat-title" style={{ opacity: 0.9 }}>% Avance Curricular</div>
          <div className="stat-value" style={{ fontSize: '2.5rem' }}>{avanceGlobal}%</div>
        </div>
      </div>

      <div className="reports-details-card">
        <h3><Users size={20} /> Desglose por Curso</h3>
        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Total Auditadas</th>
                <th>Completas</th>
                <th>Incompletas</th>
                <th>No Realizadas</th>
                <th>% Avance</th>
              </tr>
            </thead>
            <tbody>
              {allCourses.map(course => {
                let realizadas = 0;
                let incompletas = 0;
                let noRealizadas = 0;
                
                const levelData = course.startsWith('1') ? globalData.pm : globalData.sm;
                const totalCourse = levelData.length;
                const courseTag = getCourseTag(course);
                
                levelData.forEach((clase) => {
                  const clsId = String(clase.clase || "").replace(/[^0-9]/g, '');
                  const status = registrations[`${courseTag}-${clsId}`];
                  if (status === 'green') realizadas++;
                  else if (status === 'yellow') incompletas++;
                  else if (status === 'red') noRealizadas++;
                });

                const progress = totalCourse > 0 ? Math.round((realizadas / totalCourse) * 100) : 0;

                return (
                  <tr key={course}>
                    <td className="font-bold">{course}</td>
                    <td>{totalCourse}</td>
                    <td style={{ color: '#10b981', fontWeight: 'bold' }}>{realizadas}</td>
                    <td style={{ color: '#f59e0b', fontWeight: 'bold' }}>{incompletas}</td>
                    <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{noRealizadas}</td>
                    <td>
                      <div className="premium-adherence-cell">
                        <div className="pac-progress-bar">
                          <div className="pac-fill" style={{ width: `${progress}%`, backgroundColor: progress >= 90 ? '#10b981' : progress >= 70 ? '#0ea5e9' : '#f59e0b' }}></div>
                        </div>
                        <span className="pac-value">{progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default ReportsView;
