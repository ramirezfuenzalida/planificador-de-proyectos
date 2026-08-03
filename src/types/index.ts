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

// ─── ACTA DE GLOBALIZACIÓN (reuniones de equipo docente) ──────────────────
export interface ActaGlobalizacion {
  id: string;
  titulo: string;         // título/motivo de la reunión (opcional)
  fecha: string;          // yyyy-mm-dd
  horaInicio: string;     // HH:mm
  horaFin: string;        // HH:mm
  lugar: string;          // lugar/modalidad
  participantes: string[];// nombres seleccionados
  temas: string;          // Temas de la reunión
  propuesta: string;      // Propuesta de equipo
  acuerdos: string;       // Acuerdos tomados
  createdAt: number;
  updatedAt: number;
}

// ─── MUESTRA PÚBLICA (equipos multicurso con nota exportable) ─────────────
/** Posición del estudiante dentro de su grupo de aula. */
export type StudentSlot = 's1' | 's2' | 's3' | 's4';

/**
 * Un integrante de un equipo de muestra. Guardamos su origen de aula
 * (`courseTag` + `groupId` + `sid`) porque es la única forma de recuperar su
 * seguimiento formativo: las claves de `formativeRegistrations` son
 * `${courseTag}-C${clase}-G${groupId}` y dentro viven los slots s1..s4.
 * `name` se guarda además para detectar si el Sheets reordenó esa posición.
 */
export interface MuestraMiembro {
  curso: string;      // '1 Medio C'
  courseTag: string;  // '1MC'
  groupId: number;    // 1..10
  sid: StudentSlot;
  name: string;
  role: string;
}

/** Una sesión de trabajo del equipo, previa a la muestra. Se crea a mano. */
export interface SesionMuestra {
  id: string;
  fecha: string;          // yyyy-mm-dd
  tema: string;           // tema u objetivo de la sesión
  responsable: string;    // docente a cargo de esa sesión
  acuerdos: string;
  observaciones: string;
  realizada: boolean;
  avance: number;         // 0–100, avance del proyecto del equipo
}

/** La muestra pública propiamente tal, para este equipo. */
export interface PresentacionMuestra {
  fecha: string;          // yyyy-mm-dd
  hora: string;           // HH:mm
  lugar: string;          // sala, stand, patio…
  descripcion: string;    // qué va a presentar el equipo
  acuerdos: string;       // acuerdos del día de la muestra
  observaciones: string;  // evaluación del día
}

export interface MuestraEquipo {
  id: string;
  nombre: string;
  nivel: '1M' | '2M';
  tematica: string;
  asignatura: string;
  docentes: string[];
  miembros: MuestraMiembro[];
  /** Bitácora del equipo. Opcionales: los equipos creados antes no las tienen. */
  sesiones?: SesionMuestra[];
  presentacion?: PresentacionMuestra;
  /** Color identificador del equipo (hex). Se asigna al crearlo y se usa en la
   *  tarjeta y en el PDF; es solo para reconocerlo de un vistazo. Puede faltar
   *  en equipos creados antes de esta función: hay un color de reserva. */
  color?: string;
  createdAt: number;
  updatedAt: number;
}

/** Paleta de identificación de equipos: tonos distinguibles entre sí. */
export const COLORES_EQUIPO = [
  '#ec4899', // rosa
  '#f59e0b', // ámbar
  '#10b981', // esmeralda
  '#3b82f6', // azul
  '#8b5cf6', // violeta
  '#ef4444', // rojo
  '#14b8a6', // turquesa
  '#f97316', // naranja
  '#6366f1', // índigo
  '#84cc16', // lima
  '#06b6d4', // cian
  '#d946ef', // fucsia
] as const;

/** Color de un equipo, con reserva estable para los creados sin color. */
export function colorDeEquipo(equipo: MuestraEquipo, indice = 0): string {
  return equipo.color || COLORES_EQUIPO[indice % COLORES_EQUIPO.length];
}

export interface MuestraPublica {
  nombre: string;
  fecha: string;          // yyyy-mm-dd
  /** Último nivel que se estaba viendo. La muestra contiene equipos de AMBOS
   *  niveles: el nivel real de cada equipo vive en `MuestraEquipo.nivel`. */
  nivel: '1M' | '2M';
  configurada: boolean;   // false → se muestra el botón gigante de arranque
  equipos: MuestraEquipo[];
}

export const DEFAULT_MUESTRA_PUBLICA: MuestraPublica = {
  nombre: '',
  fecha: '',
  nivel: '1M',
  configurada: false,
  equipos: [],
};

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
