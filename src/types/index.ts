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

