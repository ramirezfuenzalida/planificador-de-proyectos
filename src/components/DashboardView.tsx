import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DashboardViewProps {
  courses1M: string[];
  courses2M: string[];
  classesList: string[];
  registrations: Record<string, string>;
  getCourseTag: (courseName: string | null) => string;
  handleCourseSelect: (course: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  courses1M,
  courses2M,
  classesList,
  registrations,
  getCourseTag,
  handleCourseSelect
}) => {
  const allCourses = [...courses1M, ...courses2M];
  const totalPossible = allCourses.length * classesList.length;
  
  let realizadas = 0;
  allCourses.forEach(course => {
    const courseTag = getCourseTag(course);
    classesList.forEach((_, i) => {
      const clsNum = i + 1;
      if (registrations[`${courseTag}-${clsNum}`] === 'green') realizadas++;
    });
  });
  
  const adherence = totalPossible > 0 ? Math.round((realizadas / totalPossible) * 100) : 0;

  return (
    <motion.div 
      className="dv-main-container"
      initial={{ opacity: 1, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.1 }}
    >
      <style>{`
        .dv-main-container {
          padding: 20px;
          background: #f8fafc;
          min-height: 100vh;
        }
        .dv-welcome-banner {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
          border-radius: 24px;
          padding: 40px;
          color: white;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        .dv-welcome-content h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 10px;
        }
        .dv-welcome-content p {
          font-size: 1.1rem;
          opacity: 0.9;
        }
        .dv-summary-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }
        .dv-stat-card {
          background: white;
          padding: 24px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .dv-stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dv-stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          display: block;
        }
        .dv-stat-label {
          color: #64748b;
          font-size: 0.875rem;
        }
        .dv-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 24px;
        }
        .dv-course-card {
          border-radius: 24px;
          padding: 24px;
          position: relative;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          border: none;
          min-height: 160px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          color: white;
        }
        .dv-course-card:hover {
          transform: translateY(-8px) scale(1.02);
        }
        /* KILL THE WHITE BLOB - NO BEFORE/AFTER ALLOWED */
        .dv-course-card::before, .dv-course-card::after {
          content: none !important;
          display: none !important;
        }
        .dv-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .dv-level-tag {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          backdrop-filter: blur(4px);
        }
        .dv-adherence {
          font-weight: 800;
          color: white;
        }
        .dv-course-name {
          font-size: 1.75rem;
          font-weight: 900;
          color: white;
          margin: 0;
          line-height: 1.2;
        }
        .dv-footer {
          margin-top: 20px;
        }
        .dv-stats {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 8px;
        }
        .dv-progress-track {
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 100px;
          overflow: hidden;
        }
        .dv-progress-fill {
          height: 100%;
          background: white;
          border-radius: 100px;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }
        /* Solid Modern Card Colors */
        .dv-course-card.a { background: #6366f1; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4); }
        .dv-course-card.b { background: #0ea5e9; box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.4); }
        .dv-course-card.c { background: #f59e0b; box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4); }
        .dv-course-card.d { background: #ec4899; box-shadow: 0 10px 25px -5px rgba(236, 72, 153, 0.4); }
        
        .dv-course-card.a:hover { box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.6); }
        .dv-course-card.b:hover { box-shadow: 0 20px 40px -10px rgba(14, 165, 233, 0.6); }
        .dv-course-card.c:hover { box-shadow: 0 20px 40px -10px rgba(245, 158, 11, 0.6); }
        .dv-course-card.d:hover { box-shadow: 0 20px 40px -10px rgba(236, 72, 153, 0.6); }
      `}</style>

      <div className="dv-welcome-banner">
        <div className="dv-welcome-content">
          <h1>Bienvenido al sistema de seguimiento</h1>
          <p>Liceo Bicentenario William Taylor de Alto Hospicio</p>
        </div>
        <Sparkles size={80} opacity={0.2} />
      </div>

      <div className="dv-summary-row">
        <div className="dv-stat-card">
          <div className="dv-stat-icon" style={{ background: '#e0e7ff' }}>
            <Users size={24} color="#6366f1" />
          </div>
          <div>
            <span className="dv-stat-value">{allCourses.length}</span>
            <span className="dv-stat-label">Cursos Activos</span>
          </div>
        </div>
        <div className="dv-stat-card">
          <div className="dv-stat-icon" style={{ background: '#ecfdf5' }}>
            <TrendingUp size={24} color="#10b981" />
          </div>
          <div>
            <span className="dv-stat-value">{adherence}%</span>
            <span className="dv-stat-label">Adherencia Global</span>
          </div>
        </div>
      </div>

      <div className="dv-grid">
        {allCourses.map((course) => {
          const courseTag = getCourseTag(course);
          let courseRealizadas = 0;
          classesList.forEach((_, i) => {
            const clsNum = i + 1;
            if (registrations[`${courseTag}-${clsNum}`] === 'green') courseRealizadas++;
          });
          const courseAdherence = Math.round((courseRealizadas / classesList.length) * 100);
          const letter = course.split(' ').pop()?.toLowerCase();

          return (
            <motion.div
              key={course}
              className={`dv-course-card ${letter}`}
              onClick={() => handleCourseSelect(course)}
              whileHover={{ y: -5 }}
            >
              <div className="dv-card-header">
                <span className="dv-level-tag">
                  {course.startsWith('1') ? '1° Medio' : '2° Medio'}
                </span>
                <span className="dv-adherence">{courseAdherence}%</span>
              </div>

              <h3 className="dv-course-name">{course}</h3>

              <div className="dv-footer">
                <div className="dv-stats">
                  {courseRealizadas} / {classesList.length} Clases Realizadas
                </div>
                <div className="dv-progress-track">
                  <div className="dv-progress-fill" style={{ width: `${courseAdherence}%` }}></div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default DashboardView;
