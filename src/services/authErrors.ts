/**
 * Traducción de códigos de error de Firebase Auth a mensajes en español.
 *
 * Módulo puro, sin dependencias de Firebase, para poder probarlo en aislamiento
 * sin inicializar la app (que requiere las variables VITE_FIREBASE_* del
 * entorno del navegador).
 */

const MENSAJES: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'No existe una cuenta con ese correo.',
  'auth/invalid-email': 'El correo no tiene un formato válido.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada. Contacta al administrador.',
  'auth/too-many-requests':
    'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
};

/** Ningún mensaje en inglés llega al usuario final. */
export function traducirError(codigo: string): string {
  return MENSAJES[codigo] ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
