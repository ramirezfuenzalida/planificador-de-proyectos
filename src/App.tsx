import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu,
  CheckCircle2
} from 'lucide-react';
import { useRef } from 'react';
import { supabase } from './lib/supabase';
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
import type { CalendarEvent } from './components/SmartCalendarView';
import { studentGroups2M } from './utils/studentGroups';

// ─── CONSTANTES DE AUTENTICACIÓN ────────────────────────────────────────────
const ADMIN_EMAIL = 'exequiel.ramirez@cmwt.cl';

// Permisos por defecto para cada rol al inicializar el sistema
const DEFAULT_MENU_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'courses', 'analytics', 'reports', 'formative-tracking',
    'tracking-history', 'smart-calendar', 'formative-evaluation',
    'dashboard-general', 'student-risk-radar', 'admin-panel'
  ],
  editor: [
    'courses', 'analytics', 'reports', 'formative-tracking',
    'tracking-history', 'smart-calendar', 'formative-evaluation',
    'dashboard-general', 'student-risk-radar'
  ],
  reader: [
    'courses', 'analytics', 'dashboard-general'
  ],
};

// Correos pre-autorizados (se usará como lista maestra de acceso)
// El administrador los puede gestionar desde el panel. Esta lista inicial
// se sincroniza con Supabase en la primera carga.
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
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);

  const lastSupabaseData = useRef<Record<string, string>>({});

  // ─── EFECTO: VERIFICAR SESIÓN SUPABASE AL INICIO ───────────────────────
  useEffect(() => {
    const initAuth = async () => {
      // Obtener sesión actual
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        setSession(existingSession);
        await loadRolesAndPermissions(existingSession.user.email?.toLowerCase() || '');
      }
      setAuthLoading(false);

      // Escuchar cambios de sesión (login / logout)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user?.email) {
          await loadRolesAndPermissions(newSession.user.email.toLowerCase());
        } else {
          setCurrentUserRole('reader');
        }
      });

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, []);

  // ─── CARGA DE DATOS PRINCIPAL (solo cuando hay sesión) ─────────────────
  useEffect(() => {
    if (!session) return;

    fetchData();
    const cleanup = loadAndSubscribe();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [session]);

  // ─── FUNCIÓN: CARGAR ROLES Y PERMISOS DESDE SUPABASE ──────────────────
  const loadRolesAndPermissions = async (userEmail: string) => {
    try {
      const { data } = await supabase.from('app_sync').select('*').in('key', ['teacherRoles', 'menuPermissions']);

      if (data) {
        const rolesRow = data.find(d => d.key === 'teacherRoles');
        const permsRow = data.find(d => d.key === 'menuPermissions');

        let roles = DEFAULT_TEACHER_ROLES;
        let perms = DEFAULT_MENU_PERMISSIONS;

        if (rolesRow?.data && Object.keys(rolesRow.data).length > 0) {
          roles = rolesRow.data;
        } else {
          // Inicializar en Supabase si no existen
          await supabase.from('app_sync').upsert({ key: 'teacherRoles', data: DEFAULT_TEACHER_ROLES });
        }

        if (permsRow?.data && Object.keys(permsRow.data).length > 0) {
          perms = permsRow.data;
        } else {
          // Inicializar permisos por defecto
          await supabase.from('app_sync').upsert({ key: 'menuPermissions', data: DEFAULT_MENU_PERMISSIONS });
        }

        setTeacherRoles(roles);
        setMenuPermissions(perms);

        // Admin siempre es admin sin importar lo que diga la DB
        const role = userEmail === ADMIN_EMAIL ? 'admin' : (roles[userEmail] || 'reader');
        setCurrentUserRole(role);
      }
    } catch (err) {
      console.error('Error loading roles:', err);
      // Fallback seguro
      const role = userEmail === ADMIN_EMAIL ? 'admin' : 'reader';
      setCurrentUserRole(role);
    }
  };

  // ─── SINCRONIZAR ROLES Y PERMISOS EN TIEMPO REAL ──────────────────────
  useEffect(() => {
    if (!session) return;

    const rolesChannel = supabase
      .channel('roles_perms_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_sync' }, async (payload: any) => {
        if (!payload.new) return;
        const { key, data } = payload.new;

        if (key === 'teacherRoles') {
          setTeacherRoles(data);
          const userEmail = session?.user?.email?.toLowerCase() || '';
          if (userEmail !== ADMIN_EMAIL) {
            const newRole = data[userEmail] || 'reader';
            setCurrentUserRole(newRole);
          }
        }
        if (key === 'menuPermissions') {
          setMenuPermissions(data);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(rolesChannel); };
  }, [session]);

  // ─── PERSISTIR ROLES CUANDO CAMBIAN (solo admin) ──────────────────────
  useEffect(() => {
    if (!session || currentUserRole !== 'admin') return;
    const key = 'teacherRoles';
    const dataStr = JSON.stringify(teacherRoles);
    if (dataStr !== lastSupabaseData.current[key]) {
      lastSupabaseData.current[key] = dataStr;
      const timer = setTimeout(() => {
        supabase.from('app_sync').upsert({ key, data: teacherRoles });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [teacherRoles, session, currentUserRole]);

  // ─── PERSISTIR PERMISOS CUANDO CAMBIAN (solo admin) ───────────────────
  useEffect(() => {
    if (!session || currentUserRole !== 'admin') return;
    const key = 'menuPermissions';
    const dataStr = JSON.stringify(menuPermissions);
    if (dataStr !== lastSupabaseData.current[key]) {
      lastSupabaseData.current[key] = dataStr;
      const timer = setTimeout(() => {
        supabase.from('app_sync').upsert({ key, data: menuPermissions });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [menuPermissions, session, currentUserRole]);

  // ─── SUSCRIPCIÓN PRINCIPAL (datos de planificación) ──────────────────
  const loadAndSubscribe = async () => {
    const { data: initialData } = await supabase.from('app_sync').select('*');

    if (initialData) {
      const regs = initialData.find(d => d.key === 'registrations')?.data;
      if (regs) {
        setRegistrations(regs);
        lastSupabaseData.current['registrations'] = JSON.stringify(regs);
        localStorage.setItem('zenit_regs', JSON.stringify(regs));
      }

      const formative = initialData.find(d => d.key === 'formativeRegistrations')?.data;
      if (formative) {
        setFormativeRegistrations(formative);
        lastSupabaseData.current['formativeRegistrations'] = JSON.stringify(formative);
        localStorage.setItem('zenit_formative_regs', JSON.stringify(formative));
      }

      const obs = initialData.find(d => d.key === 'observations')?.data;
      if (obs) {
        setObservations(obs);
        lastSupabaseData.current['observations'] = JSON.stringify(obs);
        localStorage.setItem('zenit_observations', JSON.stringify(obs));
      }

      const evaluations = initialData.find(d => d.key === 'formativeEvaluations')?.data;
      if (evaluations) {
        setFormativeEvaluations(evaluations);
        lastSupabaseData.current['formativeEvaluations'] = JSON.stringify(evaluations);
        localStorage.setItem('zenit_formative_evaluations', JSON.stringify(evaluations));
      }

      const calEvents = initialData.find(d => d.key === 'calendarEvents')?.data;
      if (calEvents) {
        setCustomEvents(calEvents);
        lastSupabaseData.current['calendarEvents'] = JSON.stringify(calEvents);
        localStorage.setItem('zenit_calendar_events', JSON.stringify(calEvents));
      }

      const groups = initialData.find(d => d.key === 'studentGroups')?.data;
      if (groups) {
        setStudentGroups(groups);
        lastSupabaseData.current['studentGroups'] = JSON.stringify(groups);
        localStorage.setItem('zenit_student_groups', JSON.stringify(groups));
      }
    } else {
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

    const channel = supabase
      .channel('app_sync_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_sync' }, (payload: any) => {
        if (!payload.new) return;
        const { key, data } = payload.new;
        const dataStr = JSON.stringify(data);

        lastSupabaseData.current[key] = dataStr;
        localStorage.setItem(
          `zenit_${
            key === 'registrations' ? 'regs' :
            key === 'formativeRegistrations' ? 'formative_regs' :
            key === 'formativeEvaluations' ? 'formative_evaluations' :
            key === 'calendarEvents' ? 'calendar_events' :
            key === 'studentGroups' ? 'student_groups' :
            'observations'
          }`,
          dataStr
        );

        if (key === 'registrations') setRegistrations(data);
        else if (key === 'formativeRegistrations') setFormativeRegistrations(data);
        else if (key === 'observations') setObservations(data);
        else if (key === 'formativeEvaluations') setFormativeEvaluations(data);
        else if (key === 'calendarEvents') setCustomEvents(data);
        else if (key === 'studentGroups') setStudentGroups(data);

        setLastSyncTime(new Date());
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  // ─── SINCRONIZACIÓN DE DATOS ──────────────────────────────────────────
  useEffect(() => {
    const dataStr = JSON.stringify(registrations);
    if (Object.keys(registrations).length > 0 && dataStr !== lastSupabaseData.current['registrations']) {
      lastSupabaseData.current['registrations'] = dataStr;
      localStorage.setItem('zenit_regs', dataStr);
      setIsSyncing(true);
      const timer = setTimeout(() => {
        supabase.from('app_sync').upsert({ key: 'registrations', data: registrations }).then(() => {
          setIsSyncing(false);
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [registrations]);

  useEffect(() => {
    const dataStr = JSON.stringify(formativeRegistrations);
    if (Object.keys(formativeRegistrations).length > 0 && dataStr !== lastSupabaseData.current['formativeRegistrations']) {
      lastSupabaseData.current['formativeRegistrations'] = dataStr;
      localStorage.setItem('zenit_formative_regs', dataStr);
      setIsSyncing(true);
      const timer = setTimeout(() => {
        supabase.from('app_sync').upsert({ key: 'formativeRegistrations', data: formativeRegistrations }).then(() => {
          setIsSyncing(false);
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formativeRegistrations]);

  useEffect(() => {
    const dataStr = JSON.stringify(observations);
    if (Object.keys(observations).length > 0 && dataStr !== lastSupabaseData.current['observations']) {
      lastSupabaseData.current['observations'] = dataStr;
      localStorage.setItem('zenit_observations', dataStr);
      setIsSyncing(true);
      const timer = setTimeout(() => {
        supabase.from('app_sync').upsert({ key: 'observations', data: observations }).then(() => {
          setIsSyncing(false);
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [observations]);

  useEffect(() => {
    const dataStr = JSON.stringify(formativeEvaluations);
    if (Object.keys(formativeEvaluations).length > 0 && dataStr !== lastSupabaseData.current['formativeEvaluations']) {
      lastSupabaseData.current['formativeEvaluations'] = dataStr;
      localStorage.setItem('zenit_formative_evaluations', dataStr);
      setIsSyncing(true);
      const timer = setTimeout(() => {
        supabase.from('app_sync').upsert({ key: 'formativeEvaluations', data: formativeEvaluations }).then(() => {
          setIsSyncing(false);
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formativeEvaluations]);

  useEffect(() => {
    const dataStr = JSON.stringify(customEvents);
    if (lastSupabaseData.current['calendarEvents'] !== undefined && dataStr !== lastSupabaseData.current['calendarEvents']) {
      lastSupabaseData.current['calendarEvents'] = dataStr;
      localStorage.setItem('zenit_calendar_events', dataStr);
      setIsSyncing(true);
      const timer = setTimeout(() => {
        supabase.from('app_sync').upsert({ key: 'calendarEvents', data: customEvents }).then(() => {
          setIsSyncing(false);
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [customEvents]);

  useEffect(() => {
    const dataStr = JSON.stringify(studentGroups);
    if (Object.keys(studentGroups).length > 0 && dataStr !== lastSupabaseData.current['studentGroups']) {
      lastSupabaseData.current['studentGroups'] = dataStr;
      localStorage.setItem('zenit_student_groups', dataStr);
      setIsSyncing(true);
      const timer = setTimeout(() => {
        supabase.from('app_sync').upsert({ key: 'studentGroups', data: studentGroups }).then(() => {
          setIsSyncing(false);
          setLastSyncTime(new Date());
        });
      }, 1000);
      return () => clearTimeout(timer);
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
    await supabase.auth.signOut();
    setSession(null);
    setCurrentUserRole('reader');
    setView('courses');
    localStorage.removeItem('zenit_regs');
    localStorage.removeItem('zenit_formative_regs');
    localStorage.removeItem('zenit_observations');
    localStorage.removeItem('zenit_formative_evaluations');
    localStorage.removeItem('zenit_calendar_events');
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

  const fetchData = async (isManual = false) => {
    setLoading(true);
    try {
      const PM_SHEET_ID = '1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc';
      const SM_SHEET_ID = '1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo';

      const fetchSheet = async (id: string, name: string) => {
        try {
          const response = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const text = await response.text();
          const json = JSON.parse(text.substring(47).slice(0, -2));
          const rows = json.table.rows;
          const cols = json.table.cols;

          return rows.map((r: any) => {
            const obj: any = {};
            r.c.forEach((cell: any, i: number) => {
              const val = cell ? (cell.f || cell.v || '') : '';
              if (cols[i] && cols[i].label) {
                const key = cols[i].label.toLowerCase().replace(/ /g, '_');
                obj[key] = val;
              } else {
                obj[`col_${i}`] = val;
              }
            });
            return obj;
          }).filter((clase: any) =>
            clase.clase &&
            clase.clase !== 'Clase' &&
            String(clase.clase).trim() !== ''
          );
        } catch (error) {
          console.error(`Error fetching sheet ${name}:`, error);
          throw error;
        }
      };

      const [pmData, smData] = await Promise.all([
        fetchSheet(PM_SHEET_ID, 'Primeros Medios'),
        fetchSheet(SM_SHEET_ID, 'Segundos Medios')
      ]);

      const normalize = (data: any[], type: 'pm' | 'sm') => data.map(item => {
        const rawLink = type === 'pm' ? (item.link_clase || item.col_12 || '') : (item.link_clase || item.col_11 || '');
        const rawDocente = type === 'pm' ? (item.docente_que_realiza_la_clase || item.col_14 || '') : (item.docente_que_realiza_la_clase || item.col_12 || '');

        const links = {
          canva: rawLink.includes('canva.com') || rawLink.includes('canva.link') ? rawLink : null,
          sites: rawLink.includes('sites.google.com') ? rawLink : null,
          ppt: rawLink.includes('docs.google.com/presentation') ? rawLink : null
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
          responsable: item.responsable || item.col_9 || '',
          horario: item.horario || item.horario_ || item.col_3 || '',
          dia: item.dia || item.dia_ || item.col_2 || '',
          hardware: item.solicitudes_informatica || item.col_11 || '',
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

      setGlobalData({
        pm: sortByDate(normalize(pmData, 'pm')),
        sm: sortByDate(normalize(smData, 'sm'))
      });

      if (isManual) {
        setToastMessage("¡Planificación actualizada exitosamente!");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (e) {
      console.error("Fetch failed", e);
      setToastMessage("Error al sincronizar con Google Sheets");
    } finally {
      setLoading(false);
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
        background: '#0a0518',
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
              boxShadow: '0 12px 36px rgba(124, 58, 237, 0.25)',
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
            50% { transform: scale(1.04); opacity: 1; filter: brightness(1.15) drop-shadow(0 0 24px rgba(124, 58, 237, 0.35)); }
          }
        `}</style>
      </div>
    );
  }

  // ─── PANTALLA DE LOGIN SI NO HAY SESIÓN ──────────────────────────────
  if (!session) {
    return (
      <LoginView
        onLoginSuccess={(newSession) => setSession(newSession)}
        authorizedEmails={teacherRoles}
      />
    );
  }

  // ─── PANTALLA DE CARGA DE DATOS AL INICIAR SESIÓN ────────────────────────
  const isDataEmpty = globalData.pm.length === 0 && globalData.sm.length === 0;
  if (session && loading && isDataEmpty) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0518',
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
              boxShadow: '0 12px 36px rgba(124, 58, 237, 0.25)',
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
            50% { transform: scale(1.04); opacity: 1; filter: brightness(1.15) drop-shadow(0 0 24px rgba(124, 58, 237, 0.35)); }
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
          onRefreshData={() => fetchData(true)}
          isLoadingData={loading}
          currentUserRole={currentUserRole}
          userEmail={session?.user?.email || ''}
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
        onRefreshData={() => fetchData(true)}
        isLoadingData={loading}
        currentUserRole={currentUserRole}
        userEmail={session?.user?.email || ''}
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
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
            onSyncGroups={setStudentGroups}
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
