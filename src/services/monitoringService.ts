import * as Sentry from '@sentry/react';
import { supabase } from '../lib/supabase';

// Variable de entorno para Sentry
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

// Inicialización de Sentry solo si existe el DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Ajustes de rendimiento en producción
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
  console.log('Sentry inicializado correctamente.');
} else {
  console.log('Sentry DSN no configurado. El monitoreo de errores se guardará localmente en logs_auditoria de Supabase.');
}

export interface ErrorDetails {
  componentName?: string;
  eventoDisparador?: string;
  excepcionCausa?: string;
}

export const monitoringService = {
  /**
   * Captura una excepción y registra el diagnóstico completo en Supabase y Sentry
   */
  async logError(error: Error | any, details: ErrorDetails = {}) {
    const errorName = error?.name || 'Error';
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || 'No stack trace available';
    const errorCausa = details.excepcionCausa || (error?.cause ? String(error.cause) : 'N/A');

    // Datos del cliente del navegador
    const userAgent = navigator.userAgent;
    const connectionType = (navigator as any).connection?.effectiveType || 'desconocida';
    const resolution = `${window.innerWidth}x${window.innerHeight}`;
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;

    let userId = null;
    let userRole = null;

    try {
      // Intentar obtener la sesión activa de Supabase de manera segura
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!sessionError && session?.user) {
        userId = session.user.id;
        userRole = session.user.user_metadata?.role || 'reader';
      }
    } catch (e) {
      console.error('Error al intentar obtener la sesión de Supabase:', e);
    }

    // Preparar el log de auditoría
    const logData = {
      uid: userId,
      rol: userRole,
      seccion: currentPath,
      ruta_url: currentUrl,
      componente_origen: details.componentName || 'App',
      evento_disparador: details.eventoDisparador || 'excepcion_front',
      excepcion_nombre: errorName,
      excepcion_mensaje: errorMessage,
      excepcion_stack: errorStack,
      excepcion_causa: errorCausa,
      client_user_agent: userAgent,
      client_conexion: connectionType,
      client_resolucion: resolution,
    };

    // 1. Guardar en Supabase (Backend colector primario)
    try {
      // Como logs_auditoria permite inserción pública, esto no fallará por autenticación
      const { error: dbError } = await supabase
        .from('logs_auditoria')
        .insert(logData);

      if (dbError) {
        console.error('Error al guardar log de auditoría en Supabase:', dbError);
      } else {
        console.log('Log de auditoría guardado con éxito en Supabase.');
      }
    } catch (e) {
      console.error('Fallo en la llamada de red a Supabase para registrar el log:', e);
    }

    // 2. Reportar a Sentry
    if (SENTRY_DSN) {
      Sentry.withScope((scope) => {
        // Enviar contexto sin exponer PII (datos personales) sensibles como emails
        scope.setTag('component_origin', details.componentName || 'Unknown');
        scope.setTag('trigger_event', details.eventoDisparador || 'Unknown');
        scope.setTag('connection_type', connectionType);
        scope.setTag('resolution', resolution);
        scope.setTag('url', currentUrl);
        
        scope.setUser({
          id: userId || 'anonymous',
          role: userRole || 'anonymous',
        });

        scope.setExtras({
          path: currentPath,
          causa: errorCausa,
        });

        Sentry.captureException(error);
      });
    }

    // Mostrar el error por consola para desarrollo
    console.error(`[Monitoreo] Error capturado: ${errorName} - ${errorMessage}`, error);
  }
};
