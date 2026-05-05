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
  AlertCircle,
  Trash2
} from 'lucide-react';

interface TrackingHistoryViewProps {
  courses1M: string[];
  courses2M: string[];
  formativeRegistrations: Record<string, any>;
  globalData: { pm: any[]; sm: any[] };
  getCourseTag: (course: string) => string;
  onDeleteRegistration: (id: string) => void;
}

const TrackingHistoryView: React.FC<TrackingHistoryViewProps> = ({
  courses1M,
  courses2M,
  formativeRegistrations,
  globalData,
  getCourseTag,
  onDeleteRegistration
}) => {
  const allCourses = [...courses1M, ...courses2M];
  const [selectedCourse, setSelectedCourse] = useState<string>(allCourses[0] || '');
  const [recordToDelete, setRecordToDelete] = useState<string>('');

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

  const uniqueClasses = Array.from(new Set(historyData.map(r => r.clase)));

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

    import('jspdf').then(({ default: jsPDF }) => {
      import('jspdf-autotable').then(({ default: autoTable }) => {
        const doc = new jsPDF('landscape');

        // Title
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59); // #1e293b
        doc.text(`Reporte ${period} de Seguimiento - ${selectedCourse}`, 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100, 116, 139); // #64748b
        doc.text(`Generado el ${new Date().toLocaleDateString()}`, 14, 30);

        const headers = [
          ['Fecha', 'Clase', 'Objetivo', 'Grupo', 'Global', 'Est. 1', 'Est. 2', 'Est. 3', 'Est. 4']
        ];

        const sortedForPdf = [...historyData].sort((a, b) => {
          const classA = parseInt(a.clase.replace('Clase ', '')) || 0;
          const classB = parseInt(b.clase.replace('Clase ', '')) || 0;
          if (classA !== classB) {
            return classB - classA; // Keep class descending like UI
          }
          const groupA = parseInt(a.groupId) || 0;
          const groupB = parseInt(b.groupId) || 0;
          return groupA - groupB; // Sort groups ascending
        });

        const data = sortedForPdf.map(record => {
          const s1 = record.students['s1'] || record.students['1'] || 'none';
          const s2 = record.students['s2'] || record.students['2'] || 'none';
          const s3 = record.students['s3'] || record.students['3'] || 'none';
          const s4 = record.students['s4'] || record.students['4'] || 'none';

          return [
            `${record.date} ${record.time}`,
            `N° ${record.clase}`,
            record.objective || '',
            `Grupo ${record.groupId}`,
            getStatusText(record.groupStatus),
            getStatusText(s1),
            getStatusText(s2),
            getStatusText(s3),
            getStatusText(s4)
          ];
        });

        autoTable(doc, {
          head: headers,
          body: data,
          startY: 40,
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
          columnStyles: {
            2: { cellWidth: 60 }, // make objective column wider
          },
          didParseCell: function(cellData) {
            // Colorize student and global statuses
            if (cellData.section === 'body' && cellData.column.index >= 4) {
              const text = cellData.cell.raw as string;
              if (text === 'Logrado') {
                cellData.cell.styles.fillColor = [209, 250, 229]; // light emerald
                cellData.cell.styles.textColor = [5, 150, 105];   // emerald
                cellData.cell.styles.fontStyle = 'bold';
              } else if (text === 'En Proceso') {
                cellData.cell.styles.fillColor = [254, 243, 199]; // light amber
                cellData.cell.styles.textColor = [217, 119, 6];   // amber
                cellData.cell.styles.fontStyle = 'bold';
              } else if (text === 'Alerta') {
                cellData.cell.styles.fillColor = [254, 226, 226]; // light red
                cellData.cell.styles.textColor = [220, 38, 38];   // red
                cellData.cell.styles.fontStyle = 'bold';
              } else if (text === 'Sin evaluar') {
                cellData.cell.styles.textColor = [148, 163, 184]; // slate
              }
            }
          }
        });

        doc.save(`Reporte_${period}_${selectedCourse.replace(/\s+/g, '_')}.pdf`);
      });
    });
  };

  const handleDeleteRecord = () => {
    if (recordToDelete) {
      if (window.confirm('¿Está seguro que desea eliminar TODAS las evaluaciones (los 10 grupos) de esta clase? Esta acción no se puede deshacer.')) {
        onDeleteRegistration(recordToDelete);
        setRecordToDelete('');
      }
    }
  };

  return (
    <div className="tracking-wrapper">
      <div className="tracking-header-box">
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <History size={40} color="#38bdf8" />
            Historial de Seguimiento
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, margin: 0 }}>
            Registro completo de evaluaciones por grupo y estudiante
          </p>
        </div>
      </div>

      <div className="tracking-layout">
        {/* Left Sidebar Filters & Actions */}
        <div className="tracking-sidebar">
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

          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginTop: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trash2 size={18} color="#ef4444" /> Gestión de Datos
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select 
                value={recordToDelete} 
                onChange={(e) => setRecordToDelete(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, color: '#475569', outline: 'none', textOverflow: 'ellipsis' }}
              >
                <option value="">Seleccione clase a borrar...</option>
                {uniqueClasses.map(clase => (
                   <option key={clase as string} value={`${courseTag}-C${clase}-`}>Clase N° {clase as string}</option>
                ))}
              </select>
              <button 
                onClick={handleDeleteRecord}
                disabled={!recordToDelete}
                style={{ width: '100%', padding: '12px', background: recordToDelete ? '#fee2e2' : '#f1f5f9', border: 'none', borderRadius: '12px', color: recordToDelete ? '#ef4444' : '#94a3b8', fontWeight: 700, cursor: recordToDelete ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                <Trash2 size={16} /> Borrar Clase Completa
              </button>
            </div>
          </div>
        </div>

        {/* Right Content - History List */}
        <div className="tracking-content tracking-content-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
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
                  className="tracking-card-box"
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: '1 1 250px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                          GRUPO {record.groupId}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', lineHeight: '1.4' }}>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {Object.keys(record.students).map((sKey, i) => {
                        const status = record.students[sKey];
                        return (
                          <div key={sKey} style={{ 
                            flex: '1 1 180px',
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
