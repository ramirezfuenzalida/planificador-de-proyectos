import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  Palette, 
  FolderOpen, 
  Info,
  Layers,
  HelpCircle,
  Copy
} from 'lucide-react';
import type { ProjectsConfigData, ProjectConfig, ProjectPhase } from '../types';

interface ProjectConfigManagerProps {
  projectsConfig: ProjectsConfigData;
  onSaveConfig: (newConfig: ProjectsConfigData) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_COLORS = [
  { name: 'Violeta', value: '#06b6d4' },
  { name: 'Indigo', value: '#06b6d4' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Ámbar', value: '#F59E0B' },
  { name: 'Naranja', value: '#F97316' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Rojo', value: '#EF4444' },
];

const DEFAULT_PHASES_BY_METHO: Record<string, ProjectPhase[]> = {
  'ABP': [
    { name: 'Lanzamiento e Identificación', startClass: 1, endClass: 6, startDate: '', endDate: '', color: '#06b6d4' },
    { name: 'Investigación Activa', startClass: 7, endClass: 13, startDate: '', endDate: '', color: '#3B82F6' },
    { name: 'Desarrollo y Crítica de Pares', startClass: 14, endClass: 22, startDate: '', endDate: '', color: '#F59E0B' },
    { name: 'Exposición Pública y Reflexión', startClass: 23, endClass: 30, startDate: '', endDate: '', color: '#10B981' }
  ],
  'Design Thinking': [
    { name: 'Empatizar y Definir', startClass: 1, endClass: 5, startDate: '', endDate: '', color: '#EC4899' },
    { name: 'Idear', startClass: 6, endClass: 11, startDate: '', endDate: '', color: '#F97316' },
    { name: 'Prototipar', startClass: 12, endClass: 20, startDate: '', endDate: '', color: '#3B82F6' },
    { name: 'Evaluar y Testear', startClass: 21, endClass: 28, startDate: '', endDate: '', color: '#10B981' }
  ],
  'HTH': [
    { name: 'La Pregunta Esencial', startClass: 1, endClass: 5, startDate: '', endDate: '', color: '#F59E0B' },
    { name: 'Trabajo de Campo', startClass: 6, endClass: 12, startDate: '', endDate: '', color: '#EC4899' },
    { name: 'Borradores Múltiples', startClass: 13, endClass: 20, startDate: '', endDate: '', color: '#06b6d4' },
    { name: 'Celebración del Aprendizaje', startClass: 21, endClass: 28, startDate: '', endDate: '', color: '#10B981' }
  ],
  'Personalizado': [
    { name: 'Fase Inicial', startClass: 1, endClass: 10, startDate: '', endDate: '', color: '#06b6d4' }
  ]
};

export default function ProjectConfigManager({
  projectsConfig,
  onSaveConfig,
  isLoading
}: ProjectConfigManagerProps) {
  const [localConfig, setLocalConfig] = useState<ProjectsConfigData>({});
  const [selectedLevel, setSelectedLevel] = useState<'1M' | '2M'>('1M');
  const [selectedTrim, setSelectedTrim] = useState<'t1' | 't2' | 't3'>('t1');
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  // Cargar configuración cuando cambian las props
  useEffect(() => {
    if (projectsConfig && Object.keys(projectsConfig).length > 0) {
      setLocalConfig(JSON.parse(JSON.stringify(projectsConfig)));
    } else {
      // Estructura por defecto vacía si no existe configuración previa
      const base: ProjectsConfigData = {
        '1M': {
          t1: { id: 'steam_1m', name: 'Proyecto STEAM 1° Medios', methodology: 'ABP', phases: JSON.parse(JSON.stringify(DEFAULT_PHASES_BY_METHO.ABP)) },
          t2: { id: 'sae_1m', name: 'Proyecto SAE 1° Medios', methodology: 'HTH', phases: JSON.parse(JSON.stringify(DEFAULT_PHASES_BY_METHO.HTH)) },
          t3: { id: 'transversal_1m', name: 'Proyecto Transversal 1° Medios', methodology: 'ABP', phases: JSON.parse(JSON.stringify(DEFAULT_PHASES_BY_METHO.ABP)) }
        },
        '2M': {
          t1: { id: 'steam_2m', name: 'Proyecto STEAM 2° Medios', methodology: 'Design Thinking', phases: JSON.parse(JSON.stringify(DEFAULT_PHASES_BY_METHO['Design Thinking'])) },
          t2: { id: 'sae_2m', name: 'Proyecto SAE 2° Medios', methodology: 'HTH', phases: JSON.parse(JSON.stringify(DEFAULT_PHASES_BY_METHO.HTH)) },
          t3: { id: 'transversal_2m', name: 'Proyecto Transversal 2° Medios', methodology: 'ABP', phases: JSON.parse(JSON.stringify(DEFAULT_PHASES_BY_METHO.ABP)) }
        }
      };
      setLocalConfig(base);
    }
  }, [projectsConfig]);

  const activeProject: ProjectConfig = localConfig[selectedLevel]?.[selectedTrim] || {
    id: '',
    name: '',
    methodology: 'Personalizado',
    phases: []
  };

  // Manejar cambios en campos de texto principales del proyecto
  const handleProjectFieldChange = (field: keyof ProjectConfig, value: any) => {
    setLocalConfig(prev => {
      const updated = { ...prev };
      if (!updated[selectedLevel]) updated[selectedLevel] = { t1: {} as any, t2: {} as any, t3: {} as any };
      
      const prevProj = updated[selectedLevel][selectedTrim];
      let newPhases = prevProj.phases;

      // Si cambia la metodología, autocompletar con las fases por defecto sugeridas
      if (field === 'methodology' && prevProj.methodology !== value) {
        newPhases = JSON.parse(JSON.stringify(DEFAULT_PHASES_BY_METHO[value] || []));
      }

      updated[selectedLevel][selectedTrim] = {
        ...prevProj,
        [field]: value,
        phases: newPhases
      };
      return updated;
    });
  };

  // Manejar cambios en campos específicos de una fase
  const handlePhaseFieldChange = (phaseIndex: number, field: keyof ProjectPhase, value: any) => {
    setLocalConfig(prev => {
      const updated = { ...prev };
      const project = updated[selectedLevel][selectedTrim];
      const updatedPhases = [...project.phases];
      
      updatedPhases[phaseIndex] = {
        ...updatedPhases[phaseIndex],
        [field]: value
      };

      updated[selectedLevel][selectedTrim] = {
        ...project,
        phases: updatedPhases
      };
      return updated;
    });
  };

  // Agregar una fase vacía
  const handleAddPhase = () => {
    setLocalConfig(prev => {
      const updated = { ...prev };
      const project = updated[selectedLevel][selectedTrim];
      
      const lastPhase = project.phases[project.phases.length - 1];
      const nextStartClass = lastPhase ? lastPhase.endClass + 1 : 1;

      const newPhase: ProjectPhase = {
        name: `Fase ${project.phases.length + 1}`,
        startClass: nextStartClass,
        endClass: nextStartClass + 5,
        startDate: '',
        endDate: '',
        color: DEFAULT_COLORS[project.phases.length % DEFAULT_COLORS.length].value
      };

      updated[selectedLevel][selectedTrim] = {
        ...project,
        phases: [...project.phases, newPhase]
      };
      return updated;
    });
  };

  // Eliminar una fase
  const handleRemovePhase = (index: number) => {
    setLocalConfig(prev => {
      const updated = { ...prev };
      const project = updated[selectedLevel][selectedTrim];
      const updatedPhases = project.phases.filter((_, idx) => idx !== index);
      
      updated[selectedLevel][selectedTrim] = {
        ...project,
        phases: updatedPhases
      };
      return updated;
    });
  };

  // Clonar la configuración de este nivel/trimestre al otro nivel o trimestre para acelerar la carga
  const handleCopyFromOther = (sourceTrim: 't1' | 't2' | 't3') => {
    if (sourceTrim === selectedTrim) return;
    setLocalConfig(prev => {
      const updated = { ...prev };
      const sourceProj = updated[selectedLevel][sourceTrim];
      if (!sourceProj) return prev;

      // Mantener ID del proyecto destino para no colisionar
      const targetId = updated[selectedLevel][selectedTrim].id;

      updated[selectedLevel][selectedTrim] = {
        ...JSON.parse(JSON.stringify(sourceProj)),
        id: targetId,
        name: sourceProj.name.replace(sourceTrim.toUpperCase(), selectedTrim.toUpperCase())
      };
      return updated;
    });
  };

  const handleSave = async () => {
    await onSaveConfig(localConfig);
    setIsSavedSuccessfully(true);
    setTimeout(() => setIsSavedSuccessfully(false), 3000);
  };

  return (
    <div className="project-config-container" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── HEADER ── */}
      <div className="section-title-premium" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'rgba(6, 182, 212,0.12)', border: '1px solid rgba(6, 182, 212,0.25)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4' }}>
            <FolderOpen size={20} style={{ margin: 'auto' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Estructura de Proyectos y Fases</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Configura manualmente proyectos, metodologías y fechas del año académico.</p>
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
        {/* Nivel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nivel:</span>
          <div className="level-toggle-premium" style={{ margin: 0 }}>
            <button className={selectedLevel === '1M' ? 'active' : ''} onClick={() => setSelectedLevel('1M')}>1° Medios</button>
            <button className={selectedLevel === '2M' ? 'active' : ''} onClick={() => setSelectedLevel('2M')}>2° Medios</button>
          </div>
        </div>

        {/* Trimestre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trimestre:</span>
          <div className="level-toggle-premium" style={{ margin: 0 }}>
            <button className={selectedTrim === 't1' ? 'active' : ''} onClick={() => setSelectedTrim('t1')}>Trimestre 1 (STEAM)</button>
            <button className={selectedTrim === 't2' ? 'active' : ''} onClick={() => setSelectedTrim('t2')}>Trimestre 2 (SAE)</button>
            <button className={selectedTrim === 't3' ? 'active' : ''} onClick={() => setSelectedTrim('t3')}>Trimestre 3 (Transversal)</button>
          </div>
        </div>
      </div>

      {/* ── CONFIGURACIÓN DEL PROYECTO ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1.5rem',
        background: 'white',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: '20px',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.015)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {/* Nombre */}
          <div className="filter-group-premium main-select">
            <label style={{ color: '#4b5563', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Nombre del Proyecto</label>
            <input
              type="text"
              value={activeProject.name || ''}
              onChange={e => handleProjectFieldChange('name', e.target.value)}
              placeholder="Ej. Proyecto STEAM: Robótica"
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.86rem',
                fontWeight: 600,
                outline: 'none',
                color: '#1e293b'
              }}
            />
          </div>

          {/* Metodología */}
          <div className="filter-group-premium main-select">
            <label style={{ color: '#4b5563', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Metodología</label>
            <div className="custom-select-wrapper">
              <select
                value={activeProject.methodology || 'Personalizado'}
                onChange={e => handleProjectFieldChange('methodology', e.target.value)}
                style={{ fontSize: '0.86rem', padding: '0.6rem 2rem 0.6rem 0.85rem', fontWeight: 600 }}
              >
                <option value="ABP">ABP (Aprendizaje Basado en Proyectos)</option>
                <option value="Design Thinking">Design Thinking (Pensamiento de Diseño)</option>
                <option value="HTH">HTH (Caleidoscopio High Tech High)</option>
                <option value="Personalizado">Personalizado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Botones de clonación/acción rápida */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Info size={12} /> Acciones rápidas:
          </span>
          {['t1', 't2', 't3'].filter(t => t !== selectedTrim).map(t => (
            <button
              key={t}
              onClick={() => handleCopyFromOther(t as any)}
              type="button"
              style={{
                padding: '4px 8px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
            >
              <Copy size={11} /> Clonar de Trimestre {t.substring(1)}
            </button>
          ))}
        </div>

        {/* ── FASES DEL PROYECTO ── */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} color="#06b6d4" /> Fases y Planificación del Calendario ({activeProject.phases?.length || 0})
            </h4>
            <button
              onClick={handleAddPhase}
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                color: '#06b6d4',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)'}
            >
              <Plus size={14} /> Nueva Fase
            </button>
          </div>

          {activeProject.phases?.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '2rem', background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: '14px', color: '#64748b', fontSize: '0.8rem'
            }}>
              <HelpCircle size={24} style={{ margin: '0 auto 8px', opacity: 0.6 }} /> No se registran fases en esta metodología. Pulsa "Nueva Fase" para crear una.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeProject.phases?.map((phase, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) 40px',
                    gap: '10px',
                    alignItems: 'center',
                    background: '#f8fafc',
                    borderLeft: `4px solid ${phase.color}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.005)'
                  }}
                >
                  {/* Nombre Fase */}
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>Nombre Fase</label>
                    <input
                      type="text"
                      value={phase.name}
                      onChange={e => handlePhaseFieldChange(idx, 'name', e.target.value)}
                      placeholder="Ej. Fase de Ideación"
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                      }}
                    />
                  </div>

                  {/* Rango Clases */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>Clase Inicial</label>
                    <input
                      type="number"
                      min={1}
                      value={phase.startClass}
                      onChange={e => handlePhaseFieldChange(idx, 'startClass', parseInt(e.target.value) || 1)}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', textAlign: 'center'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>Clase Final</label>
                    <input
                      type="number"
                      min={1}
                      value={phase.endClass}
                      onChange={e => handlePhaseFieldChange(idx, 'endClass', parseInt(e.target.value) || 1)}
                      style={{
                        width: '100%', padding: '6px 10px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', textAlign: 'center'
                      }}
                    />
                  </div>

                  {/* Calendario Inicio */}
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Calendar size={11} /> Inicio
                    </label>
                    <input
                      type="date"
                      value={phase.startDate}
                      onChange={e => handlePhaseFieldChange(idx, 'startDate', e.target.value)}
                      style={{
                        width: '100%', padding: '5px 8px', fontSize: '0.76rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                      }}
                    />
                  </div>

                  {/* Calendario Fin */}
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Calendar size={11} /> Término
                    </label>
                    <input
                      type="date"
                      value={phase.endDate}
                      onChange={e => handlePhaseFieldChange(idx, 'endDate', e.target.value)}
                      style={{
                        width: '100%', padding: '5px 8px', fontSize: '0.76rem', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none'
                      }}
                    />
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Palette size={11} /> Color
                    </label>
                    <div className="custom-select-wrapper">
                      <select
                        value={phase.color}
                        onChange={e => handlePhaseFieldChange(idx, 'color', e.target.value)}
                        style={{ padding: '5px 20px 5px 8px', fontSize: '0.76rem', fontWeight: 700 }}
                      >
                        {DEFAULT_COLORS.map(c => (
                          <option key={c.value} value={c.value}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Botón Borrar */}
                  <div style={{ textAlign: 'center', paddingTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => handleRemovePhase(idx)}
                      style={{
                        padding: '8px',
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '8px',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                        marginTop: '4px'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#fecaca'}
                      onMouseOut={e => e.currentTarget.style.background = '#fee2e2'}
                      title="Eliminar Fase"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
