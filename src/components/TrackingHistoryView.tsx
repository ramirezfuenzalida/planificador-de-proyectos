import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  History, 
  Download, 
  Users, 
  Clock, 
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface TrackingHistoryViewProps {
  courses1M: string[];
  courses2M: string[];
  formativeRegistrations: Record<string, any>;
  globalData: { pm: any[]; sm: any[] };
  getCourseTag: (course: string) => string;
}

const TrackingHistoryView: React.FC<TrackingHistoryViewProps> = ({
  courses1M,
  courses2M,
  formativeRegistrations,
  globalData,
  getCourseTag
}) => {
  const allCourses = [...courses1M, ...courses2M];
  const [selectedCourse, setSelectedCourse] = useState<string>(allCourses[0] || '');

  const courseTag = getCourseTag(selectedCourse);

  // Reconstruct history data from formativeRegistrations
  const historyData: any[] = [];

  Object.keys(formativeRegistrations).forEach(key => {
    // Key format: 1MA-CClase 1-G1
    if (key.startsWith(courseTag + '-')) {
      const parts = key.split('-');
      if (parts.length >= 3) {
        const clsPart = parts[1].replace('C', ''); // e.g. "Clase 1"
        const grpPart = parts[2].replace('G', ''); // e.g. "1"
        const data = formativeRegistrations[key];

        // Only include if there is some evaluation
        if (data.group !== 'none' || Object.values(data.students).some(s => s !== 'none')) {
          // Find class metadata
          const is1M = selectedCourse.startsWith('1');
          const levelClasses = is1M ? globalData.pm : globalData.sm;
          const classMeta = levelClasses.find(c => c.clase === clsPart);

          historyData.push({
            id: key,
            course: selectedCourse,
            clase: clsPart,
            groupId: grpPart,
            groupStatus: data.group,
            students: data.students,
            date: classMeta ? classMeta.fecha : 'Sin fecha',
            time: classMeta ? classMeta.horario : 'Sin hora',
            objective: classMeta ? classMeta.objetivo : 'Sin objetivo registrado'
          });
        }
      }
    }
  });

  // Sort by class number or date (descending)
  historyData.sort((a, b) => {
    const numA = parseInt(a.clase.replace('Clase ', '')) || 0;
    const numB = parseInt(b.clase.replace('Clase ', '')) || 0;
    return numB - numA;
  });

  const getStatusText = (status: string) => {
    if (status === 'green') return 'Logrado';
    if (status === 'yellow') return 'En Proceso';
    if (status === 'red') return 'Alerta';
    return 'Sin evaluar';
  };

  const getStatusColor = (status: string) => {
    if (status === 'green') return '#10b981';
    if (status === 'yellow') return '#f59e0b';
    if (status === 'red') return '#ef4444';
    return '#94a3b8';
  };

  const handleExport = (period: string) => {
    if (historyData.length === 0) {
      alert(`No hay registros para exportar en el curso ${selectedCourse}.`);
      return;
    }

    const headers = [
      'Curso',
      'Clase',
      'Objetivo',
      'Grupo',
      'Fecha',
      'Hora',
      'Evaluacion Global',
      'Estudiante 1',
      'Estudiante 2',
      'Estudiante 3',
      'Estudiante 4'
    ];

    const rows = historyData.map(record => {
      // Reconstruct students array securely 
      const s1 = record.students['1'] || record.students['student_1'] || 'none';
      const s2 = record.students['2'] || record.students['student_2'] || 'none';
      const s3 = record.students['3'] || record.students['student_3'] || 'none';
      const s4 = record.students['4'] || record.students['student_4'] || 'none';

      return [
        record.course,
        `Clase N° ${record.clase}`,
        `"${(record.objective || '').replace(/"/g, '""')}"`, // escape quotes for CSV
        `Grupo ${record.groupId}`,
        record.date,
        record.time,
        getStatusText(record.groupStatus),
        getStatusText(s1),
        getStatusText(s2),
        getStatusText(s3),
        getStatusText(s4)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Add BOM for UTF-8 Excel compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_${period}_${selectedCourse.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tracking-history-container" style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: '24px', padding: '40px', color: 'white', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <History size={40} color="#38bdf8" />
            Historial de Seguimiento
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0 }}>
            Registro completo de evaluaciones por grupo y estudiante
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        {/* Left Sidebar Filters & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Filter size={18} /> Filtrar Curso
            </h3>
            <select 
              value={selectedCourse} 
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, color: '#475569', outline: 'none' }}
            >
              <optgroup label="1° Medios">
                {courses1M.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="2° Medios">
                {courses2M.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>
          </div>

          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Download size={18} /> Exportar Reportes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => handleExport('Mensual')}
                style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#334155', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                Reporte Mensual <Download size={16} />
              </button>
              <button 
                onClick={() => handleExport('Trimestral')}
                style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#334155', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                Reporte Trimestral <Download size={16} />
              </button>
              <button 
                onClick={() => handleExport('Anual')}
                style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', color: '#334155', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                Reporte Anual <Download size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Content - History List */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', minHeight: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Registros de {selectedCourse}
            </h2>
            <div style={{ padding: '8px 16px', background: '#e0f2fe', color: '#0369a1', borderRadius: '100px', fontWeight: 700, fontSize: '0.9rem' }}>
              {historyData.length} Evaluaciones Guardadas
            </div>
          </div>

          {historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <History size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <p style={{ fontSize: '1.1rem' }}>No hay registros formativos para este curso.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {historyData.map((record, index) => (
                <motion.div 
                  key={record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                          GRUPO {record.groupId}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                          Clase N° {record.clase} - {record.objective}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', color: '#64748b', fontSize: '0.85rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {record.date}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {record.time}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${getStatusColor(record.groupStatus)}15`, color: getStatusColor(record.groupStatus), padding: '6px 12px', borderRadius: '100px', fontWeight: 700, fontSize: '0.9rem' }}>
                      <Users size={16} /> 
                      Global: {getStatusText(record.groupStatus)}
                    </div>
                  </div>

                  {/* Individual Students */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Evaluación Individual</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      {Object.keys(record.students).map((sKey, i) => {
                        const status = record.students[sKey];
                        return (
                          <div key={sKey} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            background: status === 'none' ? '#f8fafc' : `${getStatusColor(status)}15`,
                            border: `1px solid ${status === 'none' ? 'transparent' : `${getStatusColor(status)}30`}`,
                            padding: '10px 16px', 
                            borderRadius: '12px' 
                          }}>
                            <span style={{ fontWeight: 600, color: status === 'none' ? '#64748b' : getStatusColor(status), fontSize: '0.9rem' }}>
                              Estudiante {i + 1}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: getStatusColor(status), fontSize: '0.85rem', fontWeight: 800 }}>
                              {status === 'green' && <CheckCircle2 size={16} />}
                              {status === 'yellow' && <Clock size={16} />}
                              {status === 'red' && <AlertCircle size={16} />}
                              {status === 'none' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#cbd5e1' }} />}
                              {getStatusText(status)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackingHistoryView;
