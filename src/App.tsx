import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu,
  CheckCircle2
} from 'lucide-react';
import { useRef } from 'react';
import { alCambiarSesion, cerrarSesion } from './services/authService';
import { loadAll, save, subscribe, setActiveProject, saveMuestraPublica } from './services/dataService';
import { fusionarMuestra } from './services/muestraSync';
import { parseTeamsGrid } from './utils/sheets';
import { DEFAULT_PROJECTS_CONFIG, DEFAULT_MUESTRA_PUBLICA } from './types';
import type { ProjectsConfig, Project, ActaGlobalizacion, MuestraPublica } from './types';
import './App.css';

// Components
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ClassListView from './components/ClassListView';
import ClassModal from './components/ClassModal';
import CalendarView from './components/CalendarView';
import ReportsView from './components/ReportsView';
import AnalyticsView from './components/AnalyticsView';
import FormativeTrackingView from './components/FormativeTrackingView';
import TrackingHistoryView from './components/TrackingHistoryView';
import Toast from './components/Toast';
import FormativeEvaluationView from './components/FormativeEvaluationView';
import DashboardGeneralView from './components/DashboardGeneralView';
import SmartCalendarView from './components/SmartCalendarView';
import StudentRiskRadarView from './components/StudentRiskRadarView';
import LoginView from './components/LoginView';
import AdminPanelView from './components/AdminPanelView';
import ActaGlobalizacionView from './components/ActaGlobalizacionView';
import StudentProfileView from './components/StudentProfileView';
import MuestraPublicaView from './components/MuestraPublicaView';
import type { CalendarEvent } from './components/SmartCalendarView';
import { studentGroups2M } from './utils/studentGroups';

// ─── CONSTANTES DE AUTENTICACIÓN ────────────────────────────────────────────
const ADMIN_EMAIL = 'exequiel.ramirez@cmwt.cl';

// Permisos por defecto para cada rol al inicializar el sistema
const DEFAULT_MENU_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'courses', 'analytics', 'reports', 'formative-tracking',
    'tracking-history', 'smart-calendar', 'formative-evaluation',
    'dashboard-general', 'student-risk-radar', 'student-profile', 'acta-globalizacion',
    'muestra-publica', 'admin-panel'
  ],
  editor: [
    'courses', 'analytics', 'reports', 'formative-tracking',
    'tracking-history', 'smart-calendar', 'formative-evaluation',
    'dashboard-general', 'student-risk-radar', 'student-profile', 'acta-globalizacion',
    'muestra-publica'
  ],
  reader: [
    'courses', 'analytics', 'dashboard-general'
  ],
};

// Correos pre-autorizados (se usará como lista maestra de acceso)
// El administrador los puede gestionar desde el panel. Esta lista inicial
// se sincroniza con Firebase en la primera carga.
const DEFAULT_TEACHER_ROLES: Record<string, string> = {
  [ADMIN_EMAIL]: 'admin',
};

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Course = '1 Medio A' | '1 Medio B' | '1 Medio C' | '1 Medio D' |
  '2 Medio A' | '2 Medio B' | '2 Medio C' | '2 Medio D' | 'Resumen';

const courses1M: Course[] = ['1 Medio A', '1 Medio B', '1 Medio C', '1 Medio D'];
const courses2M: Course[] = ['2 Medio A', '2 Medio B', '2 Medio C', '2 Medio D'];

export default function App() {
  // ─── ESTADOS DE AUTENTICACIÓN ───────────────────────────────────────────
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('reader');
  const [teacherRoles, setTeacherRoles] = useState<Record<string, string>>(DEFAULT_TEACHER_ROLES);
  const [menuPermissions, setMenuPermissions] = useState<Record<string, string[]>>(DEFAULT_MENU_PERMISSIONS);
  const [projectsConfig, setProjectsConfig] = useState<ProjectsConfig>(DEFAULT_PROJECTS_CONFIG);
  const activeProject: Project =
    projectsConfig.projects.find(p => p.id === projectsConfig.activeProjectId)
    || projectsConfig.projects[0];

  // ─── ESTADOS GENERALES ──────────────────────────────────────────────────
  const [view, setView] = useState('courses');
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [sharedCourse, setSharedCourse] = useState<string>('');
  const [sharedLevel, setSharedLevel] = useState<'1M' | '2M'>('1M');
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [registrations, setRegistrations] = useState<Record<string, string>>({});
  const [formativeRegistrations, setFormativeRegistrations] = useState<Record<string, any>>({});
  const [formativeEvaluations, setFormativeEvaluations] = useState<Record<string, any>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalData, setGlobalData] = useState<{ pm: any[], sm: any[] }>({ pm: [], sm: [] });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: '', sub: '' });
  const [lastRegisteredColor, setLastRegisteredColor] = useState<string | null>(null);
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
  const [actas, setActas] = useState<ActaGlobalizacion[]>([]);
  const [studentGroups, setStudentGroups] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('zenit_student_groups');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return studentGroups2M;
  });

  // Analytics & Calendar States
  const [analyticsLevel, setAnalyticsLevel] = useState('All');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('Anual');
  const [analyticsSubPeriod, setAnalyticsSubPeriod] = useState('Todos');
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [muestraPublica, setMuestraPublica] = useState<MuestraPublica>(() => {
    const saved = localStorage.getItem('zenit_muestra_publica');
    if (saved) {
      try { return { ...DEFAULT_MUESTRA_PUBLICA, ...JSON.parse(saved) }; } catch (e) { /* corrupto: se usa el default */ }
    }
    return DEFAULT_MUESTRA_PUBLICA;
  });
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);

  const lastRemoteData = useRef<Record<string, string>>({});
  // Token de la última carga de planillas: solo la más reciente aplica su
  // resultado. Evita que una carga vieja (config por defecto o red lenta) termine
  // después y sobrescriba los datos buenos (bug: Segundos Medios desaparecía).
  const fetchTokenRef = useRef(0);

  // ─── EFECTO: ESCUCHAR LA SESIÓN DE FIREBASE ───────────────────────────
  useEffect(() => {
    // onAuthStateChanged dispara también en la carga inicial, de modo que
    // sustituye a getSession y al listener en una sola llamada.
    const initAuth = async () => {
      const baja = alCambiarSesion(async (user) => {
        setSession(user);
        if (user?.email) {
          await loadRolesAndPermissions(user.email.toLowerCase());
        } else {
          setCurrentUserRole('reader');
        }
        setAuthLoading(false);
      });

      return () => baja();
    };

    initAuth();
  }, []);

  // ─── CARGA DE DATOS PRINCIPAL (sesión y proyecto activo) ──────────────
  useEffect(() => {
    if (!session) return;

    setActiveProject(projectsConfig.activeProjectId);
    fetchData();
    const cleanup = loadAndSubscribe();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [session, projectsConfig.activeProjectId]);

  // Recarga automática cuando cambian las planillas/pestañas/títulos del proyecto
  // activo (ej. al configurarlo en el Panel de Admin), sin actualizar a mano.
  const activeSourcesSig = JSON.stringify([activeProject?.id, activeProject?.pm, activeProject?.sm]);
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => { fetchData(); }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSourcesSig, session]);

  // ─── FUNCIÓN: CARGAR ROLES Y PERMISOS DESDE SUPABASE ──────────────────
  const loadRolesAndPermissions = async (userEmail: string) => {
    try {
      // Reintenta la carga inicial (config/roles): en móvil una lectura puede
      // fallar por red intermitente. Si NO se logra, no tocamos nada (para no
      // dejar el dispositivo en el proyecto por defecto ni sobrescribir Firebase).
      let data: Record<string, unknown> | null = null;
      for (let i = 0; i < 3; i++) {
        try { data = await loadAll(); break; }
        catch (e) {
          if (i === 2) throw e;
          await new Promise(res => setTimeout(res, 900 * (i + 1)));
        }
      }
      if (!data) throw new Error('Sin datos de configuración');

      const rolesData = data.teacherRoles as Record<string, string> | undefined;
      const permsData = data.menuPermissions as Record<string, string[]> | undefined;
      const cfgData = data.projectsConfig as ProjectsConfig | undefined;

      // Configuración de proyectos. Si viene, se aplica. Si NO viene, se usa el
      // default LOCAL pero NO se escribe en Firebase (una lectura fallida podría
      // borrar una config real —ej. SAE— y dejar al equipo en STEAM).
      if (cfgData && cfgData.projects?.length) {
        setProjectsConfig(cfgData);
        setActiveProject(cfgData.activeProjectId);
      } else {
        setActiveProject(DEFAULT_PROJECTS_CONFIG.activeProjectId);
      }

      const roles = (rolesData && Object.keys(rolesData).length > 0) ? rolesData : DEFAULT_TEACHER_ROLES;
      const perms = (permsData && Object.keys(permsData).length > 0) ? permsData : DEFAULT_MENU_PERMISSIONS;

      setTeacherRoles(roles);
      setMenuPermissions(perms);

      // Admin siempre es admin sin importar lo que diga la DB
      const role = userEmail === ADMIN_EMAIL ? 'admin' : (roles[userEmail] || 'reader');
      setCurrentUserRole(role);
    } catch (err) {
      console.error('Error loading roles:', err);
      // Fallback seguro
      const role = userEmail === ADMIN_EMAIL ? 'admin' : 'reader';
      setCurrentUserRole(role);
    }
  };

  // ─── PERSISTIR CONFIG DE PROYECTOS (solo admin) ───────────────────────
  useEffect(() => {
    if (!session || currentUserRole !== 'admin') return;
    const dataStr = JSON.stringify(projectsConfig);
    if (dataStr !== lastRemoteData.current['projectsConfig']) {
      lastRemoteData.current['projectsConfig'] = dataStr;
      const timer = setTimeout(() => { save('projectsConfig', projectsConfig as any); }, 800);
      return () => clearTimeout(timer);
    }
  }, [projectsConfig, session, currentUserRole]);

  // ─── PERSISTIR ROLES CUANDO CAMBIAN (solo admin) ──────────────────────
  useEffect(() => {
    if (!session || currentUserRole !== 'admin') return;
    const key = 'teacherRoles';
    const dataStr = JSON.stringify(teacherRoles);
    if (dataStr !== lastRemoteData.current[key]) {
      lastRemoteData.current[key] = dataStr;
      const timer = setTimeout(() => {
        save(key, teacherRoles);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [teacherRoles, session, currentUserRole]);

  // ─── PERSISTIR PERMISOS CUANDO CAMBIAN (solo admin) ───────────────────
  useEffect(() => {
    if (!session || currentUserRole !== 'admin') return;
    const key = 'menuPermissions';
    const dataStr = JSON.stringify(menuPermissions);
    if (dataStr !== lastRemoteData.current[key]) {
      lastRemoteData.current[key] = dataStr;
      const timer = setTimeout(() => {
        save(key, menuPermissions);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [menuPermissions, session, currentUserRole]);

  // ─── CARGA INICIAL Y SUSCRIPCIÓN EN TIEMPO REAL ──────────────────────
  // Una sola suscripción de dataService cubre las 8 claves (datos, roles y
  // permisos). El estado de React recibe el mismo diccionario plano de antes.
  const loadAndSubscribe = async () => {
    const localFallbackKey: Record<string, string> = {
      registrations: 'zenit_regs',
      formativeRegistrations: 'zenit_formative_regs',
      formativeEvaluations: 'zenit_formative_evaluations',
      calendarEvents: 'zenit_calendar_events',
      studentGroups: 'zenit_student_groups',
      observations: 'zenit_observations',
      muestraPublica: 'zenit_muestra_publica',
    };

    // Aplica cada clave al estado y refresca el espejo en localStorage.
    const aplicar = (key: string, data: any) => {
      const dataStr = JSON.stringify(data);
      lastRemoteData.current[key] = dataStr;
      if (localFallbackKey[key]) localStorage.setItem(localFallbackKey[key], dataStr);

      if (key === 'registrations') setRegistrations(data);
      else if (key === 'formativeRegistrations') setFormativeRegistrations(data);
      else if (key === 'observations') setObservations(data);
      else if (key === 'formativeEvaluations') setFormativeEvaluations(data);
      else if (key === 'calendarEvents') setCustomEvents(data);
      // projectsConfig NO se aplica desde la suscripción en vivo: se carga una vez
      // al iniciar (loadRolesAndPermissions) y luego mandan las ediciones locales del
      // admin. Aplicarlo aquí revertía los cambios recién hechos (la re-suscripción
      // entrega la versión vieja antes de que el guardado con debounce termine).
      // studentGroups ya no viene de Firebase: los equipos son fuente de verdad del Sheets.
      else if (key === 'teacherRoles') {
        setTeacherRoles(data);
        const userEmail = session?.email?.toLowerCase() || '';
        if (userEmail !== ADMIN_EMAIL) setCurrentUserRole(data[userEmail] || 'reader');
      }
      else if (key === 'menuPermissions') setMenuPermissions(data);
      else if (key === 'actasGlobalizacion') setActas(Array.isArray(data) ? data : []);
      // La muestra es un documento compartido: al llegar cambios de otro docente
      // se fusionan con lo que este tiene en pantalla, en vez de reemplazarlo.
      // Si no, a quien está escribiendo se le borraría el texto a medio tipear.
      else if (key === 'muestraPublica') {
        setMuestraPublica((prev) => fusionarMuestra(
          prev.configurada ? prev : null,
          { ...DEFAULT_MUESTRA_PUBLICA, ...data },
        ) as MuestraPublica);
      }
    };

    try {
      const initialData = await loadAll();
      Object.entries(initialData).forEach(([key, data]) => {
        if (data && (typeof data !== 'object' || Object.keys(data).length > 0)) {
          aplicar(key, data);
        }
      });
    } catch (err) {
      console.error('Error en la carga inicial, usando localStorage:', err);
      const saved = localStorage.getItem('zenit_regs');
      if (saved) setRegistrations(jsonParseSafe(saved, {}));
      const savedFormative = localStorage.getItem('zenit_formative_regs');
      if (savedFormative) setFormativeRegistrations(jsonParseSafe(savedFormative, {}));
      const savedObservations = localStorage.getItem('zenit_observations');
      if (savedObservations) setObservations(jsonParseSafe(savedObservations, {}));
      const savedEvaluations = localStorage.getItem('zenit_formative_evaluations');
      if (savedEvaluations) setFormativeEvaluations(jsonParseSafe(savedEvaluations, {}));
      const savedEvents = localStorage.getItem('zenit_calendar_events');
      if (savedEvents) setCustomEvents(jsonParseSafe(savedEvents, []));
    }

    const unsubscribe = subscribe((key, data) => {
      aplicar(key, data);
      setLastSyncTime(new Date());
    });
    return unsubscribe;
  };

  // ─── SINCRONIZACIÓN DE DATOS ──────────────────────────────────────────
  useEffect(() => {
    const dataStr = JSON.stringify(registrations);
    if (Object.keys(registrations).length > 0 && dataStr !== lastRemoteData.current['registrations']) {
      lastRemoteData.current['registrations'] = dataStr;
      localStorage.setItem('zenit_regs', dataStr);
      const timer = setTimeout(() => {
        save('registrations', registrations).then(() => {
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [registrations]);

  useEffect(() => {
    const dataStr = JSON.stringify(formativeRegistrations);
    if (Object.keys(formativeRegistrations).length > 0 && dataStr !== lastRemoteData.current['formativeRegistrations']) {
      lastRemoteData.current['formativeRegistrations'] = dataStr;
      localStorage.setItem('zenit_formative_regs', dataStr);
      const timer = setTimeout(() => {
        save('formativeRegistrations', formativeRegistrations).then(() => {
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formativeRegistrations]);

  // La muestra se guarda solo una vez configurada: así el objeto por defecto no
  // pisa en Firestore una muestra ya creada mientras llega la carga inicial.
  // El guardado va por saveMuestraPublica (transacción con fusión) para que dos
  // docentes editando equipos distintos no se borren el trabajo.
  useEffect(() => {
    const dataStr = JSON.stringify(muestraPublica);
    if (muestraPublica.configurada && dataStr !== lastRemoteData.current['muestraPublica']) {
      lastRemoteData.current['muestraPublica'] = dataStr;
      localStorage.setItem('zenit_muestra_publica', dataStr);
      const timer = setTimeout(() => {
        saveMuestraPublica(muestraPublica).then((fusionada) => {
          // Adoptamos el resultado de la fusión: puede traer equipos de otro
          // docente que no estaban en esta pantalla.
          lastRemoteData.current['muestraPublica'] = JSON.stringify(fusionada);
          setMuestraPublica(fusionada as MuestraPublica);
          setLastSyncTime(new Date());
        }).catch((err) => console.error('Error guardando la muestra:', err));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [muestraPublica]);

  useEffect(() => {
    const dataStr = JSON.stringify(observations);
    if (Object.keys(observations).length > 0 && dataStr !== lastRemoteData.current['observations']) {
      lastRemoteData.current['observations'] = dataStr;
      localStorage.setItem('zenit_observations', dataStr);
      const timer = setTimeout(() => {
        save('observations', observations).then(() => {
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [observations]);

  useEffect(() => {
    const dataStr = JSON.stringify(formativeEvaluations);
    if (Object.keys(formativeEvaluations).length > 0 && dataStr !== lastRemoteData.current['formativeEvaluations']) {
      lastRemoteData.current['formativeEvaluations'] = dataStr;
      localStorage.setItem('zenit_formative_evaluations', dataStr);
      const timer = setTimeout(() => {
        save('formativeEvaluations', formativeEvaluations).then(() => {
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formativeEvaluations]);

  useEffect(() => {
    const dataStr = JSON.stringify(customEvents);
    if (lastRemoteData.current['calendarEvents'] !== undefined && dataStr !== lastRemoteData.current['calendarEvents']) {
      lastRemoteData.current['calendarEvents'] = dataStr;
      localStorage.setItem('zenit_calendar_events', dataStr);
      const timer = setTimeout(() => {
        save('calendarEvents', customEvents).then(() => {
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [customEvents]);

  // Los equipos (studentGroups) son fuente de verdad del Sheets (pestaña de
  // equipos del proyecto activo); no se guardan en Firebase. Solo caché local.
  useEffect(() => {
    if (Object.keys(studentGroups).length > 0) {
      localStorage.setItem('zenit_student_groups', JSON.stringify(studentGroups));
    }
  }, [studentGroups]);

  // ─── HELPERS ─────────────────────────────────────────────────────────
  const jsonParseSafe = (str: string, fallback: any) => {
    try { return JSON.parse(str); } catch { return fallback; }
  };

  const hasPermission = (viewId: string): boolean => {
    if (currentUserRole === 'admin') return true;
    const allowedViews = menuPermissions[currentUserRole] || [];
    return allowedViews.includes(viewId);
  };

  const handleSetView = (newView: string) => {
    if (!hasPermission(newView)) {
      setToastMessage('No tienes permiso para acceder a esta sección.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setSharedCourse('');
    setSharedLevel('1M');
    setView(newView);
  };

  const handleNavigateToTracking = (courseName: string) => {
    setSharedCourse(courseName);
    const level = courseName.startsWith('1') ? '1M' : '2M';
    setSharedLevel(level);
    setView('formative-tracking');
  };

  const handleNavigateToEvaluation = (courseName: string) => {
    setSharedCourse(courseName);
    const level = courseName.startsWith('1') ? '1M' : '2M';
    setSharedLevel(level);
    setView('formative-evaluation');
  };

  const handleSignOut = async () => {
    try {
      await cerrarSesion();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setSession(null);
      setCurrentUserRole('reader');
      setView('courses');
      localStorage.removeItem('zenit_regs');
      localStorage.removeItem('zenit_formative_regs');
      localStorage.removeItem('zenit_observations');
      localStorage.removeItem('zenit_formative_evaluations');
      localStorage.removeItem('zenit_calendar_events');
    }
  };

  const deleteFormativeRegistration = (idOrPrefix: string) => {
    setFormativeRegistrations(prev => {
      const newRegs = { ...prev };
      Object.keys(newRegs).forEach(key => {
        if (key === idOrPrefix || key.startsWith(idOrPrefix)) {
          delete newRegs[key];
        }
      });
      return newRegs;
    });
  };

  // `que` define qué pestañas refrescar:
  //   'all'       → planificación (pestaña 1) + equipos (pestaña 2)  [carga inicial]
  //   'planning'  → solo planificación/clases (pestaña 1)            [botón "Actualizar Planilla"]
  //   'teams'     → solo grupos/estudiantes (pestaña 2)              [botón "Actualizar Grupos"]
  const fetchData = async (isManual = false, que: 'all' | 'planning' | 'teams' = 'all') => {
    const token = ++fetchTokenRef.current; // esta es la carga vigente
    const wantPlanning = que !== 'teams';
    const wantTeams = que !== 'planning';
    setLoading(true);
    if (isManual) setIsSyncing(true);
    try {
      const PM_SHEET_ID = activeProject.pm.sheetId;
      const SM_SHEET_ID = activeProject.sm.sheetId;

      const gvizUrl = (id: string, tab: string) =>
        `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json` +
        (tab ? `&sheet=${encodeURIComponent(tab)}` : '');

      const parseSheet = (text: string) => {
        const json = JSON.parse(text.substring(47).slice(0, -2));
        if (!json.table || !json.table.rows) return [];
        const rows = json.table.rows;
        const cols = json.table.cols;
        return rows.map((r: any) => {
          const obj: any = {};
          r.c.forEach((cell: any, i: number) => {
            const val = cell ? (cell.f || cell.v || '') : '';
            // Siempre guarda por índice como respaldo.
            obj[`col_${i}`] = val;
            if (cols[i] && cols[i].label) {
              // Clave robusta: sin espacios extra (trim), sin tildes (normalize)
              // y espacios→'_'. Antes "Link Clase " daba "link_clase_" y
              // "Solicitudes Informática" daba "solicitudes_informática" (con tilde).
              const key = cols[i].label
                .trim()
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '')
                .replace(/\s+/g, '_');
              if (key) obj[key] = val;
            }
          });
          return obj;
        }).filter((clase: any) =>
          clase.clase &&
          clase.clase !== 'Clase' &&
          String(clase.clase).trim() !== ''
        );
      };

      // Lee una pestaña con REINTENTOS: en móvil una descarga puede fallar o
      // volver vacía por red intermitente; reintentamos hasta 3 veces con backoff
      // y forzamos descarga fresca (cache: 'no-store') para no leer una copia vieja.
      const fetchSheet = async (id: string, tab: string, name: string) => {
        if (!id) return [];
        let ultimo: any[] = [];
        for (let intento = 0; intento < 3; intento++) {
          try {
            const response = await fetch(gvizUrl(id, tab), { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            ultimo = parseSheet(text);
            if (ultimo.length > 0) return ultimo; // éxito con clases
          } catch (error) {
            console.warn(`Intento ${intento + 1} falló al leer "${name}" (pestaña "${tab || 'primera'}"):`, error);
          }
          if (intento < 2) await new Promise(res => setTimeout(res, 800 * (intento + 1)));
        }
        return ultimo; // tras 3 intentos, devuelve lo que haya (posible [])
      };

      // Lee una pestaña de equipos como matriz cruda y la parsea a grupos.
      // Con reintentos + descarga fresca (móvil): si falla o vuelve vacío, reintenta.
      const fetchTeams = async (id: string, tab: string, nivel: '1' | '2') => {
        if (!id || !tab) return {};
        for (let intento = 0; intento < 3; intento++) {
          try {
            const response = await fetch(gvizUrl(id, tab), { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            const json = JSON.parse(text.substring(47).slice(0, -2));
            const grid: string[][] = (json.table.rows || []).map((r: any) =>
              (r.c || []).map((cell: any) => (cell && cell.v != null ? String(cell.v).trim() : '')),
            );
            const parsed = parseTeamsGrid(grid, nivel);
            if (Object.keys(parsed).length > 0) return parsed;
          } catch (e) {
            console.warn(`Intento ${intento + 1} equipos (${tab}) falló:`, e);
          }
          if (intento < 2) await new Promise(res => setTimeout(res, 800 * (intento + 1)));
        }
        return {};
      };

      const [pmData, smData, pmTeams, smTeams] = await Promise.all([
        wantPlanning ? fetchSheet(PM_SHEET_ID, activeProject.pm.planningTab, 'Primeros Medios') : Promise.resolve([] as any[]),
        wantPlanning ? fetchSheet(SM_SHEET_ID, activeProject.sm.planningTab, 'Segundos Medios') : Promise.resolve([] as any[]),
        wantTeams ? fetchTeams(PM_SHEET_ID, activeProject.pm.teamsTab, '1') : Promise.resolve({} as Record<string, any>),
        wantTeams ? fetchTeams(SM_SHEET_ID, activeProject.sm.teamsTab, '2') : Promise.resolve({} as Record<string, any>),
      ]);

      // Equipos (nombres de estudiantes): se FUSIONAN con lo ya cargado, nivel por
      // nivel. Antes se reemplazaba todo el objeto: si Segundos fallaba pero Primeros
      // llegaba, quedaban solo los de Primeros y se BORRABAN los de Segundos.
      // Ahora, si un nivel no trae datos, se conserva el que ya estaba.
      if (Object.keys(pmTeams).length > 0 || Object.keys(smTeams).length > 0) {
        setStudentGroups(prev => ({ ...prev, ...pmTeams, ...smTeams }));
      }

      // Las CLASES (globalData) sí requieren el token: setGlobalData siempre pisa,
      // así que una carga vieja no debe aplicar y dejar Segundos vacío.
      if (token !== fetchTokenRef.current) return;

      const normalize = (data: any[], type: 'pm' | 'sm') => data.map(item => {
        const rawLink = type === 'pm' ? (item.link_clase || item.col_12 || '') : (item.link_clase || item.col_11 || '');
        const rawDocente = type === 'pm' ? (item.docente_que_realiza_la_clase || item.col_14 || '') : (item.docente_que_realiza_la_clase || item.col_12 || '');

        const low = String(rawLink).toLowerCase();
        const isCanva = low.includes('canva.com') || low.includes('canva.link');
        const isSites = low.includes('sites.google.com');
        // PPT: Google Slides Y TAMBIÉN PowerPoint (.pptx/.ppt, OneDrive, SharePoint, Office).
        const isPpt = low.includes('docs.google.com/presentation')
          || low.includes('.pptx') || low.includes('.ppt')
          || low.includes('powerpoint') || low.includes('officeapps.live')
          || low.includes('office.com') || low.includes('sharepoint')
          || low.includes('onedrive') || low.includes('1drv.ms');
        const isUrl = /https?:\/\/|www\./i.test(low);
        const links = {
          canva: isCanva ? rawLink : null,
          sites: isSites ? rawLink : null,
          ppt: isPpt ? rawLink : null,
          // Cualquier otro enlace válido: no se pierde, se ofrece "Abrir material".
          other: (isUrl && !isCanva && !isSites && !isPpt) ? rawLink : null,
        };

        return {
          clase: (item.clase || item.col_1)?.toString() || '',
          fecha: item.fecha || item.col_4 || '',
          objetivo: item.objetivo || item.objetivo_de_la_clase || item.col_6 || '',
          etapa: item.etapa_de_proyecto || item.col_5 || '',
          rawDocente: rawDocente,
          contenido: item.contenido || item.col_7 || '',
          actividad: item.actividad || item.actividad_de_la_clase || item.col_8 || '',
          link: rawLink,
          canvaLink: links.canva,
          sitesLink: links.sites,
          pptLink: links.ppt,
          otherLink: links.other,
          responsable: item.responsable || item.col_9 || '',
          horario: item.horario || item.horario_ || item.col_3 || '',
          dia: item.dia || item.dia_ || item.col_2 || '',
          hardware: item.solicitudes_informatica || '',
          diseno: item.diseno_de_materiales || item.diseno_de_material || '',
          aulaInvertida: item.aula_invertida || '',
          notes: type === 'pm' ? (item.col_15 || '') : (item.col_13 || '')
        };
      });

      const sortByDate = (arr: any[]) => arr.sort((a, b) => {
        const parse = (f: string) => {
          try {
            if (!f || typeof f !== 'string') return 0;
            const p = f.split(/[\/\-]/);
            if (p.length < 3) return 0;
            const year = p[2].length === 2 ? '20' + p[2] : p[2];
            const month = p[1].padStart(2, '0');
            const day = p[0].padStart(2, '0');
            return new Date(`${year}-${month}-${day}T12:00:00`).getTime();
          } catch { return 0; }
        };
        return parse(a.fecha) - parse(b.fecha);
      });

      // Solo tocar la PLANIFICACIÓN (globalData) si se pidió. En modo 'teams' NO
      // se pisa globalData (si no, un refresco de grupos borraría las clases).
      if (wantPlanning) {
        setGlobalData({
          pm: sortByDate(normalize(pmData, 'pm')),
          sm: sortByDate(normalize(smData, 'sm'))
        });

        const hayPlanillas = !!(PM_SHEET_ID || SM_SHEET_ID);
        const sinClases = pmData.length === 0 && smData.length === 0;
        if (hayPlanillas && sinClases) {
          setToastMessage('No se cargaron clases. Revisa que la planilla sea pública y que el nombre de la pestaña de planificación sea exacto.');
          setTimeout(() => setToastMessage(null), 6000);
        } else if (isManual) {
          setToastMessage(que === 'planning' ? '¡Planificación actualizada exitosamente!' : '¡Planilla actualizada!');
          setTimeout(() => setToastMessage(null), 3000);
        }
      } else if (isManual) {
        // Refresco solo de grupos (pestaña 2).
        setToastMessage('¡Grupos de estudiantes actualizados!');
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (e) {
      console.error("Fetch failed", e);
      if (token === fetchTokenRef.current) {
        setToastMessage("Error inesperado al leer las planillas. Revisa la configuración del proyecto.");
      }
    } finally {
      // Solo la carga vigente controla los indicadores de estado.
      if (token === fetchTokenRef.current) {
        setLoading(false);
        setIsSyncing(false);
      }
    }
  };

  const handleCourseSelect = (course: string) => {
    setActiveCourse(course as Course);
    setView('class-list');
    setIsMobileSidebarOpen(false);
  };

  const handleBackToCourses = () => {
    setView('courses');
    setActiveCourse(null);
    setIsMobileSidebarOpen(false);
  };

  const getCourseTag = (course: string | null) => {
    if (!course) return '';
    if (course.includes('1 Medio A')) return '1MA';
    if (course.includes('1 Medio B')) return '1MB';
    if (course.includes('1 Medio C')) return '1MC';
    if (course.includes('1 Medio D')) return '1MD';
    if (course.includes('2 Medio A')) return '2MA';
    if (course.includes('2 Medio B')) return '2MB';
    if (course.includes('2 Medio C')) return '2MC';
    if (course.includes('2 Medio D')) return '2MD';
    return '';
  };

  const handleRegisterStatus = (statusColor: string) => {
    if (!selectedClass || !activeCourse) return;

    const courseTag = getCourseTag(activeCourse);
    const clsId = String(selectedClass.clase || "").replace(/[^0-9]/g, '');
    const registrationId = `${courseTag}-${clsId}`;

    setRegistrations(prev => ({
      ...prev,
      [registrationId]: statusColor
    }));

    setSuccessInfo({
      title: 'REGISTRO EXITOSO',
      sub: 'El estado de la clase se ha actualizado correctamente.'
    });
    setLastRegisteredColor(statusColor);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      setSelectedClass(null);
      setLastRegisteredColor(null);
    }, 2000);
  };

  const getTeacherForCourse = (raw: any, course: string) => {
    if (!raw) return 'Sin asignar';
    const tag = getCourseTag(course);
    const rawStr = String(raw);

    const regex = /(1MA|1MB|1MC|1MD|2MA|2MB|2MC|2MD)\s*[:\-]/g;
    const segments: { tag: string, start: number }[] = [];
    let match;
    while ((match = regex.exec(rawStr)) !== null) {
      segments.push({ tag: match[1], start: match.index });
    }

    if (segments.length === 0) return rawStr.trim();

    const targetSeg = segments.find(s => s.tag === tag);
    if (!targetSeg) return 'Sin asignar';

    const nextSeg = segments[segments.indexOf(targetSeg) + 1];
    const end = nextSeg ? nextSeg.start : rawStr.length;

    let content = rawStr.substring(targetSeg.start, end);
    content = content.replace(/^[12]M[A-D]\s*[:\-]\s*/i, '').trim();

    const courseEndIndex = content.indexOf('//');
    if (courseEndIndex !== -1) {
      content = content.substring(0, courseEndIndex).trim();
    }

    return content.replace(/\/+$/, '').trim() || 'Sin asignar';
  };

  const handleAddCalendarEvent = (event: CalendarEvent) => {
    setCustomEvents(prev => [...prev, event]);
    setToastMessage("Evento agendado correctamente");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── ACTAS DE GLOBALIZACIÓN (reuniones de equipo) ─────────────────────
  const persistActas = (next: ActaGlobalizacion[]) => {
    setActas(next);
    lastRemoteData.current['actasGlobalizacion'] = JSON.stringify(next);
    save('actasGlobalizacion', next as any)
      .then(() => setLastSyncTime(new Date()))
      .catch((e) => console.error('No se pudo guardar el acta:', e));
  };

  const handleDeleteCalendarEvent = (id: string) => {
    setCustomEvents(prev => prev.filter(e => e.id !== id));
    setToastMessage("Evento eliminado correctamente");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveObservation = () => {
    setToastMessage("Observación guardada correctamente");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── PANTALLA DE CARGA DE AUTENTICACIÓN ──────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          animation: 'pulse 1.8s ease-in-out infinite' 
        }}>
          <img 
            src="/zenit_app_icon.png" 
            alt="ZenitApp Logo" 
            style={{ 
              width: '84px', 
              height: '84px', 
              borderRadius: '20px', 
              boxShadow: '0 12px 36px rgba(20, 184, 166, 0.25)',
              border: '2px solid rgba(255, 255, 255, 0.08)'
            }} 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(0.96); opacity: 0.85; filter: brightness(0.95); }
            50% { transform: scale(1.04); opacity: 1; filter: brightness(1.15) drop-shadow(0 0 24px rgba(20, 184, 166, 0.35)); }
          }
        `}</style>
      </div>
    );
  }

  // ─── PANTALLA DE LOGIN SI NO HAY SESIÓN ──────────────────────────────
  if (!session) {
    return (
      <LoginView
        onLoginSuccess={(user) => setSession(user)}
      />
    );
  }

  // ─── PANTALLA DE CARGA DE DATOS AL INICIAR SESIÓN ────────────────────────
  const isDataEmpty = globalData.pm.length === 0 && globalData.sm.length === 0;
  if (session && loading && isDataEmpty) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          animation: 'pulse 1.8s ease-in-out infinite' 
        }}>
          <img 
            src="/zenit_app_icon.png" 
            alt="ZenitApp Logo" 
            style={{ 
              width: '84px', 
              height: '84px', 
              borderRadius: '20px', 
              boxShadow: '0 12px 36px rgba(20, 184, 166, 0.25)',
              border: '2px solid rgba(255, 255, 255, 0.08)'
            }} 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(0.96); opacity: 0.85; filter: brightness(0.95); }
            50% { transform: scale(1.04); opacity: 1; filter: brightness(1.15) drop-shadow(0 0 24px rgba(20, 184, 166, 0.35)); }
          }
        `}</style>
      </div>
    );
  }

  // ─── PANEL DE ADMINISTRACIÓN ──────────────────────────────────────────
  if (view === 'admin-panel') {
    return (
      <motion.div 
        className="app-window no-flicker"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Sidebar
          view={view}
          setView={handleSetView}
          activeCourse={activeCourse}
          setActiveCourse={(c) => setActiveCourse(c as Course | null)}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          courses1M={courses1M}
          courses2M={courses2M}
          handleBackToCourses={handleBackToCourses}
          handleCourseSelect={handleCourseSelect}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
          onRefreshData={() => fetchData(true, 'planning')}
          isLoadingData={loading}
          currentUserRole={currentUserRole}
          userEmail={session?.email || ''}
          menuPermissions={menuPermissions}
          onSignOut={handleSignOut}
        />
        <main className="main-board no-flicker">
          <header className="mobile-nav-header">
            <button className="mobile-menu-btn" onClick={() => setIsMobileSidebarOpen(true)}>
              <Menu size={28} />
            </button>
            <div className="mobile-nav-brand">ZenitApp</div>
          </header>
          <AdminPanelView
            teacherRoles={teacherRoles}
            setTeacherRoles={setTeacherRoles}
            menuPermissions={menuPermissions}
            setMenuPermissions={setMenuPermissions}
            projectsConfig={projectsConfig}
            setProjectsConfig={setProjectsConfig}
            onBackToDashboard={() => setView('courses')}
          />
        </main>
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      </motion.div>
    );
  }

  // ─── APLICACIÓN PRINCIPAL ─────────────────────────────────────────────
  return (
    <motion.div 
      className="app-window no-flicker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Sidebar
        view={view}
        setView={handleSetView}
        activeCourse={activeCourse}
        setActiveCourse={(c) => setActiveCourse(c as Course | null)}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        courses1M={courses1M}
        courses2M={courses2M}
        handleBackToCourses={handleBackToCourses}
        handleCourseSelect={handleCourseSelect}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onRefreshData={() => fetchData(true, 'planning')}
        isLoadingData={loading}
        currentUserRole={currentUserRole}
        userEmail={session?.email || ''}
        menuPermissions={menuPermissions}
        onSignOut={handleSignOut}
      />

      <main className="main-board no-flicker">
        <header className="mobile-nav-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileSidebarOpen(true)}>
            <Menu size={28} />
          </button>
          <div className="mobile-nav-brand">ZenitApp</div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={view + (activeCourse ? `-${activeCourse}` : '') + (sharedCourse ? `-${sharedCourse}` : '')}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0 }}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {view === 'courses' ? (
          <DashboardView
            key="courses"
            courses1M={courses1M}
            courses2M={courses2M}
            registrations={registrations}
            globalData={globalData}
            getCourseTag={getCourseTag}
            handleCourseSelect={handleCourseSelect}
            activeProject={activeProject}
          />
        ) : view === 'tracking-history' ? (
          <TrackingHistoryView
            key="tracking-history"
            courses1M={courses1M}
            courses2M={courses2M}
            formativeRegistrations={formativeRegistrations}
            globalData={globalData}
            getCourseTag={getCourseTag}
            onDeleteRegistration={deleteFormativeRegistration}
            dynamicGroups={studentGroups}
          />
        ) : view === 'class-list' && activeCourse ? (
          <ClassListView
            key="class-list"
            activeCourse={activeCourse}
            registrations={registrations}
            getCourseTag={getCourseTag}
            globalData={globalData}
            onClassSelect={setSelectedClass}
            onBack={handleBackToCourses}
            getTeacherForCourse={getTeacherForCourse}
          />
        ) : view === 'analytics' ? (
          <AnalyticsView
            key="analytics"
            analyticsLevel={analyticsLevel}
            setAnalyticsLevel={setAnalyticsLevel}
            analyticsPeriod={analyticsPeriod}
            setAnalyticsPeriod={setAnalyticsPeriod}
            analyticsSubPeriod={analyticsSubPeriod}
            setAnalyticsSubPeriod={setAnalyticsSubPeriod}
            analyticsLoading={loading}
            globalData={globalData}
            courses1M={courses1M}
            courses2M={courses2M}
            registrations={registrations}
            observations={observations}
            getCourseTag={getCourseTag}
            getTeacherForCourse={getTeacherForCourse}
          />
        ) : view === 'calendar' ? (
          <CalendarView
            key="calendar"
            currentCalendarDate={currentCalendarDate}
            setCurrentCalendarDate={setCurrentCalendarDate}
            selectedCalendarDay={selectedCalendarDay}
            setSelectedCalendarDay={setSelectedCalendarDay}
            globalData={globalData}
            registrations={registrations}
            getTeacherForCourse={getTeacherForCourse}
            getCourseTag={getCourseTag}
          />
        ) : view === 'smart-calendar' ? (
          <SmartCalendarView
            key="smart-calendar"
            globalData={globalData}
            registrations={registrations}
            getTeacherForCourse={getTeacherForCourse}
            getCourseTag={getCourseTag}
            customEvents={customEvents}
            onAddEvent={handleAddCalendarEvent}
            onDeleteEvent={handleDeleteCalendarEvent}
          />
        ) : view === 'reports' ? (
          <ReportsView
            key="reports"
            registrations={registrations}
            courses1M={courses1M}
            courses2M={courses2M}
            getCourseTag={getCourseTag}
            globalData={globalData}
          />
        ) : view === 'formative-tracking' ? (
          <FormativeTrackingView
            key={`formative-${sharedCourse}`}
            courses1M={courses1M}
            courses2M={courses2M}
            globalData={globalData}
            formativeRegistrations={formativeRegistrations}
            setFormativeRegistrations={setFormativeRegistrations}
            getCourseTag={getCourseTag}
            initialCourse={sharedCourse}
            initialLevel={sharedLevel}
            dynamicGroups={studentGroups}
            onRefresh={() => fetchData(true, 'teams')}
            isRefreshing={loading}
          />
        ) : view === 'formative-evaluation' ? (
          <FormativeEvaluationView
            key={`formative-evaluation-${sharedCourse}`}
            courses1M={courses1M}
            courses2M={courses2M}
            globalData={globalData}
            formativeRegistrations={formativeRegistrations}
            formativeEvaluations={formativeEvaluations}
            setFormativeEvaluations={setFormativeEvaluations}
            getCourseTag={getCourseTag}
            initialCourse={sharedCourse}
            initialLevel={sharedLevel}
            dynamicGroups={studentGroups}
          />
        ) : view === 'muestra-publica' ? (
          <MuestraPublicaView
            key="muestra-publica"
            muestra={muestraPublica}
            setMuestra={setMuestraPublica}
            courses1M={courses1M}
            courses2M={courses2M}
            globalData={globalData}
            formativeRegistrations={formativeRegistrations}
            formativeEvaluations={formativeEvaluations}
            setFormativeEvaluations={setFormativeEvaluations}
            getCourseTag={getCourseTag}
            dynamicGroups={studentGroups}
            canEdit={currentUserRole === 'admin' || currentUserRole === 'editor'}
          />
        ) : view === 'dashboard-general' ? (
          <DashboardGeneralView
            key="dashboard-general"
            courses1M={courses1M}
            courses2M={courses2M}
            globalData={globalData}
            formativeRegistrations={formativeRegistrations}
            formativeEvaluations={formativeEvaluations}
            getCourseTag={getCourseTag}
            onNavigateToTracking={handleNavigateToTracking}
            onNavigateToEvaluation={handleNavigateToEvaluation}
            onNavigateToRiskRadar={() => setView('student-risk-radar')}
            dynamicGroups={studentGroups}
          />
        ) : view === 'student-risk-radar' ? (
          <StudentRiskRadarView
            courses1M={courses1M}
            courses2M={courses2M}
            globalData={globalData}
            formativeRegistrations={formativeRegistrations}
            formativeEvaluations={formativeEvaluations}
            setFormativeEvaluations={setFormativeEvaluations}
            getCourseTag={getCourseTag}
            onBackToDashboard={() => setView('dashboard-general')}
            dynamicGroups={studentGroups}
          />
        ) : view === 'acta-globalizacion' ? (
          <ActaGlobalizacionView
            key="acta-globalizacion"
            actas={actas}
            onSaveActas={persistActas}
            canEdit={currentUserRole === 'admin' || currentUserRole === 'editor'}
          />
        ) : view === 'student-profile' ? (
          <StudentProfileView
            key="student-profile"
            courses1M={courses1M}
            courses2M={courses2M}
            globalData={globalData}
            formativeRegistrations={formativeRegistrations}
            formativeEvaluations={formativeEvaluations}
            setFormativeEvaluations={setFormativeEvaluations}
            getCourseTag={getCourseTag}
            dynamicGroups={studentGroups}
          />
        ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedClass && (
          <ClassModal
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            activeCourse={activeCourse}
            registrations={registrations}
            handleRegisterStatus={handleRegisterStatus}
            getCourseTag={getCourseTag}
            observations={observations}
            setObservations={setObservations}
            handleSaveObservation={handleSaveObservation}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: lastRegisteredColor === 'green' ? 'rgba(6, 95, 70, 0.2)' :
                lastRegisteredColor === 'yellow' ? 'rgba(234, 179, 8, 0.2)' :
                  'rgba(153, 27, 27, 0.2)'
            }}
          >
            <motion.div
              className={`success-card ${lastRegisteredColor}`}
              initial={{ scale: 0.8, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
            >
              <div className="success-icon-wrapper">
                <CheckCircle2 size={56} className="success-icon" style={{ marginBottom: 0 }} />
              </div>
              <h2>{successInfo.title}</h2>
              <p>{successInfo.sub}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </motion.div>
  );
}
