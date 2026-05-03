import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  XCircle, 
  AlertCircle, 
  CheckCircle2, 
  LayoutGrid, 
  MonitorPlay, 
  Globe, 
  Target, 
  BookOpen, 
  ClipboardList, 
  Palette, 
  MessageSquare, 
  ClipboardCheck,
  Users,
  Info
} from 'lucide-react';
import { ensureHttps } from '../utils/materials';

interface ClassModalProps {
  selectedClass: any;
  setSelectedClass: (val: any) => void;
  activeCourse: string | null;
  registrations: any;
  handleRegisterStatus: (status: string) => void;
  getCourseTag: (course: string | null) => string;
  observations: any;
  setObservations: React.Dispatch<React.SetStateAction<any>>;
  handleSaveObservation: () => void;
}

const ClassModal: React.FC<ClassModalProps> = ({
  selectedClass,
  setSelectedClass,
  activeCourse,
  registrations,
  handleRegisterStatus,
  getCourseTag,
  observations,
  setObservations,
  handleSaveObservation
}) => {
  return (
    <AnimatePresence>
      {selectedClass && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          className="modal-overlay-cosmic"
          onClick={() => setSelectedClass(null)}
        >
          <motion.div
            initial={{ opacity: 1, y: "100%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 1, y: "100%", scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="modal-content-premium"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Professional Sheet Handle for Mobile */}
            <div className="modal-sheet-handle"></div>

            <button className="modal-close-btn-pro" onClick={() => setSelectedClass(null)} title="Cerrar detalle">
              <X size={24} />
            </button>

            <div className="modal-header-compact">
              <div className="modal-header-left">
                <div className="modal-clase-num-badge">#{selectedClass.clase}</div>
                <div className="modal-header-info">
                  <h2>{activeCourse}</h2>
                  <p>{selectedClass.dia} | {selectedClass.horario} • {selectedClass.fecha}</p>
                </div>
              </div>
            </div>

            <div className="modal-scroll-area">
              <div className="modal-vertical-stack">
                {/* Gestión de Estado */}
                <div className="premium-card-section">
                  <h4 className="section-header-modern">
                    <Sparkles size={18} color="#8B5CF6" />
                    Gestión de Estado
                  </h4>
                  <div className="registration-controls-v2">
                    <div className="status-button-grid-pro">
                      <button
                        className={`status-btn-pro red ${registrations[`${getCourseTag(activeCourse)}-${String(selectedClass.clase || "").replace(/[^0-9]/g, '')}`] === 'red' ? 'active' : ''}`}
                        onClick={() => handleRegisterStatus('red')}
                      >
                        <XCircle size={24} />
                        <span>NO REALIZADA</span>
                      </button>
                      <button
                        className={`status-btn-pro yellow ${registrations[`${getCourseTag(activeCourse)}-${String(selectedClass.clase || "").replace(/[^0-9]/g, '')}`] === 'yellow' ? 'active' : ''}`}
                        onClick={() => handleRegisterStatus('yellow')}
                      >
                        <AlertCircle size={24} />
                        <span>INCOMPLETA</span>
                      </button>
                      <button
                        className={`status-btn-pro green ${registrations[`${getCourseTag(activeCourse)}-${selectedClass.clase}`] === 'green' ? 'active' : ''}`}
                        onClick={() => handleRegisterStatus('green')}
                      >
                        <CheckCircle2 size={24} />
                        <span>REALIZADA</span>
                      </button>
                    </div>

                    {registrations[`${getCourseTag(activeCourse)}-${selectedClass.clase}`] && (
                      <button className="revert-btn-v2" onClick={() => handleRegisterStatus('')}>
                        <XCircle size={14} /> Limpiar registro actual
                      </button>
                    )}
                  </div>
                </div>

                {/* Ejecución */}
                <div className="premium-card-section">
                  <h4 className="section-header-modern"><Users size={18} color="#8B5CF6" /> Ejecución y Responsables</h4>
                  <div className="execution-row-pro">
                    <div className="execution-box">
                      <span className="execution-label">Docente en Aula:</span>
                      <span className="execution-value">
                        {selectedClass.rawDocente || 'Sin asignar'}
                      </span>
                    </div>
                    <div className="execution-box secondary">
                      <span className="execution-label">Responsable del Diseño:</span>
                      <span className="execution-value">{selectedClass.responsable || 'Equipo Pedagógico'}</span>
                    </div>
                  </div>
                  {selectedClass.hardware && (
                    <div className="hardware-info-pro">
                      <MonitorPlay size={16} />
                      <span><strong>Requerimiento Hardware:</strong> {selectedClass.hardware}</span>
                    </div>
                  )}
                  {selectedClass.notes && (
                    <div className="notes-info-pro">
                      <Info size={16} />
                      <span><strong>Notas Admin:</strong> {selectedClass.notes}</span>
                    </div>
                  )}
                </div>

                {/* Materiales */}
                {(selectedClass.canvaLink || selectedClass.pptLink || selectedClass.sitesLink) && (
                  <div className="premium-card-section">
                    <h4 className="section-header-modern"><LayoutGrid size={18} color="#8B5CF6" /> Materiales Pedagógicos</h4>
                    <div className="materials-grid-pro">
                      {selectedClass.canvaLink && (
                        <a href={ensureHttps(selectedClass.canvaLink)} target="_blank" rel="noopener noreferrer" className="material-btn-pro canva-style">
                          <MonitorPlay size={20} /> Ver en Canva
                        </a>
                      )}
                      {selectedClass.pptLink && (
                        <a href={ensureHttps(selectedClass.pptLink)} target="_blank" rel="noopener noreferrer" className="material-btn-pro canva-style ppt-variant">
                          <LayoutGrid size={20} /> Ver Presentación PPTX
                        </a>
                      )}
                      {selectedClass.sitesLink && (
                        <a href={ensureHttps(selectedClass.sitesLink)} target="_blank" rel="noopener noreferrer" className="material-btn-pro canva-style sites-variant">
                          <Globe size={20} /> Google Sites
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Contenido Pedagógico */}
                <div className="content-stack-pro">
                  <div className="content-card-premium">
                    <div className="content-card-header"><Target size={20} color="#8B5CF6" /><span>Objetivo de Aprendizaje</span></div>
                    <div className="content-card-body">{selectedClass.objetivo || 'Sin objetivo definido'}</div>
                  </div>

                  <div className="content-card-premium">
                    <div className="content-card-header"><BookOpen size={20} color="#8B5CF6" /><span>Contenido Curricular</span></div>
                    <div className="content-card-body">{selectedClass.contenido || 'Sin contenido definido'}</div>
                  </div>

                  <div className="content-card-premium">
                    <div className="content-card-header"><ClipboardList size={20} color="#8B5CF6" /><span>Actividad Programada</span></div>
                    <div className="content-card-body">{selectedClass.actividad || 'Sin actividad definida'}</div>
                  </div>

                  <div className="content-card-premium">
                    <div className="content-card-header"><Palette size={20} color="#8B5CF6" /><span>Diseño y Materiales</span></div>
                    <div className="content-card-body">{selectedClass.diseno || 'Sin especificaciones'}</div>
                  </div>
                </div>

                {/* Observaciones */}
                <div className="premium-card-section">
                  <h4 className="section-header-modern"><MessageSquare size={18} color="#8B5CF6" /> Observaciones de la Sesión</h4>
                  <textarea
                    className="modern-textarea"
                    placeholder="Escribe notas relevantes sobre el desarrollo de la clase..."
                    value={observations[`${activeCourse}-${selectedClass.clase}`] || ''}
                    onChange={(e) => setObservations((prev: any) => ({
                      ...prev,
                      [`${activeCourse}-${selectedClass.clase}`]: e.target.value
                    }))}
                  />
                   <button 
                    className="btn-save-observation"
                    onClick={handleSaveObservation}
                  >
                    <ClipboardCheck size={18} /> Guardar Observación
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClassModal;
