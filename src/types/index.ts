export interface Clase {
  clase: string;
  fecha: string;
  objetivo: string;
  etapa: string;
  rawDocente: string;
  contenido: string;
  actividad: string;
  link: string;
  canvaLink: string | null;
  sitesLink: string | null;
  pptLink: string | null;
  responsable: string;
  horario: string;
  dia: string;
  hardware: string;
  notes: string;
  titulo?: string; // Título opcional para el modal
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  course: string;
  time?: string;
  description?: string;
  type?: 'evaluacion' | 'reunion' | 'hitos' | 'otro';
}

export type Course = '1 Medio A' | '1 Medio B' | '1 Medio C' | '1 Medio D' |
  '2 Medio A' | '2 Medio B' | '2 Medio C' | '2 Medio D' | 'Resumen';

export interface GlobalData {
  pm: Clase[];
  sm: Clase[];
}

export type TeacherRoles = Record<string, string>;
export type MenuPermissions = Record<string, string[]>;

export interface SyncPayload {
  key: string;
  data: any;
  updated_at?: string;
}

export interface ProjectPhase {
  name: string;
  startClass: number;
  endClass: number;
  startDate: string;
  endDate: string;
  color: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  methodology: 'ABP' | 'Design Thinking' | 'HTH' | 'Personalizado';
  phases: ProjectPhase[];
}

export type LevelProjects = Record<string, { // t1, t2, t3
  id: string;
  name: string;
  methodology: 'ABP' | 'Design Thinking' | 'HTH' | 'Personalizado';
  phases: ProjectPhase[];
}>;

export type ProjectsConfigData = Record<string, LevelProjects>; // '1M', '2M'


// ─── GESTIÓN DE PROYECTOS (STEAM / SAE / Transversal) ───────────────────────
export type ProjectType = 'STEAM' | 'SAE' | 'Transversal';

/** Configuración de un nivel (Primeros o Segundos) dentro de un proyecto. */
export interface ProjectLevelSource {
  name: string;         // título propio de este nivel, ej. 'Humberstone VIVE' (puede diferir entre niveles)
  sheetId: string;      // ID de la planilla (extraído del URL)
  planningTab: string;  // nombre de la pestaña de planificación (ej. 'SAE PROYECTO 2')
  teamsTab: string;     // nombre de la pestaña de equipos (ej. '1°TEAM BUILDING')
}

export interface Project {
  id: string;         // 'steam' | 'sae' | 'transversal'
  type: ProjectType;  // categoría fija (define ícono/color)
  name: string;       // nombre propio, ej. 'Humberstone VIVE' (si vacío, se usa el tipo)
  pm: ProjectLevelSource; // Primeros Medios
  sm: ProjectLevelSource; // Segundos Medios
}

export interface ProjectsConfig {
  projects: Project[];
  activeProjectId: string;
}

const emptySource = (): ProjectLevelSource => ({ name: '', sheetId: '', planningTab: '', teamsTab: '' });

export const DEFAULT_PROJECTS_CONFIG: ProjectsConfig = {
  projects: [
    // STEAM arranca con las planillas hardcodeadas históricas (Primeros/Segundos).
    {
      id: 'steam', type: 'STEAM', name: '',
      pm: { name: '', sheetId: '1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc', planningTab: '', teamsTab: '' },
      sm: { name: '', sheetId: '1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo', planningTab: '', teamsTab: '' },
    },
    { id: 'sae', type: 'SAE', name: '', pm: emptySource(), sm: emptySource() },
    { id: 'transversal', type: 'Transversal', name: '', pm: emptySource(), sm: emptySource() },
  ],
  activeProjectId: 'steam',
};
