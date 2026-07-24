# Migración de Supabase a Firebase — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar el planificador del proyecto Supabase que comparte con `GESTION OSWT APP`, moviendo autenticación y datos a un proyecto Firebase propio.

**Architecture:** Todo Firebase queda detrás de dos servicios (`authService`, `dataService`) que exponen la misma forma de datos que la app usa hoy. Las cuatro colecciones que crecen se particionan por curso para evitar el límite de 1 MiB por documento de Firestore. El estado en React no cambia, de modo que vistas, cálculos y PDFs quedan intactos.

**Tech Stack:** React 19, TypeScript, Vite 8, Firebase 10 (Auth + Firestore), Vitest, Firebase Emulator Suite, Playwright.

## Global Constraints

- **No romper `GESTION OSWT APP`.** Es la restricción dura del proyecto. Ninguna operación sobre Supabase fuera de las especificadas en la Tarea 12.
- **Plan gratuito (Spark).** Prohibido usar Cloud Functions o el Admin SDK en servidor: exigen plan Blaze.
- **Credenciales solo en `.env.local`** (cubierto por `.gitignore` con el patrón `.env*.local`). Nunca hardcodeadas, a diferencia de `src/lib/supabase.ts` hoy.
- **Nunca solicitar la contraseña de Google del usuario.** El acceso operativo es vía `firebase login` (OAuth en el navegador del usuario).
- **Cursos válidos** como identificador de documento, exactos: `1 Medio A`, `1 Medio B`, `1 Medio C`, `1 Medio D`, `2 Medio A`, `2 Medio B`, `2 Medio C`, `2 Medio D`.
- **Correo del administrador:** `exequiel.ramirez@cmwt.cl` (constante `ADMIN_EMAIL` en `src/App.tsx:32`).
- **Documento de anomalías:** `_sin_curso`, para claves que no coincidan con ningún curso conocido.
- **Ningún mensaje de error en inglés** llega al usuario final.
- Especificación de referencia: `docs/superpowers/specs/2026-07-23-migracion-firebase-design.md`.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/lib/firebase.ts` | crear | Inicializa la app; exporta `auth` y `db`. Único archivo que importa `firebase/app`. |
| `src/services/dataService.ts` | crear (reemplaza `dbService.ts`) | Persistencia y partición por curso. |
| `src/services/partition.ts` | crear | Lógica pura de partición, sin dependencias de Firebase. Testeable en aislamiento. |
| `src/services/authService.ts` | crear | Sesión, recuperación de clave, alta de docentes, traducción de errores. |
| `src/services/monitoringService.ts` | modificar | `insert` de Supabase → `addDoc` de Firestore. |
| `src/services/dbService.ts` | eliminar | Sustituido por `dataService.ts`. |
| `src/lib/supabase.ts` | eliminar | — |
| `src/App.tsx` | modificar | Consume los servicios; se le quita el bypass de desarrollo. |
| `src/components/LoginView.tsx` | modificar | Auth por Firebase + recuperación de contraseña. |
| `src/components/AdminPanelView.tsx` | modificar | Alta de docentes. |
| `src/components/Sidebar.tsx` | modificar | Cierre de sesión. |
| `firestore.rules` | crear | Reglas de seguridad versionadas. |
| `firebase.json` | crear | Configuración de emuladores y despliegue de reglas. |
| `vitest.config.ts` | crear | Runner de pruebas unitarias. |

`partition.ts` se separa de `dataService.ts` a propósito: es lógica pura, es la parte con más riesgo de error sutil, y aislarla permite probarla sin emulador ni red.

---

## Tarea 0: Crear el proyecto Firebase (manual, la hace el usuario)

**Esta tarea no la ejecuta un agente.** Requiere la consola web y la cuenta Google del usuario.

- [ ] **Paso 1: Crear el proyecto**

En https://console.firebase.google.com → "Agregar proyecto" → nombre sugerido `zenitapp-planificador`. Desactivar Google Analytics (no se usa).

- [ ] **Paso 2: Habilitar Authentication**

Build → Authentication → "Comenzar" → pestaña "Sign-in method" → habilitar **Correo electrónico/contraseña**. No habilitar "Vínculo de correo electrónico".

- [ ] **Paso 3: Habilitar Firestore**

Build → Firestore Database → "Crear base de datos" → modo **producción** → ubicación
`southamerica-west1` (Santiago). Si no está disponible, `southamerica-east1` (São Paulo).

El modo producción deja la base cerrada; las reglas se suben en la Tarea 5. No usar modo
de prueba: deja la base abierta a cualquiera durante 30 días.

- [ ] **Paso 4: Registrar la app web y copiar la configuración**

Configuración del proyecto → "Tus apps" → icono web `</>` → apodo `zenitapp` → copiar el objeto `firebaseConfig`.

- [ ] **Paso 5: Crear la cuenta de administrador**

Authentication → Users → "Agregar usuario" → correo `exequiel.ramirez@cmwt.cl` y una contraseña. Esta es la cuenta con la que se verificará todo.

- [ ] **Paso 6: Autenticar la CLI**

```bash
npm install -g firebase-tools
firebase login
```

Abre el navegador del usuario. La CLI guarda un token de refresco local.

**Entregable:** el objeto `firebaseConfig` y una cuenta de administrador creada.

---

## Tarea 1: Infraestructura de pruebas y dependencias

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `firebase.json`
- Create: `.firebaserc`
- Modify: `.env.local`
- Create: `src/services/partition.test.ts`

**Interfaces:**
- Consumes: el `firebaseConfig` de la Tarea 0.
- Produces: `npm test` ejecuta Vitest; `npm run emulators` levanta Firestore y Auth locales.

- [ ] **Paso 1: Instalar dependencias**

```bash
npm install firebase
npm install -D vitest @firebase/rules-unit-testing
```

- [ ] **Paso 2: Agregar scripts a `package.json`**

En el objeto `"scripts"`, agregar:

```json
"test": "vitest run",
"test:watch": "vitest",
"emulators": "firebase emulators:start --only firestore,auth"
```

- [ ] **Paso 3: Crear `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

Además, excluir los archivos de prueba de la compilación de la app, para que
`noUnusedLocals` de `tsconfig.app.json` no falle sobre ellos. En `tsconfig.app.json`,
junto a `"include": ["src"]`, agregar:

```json
"exclude": ["src/**/*.test.ts"]
```

- [ ] **Paso 4: Crear `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

- [ ] **Paso 5: Crear `.firebaserc`**

Reemplazar `ID-DEL-PROYECTO` por el id real obtenido en la Tarea 0.

```json
{
  "projects": {
    "default": "ID-DEL-PROYECTO"
  }
}
```

- [ ] **Paso 6: Agregar las credenciales a `.env.local`**

Reemplazar cada valor por el correspondiente de `firebaseConfig` (Tarea 0, Paso 4):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

- [ ] **Paso 7: Escribir una prueba trivial que verifique el arnés**

Crear `src/services/partition.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('arnés de pruebas', () => {
  it('ejecuta pruebas', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Paso 8: Ejecutar y verificar que pasa**

Run: `npm test`
Expected: PASS, 1 prueba.

- [ ] **Paso 9: Verificar que los emuladores levantan**

Run: `npm run emulators`
Expected: arranca y muestra `Firestore: localhost:8080` y `Authentication: localhost:9099`. Detener con Ctrl+C.

- [ ] **Paso 10: Commit**

```bash
git add package.json package-lock.json vitest.config.ts firebase.json .firebaserc src/services/partition.test.ts
git commit -m "chore: infraestructura de pruebas y dependencias de Firebase"
```

---

## Tarea 2: Lógica de partición por curso

**Files:**
- Create: `src/services/partition.ts`
- Modify: `src/services/partition.test.ts`

**Interfaces:**
- Consumes: nada. Módulo puro, sin dependencias.
- Produces:
  - `COURSES: readonly string[]`
  - `PARTITIONED_KEYS: readonly string[]`
  - `SINGLE_DOC_KEYS: readonly string[]`
  - `UNKNOWN_COURSE_DOC: string`
  - `courseForKey(key: string): string`
  - `partitionByCourse(record: Record<string, unknown>): Record<string, Record<string, unknown>>`
  - `mergePartitions(parts: Record<string, Record<string, unknown>>): Record<string, unknown>`

- [ ] **Paso 1: Escribir las pruebas que fallan**

Reemplazar el contenido completo de `src/services/partition.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  courseForKey,
  partitionByCourse,
  mergePartitions,
  UNKNOWN_COURSE_DOC,
} from './partition';

describe('courseForKey', () => {
  it('reconoce el curso cuando es prefijo de la clave', () => {
    expect(courseForKey('1 Medio A-Clase 5')).toBe('1 Medio A');
    expect(courseForKey('2 Medio D-G3-est42')).toBe('2 Medio D');
  });

  it('prefiere la coincidencia más larga', () => {
    // Defiende contra un futuro curso "1 Medio A-1": la comparación es
    // contra la lista de cursos, no un corte en el primer guion.
    expect(courseForKey('1 Medio A-2026-03-15-Juan')).toBe('1 Medio A');
  });

  it('devuelve el documento de anomalías si no coincide ningún curso', () => {
    expect(courseForKey('curso inventado-x')).toBe(UNKNOWN_COURSE_DOC);
    expect(courseForKey('')).toBe(UNKNOWN_COURSE_DOC);
  });
});

describe('partitionByCourse', () => {
  it('agrupa las claves por curso', () => {
    const entrada = {
      '1 Medio A-c1': 'presente',
      '1 Medio A-c2': 'ausente',
      '2 Medio B-c1': 'presente',
    };
    expect(partitionByCourse(entrada)).toEqual({
      '1 Medio A': { '1 Medio A-c1': 'presente', '1 Medio A-c2': 'ausente' },
      '2 Medio B': { '2 Medio B-c1': 'presente' },
    });
  });

  it('manda las claves huérfanas al documento de anomalías', () => {
    expect(partitionByCourse({ 'basura-1': 'x' })).toEqual({
      [UNKNOWN_COURSE_DOC]: { 'basura-1': 'x' },
    });
  });

  it('devuelve un objeto vacío si no hay datos', () => {
    expect(partitionByCourse({})).toEqual({});
  });
});

describe('mergePartitions', () => {
  it('reensambla las particiones en un diccionario plano', () => {
    const partes = {
      '1 Medio A': { '1 Medio A-c1': 'presente' },
      '2 Medio B': { '2 Medio B-c1': 'ausente' },
    };
    expect(mergePartitions(partes)).toEqual({
      '1 Medio A-c1': 'presente',
      '2 Medio B-c1': 'ausente',
    });
  });

  it('es la inversa exacta de partitionByCourse', () => {
    const original = {
      '1 Medio A-c1': 'presente',
      '2 Medio D-G1-e9': 'ausente',
      'huerfana-x': 'raro',
    };
    expect(mergePartitions(partitionByCourse(original))).toEqual(original);
  });
});
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./partition"`.

- [ ] **Paso 3: Implementar `src/services/partition.ts`**

```typescript
/**
 * Lógica pura de partición por curso. Sin dependencias de Firebase, para
 * poder probarla en aislamiento.
 *
 * Las claves de asistencia, seguimiento, observaciones y evaluaciones llevan
 * siempre el curso como prefijo (`${curso}-${...}`). Derivamos el curso
 * comparando contra la lista conocida, NO cortando en el primer guion: cortar
 * por guion se rompería el día que un curso se llame "1 Medio A-1".
 */

export const COURSES = [
  '1 Medio A', '1 Medio B', '1 Medio C', '1 Medio D',
  '2 Medio A', '2 Medio B', '2 Medio C', '2 Medio D',
] as const;

/** Colecciones que crecen y se parten en un documento por curso. */
export const PARTITIONED_KEYS = [
  'registrations',
  'formativeRegistrations',
  'observations',
  'formativeEvaluations',
] as const;

/** Colecciones acotadas, que viven en un único documento de `app_sync`. */
export const SINGLE_DOC_KEYS = [
  'teacherRoles',
  'menuPermissions',
  'studentGroups',
  'calendarEvents',
] as const;

/** Destino de las claves que no coinciden con ningún curso conocido. */
export const UNKNOWN_COURSE_DOC = '_sin_curso';

/** Cursos ordenados de más largo a más corto, para que gane la coincidencia
 *  más específica si alguna vez un nombre es prefijo de otro. */
const CURSOS_POR_ESPECIFICIDAD = [...COURSES].sort((a, b) => b.length - a.length);

export function courseForKey(key: string): string {
  const encontrado = CURSOS_POR_ESPECIFICIDAD.find(curso => key.startsWith(curso));
  return encontrado ?? UNKNOWN_COURSE_DOC;
}

export function partitionByCourse(
  record: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  const salida: Record<string, Record<string, unknown>> = {};
  for (const [clave, valor] of Object.entries(record)) {
    const curso = courseForKey(clave);
    (salida[curso] ??= {})[clave] = valor;
  }
  return salida;
}

export function mergePartitions(
  parts: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  return Object.assign({}, ...Object.values(parts));
}
```

- [ ] **Paso 4: Ejecutar y verificar que pasan**

Run: `npm test`
Expected: PASS, 8 pruebas.

- [ ] **Paso 5: Commit**

```bash
git add src/services/partition.ts src/services/partition.test.ts
git commit -m "feat: lógica de partición por curso para Firestore"
```

---

## Tarea 3: Inicialización de Firebase

**Files:**
- Create: `src/lib/firebase.ts`

**Interfaces:**
- Consumes: variables `VITE_FIREBASE_*` de la Tarea 1.
- Produces: `app: FirebaseApp`, `auth: Auth`, `db: Firestore`, `firebaseConfig: FirebaseOptions`.

`firebaseConfig` se exporta porque `authService` lo necesita para crear la segunda instancia del alta de docentes (Tarea 5).

- [ ] **Paso 1: Crear `src/lib/firebase.ts`**

```typescript
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    'Faltan las variables VITE_FIREBASE_* en .env.local. ' +
    'Revisa docs/superpowers/plans/2026-07-23-migracion-firebase.md, Tarea 1, Paso 6.'
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

- [ ] **Paso 2: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Paso 3: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "feat: inicialización de Firebase desde variables de entorno"
```

---

## Tarea 4: dataService contra el emulador

**Files:**
- Create: `src/services/dataService.ts`
- Create: `src/services/dataService.test.ts`

**Interfaces:**
- Consumes: `partition.ts` (Tarea 2), `firebase.ts` (Tarea 3).
- Produces:
  - `loadAll(): Promise<Record<string, unknown>>` — diccionario con las 8 claves.
  - `save(key: string, data: Record<string, unknown>): Promise<void>`
  - `subscribe(cb: (key: string, data: Record<string, unknown>) => void): () => void`

Las pruebas usan el emulador, por lo que requieren `npm run emulators` corriendo en otra terminal.

- [ ] **Paso 1: Escribir las pruebas que fallan**

Crear `src/services/dataService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { initializeApp } from 'firebase/app';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, collection, getDocs,
} from 'firebase/firestore';
import { partitionByCourse, mergePartitions } from './partition';

// El emulador debe estar corriendo: `npm run emulators`
const app = initializeApp({ projectId: 'demo-zenit' }, `prueba-${Date.now()}`);
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

describe('particionado contra Firestore', () => {
  it('escribe un documento por curso y los reensambla al leer', async () => {
    const original = {
      '1 Medio A-c1': 'presente',
      '1 Medio A-c2': 'ausente',
      '2 Medio B-c1': 'presente',
    };

    const partes = partitionByCourse(original);
    for (const [curso, datos] of Object.entries(partes)) {
      await setDoc(doc(db, 'registrations', curso), { data: datos });
    }

    // Debe haber exactamente 2 documentos: uno por curso presente.
    const snap = await getDocs(collection(db, 'registrations'));
    expect(snap.size).toBe(2);

    const leido: Record<string, Record<string, unknown>> = {};
    snap.forEach(d => { leido[d.id] = d.data().data; });
    expect(mergePartitions(leido)).toEqual(original);
  });

  it('mantiene los cursos aislados: escribir uno no toca al otro', async () => {
    await setDoc(doc(db, 'registrations', '1 Medio A'), { data: { '1 Medio A-c1': 'x' } });
    await setDoc(doc(db, 'registrations', '2 Medio B'), { data: { '2 Medio B-c1': 'y' } });
    await setDoc(doc(db, 'registrations', '1 Medio A'), { data: { '1 Medio A-c1': 'z' } });

    const otro = await getDoc(doc(db, 'registrations', '2 Medio B'));
    expect(otro.data()?.data).toEqual({ '2 Medio B-c1': 'y' });
  });
});
```

- [ ] **Paso 2: Levantar el emulador y ejecutar**

En una terminal: `npm run emulators`
En otra: `npm test`
Expected: PASS, 2 pruebas nuevas.

- [ ] **Paso 3: Implementar `src/services/dataService.ts`**

```typescript
import {
  collection, doc, getDoc, getDocs, setDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  PARTITIONED_KEYS, SINGLE_DOC_KEYS, partitionByCourse, mergePartitions,
} from './partition';

const esParticionada = (key: string) =>
  (PARTITIONED_KEYS as readonly string[]).includes(key);

/**
 * Carga las 8 claves. Las particionadas se reensamblan en el mismo
 * diccionario plano que la app usa hoy, de modo que el estado de React
 * no cambia respecto de la versión con Supabase.
 */
export async function loadAll(): Promise<Record<string, unknown>> {
  const salida: Record<string, unknown> = {};

  for (const key of SINGLE_DOC_KEYS) {
    const snap = await getDoc(doc(db, 'app_sync', key));
    if (snap.exists()) salida[key] = snap.data().data;
  }

  for (const key of PARTITIONED_KEYS) {
    const snap = await getDocs(collection(db, key));
    const partes: Record<string, Record<string, unknown>> = {};
    snap.forEach(d => { partes[d.id] = d.data().data ?? {}; });
    salida[key] = mergePartitions(partes);
  }

  return salida;
}

/** Dirige la escritura al documento correcto según la clave. */
export async function save(
  key: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!esParticionada(key)) {
    await setDoc(doc(db, 'app_sync', key), { data });
    return;
  }
  const partes = partitionByCourse(data);
  await Promise.all(
    Object.entries(partes).map(([curso, datos]) =>
      setDoc(doc(db, key, curso), { data: datos }),
    ),
  );
}

/** Registra los onSnapshot y devuelve una función de limpieza. */
export function subscribe(
  cb: (key: string, data: Record<string, unknown>) => void,
): () => void {
  const bajas: Array<() => void> = [];

  for (const key of SINGLE_DOC_KEYS) {
    bajas.push(onSnapshot(doc(db, 'app_sync', key), snap => {
      if (snap.exists()) cb(key, snap.data().data);
    }));
  }

  for (const key of PARTITIONED_KEYS) {
    bajas.push(onSnapshot(collection(db, key), snap => {
      const partes: Record<string, Record<string, unknown>> = {};
      snap.forEach(d => { partes[d.id] = d.data().data ?? {}; });
      cb(key, mergePartitions(partes));
    }));
  }

  return () => bajas.forEach(baja => baja());
}
```

- [ ] **Paso 4: Verificar que compila y que las pruebas pasan**

Run: `npx tsc -b && npm test`
Expected: sin errores de tipos; todas las pruebas PASS.

- [ ] **Paso 5: Commit**

```bash
git add src/services/dataService.ts src/services/dataService.test.ts
git commit -m "feat: dataService con partición por curso sobre Firestore"
```

---

## Tarea 5: Reglas de seguridad

**Files:**
- Create: `firestore.rules`
- Create: `src/services/rules.test.ts`

**Interfaces:**
- Consumes: `firebase.json` (Tarea 1).
- Produces: reglas desplegables con `firebase deploy --only firestore:rules`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

Crear `src/services/rules.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const ADMIN = 'exequiel.ramirez@cmwt.cl';
let entorno: RulesTestEnvironment;

beforeAll(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-reglas',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => { await entorno.cleanup(); });

describe('reglas de Firestore', () => {
  it('rechaza a un usuario sin autenticar', async () => {
    const db = entorno.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'registrations', '1 Medio A')));
  });

  it('permite leer y escribir asistencia a un docente autenticado', async () => {
    const db = entorno.authenticatedContext('docente', { email: 'profe@cmwt.cl' }).firestore();
    await assertSucceeds(setDoc(doc(db, 'registrations', '1 Medio A'), { data: {} }));
    await assertSucceeds(getDoc(doc(db, 'registrations', '1 Medio A')));
  });

  it('impide que un docente modifique los roles', async () => {
    const db = entorno.authenticatedContext('docente', { email: 'profe@cmwt.cl' }).firestore();
    await assertFails(setDoc(doc(db, 'app_sync', 'teacherRoles'), { data: {} }));
  });

  it('permite al administrador modificar los roles', async () => {
    const db = entorno.authenticatedContext('admin', { email: ADMIN }).firestore();
    await assertSucceeds(setDoc(doc(db, 'app_sync', 'teacherRoles'), { data: {} }));
  });

  it('permite escribir logs sin autenticar pero no leerlos', async () => {
    const db = entorno.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'logs_auditoria', 'l1'), { msg: 'x' }));
    await assertFails(getDoc(doc(db, 'logs_auditoria', 'l1')));
  });
});
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `npm test`
Expected: FAIL — `firestore.rules` no existe.

- [ ] **Paso 3: Crear `firestore.rules`**

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function autenticado() {
      return request.auth != null;
    }

    function esAdmin() {
      return autenticado()
        && request.auth.token.email == 'exequiel.ramirez@cmwt.cl';
    }

    // Roles y permisos: solo el administrador escribe. Antes esto se
    // controlaba únicamente en el cliente, lo cual era cosmético.
    match /app_sync/teacherRoles {
      allow read: if autenticado();
      allow write: if esAdmin();
    }

    match /app_sync/menuPermissions {
      allow read: if autenticado();
      allow write: if esAdmin();
    }

    match /app_sync/{documento} {
      allow read, write: if autenticado();
    }

    match /registrations/{curso} {
      allow read, write: if autenticado();
    }

    match /formativeRegistrations/{curso} {
      allow read, write: if autenticado();
    }

    match /observations/{curso} {
      allow read, write: if autenticado();
    }

    match /formativeEvaluations/{curso} {
      allow read, write: if autenticado();
    }

    // Bitácora de errores: escritura abierta para poder registrar fallos
    // ocurridos antes del login; lectura solo para el administrador.
    match /logs_auditoria/{id} {
      allow create, write: if true;
      allow read: if esAdmin();
    }

    // Todo lo no declarado queda cerrado.
    match /{documento=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Paso 4: Ejecutar y verificar que pasan**

Run: `npm test`
Expected: PASS, 5 pruebas de reglas.

- [ ] **Paso 5: Desplegar las reglas**

Run: `firebase deploy --only firestore:rules`
Expected: `Deploy complete!`

- [ ] **Paso 6: Commit**

```bash
git add firestore.rules src/services/rules.test.ts
git commit -m "feat: reglas de seguridad de Firestore con roles verificados"
```

---

## Tarea 6: authService

**Files:**
- Create: `src/services/authService.ts`
- Create: `src/services/authService.test.ts`

**Interfaces:**
- Consumes: `firebase.ts` (Tarea 3).
- Produces:
  - `iniciarSesion(email: string, password: string): Promise<User>`
  - `cerrarSesion(): Promise<void>`
  - `alCambiarSesion(cb: (user: User | null) => void): () => void`
  - `recuperarContrasena(email: string): Promise<void>`
  - `crearCuentaDocente(email: string, password: string): Promise<void>`
  - `traducirError(codigo: string): string`

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `src/services/authService.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { traducirError } from './authService';

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
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./authService"`.

- [ ] **Paso 3: Implementar `src/services/authService.ts`**

```typescript
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail, createUserWithEmailAndPassword, type User,
} from 'firebase/auth';
import { auth, firebaseConfig } from '../lib/firebase';

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
```

- [ ] **Paso 4: Ejecutar y verificar que pasan**

Run: `npm test`
Expected: PASS, 2 pruebas nuevas.

- [ ] **Paso 5: Commit**

```bash
git add src/services/authService.ts src/services/authService.test.ts
git commit -m "feat: authService con errores en español y alta sin perder sesión"
```

---

## Tarea 7: monitoringService a Firestore

**Files:**
- Modify: `src/services/monitoringService.ts:80-92`

**Interfaces:**
- Consumes: `firebase.ts` (Tarea 3).
- Produces: sin cambios en su interfaz pública; solo cambia el destino de escritura.

- [ ] **Paso 1: Reemplazar el import de Supabase**

Quitar `import { supabase } from '../lib/supabase';` y poner:

```typescript
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
```

- [ ] **Paso 2: Reemplazar el bloque de inserción**

Sustituir el bloque `supabase.from('logs_auditoria').insert(logData)` por:

```typescript
    try {
      await addDoc(collection(db, 'logs_auditoria'), {
        ...logData,
        creado_en: serverTimestamp(),
      });
    } catch (e) {
      console.error('Fallo al registrar el log de auditoría en Firestore:', e);
    }
```

- [ ] **Paso 3: Verificar que compila**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Paso 4: Commit**

```bash
git add src/services/monitoringService.ts
git commit -m "refactor: registrar logs de auditoría en Firestore"
```

---

## Tarea 8: LoginView con Firebase y recuperación de contraseña

**Files:**
- Modify: `src/components/LoginView.tsx:1-44`

**Interfaces:**
- Consumes: `authService` (Tarea 6).
- Produces: la prop `authorizedEmails` **se elimina** de `LoginViewProps`. La Tarea 10 debe quitar su paso desde `App.tsx`.

- [ ] **Paso 1: Reemplazar imports y props**

Sustituir `import { supabase } from '../lib/supabase';` por:

```typescript
import { iniciarSesion, recuperarContrasena, traducirError } from '../services/authService';
```

Y la interfaz de props por:

```typescript
interface LoginViewProps {
  onLoginSuccess: (user: unknown) => void;
}
```

- [ ] **Paso 2: Reemplazar `handleLogin` completo**

Se elimina el auto-registro: era el origen del error engañoso "Invalid login credentials" y con altas desde el Panel de Admin deja de tener sentido.

```typescript
export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [aviso, setAviso]       = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAviso(null);
    if (!email.trim() || !password) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    try {
      const user = await iniciarSesion(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(traducirError(err?.code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async () => {
    setError(null);
    setAviso(null);
    if (!email.trim()) { setError('Escribe tu correo para enviarte el enlace.'); return; }
    setLoading(true);
    try {
      await recuperarContrasena(email);
      setAviso('Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.');
    } catch (err: any) {
      setError(traducirError(err?.code ?? ''));
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Paso 3: Agregar el enlace de recuperación bajo el botón "Ingresar"**

Insertar justo después del `</form>` de cierre:

```tsx
        <button
          type="button"
          onClick={handleRecuperar}
          disabled={loading}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(251,191,36,0.75)', fontSize: '0.75rem',
            fontFamily: "'Inter', sans-serif", fontWeight: 600,
            marginTop: 14, width: '100%', textAlign: 'center',
          }}
        >
          ¿Olvidaste tu contraseña?
        </button>
```

- [ ] **Paso 4: Mostrar el aviso de éxito**

Insertar junto al bloque de error existente, dentro del mismo `AnimatePresence`:

```tsx
          {aviso && (
            <motion.div
              className="lv-error"
              style={{
                background: 'rgba(16,185,129,0.1)',
                borderColor: 'rgba(16,185,129,0.2)',
                color: '#6ee7b7',
              }}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{aviso}</span>
            </motion.div>
          )}
```

- [ ] **Paso 5: Verificar que compila**

Run: `npx tsc -b`
Expected: un error esperado en `App.tsx`, porque aún pasa `authorizedEmails`. Se corrige en la Tarea 10.

- [ ] **Paso 6: Commit**

```bash
git add src/components/LoginView.tsx
git commit -m "feat: login con Firebase, recuperación de contraseña y errores en español"
```

---

## Tarea 9: Alta de docentes en el Panel de Admin

**Files:**
- Modify: `src/components/AdminPanelView.tsx`

**Interfaces:**
- Consumes: `crearCuentaDocente`, `traducirError` (Tarea 6).
- Produces: nada que otras tareas consuman.

- [ ] **Paso 1: Agregar el import**

```typescript
import { crearCuentaDocente, traducirError } from '../services/authService';
```

- [ ] **Paso 2: Agregar el estado del formulario**

Dentro del componente, junto a los estados existentes:

```typescript
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [nuevaClave, setNuevaClave] = useState('');
  const [altaError, setAltaError] = useState<string | null>(null);
  const [altaOk, setAltaOk] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
```

- [ ] **Paso 3: Agregar el manejador**

```typescript
  const handleCrearDocente = async () => {
    setAltaError(null);
    setAltaOk(null);
    if (!nuevoCorreo.trim() || nuevaClave.length < 6) {
      setAltaError('Ingresa un correo y una contraseña de al menos 6 caracteres.');
      return;
    }
    setCreando(true);
    try {
      await crearCuentaDocente(nuevoCorreo, nuevaClave);
      setAltaOk(`Cuenta creada para ${nuevoCorreo.trim().toLowerCase()}.`);
      setNuevoCorreo('');
      setNuevaClave('');
    } catch (err: any) {
      setAltaError(traducirError(err?.code ?? ''));
    } finally {
      setCreando(false);
    }
  };
```

- [ ] **Paso 4: Agregar el formulario en la sección de gestión de usuarios**

```tsx
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            type="email"
            placeholder="correo@cmwt.cl"
            value={nuevoCorreo}
            onChange={e => setNuevoCorreo(e.target.value)}
            disabled={creando}
          />
          <input
            type="password"
            placeholder="Contraseña inicial"
            value={nuevaClave}
            onChange={e => setNuevaClave(e.target.value)}
            disabled={creando}
          />
          <button onClick={handleCrearDocente} disabled={creando}>
            {creando ? 'Creando...' : 'Crear cuenta'}
          </button>
        </div>
        {altaError && <p style={{ color: '#dc2626', fontSize: '0.8rem' }}>{altaError}</p>}
        {altaOk && <p style={{ color: '#059669', fontSize: '0.8rem' }}>{altaOk}</p>}
```

- [ ] **Paso 5: Verificar que compila**

Run: `npx tsc -b`
Expected: solo el error pendiente de `App.tsx` de la Tarea 8.

- [ ] **Paso 6: Commit**

```bash
git add src/components/AdminPanelView.tsx
git commit -m "feat: alta de cuentas de docentes desde el Panel de Admin"
```

---

## Tarea 10: Conectar App.tsx y Sidebar, y retirar Supabase

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Delete: `src/lib/supabase.ts`
- Delete: `src/services/dbService.ts`
- Modify: `package.json`
- Modify: `.env.local`

**Interfaces:**
- Consumes: `authService` (Tarea 6), `dataService` (Tarea 4), `LoginView` sin `authorizedEmails` (Tarea 8).
- Produces: la app completa funcionando sobre Firebase.

- [ ] **Paso 1: Reemplazar imports en `App.tsx`**

Quitar `import { supabase } from './lib/supabase';` y poner:

```typescript
import { alCambiarSesion, cerrarSesion } from './services/authService';
import { loadAll, save, subscribe } from './services/dataService';
```

- [ ] **Paso 2: Eliminar el bypass de desarrollo**

Borrar por completo el bloque de constantes `DEV_BYPASS_AUTH` y `DEV_SESSION`, y el bloque `if (DEV_BYPASS_AUTH) { ... }` dentro de `initAuth`. Restaurar:

```typescript
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
```

Con recuperación de contraseña operativa, el bypass deja de ser necesario.

- [ ] **Paso 3: Reemplazar `initAuth`**

```typescript
  useEffect(() => {
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
  }, []);
```

`onAuthStateChanged` dispara también en la carga inicial, de modo que sustituye a `getSession` y al listener en una sola llamada.

- [ ] **Paso 4: Sustituir cada `supabase.from('app_sync').upsert({ key, data })`**

Reemplazar todas las ocurrencias por:

```typescript
save(key, data);
```

Y cada lectura `supabase.from('app_sync').select(...)` por `await loadAll()`.

- [ ] **Paso 5: Sustituir las 4 suscripciones realtime**

Reemplazar los bloques `supabase.channel(...).on('postgres_changes', ...)` por una sola:

```typescript
  useEffect(() => {
    if (!session) return;
    return subscribe((key, data) => {
      if (key === 'registrations') setRegistrations(data as Record<string, string>);
      if (key === 'formativeRegistrations') setFormativeRegistrations(data as Record<string, any>);
      if (key === 'formativeEvaluations') setFormativeEvaluations(data as Record<string, any>);
      if (key === 'observations') setObservations(data as Record<string, string>);
      if (key === 'calendarEvents') setCustomEvents(data as any);
      if (key === 'studentGroups') setStudentGroups(data as Record<string, any>);
      if (key === 'teacherRoles') setTeacherRoles(data as Record<string, string>);
      if (key === 'menuPermissions') setMenuPermissions(data as Record<string, string[]>);
    });
  }, [session]);
```

- [ ] **Paso 6: Quitar la prop `authorizedEmails` de `LoginView`**

```tsx
      <LoginView onLoginSuccess={(user) => setSession(user)} />
```

- [ ] **Paso 7: Renombrar `lastSupabaseData` a `lastRemoteData`**

Run: `grep -rn "lastSupabaseData" src` y renombrar todas las ocurrencias.

- [ ] **Paso 8: Actualizar `Sidebar.tsx`**

Reemplazar el import de supabase por `import { cerrarSesion } from '../services/authService';` y la llamada `supabase.auth.signOut()` por `cerrarSesion()`.

- [ ] **Paso 9: Eliminar los archivos de Supabase y la dependencia**

```bash
rm src/lib/supabase.ts src/services/dbService.ts
npm uninstall @supabase/supabase-js
```

- [ ] **Paso 10: Quitar la variable del bypass de `.env.local`**

Borrar la línea `VITE_AUTH_BYPASS=true` y sus dos comentarios.

- [ ] **Paso 11: Verificar que no queda rastro de Supabase**

Run: `grep -rn "supabase" src/ ; echo "---"; npx tsc -b && npm run build`
Expected: `grep` sin resultados; compilación y build sin errores.

- [ ] **Paso 12: Commit**

```bash
git add -A
git commit -m "refactor: migrar la aplicación de Supabase a Firebase"
```

---

## Tarea 11: Verificación end-to-end

**Files:**
- Create: `tests/firebase-auth.spec.ts`

**Interfaces:**
- Consumes: la app completa (Tarea 10).
- Produces: evidencia de que los criterios de aceptación se cumplen.

- [ ] **Paso 1: Escribir la prueba end-to-end**

Crear `tests/firebase-auth.spec.ts`. Requiere la cuenta de administrador creada en la Tarea 0, Paso 5, con su contraseña en la variable de entorno `E2E_ADMIN_PASSWORD`.

```typescript
import { test, expect } from '@playwright/test';

const ADMIN = 'exequiel.ramirez@cmwt.cl';
const CLAVE = process.env.E2E_ADMIN_PASSWORD;

test('muestra el login y rechaza credenciales inválidas en español', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('correo@cmwt.cl')).toBeVisible();

  await page.getByPlaceholder('correo@cmwt.cl').fill(ADMIN);
  await page.getByPlaceholder('••••••••••').fill('clave-incorrecta-zzz');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
  // Ningún mensaje crudo de Firebase debe aparecer.
  await expect(page.locator('body')).not.toContainText('auth/');
});

test('el administrador entra y ve el panel completo', async ({ page }) => {
  test.skip(!CLAVE, 'Define E2E_ADMIN_PASSWORD para ejecutar esta prueba.');

  await page.goto('/');
  await page.getByPlaceholder('correo@cmwt.cl').fill(ADMIN);
  await page.getByPlaceholder('••••••••••').fill(CLAVE!);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page.getByText('Panel de Admin')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('ADMINISTRADOR')).toBeVisible();
});

test('ofrece recuperar la contraseña', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('correo@cmwt.cl').fill(ADMIN);
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page.getByText(/enlace para restablecer/i)).toBeVisible();
});
```

- [ ] **Paso 2: Ejecutar**

```bash
E2E_ADMIN_PASSWORD='<la contraseña de la Tarea 0>' npx playwright test tests/firebase-auth.spec.ts
```

Expected: 3 pruebas PASS.

- [ ] **Paso 3: Verificación manual de los criterios de aceptación**

Con `npm run dev` corriendo, confirmar uno por uno:

1. Login real con la cuenta de administrador. ✅
2. Registrar asistencia, recargar la página, y que el dato persista. ✅
3. Abrir dos pestañas, cambiar algo en una y ver el cambio en la otra sin recargar. ✅
4. Crear un docente de prueba desde el Panel de Admin **sin perder la sesión de administrador**. ✅
5. Verificar en la consola de Firebase que `registrations` tiene un documento por curso, no uno solo. ✅

- [ ] **Paso 4: Commit**

```bash
git add tests/firebase-auth.spec.ts
git commit -m "test: verificación end-to-end de la autenticación con Firebase"
```

---

## Tarea 12: Limpieza de Supabase (manual, tras verificación)

**No ejecutar hasta que el usuario confirme que la app funciona en uso real durante algunos días.**

**Restricción dura: no romper `GESTION OSWT APP`.** Verificación ya realizada: OSWT usa 23 tablas y ninguna es `app_sync` ni `logs_auditoria`. OSWT referencia `Logs_Auditoria` (con mayúsculas), que es otra tabla distinta.

- [ ] **Paso 1: Reconfirmar que OSWT no usa las tablas**

```bash
grep -rn "app_sync\|logs_auditoria" "/Users/orquestasinfonicaw.t./GESTION OSWT APP" --exclude-dir=node_modules
```

Expected: sin resultados. **Si aparece algo, detenerse y avisar al usuario.**

- [ ] **Paso 2: Listar las cuentas antes de borrar**

En el dashboard de `oswtapp` → Authentication → Users. Anotar cuáles pertenecen al planificador. **Nada de borrados masivos.**

- [ ] **Paso 3: Eliminar las tablas**

En el SQL Editor del proyecto `oswtapp`:

```sql
DROP TABLE IF EXISTS app_sync;
DROP TABLE IF EXISTS logs_auditoria;
```

- [ ] **Paso 4: Eliminar solo las cuentas del planificador**

Una por una, desde Authentication → Users, usando la lista del Paso 2.

- [ ] **Paso 5: Verificar que OSWT sigue funcionando**

Abrir `GESTION OSWT APP` y confirmar que carga y opera con normalidad.

---

## Notas finales

- Los Google Sheets siguen siendo la fuente de la planificación pedagógica. No se tocan.
- No se hace *code splitting* (`React.lazy`) ni se unifican los imports duplicados de jsPDF. Son mejoras reales, pero de otro trabajo.
- `GESTION OSWT APP` referencia `Logs_Auditoria` y `students`, y ambas devuelven HTTP 404. Esas referencias están rotas en esa aplicación; queda registrado para revisión futura.
