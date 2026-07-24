import * as Sentry from '@sentry/react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

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
  console.log('Sentry DSN no configurado. El monitoreo de errores se guardará en logs_auditoria de Firestore.');
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
      // Obtener el usuario autenticado de Firebase de manera segura
      const user = auth.currentUser;
      if (user) {
        userId = user.uid;
        userRole = 'reader';
      }
    } catch (e) {
      console.error('Error al intentar obtener la sesión de Firebase:', e);
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

    // 1. Guardar en Firestore (Backend colector primario)
    try {
      // La colección logs_auditoria permite escritura pública en las reglas,
      // de modo que esto no falla por autenticación.
      await addDoc(collection(db, 'logs_auditoria'), {
        ...logData,
        creado_en: serverTimestamp(),
      });
    } catch (e) {
      console.error('Fallo al registrar el log de auditoría en Firestore:', e);
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
