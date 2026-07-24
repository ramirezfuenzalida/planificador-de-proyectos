import { supabase } from '../lib/supabase';
import type { Clase, GlobalData, SyncPayload } from '../types';

export const dbService = {
  /**
   * Carga inicial de datos de sincronización desde Supabase (app_sync)
   */
  async loadInitialSyncData(): Promise<SyncPayload[] | null> {
    try {
      const { data, error } = await supabase.from('app_sync').select('*');
      if (error) throw error;
      return data as SyncPayload[];
    } catch (err) {
      console.error('Error in loadInitialSyncData:', err);
      return null;
    }
  },

  /**
   * Carga inicial de roles y permisos desde Supabase
   */
  async loadRolesAndPermissions(): Promise<SyncPayload[] | null> {
    try {
      const { data, error } = await supabase
        .from('app_sync')
        .select('*')
        .in('key', ['teacherRoles', 'menuPermissions']);
      if (error) throw error;
      return data as SyncPayload[];
    } catch (err) {
      console.error('Error in loadRolesAndPermissions:', err);
      return null;
    }
  },

  /**
   * Suscribirse a cambios en tiempo real en la tabla app_sync
   */
  subscribeToSyncChanges(callback: (payload: any) => void) {
    const channel = supabase
      .channel('app_sync_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_sync' }, (payload) => {
        callback(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Suscribirse a cambios en tiempo real de roles y permisos en app_sync
   */
  subscribeToRolesChanges(callback: (payload: any) => void) {
    const channel = supabase
      .channel('roles_perms_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_sync' }, (payload) => {
        callback(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Guardar datos de sincronización en Supabase (upsert)
   */
  async saveSyncData(key: string, data: any): Promise<{ data: any; error: any }> {
    return supabase.from('app_sync').upsert({ key, data });
  },

  /**
   * Cargar y normalizar datos de planificación pedagógica desde Google Sheets con Caché de 5 minutos
   */
  async fetchPlanningSheets(isManual = false): Promise<GlobalData> {
    const PM_SHEET_ID = '1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc';
    const SM_SHEET_ID = '1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo';

    const CACHE_KEY = 'zenit_sheets_cache';
    const CACHE_TIME_KEY = 'zenit_sheets_cache_time';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
    const now = Date.now();

    // Si no es refresco manual y el cache es válido, consumirlo inmediatamente
    if (!isManual && cachedData && cachedTime && (now - Number(cachedTime) < CACHE_TTL)) {
      try {
        return JSON.parse(cachedData) as GlobalData;
      } catch (e) {
        console.error('Error parsing sheets cache, refetching...', e);
      }
    }

    const fetchSheet = async (id: string, name: string): Promise<any[]> => {
      try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json`);
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("UNAUTHORIZED");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const startIdx = text.indexOf('{');
        const endIdx = text.lastIndexOf('}');
        if (startIdx === -1 || endIdx === -1) {
          throw new Error('Formato de respuesta de Google Sheets no válido');
        }
        const json = JSON.parse(text.substring(startIdx, endIdx + 1));
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


    const normalize = (data: any[], type: 'pm' | 'sm'): Clase[] => data.map(item => {
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

    const sortByDate = (arr: Clase[]): Clase[] => arr.sort((a, b) => {
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

    const freshData: GlobalData = {
      pm: sortByDate(normalize(pmData, 'pm')),
      sm: sortByDate(normalize(smData, 'sm'))
    };

    // Actualizar caché local
    localStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
    localStorage.setItem(CACHE_TIME_KEY, now.toString());

    return freshData;
  }
};
