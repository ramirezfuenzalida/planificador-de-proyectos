import { useState, useEffect } from 'react';
import { 
  Trash2, 
  Save, 
  BookOpen, 
  Link, 
  Calendar, 
  Clock, 
  User, 
  Laptop, 
  PlusCircle, 
  FileText
} from 'lucide-react';
import type { ProjectsConfigData, Clase } from '../types';

// Tipo para el mapeo de planificación local: [nivel][projectId] = Clase[]
type LocalPlanningData = Record<string, Record<string, Clase[]>>;

interface ClassPlanningManagerProps {
  projectsConfig: ProjectsConfigData;
  planningConfig: LocalPlanningData;
  onSavePlanning: (newPlanning: LocalPlanningData) => Promise<void>;
  isLoading: boolean;
}

export default function ClassPlanningManager({
  projectsConfig,
  planningConfig,
  onSavePlanning,
  isLoading
}: ClassPlanningManagerProps) {
  const [localPlanning, setLocalPlanning] = useState<LocalPlanningData>({});
  const [selectedLevel, setSelectedLevel] = useState<'1M' | '2M'>('1M');
  const [selectedTrim, setSelectedTrim] = useState<'t1' | 't2' | 't3'>('t1');
  const [selectedClassIndex, setSelectedClassIndex] = useState<number | null>(null);
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  // Inicializar planificación local
  useEffect(() => {
    if (planningConfig && Object.keys(planningConfig).length > 0) {
      setLocalPlanning(JSON.parse(JSON.stringify(planningConfig)));
    } else {
      setLocalPlanning({
        '1M': { steam_1m: [], sae_1m: [], transversal_1m: [] },
        '2M': { steam_2m: [], sae_2m: [], transversal_2m: [] }
      });
    }
  }, [planningConfig]);

  // Obtener proyecto configurado (para saber su ID, fases, etc.)
  const projectSetup = projectsConfig[selectedLevel]?.[selectedTrim] || {
    id: `${selectedTrim === 't1' ? 'steam' : selectedTrim === 't2' ? 'sae' : 'transversal'}_${selectedLevel.toLowerCase()}`,
    name: `Proyecto ${selectedTrim.toUpperCase()}`,
    methodology: 'Personalizado',
    phases: []
  };

  const projectId = projectSetup.id;

  // Clases del proyecto actual
  const classesList = localPlanning[selectedLevel]?.[projectId] || [];

  // Mapear automáticamente la fase (etapa) según el número de clase y la configuración de fases
  const autoDetectPhase = (classNumStr: string): string => {
    const classNum = parseInt(classNumStr);
    if (isNaN(classNum)) return '';
    const phase = projectSetup.phases?.find(p => classNum >= p.startClass && classNum <= p.endClass);
    return phase ? phase.name : '';
  };

  const handleClassChange = (index: number, field: keyof Clase, value: any) => {
    setLocalPlanning(prev => {
      const updated = { ...prev };
      if (!updated[selectedLevel]) updated[selectedLevel] = {};
      if (!updated[selectedLevel][projectId]) updated[selectedLevel][projectId] = [];

      const list = [...updated[selectedLevel][projectId]];
      list[index] = {
        ...list[index],
        [field]: value
      };

      // Si cambia el número de clase, autodetectar etapa/fase
      if (field === 'clase') {
        list[index].etapa = autoDetectPhase(value);
      }

      updated[selectedLevel][projectId] = list;
      return updated;
    });
  };

  const handleAddClass = () => {
    setLocalPlanning(prev => {
      const updated = { ...prev };
      if (!updated[selectedLevel]) updated[selectedLevel] = {};
      if (!updated[selectedLevel][projectId]) updated[selectedLevel][projectId] = [];

      const list = [...updated[selectedLevel][projectId]];
      const nextNum = list.length > 0 ? (parseInt(list[list.length - 1].clase) || 0) + 1 : 1;

      const newClass: Clase = {
        clase: nextNum.toString(),
        fecha: new Date().toISOString().substring(0, 10), // AAAA-MM-DD
        objetivo: '',
        etapa: autoDetectPhase(nextNum.toString()),
        rawDocente: '',
        contenido: '',
        actividad: '',
        link: '',
        canvaLink: '',
        sitesLink: '',
        pptLink: '',
        responsable: '',
        horario: '',
        dia: '',
        hardware: '',
        notes: ''
      };

      updated[selectedLevel][projectId] = [...list, newClass];
      setSelectedClassIndex(updated[selectedLevel][projectId].length - 1);
      return updated;
    });
  };

  const handleRemoveClass = (index: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta clase de la planificación?')) return;
    setLocalPlanning(prev => {
      const updated = { ...prev };
      const list = updated[selectedLevel][projectId].filter((_, idx) => idx !== index);
      updated[selectedLevel][projectId] = list;
      return updated;
    });
    if (selectedClassIndex === index) {
      setSelectedClassIndex(null);
    } else if (selectedClassIndex !== null && selectedClassIndex > index) {
      setSelectedClassIndex(selectedClassIndex - 1);
    }
  };

  const handleSave = async () => {
    // Validar y ordenar por número de clase antes de guardar
    const orderedPlanning = JSON.parse(JSON.stringify(localPlanning));
    if (orderedPlanning[selectedLevel]?.[projectId]) {
      orderedPlanning[selectedLevel][projectId].sort((a: Clase, b: Clase) => {
        return (parseInt(a.clase) || 0) - (parseInt(b.clase) || 0);
      });
    }

    await onSavePlanning(orderedPlanning);
    setLocalPlanning(orderedPlanning);
    setIsSavedSuccessfully(true);
    setTimeout(() => setIsSavedSuccessfully(false), 3000);
  };

  // Autocompletar la etapa de todas las clases en base a la configuración actual del proyecto
  const handleAutoAlignPhases = () => {
    setLocalPlanning(prev => {
      const updated = { ...prev };
      if (updated[selectedLevel]?.[projectId]) {
        const list = updated[selectedLevel][projectId].map((c: Clase) => ({
          ...c,
          etapa: autoDetectPhase(c.clase)
        }));
        updated[selectedLevel][projectId] = list;
      }
      return updated;
    });
  };

  const activeClass = selectedClassIndex !== null ? classesList[selectedClassIndex] : null;

  return (
    <div className="class-planning-container" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── HEADER ── */}
      <div className="section-title-premium" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'rgba(6, 182, 212,0.12)', border: '1px solid rgba(6, 182, 212,0.25)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
            <BookOpen size={20} style={{ margin: 'auto' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Planificación de Clases y Recursos</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Diseña las sesiones del proyecto y gestiona los enlaces oficiales de Canva y PPT.</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isLoading}
          style={{
            background: isSavedSuccessfully 
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
              : 'linear-gradient(135deg, #06b6d4 0%, #0d9488 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0.65rem 1.25rem',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(6, 182, 212, 0.25)',
            transition: 'all 0.2s ease',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          <Save size={16} />
          <span>{isLoading ? 'Guardando...' : isSavedSuccessfully ? '¡Sincronizado!' : 'Guardar y Sincronizar'}</span>
        </button>
      </div>

      {/* ── SELECTOR DE NIVEL Y TRIMESTRE ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(255,255,255,0.4)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0,0,0,0.05)',
        padding: '12px 16px',
        borderRadius: '16px',
        marginBottom: '1.5rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nivel:</span>
          <div className="level-toggle-premium" style={{ margin: 0 }}>
            <button className={selectedLevel === '1M' ? 'active' : ''} onClick={() => { setSelectedLevel('1M'); setSelectedClassIndex(null); }}>1° Medios</button>
            <button className={selectedLevel === '2M' ? 'active' : ''} onClick={() => { setSelectedLevel('2M'); setSelectedClassIndex(null); }}>2° Medios</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trimestre / Proyecto:</span>
          <div className="level-toggle-premium" style={{ margin: 0 }}>
            <button className={selectedTrim === 't1' ? 'active' : ''} onClick={() => { setSelectedTrim('t1'); setSelectedClassIndex(null); }}>T1 ({projectSetup.methodology})</button>
            <button className={selectedTrim === 't2' ? 'active' : ''} onClick={() => { setSelectedTrim('t2'); setSelectedClassIndex(null); }}>T2 ({projectSetup.methodology})</button>
            <button className={selectedTrim === 't3' ? 'active' : ''} onClick={() => { setSelectedTrim('t3'); setSelectedClassIndex(null); }}>T3 ({projectSetup.methodology})</button>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* COLUMNA IZQUIERDA: LISTADO DE CLASES */}
        <div style={{
          background: 'white',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: '20px',
          padding: '1.25rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.01)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>Clases ({classesList.length})</span>
            <button
              onClick={handleAddClass}
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <PlusCircle size={12} /> Agregar
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
            <button
              onClick={handleAutoAlignPhases}
              disabled={classesList.length === 0}
              style={{
                flex: 1,
                padding: '5px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.66rem',
                fontWeight: 700,
                cursor: classesList.length === 0 ? 'not-allowed' : 'pointer',
                color: '#475569'
              }}
              title="Alinea automáticamente el nombre de la fase en base a la clase asignada"
            >
              Autodetectar Fases
            </button>
          </div>

          <div className="classes-planning-list" style={{
            maxHeight: '400px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '4px'
          }}>
            {classesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                Sin clases en este proyecto.
              </div>
            ) : (
              classesList.map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedClassIndex(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: selectedClassIndex === idx ? 'rgba(6, 182, 212, 0.08)' : '#f8fafc',
                    border: selectedClassIndex === idx ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: selectedClassIndex === idx ? '#06b6d4' : '#1e293b' }}>
                      Clase {c.clase}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveClass(idx);
                      }}
                      style={{
                        background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6
                      }}
                      title="Eliminar sesión"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '4px' }}>
                    {c.objetivo || 'Sin objetivo establecido'}
                  </div>
                  {c.etapa && (
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      background: 'rgba(0,0,0,0.05)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      color: '#475569',
                      display: 'inline-block',
                      marginTop: '4px'
                    }}>
                      {c.etapa}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: EDITOR DE DETALLES DE CLASE */}
        <div style={{
          background: 'white',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: '20px',
          padding: '1.5rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.01)',
          minHeight: '400px'
        }}>
          {!activeClass ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '350px',
              color: '#94a3b8',
              textAlign: 'center'
            }}>
              <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Ninguna Clase Seleccionada</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', maxWidth: '280px' }}>Selecciona una clase del panel izquierdo o crea una nueva para comenzar a planificar su contenido.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                Editar Sesión N° {activeClass.clase}
              </h4>

              {/* Grid 3 columnas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* Clase Número */}
                <div className="filter-group-premium">
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Clase N°</label>
                  <input
                    type="text"
                    value={activeClass.clase}
                    onChange={e => handleClassChange(selectedClassIndex!, 'clase', e.target.value)}
                    style={{
                      width: '100%', padding: '6px 10px', fontSize: '0.82rem', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                    }}
                  />
                </div>

                {/* Fecha */}
                <div className="filter-group-premium">
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Calendar size={12} /> Fecha Clase
                  </label>
                  <input
                    type="date"
                    value={activeClass.fecha}
                    onChange={e => handleClassChange(selectedClassIndex!, 'fecha', e.target.value)}
                    style={{
                      width: '100%', padding: '5px 8px', fontSize: '0.82rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                    }}
                  />
                </div>

                {/* Fase/Etapa */}
                <div className="filter-group-premium">
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Fase Asociada</label>
                  <div className="custom-select-wrapper">
                    <select
                      value={activeClass.etapa}
                      onChange={e => handleClassChange(selectedClassIndex!, 'etapa', e.target.value)}
                      style={{ padding: '6px 20px 6px 10px', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      <option value="">Ninguna</option>
                      {projectSetup.phases?.map((p, pidx) => (
                        <option key={pidx} value={p.name}>{p.name}</option>
                      ))}
                      <option value="Evaluación">Evaluación</option>
                      <option value="Cierre">Cierre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Objetivo */}
              <div className="filter-group-premium">
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Objetivo Pedagógico</label>
                <textarea
                  value={activeClass.objetivo}
                  onChange={e => handleClassChange(selectedClassIndex!, 'objetivo', e.target.value)}
                  placeholder="Objetivo específico de la sesión..."
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 12px', fontSize: '0.82rem', fontWeight: 550, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Contenido */}
                <div className="filter-group-premium">
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Contenido</label>
                  <input
                    type="text"
                    value={activeClass.contenido}
                    onChange={e => handleClassChange(selectedClassIndex!, 'contenido', e.target.value)}
                    placeholder="Contenido a tratar..."
                    style={{
                      width: '100%', padding: '6px 10px', fontSize: '0.82rem', fontWeight: 550, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                    }}
                  />
                </div>

                {/* Actividad */}
                <div className="filter-group-premium">
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Actividad Sugerida</label>
                  <input
                    type="text"
                    value={activeClass.actividad}
                    onChange={e => handleClassChange(selectedClassIndex!, 'actividad', e.target.value)}
                    placeholder="Descripción de la actividad..."
                    style={{
                      width: '100%', padding: '6px 10px', fontSize: '0.82rem', fontWeight: 550, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Enlaces (Canva, PPTX, Sites) */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Link size={14} color="#06b6d4" /> Enlaces a Materiales Didácticos
                </h5>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  {/* Canva */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, width: '90px', color: '#64748b' }}>Canva Link</span>
                    <input
                      type="text"
                      value={activeClass.canvaLink || ''}
                      onChange={e => handleClassChange(selectedClassIndex!, 'canvaLink', e.target.value)}
                      placeholder="https://www.canva.com/design/..."
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                      }}
                    />
                  </div>

                  {/* PPT */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, width: '90px', color: '#64748b' }}>PPT Link</span>
                    <input
                      type="text"
                      value={activeClass.pptLink || ''}
                      onChange={e => handleClassChange(selectedClassIndex!, 'pptLink', e.target.value)}
                      placeholder="https://docs.google.com/presentation/..."
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                      }}
                    />
                  </div>

                  {/* Sites */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, width: '90px', color: '#64748b' }}>Google Sites</span>
                    <input
                      type="text"
                      value={activeClass.sitesLink || ''}
                      onChange={e => handleClassChange(selectedClassIndex!, 'sitesLink', e.target.value)}
                      placeholder="https://sites.google.com/..."
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Responsable, Horario, Hardware y Notas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* Docente Responsable */}
                <div className="filter-group-premium">
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <User size={12} /> Responsable
                  </label>
                  <input
                    type="text"
                    value={activeClass.responsable || activeClass.rawDocente || ''}
                    onChange={e => {
                      handleClassChange(selectedClassIndex!, 'responsable', e.target.value);
                      handleClassChange(selectedClassIndex!, 'rawDocente', e.target.value);
                    }}
                    placeholder="Profesor a cargo..."
                    style={{
                      width: '100%', padding: '6px 10px', fontSize: '0.82rem', fontWeight: 550, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                    }}
                  />
                </div>

                {/* Horario */}
                <div className="filter-group-premium">
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={12} /> Horario / Bloque
                  </label>
                  <input
                    type="text"
                    value={activeClass.horario || ''}
                    onChange={e => handleClassChange(selectedClassIndex!, 'horario', e.target.value)}
                    placeholder="Ej. Bloque 1 (08:30-10:00)"
                    style={{
                      width: '100%', padding: '6px 10px', fontSize: '0.82rem', fontWeight: 550, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                    }}
                  />
                </div>

                {/* Hardware Insumos */}
                <div className="filter-group-premium">
                  <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Laptop size={12} /> Solicitud T.I.
                  </label>
                  <input
                    type="text"
                    value={activeClass.hardware || ''}
                    onChange={e => handleClassChange(selectedClassIndex!, 'hardware', e.target.value)}
                    placeholder="Ej. Proyector, 20 Laptops..."
                    style={{
                      width: '100%', padding: '6px 10px', fontSize: '0.82rem', fontWeight: 550, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="filter-group-premium">
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <FileText size={12} /> Notas del Docente (Bitácora Interna)
                </label>
                <input
                  type="text"
                  value={activeClass.notes || ''}
                  onChange={e => handleClassChange(selectedClassIndex!, 'notes', e.target.value)}
                  placeholder="Notas especiales para la sesión..."
                  style={{
                    width: '100%', padding: '6px 10px', fontSize: '0.82rem', fontWeight: 550, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                  }}
                />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
