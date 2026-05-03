
import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart2, PieChart, Printer, TrendingUp, CheckCircle2, 
  AlertCircle, XCircle, Users, BookOpen, MessageSquare 
} from 'lucide-react';
import { 
  getTrimester, getMonthString, parseGoogleDate 
} from '../utils/calendarUtils';

interface AnalyticsViewProps {
  analyticsLevel: string;
  setAnalyticsLevel: (level: string) => void;
  analyticsPeriod: string;
  setAnalyticsPeriod: (period: string) => void;
  analyticsSubPeriod: string;
  setAnalyticsSubPeriod: (subPeriod: string) => void;
  analyticsLoading: boolean;
  globalData: { pm: any[]; sm: any[] };
  courses1M: string[];
  courses2M: string[];
  registrations: Record<string, string>;
  observations: Record<string, string>;
  getCourseTag: (course: string) => string;
  getTeacherForCourse: (name: any, course: string) => string;
}

interface TeacherStat {
  realizadas: number;
  incompletas: number;
  noRealizadas: number;
  total: number;
  classLog: any[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analyticsLevel,
  setAnalyticsLevel,
  analyticsPeriod,
  setAnalyticsPeriod,
  analyticsSubPeriod,
  setAnalyticsSubPeriod,
  analyticsLoading,
  globalData,
  courses1M,
  courses2M,
  registrations,
  observations,
  getCourseTag,
  getTeacherForCourse
}) => {
  let targetCourses: string[] = [];
  if (analyticsLevel === 'All') targetCourses = [...courses1M, ...courses2M];
  else if (analyticsLevel === '1 Medios') targetCourses = [...courses1M];
  else if (analyticsLevel === '2 Medios') targetCourses = [...courses2M];
  else targetCourses = [analyticsLevel];

  // Stats and Teacher tracking
  const aggregatedStats = { realizadas: 0, incompletas: 0, noRealizadas: 0, total: 0 };
  
  // Normalize teacher names to handle accents and casing consistently
  const normalizeName = (name: string) => {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  };

  const teacherStats: Record<string, TeacherStat> = {};

  targetCourses.forEach(course => {
    const levelData = course.startsWith('1') ? globalData.pm : globalData.sm;
    levelData.forEach((clase: any) => {
      const parsedDate = parseGoogleDate(clase.fecha);
      let shouldInclude = false;

      if (analyticsPeriod === 'Anual') {
        shouldInclude = true;
      } else if (analyticsPeriod === 'Trimestral' && parsedDate) {
        if (analyticsSubPeriod === 'Todos' || getTrimester(parsedDate) === analyticsSubPeriod) {
          shouldInclude = true;
        }
      } else if (analyticsPeriod === 'Mensual' && parsedDate) {
        if (analyticsSubPeriod === 'Todos' || getMonthString(parsedDate) === analyticsSubPeriod) {
          shouldInclude = true;
        }
      }

      if (shouldInclude) {
        aggregatedStats.total++;
        const courseTag = getCourseTag(course);
        const clsId = String(clase.clase || "").replace(/[^0-9]/g, '');
        const status = registrations[`${courseTag}-${clsId}`];

        const rawDocStr = getTeacherForCourse(clase.rawDocente || clase.docenteRealiza || clase.responsable, course);
        if (!rawDocStr || rawDocStr.trim() === "" || rawDocStr.toLowerCase().includes("sin asignar")) return;

        // NEW RULE: Treat the combined string as a single unique entity (Individual or Team)
        // Normalize the names within the string to ensure consistency
        let entityName = rawDocStr.split('/')
          .map(t => normalizeName(t))
          .filter(t => t.length > 0)
          .join(' / ');
        
        // Failsafe: Strip any leading course tag if it somehow persisted (e.g. 1MA: JEAN)
        entityName = entityName.replace(/^[12]M[A-D]\s*[:\-]\s*/i, '').trim();
        
        if (entityName) {
          if (!teacherStats[entityName]) {
            teacherStats[entityName] = { realizadas: 0, incompletas: 0, noRealizadas: 0, total: 0, classLog: [] };
          }
          
          teacherStats[entityName].total++;
          teacherStats[entityName].classLog.push({ 
            num: clsId, 
            course: courseTag, 
            status: status || 'pending' 
          });

          if (status === 'green') {
            teacherStats[entityName].realizadas++;
          } else if (status === 'yellow') {
            teacherStats[entityName].incompletas++;
          } else if (status === 'red') {
            teacherStats[entityName].noRealizadas++;
          }
        }

        // Global stats remain per-class
        if (status === 'green') {
          aggregatedStats.realizadas++;
        } else if (status === 'yellow') {
          aggregatedStats.incompletas++;
        } else if (status === 'red') {
          aggregatedStats.noRealizadas++;
        }
      }
    });
  });

  const getSafePercentage = (val: number) => {
    if (!aggregatedStats.total || aggregatedStats.total === 0) return 0;
    return Math.round((val / aggregatedStats.total) * 100);
  };

  const chartsUI = aggregatedStats.total > 0 ? (
    <div className="charts-container">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="chart-card"
      >
        <div className="chart-title">
          <BarChart2 size={20} color="#8B5CF6" />
          Panorama de Realización
        </div>

        <div className="stacked-bar-container">
          {aggregatedStats.realizadas > 0 && (
            <div className="stacked-segment-premium" style={{ width: `${getSafePercentage(aggregatedStats.realizadas)}%`, background: 'linear-gradient(90deg, #059669, #10b981)' }}>
              {getSafePercentage(aggregatedStats.realizadas)}%
            </div>
          )}
          {aggregatedStats.incompletas > 0 && (
            <div className="stacked-segment-premium" style={{ width: `${getSafePercentage(aggregatedStats.incompletas)}%`, background: 'linear-gradient(90deg, #d97706, #f59e0b)' }}>
              {getSafePercentage(aggregatedStats.incompletas)}%
            </div>
          )}
          {aggregatedStats.noRealizadas > 0 && (
            <div className="stacked-segment-premium" style={{ width: `${getSafePercentage(aggregatedStats.noRealizadas)}%`, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }}>
              {getSafePercentage(aggregatedStats.noRealizadas)}%
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Gráfico de acumulación mostrando el porcentaje exacto de adherencia al plan de estudios para el período y curso seleccionado.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="chart-card"
      >
        <div className="chart-title" style={{ justifyContent: 'center' }}>
          <PieChart size={20} color="#0EA5E9" />
          Distribución Global
        </div>

        <div className="doughnut-wrapper" style={{
          background: `conic-gradient(
              #10b981 0% ${getSafePercentage(aggregatedStats.realizadas)}%,
              #f59e0b ${getSafePercentage(aggregatedStats.realizadas)}% ${getSafePercentage(aggregatedStats.realizadas + aggregatedStats.incompletas)}%,
              #ef4444 ${getSafePercentage(aggregatedStats.realizadas + aggregatedStats.incompletas)}% ${getSafePercentage(aggregatedStats.realizadas + aggregatedStats.incompletas + aggregatedStats.noRealizadas)}%,
              #e2e8f0 ${getSafePercentage(aggregatedStats.realizadas + aggregatedStats.incompletas + aggregatedStats.noRealizadas)}% 100%
            )`
        }}>
          <div className="doughnut-inner-premium">
            <span className="percentage-value">{getSafePercentage(aggregatedStats.realizadas)}%</span>
            <span className="percentage-label">ADHERENCIA</span>
          </div>
        </div>

        <div className="chart-legend">
          <div className="legend-item">
            <div><span className="legend-dot" style={{ background: '#10b981' }}></span>Completadas</div>
            <span>{aggregatedStats.realizadas}</span>
          </div>
          <div className="legend-item">
            <div><span className="legend-dot" style={{ background: '#ef4444' }}></span>No Realizadas</div>
            <span>{aggregatedStats.noRealizadas}</span>
          </div>
          <div className="legend-item">
            <div><span className="legend-dot" style={{ background: '#e2e8f0' }}></span>Por Registrar</div>
            <span>{aggregatedStats.total - (aggregatedStats.realizadas + aggregatedStats.incompletas + aggregatedStats.noRealizadas)}</span>
          </div>
        </div>
      </motion.div>
    </div>
  ) : (
    <div className="no-data-notice-premium">
      <AlertCircle size={40} />
      <p>No hay registros que coincidan con los filtros seleccionados.</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="reports-view-modern" 
      id="premium-report-root"
    >
      <div className="reports-header-glass">
        <div className="reports-header-top">
          <div className="reports-header-title-box">
            <h1><PieChart size={32} color="#0EA5E9" /> Analítica Avanzada</h1>
            <p className="reports-subtitle">Explora datos pedagógicos filtrados por nivel, período anual, mensual o trimestral.</p>
          </div>
          <button
            className="export-pdf-btn"
            onClick={() => window.print()}
            style={{ background: '#1e293b', color: 'white' }}
          >
            <Printer size={18} /> Imprimir Reporte
          </button>
        </div>
        <div className="analytics-filters">
          <select value={analyticsLevel} onChange={e => setAnalyticsLevel(e.target.value)} className="analytics-select">
            <option value="All">Todos los Niveles</option>
            <option value="1 Medios">Primeros Medios (General)</option>
            <option value="2 Medios">Segundos Medios (General)</option>
            {courses1M.map(c => <option key={c} value={c}>{c}</option>)}
            {courses2M.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={analyticsPeriod} onChange={e => { setAnalyticsPeriod(e.target.value); setAnalyticsSubPeriod('Todos'); }} className="analytics-select">
            <option value="Anual">Anual Total</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Mensual">Mensual</option>
          </select>

          {analyticsPeriod === 'Trimestral' && (
            <select value={analyticsSubPeriod} onChange={e => setAnalyticsSubPeriod(e.target.value)} className="analytics-select">
              <option value="Todos">Todos los Trimestres</option>
              <option value="Trimestre 1">Trimestre 1</option>
              <option value="Trimestre 2">Trimestre 2</option>
              <option value="Trimestre 3">Trimestre 3</option>
            </select>
          )}

          {analyticsPeriod === 'Mensual' && (
            <select value={analyticsSubPeriod} onChange={e => setAnalyticsSubPeriod(e.target.value)} className="analytics-select">
              <option value="Todos">Todos los Meses</option>
              {['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      </div>

      {analyticsLoading ? (
        <div className="loading-state-cosmic">
          <div className="cosmic-spinner"></div>
          <p>Sincronizando registros matriciales de Google Sheets...</p>
        </div>
      ) : (
        <>
          {aggregatedStats.total > 0 ? (
            <>
              <div className="stats-grid-glass" style={{ marginTop: '2rem' }}>
                <div className="stat-card-premium stat-blue">
                  <div className="stat-icon-wrapper"><TrendingUp size={28} /></div>
                  <div className="stat-title">Clases Auditadas</div>
                  <div className="stat-value">{aggregatedStats.total}</div>
                </div>
                <div className="stat-card-premium stat-green">
                  <div className="stat-icon-wrapper"><CheckCircle2 size={28} /></div>
                  <div className="stat-title">Clases Realizadas</div>
                  <div className="stat-value">{aggregatedStats.realizadas}</div>
                </div>
                <div className="stat-card-premium stat-yellow">
                  <div className="stat-icon-wrapper"><AlertCircle size={28} /></div>
                  <div className="stat-title">Clases Incompletas</div>
                  <div className="stat-value">{aggregatedStats.incompletas}</div>
                </div>
                <div className="stat-card-premium stat-red">
                  <div className="stat-icon-wrapper"><XCircle size={28} /></div>
                  <div className="stat-title">No Realizadas</div>
                  <div className="stat-value">{aggregatedStats.noRealizadas}</div>
                </div>
              </div>

              {chartsUI}

              <div className="reports-details-card" style={{ marginTop: '2rem' }}>
                <div className="section-title-premium">
                  <Users size={22} color="#0EA5E9" />
                  <h3>Desempeño Pedagógico por Docente</h3>
                </div>
                <div className="reports-table-container">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Docente</th>
                        <th style={{ textAlign: 'center' }}>Asignadas</th>
                        <th style={{ textAlign: 'center' }}>Completas</th>
                        <th style={{ textAlign: 'center' }}>En Proceso</th>
                        <th style={{ textAlign: 'center' }}>No Ejecutadas</th>
                        <th style={{ textAlign: 'center', minWidth: '120px' }}>% Adherencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(teacherStats)
                        .sort((a, b) => {
                          const adheA = a[1].total > 0 ? (a[1].realizadas / a[1].total) : 0;
                          const adheB = b[1].total > 0 ? (b[1].realizadas / b[1].total) : 0;
                          return adheB - adheA;
                        })
                        .map(([name, stats]) => {
                          const adhe = stats.total > 0 ? Math.round((stats.realizadas / stats.total) * 100) : 0;

                          return (
                            <tr key={name}>
                              <td className="docente-name-cell">
                                <div className="teacher-avatar-mini">{name.charAt(0)}</div>
                                <div className="teacher-info-stack">
                                  <span className="teacher-name-main">{name}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>{stats.total}</td>
                              <td style={{ textAlign: 'center' }}>{stats.realizadas}</td>
                              <td style={{ textAlign: 'center' }}>{stats.incompletas}</td>
                              <td style={{ textAlign: 'center' }}>{stats.noRealizadas}</td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="premium-adherence-cell">
                                  <div className="pac-progress-bar">
                                    <div className="pac-fill" style={{ width: `${adhe}%`, backgroundColor: adhe >= 90 ? '#10b981' : adhe >= 70 ? '#0ea5e9' : '#f59e0b' }}></div>
                                  </div>
                                  <span className="pac-value">{adhe}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="reports-details-card" style={{ marginTop: '3rem', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div className="section-title-premium" style={{ marginBottom: '2rem' }}>
                  <div className="title-icon-box" style={{ background: '#0ea5e9' }}>
                    <BookOpen size={24} color="white" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Bitácora Curricular Detallada</h3>
                    <p style={{ color: '#64748b', fontWeight: 600 }}>Registro histórico de sesiones por docente y equipo</p>
                  </div>
                </div>

                <div className="teachers-detail-grid">
                  {Object.entries(teacherStats)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([name, stats]) => {
                      // Group by course for better clarity
                      const groupedByCourse: Record<string, any[]> = {};
                      stats.classLog.forEach(log => {
                        if (!groupedByCourse[log.course]) groupedByCourse[log.course] = [];
                        groupedByCourse[log.course].push(log);
                      });

                      return (
                        <div key={name} className="teacher-detail-card-premium">
                          <div className="tdc-header-modern">
                            <div className="tdc-avatar-box">
                              <Users size={20} color="#0ea5e9" />
                            </div>
                            <div className="tdc-main-info">
                              <h4>{name}</h4>
                              <div className="tdc-summary-line">
                                <strong>{stats.realizadas}</strong> realizadas / <strong>{stats.total}</strong> totales
                              </div>
                            </div>
                          </div>

                          <div className="tdc-courses-container">
                            {Object.entries(groupedByCourse).map(([course, logs]) => (
                              <div key={course} className="tdc-course-block">
                                <span className="tdc-course-tag">{course}</span>
                                <div className="tdc-logs-row">
                                  {logs.sort((a, b) => parseInt(a.num) - parseInt(b.num)).map((log, lidx) => (
                                    <div key={lidx} className={`log-indicator ${log.status}`} title={`Clase ${log.num}`}>
                                      {log.num}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="reports-details-card" style={{ marginTop: '2rem' }}>
                <div className="section-title-premium">
                  <MessageSquare size={22} color="#8B5CF6" />
                  <h3>Bitácora de Observaciones Pedagógicas</h3>
                </div>
                <div className="observations-log-grid">
                  {Object.entries(observations).filter(([_, text]) => text.trim().length > 0).length > 0 ? (
                    Object.entries(observations)
                      .filter(([_, text]) => text.trim().length > 0)
                      .map(([id, text]) => {
                        const [course, className] = id.split('-');
                        const status = registrations[id];
                        let teacher = "Docente no especificado";
                        const courseData = course.startsWith('1') ? globalData.pm : globalData.sm;
                        const session = courseData.find((s: any) => s.clase === className);
                        if (session) teacher = session.docenteRealiza || session.responsable || teacher;

                        return (
                          <div key={id} className={`observation-log-card ${status || 'pending'}`}>
                            <div className="olc-header">
                              <span className="olc-course">{course}</span>
                              <span className="olc-class">Clase {className}</span>
                              <div className={`olc-status-dot ${status || 'pending'}`}></div>
                            </div>
                            <div className="olc-teacher">
                              <Users size={12} />
                              <span>{teacher}</span>
                            </div>
                            <p className="olc-text">"{text}"</p>
                          </div>
                        );
                      })
                  ) : (
                    <div className="no-observations-notice">
                      <p>No se han registrado observaciones aún.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="no-data-notice-premium" style={{ marginTop: '4rem' }}>
              <AlertCircle size={48} color="#94a3b8" />
              <h3>Sin Datos en la Selección</h3>
              <p>No se encontraron registros de clases para los filtros aplicados.</p>
              <button className="back-btn" onClick={() => { setAnalyticsLevel('All'); setAnalyticsPeriod('Anual'); }} style={{ marginTop: '1rem', border: '1px solid #e2e8f0' }}>
                Restablecer Filtros
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default AnalyticsView;
