import { describe, it, expect } from 'vitest';
import { traducirError } from './authErrors';

describe('traducirError', () => {
  it('traduce los códigos conocidos de Firebase', () => {
    expect(traducirError('auth/invalid-credential')).toBe('Correo o contraseña incorrectos.');
    expect(traducirError('auth/user-not-found')).toBe('No existe una cuenta con ese correo.');
    expect(traducirError('auth/too-many-requests')).toBe(
      'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.',
    );
    expect(traducirError('auth/network-request-failed')).toBe(
      'Sin conexión. Revisa tu red e inténtalo de nuevo.',
    );
  });

  it('nunca devuelve el código crudo para un error desconocido', () => {
    const mensaje = traducirError('auth/algo-inesperado');
    expect(mensaje).not.toContain('auth/');
    expect(mensaje).toBe('Ocurrió un error inesperado. Inténtalo de nuevo.');
  });
});
