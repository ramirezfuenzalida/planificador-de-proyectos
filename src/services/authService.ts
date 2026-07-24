import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail, createUserWithEmailAndPassword, type User,
} from 'firebase/auth';
import { auth, firebaseConfig } from '../lib/firebase';

export { traducirError } from './authErrors';

export async function iniciarSesion(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return cred.user;
}

export async function cerrarSesion(): Promise<void> {
  await signOut(auth);
}

export function alCambiarSesion(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function recuperarContrasena(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

/**
 * Crea la cuenta de un docente sin expulsar al administrador.
 *
 * createUserWithEmailAndPassword inicia sesión automáticamente con el usuario
 * recién creado. Para evitarlo se usa una segunda instancia de Firebase en
 * memoria, que se descarta al terminar: la sesión del administrador en la
 * instancia principal queda intacta.
 *
 * La alternativa (Cloud Functions con el Admin SDK) exige el plan Blaze.
 */
export async function crearCuentaDocente(email: string, password: string): Promise<void> {
  const secundaria = initializeApp(firebaseConfig, `alta-${Date.now()}`);
  try {
    const authSecundaria = getAuth(secundaria);
    await createUserWithEmailAndPassword(
      authSecundaria, email.trim().toLowerCase(), password,
    );
    await signOut(authSecundaria);
  } finally {
    await deleteApp(secundaria);
  }
}
