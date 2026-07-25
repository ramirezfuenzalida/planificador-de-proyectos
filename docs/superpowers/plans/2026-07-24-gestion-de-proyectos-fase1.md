# Gestión de Proyectos — Fase 1 (cambio de proyecto) — Plan

> **Para ejecutar:** implementar tarea por tarea, con verificación en cada paso.
> Casillas `- [ ]` para seguimiento.

**Goal:** Manejar 3 proyectos (STEAM/SAE/Transversal) con nombre propio, cambiar el activo
desde el Panel de Admin, leer las planillas del proyecto activo y mantener los datos de
seguimiento **separados por proyecto**. El nombre del proyecto activo aparece en la portada.

**Architecture:** Un objeto de configuración `projectsConfig` (global, en Firebase, admin-write)
guarda los 3 proyectos y cuál está activo. `dataService` se vuelve "project-aware": las claves
de seguimiento se guardan/leen con el id del proyecto en la ruta de Firestore, sin cambiar el
formato interno de las claves. `fetchData` usa los Sheets del proyecto activo.

**Tech Stack:** React 19, TypeScript, Vite, Firebase (Firestore), Vitest.

## Global Constraints

- Tipos de proyecto fijos: `STEAM`, `SAE`, `Transversal`. Cada uno con **nombre propio** libre.
- 2 Sheets por proyecto (Primeros `sheetPM`, Segundos `sheetSM`); el usuario pega el URL y la app extrae el ID.
- Selector + config **solo admin**, dentro de `AdminPanelView`.
- Datos de seguimiento **separados por proyecto**; STEAM = las planillas hardcodeadas actuales.
- Claves globales: `teacherRoles`, `menuPermissions`, `studentGroups`, `projectsConfig`.
- Claves por proyecto: `registrations`, `formativeRegistrations`, `observations`, `formativeEvaluations`, `calendarEvents`.
- No cambiar el parseo de columnas de las planillas ni el rediseño cósmico.
- IDs actuales (→ STEAM): PM `1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc`, SM `1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo`.
- Spec: `docs/superpowers/specs/2026-07-24-gestion-de-proyectos-design.md`.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/utils/sheets.ts` | crear | `extractSheetId(url)`: saca el ID de un URL de Sheets. Puro, testeable. |
| `src/services/projectScope.ts` | crear | Helpers puros de rutas por proyecto (doc ids). Testeable sin Firebase. |
| `src/services/partition.ts` | modificar | Agregar `projectsConfig` a claves globales; exportar sets de claves scoped. |
| `src/services/dataService.ts` | modificar | `setActiveProject(id)` + rutas scoped en load/save/subscribe. |
| `src/types/index.ts` | modificar | Tipos `ProjectType`, `Project`, `ProjectsConfig` + defaults. |
| `src/App.tsx` | modificar | Cargar config, estado de proyecto activo, `fetchData` con Sheets activos, re-suscribir al cambiar. |
| `src/components/AdminPanelView.tsx` | modificar | Sección "Gestión de Proyectos": tipo + nombre + 2 links + selector activo. |
| `src/components/DashboardView.tsx` | modificar | Mostrar nombre/tipo del proyecto activo en la portada. |
| `src/components/Sidebar.tsx` | modificar | Indicador de solo lectura del proyecto activo. |
| `firestore.rules` | modificar | `projectsConfig` escribible solo por admin. |

---

## Tarea 1: Utilidad extractSheetId

**Files:** crear `src/utils/sheets.ts`, `src/utils/sheets.test.ts`

**Produces:** `extractSheetId(input: string): string` — devuelve el ID desde un URL de Sheets,
o el mismo string si ya parece un ID, o `''` si no es válido.

- [ ] **Paso 1: Prueba que falla** — `src/utils/sheets.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { extractSheetId } from './sheets';

describe('extractSheetId', () => {
  it('extrae el id de un URL completo', () => {
    expect(extractSheetId('https://docs.google.com/spreadsheets/d/1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc/edit#gid=0'))
      .toBe('1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc');
  });
  it('acepta un id pelado', () => {
    expect(extractSheetId('1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo'))
      .toBe('1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo');
  });
  it('devuelve vacío para basura', () => {
    expect(extractSheetId('no es un link')).toBe('');
    expect(extractSheetId('')).toBe('');
  });
});
```

- [ ] **Paso 2:** `npm test` → FAIL (no existe el módulo).
- [ ] **Paso 3: Implementar** `src/utils/sheets.ts`

```typescript
/** Extrae el ID de un URL de Google Sheets. Acepta también un ID pelado. */
export function extractSheetId(input: string): string {
  const s = (input || '').trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  // Un ID de Sheets es una cadena larga sin espacios ni barras.
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return '';
}
```

- [ ] **Paso 4:** `npm test` → PASS.
- [ ] **Paso 5:** commit `feat: util extractSheetId para links de Sheets`.

---

## Tarea 2: Helpers de ruta por proyecto (puros)

**Files:** crear `src/services/projectScope.ts`, `src/services/projectScope.test.ts`

**Produces:**
- `PROJECT_SCOPED_PARTITIONED: readonly string[]` = registrations, formativeRegistrations, observations, formativeEvaluations
- `PROJECT_SCOPED_SINGLE: readonly string[]` = calendarEvents
- `GLOBAL_SINGLE: readonly string[]` = teacherRoles, menuPermissions, studentGroups, projectsConfig
- `scopedPartDocId(projectId, curso): string` → `` `${projectId}__${curso}` ``
- `cursoFromScopedDocId(projectId, docId): string | null` → curso si el doc pertenece al proyecto, si no `null`
- `scopedSingleDocId(key, projectId): string` → `` `${key}__${projectId}` ``

- [ ] **Paso 1: Prueba que falla** — `src/services/projectScope.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { scopedPartDocId, cursoFromScopedDocId, scopedSingleDocId } from './projectScope';

describe('rutas por proyecto', () => {
  it('construye el doc id particionado con proyecto', () => {
    expect(scopedPartDocId('sae', '1 Medio A')).toBe('sae__1 Medio A');
  });
  it('recupera el curso solo si el doc es del proyecto activo', () => {
    expect(cursoFromScopedDocId('sae', 'sae__1 Medio A')).toBe('1 Medio A');
    expect(cursoFromScopedDocId('sae', 'steam__1 Medio A')).toBeNull();
  });
  it('construye el doc id de clave única con proyecto', () => {
    expect(scopedSingleDocId('calendarEvents', 'steam')).toBe('calendarEvents__steam');
  });
});
```

- [ ] **Paso 2:** `npm test` → FAIL.
- [ ] **Paso 3: Implementar** `src/services/projectScope.ts`

```typescript
export const PROJECT_SCOPED_PARTITIONED = [
  'registrations', 'formativeRegistrations', 'observations', 'formativeEvaluations',
] as const;
export const PROJECT_SCOPED_SINGLE = ['calendarEvents'] as const;
export const GLOBAL_SINGLE = [
  'teacherRoles', 'menuPermissions', 'studentGroups', 'projectsConfig',
] as const;

const SEP = '__';

export function scopedPartDocId(projectId: string, curso: string): string {
  return `${projectId}${SEP}${curso}`;
}
export function cursoFromScopedDocId(projectId: string, docId: string): string | null {
  const prefijo = `${projectId}${SEP}`;
  return docId.startsWith(prefijo) ? docId.slice(prefijo.length) : null;
}
export function scopedSingleDocId(key: string, projectId: string): string {
  return `${key}${SEP}${projectId}`;
}
```

- [ ] **Paso 4:** `npm test` → PASS.
- [ ] **Paso 5:** commit `feat: helpers puros de rutas por proyecto`.

---

## Tarea 3: Tipos y defaults de proyectos

**Files:** modificar `src/types/index.ts`

**Produces:** `ProjectType`, `Project`, `ProjectsConfig`, `DEFAULT_PROJECTS_CONFIG`.

- [ ] **Paso 1: Agregar tipos** al final de `src/types/index.ts`

```typescript
export type ProjectType = 'STEAM' | 'SAE' | 'Transversal';

export interface Project {
  id: string;          // 'steam' | 'sae' | 'transversal'
  type: ProjectType;   // categoría fija
  name: string;        // nombre propio, ej. 'Humberstone VIVE' (si vacío, se muestra el tipo)
  sheetPM: string;     // ID de la planilla Primeros
  sheetSM: string;     // ID de la planilla Segundos
}

export interface ProjectsConfig {
  projects: Project[];
  activeProjectId: string;
}

export const DEFAULT_PROJECTS_CONFIG: ProjectsConfig = {
  projects: [
    { id: 'steam', type: 'STEAM', name: '', sheetPM: '1i3s_Qwcw0tJv9hxfIrWsrPMhztB5lv88NcAa0aOQwcc', sheetSM: '1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo' },
    { id: 'sae', type: 'SAE', name: '', sheetPM: '', sheetSM: '' },
    { id: 'transversal', type: 'Transversal', name: '', sheetPM: '', sheetSM: '' },
  ],
  activeProjectId: 'steam',
};
```

- [ ] **Paso 2:** `npx tsc -b` → sin errores.
- [ ] **Paso 3:** commit `feat: tipos y defaults de configuración de proyectos`.

---

## Tarea 4: dataService project-aware

**Files:** modificar `src/services/dataService.ts`, `src/services/partition.ts`

**Consumes:** `projectScope.ts` (Tarea 2).
**Produces:** `setActiveProject(id: string): void`; `loadAll/save/subscribe` respetan el proyecto activo para las claves scoped.

- [ ] **Paso 1:** En `partition.ts`, agregar `projectsConfig` a `SINGLE_DOC_KEYS` (para que sea una clave global válida) y quitar `calendarEvents` de `SINGLE_DOC_KEYS` (ahora es scoped y lo maneja dataService aparte). `PARTITIONED_KEYS` no cambia.

```typescript
export const SINGLE_DOC_KEYS = [
  'teacherRoles', 'menuPermissions', 'studentGroups', 'projectsConfig',
] as const;
```

- [ ] **Paso 2:** Reescribir `dataService.ts` para ser project-aware.

```typescript
import {
  collection, doc, getDoc, getDocs, setDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PARTITIONED_KEYS, SINGLE_DOC_KEYS, partitionByCourse, mergePartitions } from './partition';
import {
  PROJECT_SCOPED_SINGLE, scopedPartDocId, cursoFromScopedDocId, scopedSingleDocId,
} from './projectScope';

let activeProjectId = 'steam';
/** Define el proyecto cuyos datos de seguimiento se leen/guardan. */
export function setActiveProject(id: string): void { activeProjectId = id; }

const esParticionada = (key: string) => (PARTITIONED_KEYS as readonly string[]).includes(key);
const esGlobalSingle = (key: string) => (SINGLE_DOC_KEYS as readonly string[]).includes(key);
const esScopedSingle = (key: string) => (PROJECT_SCOPED_SINGLE as readonly string[]).includes(key);

export async function loadAll(): Promise<Record<string, unknown>> {
  const salida: Record<string, unknown> = {};

  for (const key of SINGLE_DOC_KEYS) {
    const snap = await getDoc(doc(db, 'app_sync', key));
    if (snap.exists()) salida[key] = snap.data().data;
  }

  // calendarEvents (single-doc por proyecto)
  for (const key of PROJECT_SCOPED_SINGLE) {
    const snap = await getDoc(doc(db, 'app_sync', scopedSingleDocId(key, activeProjectId)));
    if (snap.exists()) salida[key] = snap.data().data;
  }

  // registrations, etc. (particionadas por curso, dentro del proyecto activo)
  for (const key of PARTITIONED_KEYS) {
    const snap = await getDocs(collection(db, key));
    const partes: Record<string, Record<string, unknown>> = {};
    snap.forEach(d => {
      const curso = cursoFromScopedDocId(activeProjectId, d.id);
      if (curso) partes[curso] = d.data().data ?? {};
    });
    salida[key] = mergePartitions(partes);
  }

  return salida;
}

export async function save(key: string, data: Record<string, unknown> | unknown[]): Promise<void> {
  if (esGlobalSingle(key)) {
    await setDoc(doc(db, 'app_sync', key), { data });
    return;
  }
  if (esScopedSingle(key)) {
    await setDoc(doc(db, 'app_sync', scopedSingleDocId(key, activeProjectId)), { data });
    return;
  }
  if (esParticionada(key)) {
    const partes = partitionByCourse(data as Record<string, unknown>);
    await Promise.all(
      Object.entries(partes).map(([curso, datos]) =>
        setDoc(doc(db, key, scopedPartDocId(activeProjectId, curso)), { data: datos }),
      ),
    );
    return;
  }
  // fallback: guardar como global
  await setDoc(doc(db, 'app_sync', key), { data });
}

export function subscribe(cb: (key: string, data: Record<string, unknown>) => void): () => void {
  const bajas: Array<() => void> = [];

  for (const key of SINGLE_DOC_KEYS) {
    bajas.push(onSnapshot(doc(db, 'app_sync', key), snap => {
      if (snap.exists()) cb(key, snap.data().data);
    }));
  }
  for (const key of PROJECT_SCOPED_SINGLE) {
    bajas.push(onSnapshot(doc(db, 'app_sync', scopedSingleDocId(key, activeProjectId)), snap => {
      if (snap.exists()) cb(key, snap.data().data);
    }));
  }
  for (const key of PARTITIONED_KEYS) {
    bajas.push(onSnapshot(collection(db, key), snap => {
      const partes: Record<string, Record<string, unknown>> = {};
      snap.forEach(d => {
        const curso = cursoFromScopedDocId(activeProjectId, d.id);
        if (curso) partes[curso] = d.data().data ?? {};
      });
      cb(key, mergePartitions(partes));
    }));
  }
  return () => bajas.forEach(baja => baja());
}
```

- [ ] **Paso 3:** `npx tsc -b && npm test` → tipos OK; pruebas puras siguen en verde.
- [ ] **Paso 4:** commit `feat: dataService separa datos de seguimiento por proyecto`.

---

## Tarea 5: Reglas de Firestore para projectsConfig

**Files:** modificar `firestore.rules` (y publicar en la consola de Firebase).

- [ ] **Paso 1:** Agregar antes de `match /app_sync/{documento}`:

```
    match /app_sync/projectsConfig {
      allow read: if autenticado();
      allow write: if esAdmin();
    }
```

- [ ] **Paso 2:** Publicar las reglas (consola de Firestore → Reglas → pegar → Publicar), o `firebase deploy --only firestore:rules` si hay CLI autenticada.
- [ ] **Paso 3:** Verificar desde REST que un no-admin no puede escribir `projectsConfig` (403) y el admin sí.
- [ ] **Paso 4:** commit `feat: regla admin-only para projectsConfig`.

---

## Tarea 6: Cablear App.tsx

**Files:** modificar `src/App.tsx`

**Consumes:** tipos (Tarea 3), `setActiveProject` (Tarea 4), `extractSheetId` (Tarea 1).

- [ ] **Paso 1:** Importar `DEFAULT_PROJECTS_CONFIG`, tipo `ProjectsConfig`, y `setActiveProject`. Agregar estado:

```typescript
const [projectsConfig, setProjectsConfig] = useState<ProjectsConfig>(DEFAULT_PROJECTS_CONFIG);
const activeProject = projectsConfig.projects.find(p => p.id === projectsConfig.activeProjectId)
  || projectsConfig.projects[0];
```

- [ ] **Paso 2:** En `loadRolesAndPermissions` (o donde se hace `loadAll`), leer también `projectsConfig`:

```typescript
const cfg = data.projectsConfig as ProjectsConfig | undefined;
if (cfg && cfg.projects?.length) {
  setProjectsConfig(cfg);
  setActiveProject(cfg.activeProjectId);
} else {
  await save('projectsConfig', DEFAULT_PROJECTS_CONFIG as any);
  setActiveProject(DEFAULT_PROJECTS_CONFIG.activeProjectId);
}
```

- [ ] **Paso 3:** En `fetchData`, reemplazar los IDs fijos por los del proyecto activo:

```typescript
const PM_SHEET_ID = activeProject.sheetPM;
const SM_SHEET_ID = activeProject.sheetSM;
if (!PM_SHEET_ID && !SM_SHEET_ID) { setGlobalData({ pm: [], sm: [] }); setLoading(false); return; }
```

- [ ] **Paso 4:** Al cambiar el proyecto activo, re-sincronizar. En el efecto que hace `loadAndSubscribe`, agregar `projectsConfig.activeProjectId` a las dependencias y llamar `setActiveProject(...)` antes de `loadAll()`/`subscribe()`, y volver a `fetchData()`.

```typescript
useEffect(() => {
  if (!session) return;
  setActiveProject(projectsConfig.activeProjectId);
  fetchData();
  const cleanup = loadAndSubscribe();
  return () => { cleanup.then(fn => fn && fn()); };
}, [session, projectsConfig.activeProjectId]);
```

- [ ] **Paso 5:** Guardar `projectsConfig` cuando cambie (solo admin), con debounce, igual que `teacherRoles`:

```typescript
useEffect(() => {
  if (!session || currentUserRole !== 'admin') return;
  const dataStr = JSON.stringify(projectsConfig);
  if (dataStr !== lastRemoteData.current['projectsConfig']) {
    lastRemoteData.current['projectsConfig'] = dataStr;
    const t = setTimeout(() => save('projectsConfig', projectsConfig as any), 800);
    return () => clearTimeout(t);
  }
}, [projectsConfig, session, currentUserRole]);
```

- [ ] **Paso 6:** En la suscripción (`aplicar`), manejar `projectsConfig`: `if (key === 'projectsConfig') setProjectsConfig(data as any);`
- [ ] **Paso 7:** Pasar props a `AdminPanelView`, `DashboardView`, `Sidebar` (`projectsConfig`, `setProjectsConfig`, `activeProject`).
- [ ] **Paso 8:** `npx tsc -b && npm run build` → sin errores.
- [ ] **Paso 9:** commit `feat: App maneja proyecto activo y carga sus planillas`.

---

## Tarea 7: Sección "Gestión de Proyectos" en el Panel de Admin

**Files:** modificar `src/components/AdminPanelView.tsx`

**Consumes:** `projectsConfig`, `setProjectsConfig` (props), `extractSheetId`.

- [ ] **Paso 1:** Agregar props `projectsConfig: ProjectsConfig` y `setProjectsConfig: (c: ProjectsConfig) => void`.
- [ ] **Paso 2:** Agregar una card "Gestión de Proyectos" con, por cada proyecto:
  - etiqueta del tipo (STEAM/SAE/Transversal, no editable),
  - input **Nombre propio** (`name`),
  - input **Link Primeros** y **Link Segundos** (al pegar, guardar `extractSheetId(url)` en `sheetPM`/`sheetSM`; mostrar ✓ si el ID quedó válido),
  - un radio/botón **"Activo"** para marcar `activeProjectId`.

Manejador de cambio:

```typescript
const updateProject = (id: string, patch: Partial<Project>) => {
  setProjectsConfig({
    ...projectsConfig,
    projects: projectsConfig.projects.map(p => p.id === id ? { ...p, ...patch } : p),
  });
};
const setActivo = (id: string) => setProjectsConfig({ ...projectsConfig, activeProjectId: id });
```

Para los links: `onChange={e => updateProject(p.id, { sheetPM: extractSheetId(e.target.value) })}` (guardar el ID ya extraído; mostrar advertencia si `extractSheetId` devolvió `''` y el campo no está vacío).

- [ ] **Paso 3:** `npx tsc -b` → sin errores.
- [ ] **Paso 4:** commit `feat: gestión de proyectos en el Panel de Admin`.

---

## Tarea 8: Nombre del proyecto en la portada + indicador en sidebar

**Files:** modificar `src/components/DashboardView.tsx`, `src/components/Sidebar.tsx`

**Consumes:** `activeProject` (prop).

- [ ] **Paso 1:** `DashboardView` recibe `activeProject: Project`. Reemplazar el bloque de bienvenida por el nombre del proyecto:

```tsx
<div className="dv-eyebrow">{activeProject.type} · Seguimiento 2026</div>
<h1 className="dv-title">{activeProject.name?.trim() || activeProject.type}</h1>
<p className="dv-sub">Liceo Bicentenario William Taylor de Alto Hospicio</p>
```

- [ ] **Paso 2:** `Sidebar` recibe `activeProjectName: string` y lo muestra junto a "Seguimiento 2026" como indicador de solo lectura.
- [ ] **Paso 3:** `npx tsc -b && npm run build` → sin errores.
- [ ] **Paso 4:** commit `feat: la portada muestra el nombre del proyecto activo`.

---

## Tarea 9: Verificación

- [ ] **Paso 1:** `npm test` → todas las pruebas puras en verde.
- [ ] **Paso 2:** `npm run build` → build limpio.
- [ ] **Paso 3:** Preview con datos de ejemplo: la portada muestra el nombre del proyecto activo.
- [ ] **Paso 4:** Verificación manual en la app real (con login admin):
  1. En el Panel de Admin, poner nombre "Humberstone VIVE" al proyecto SAE y pegar sus 2 links.
  2. Marcar SAE como activo → la portada muestra "Humberstone VIVE / SAE" y carga las clases de las planillas de SAE.
  3. Registrar una clase en SAE, volver a STEAM → STEAM no tiene ese registro (datos separados). ✔
  4. Volver a SAE → el registro sigue ahí. ✔
- [ ] **Paso 5:** commit `test: verificación de gestión de proyectos fase 1`.

---

## Notas

- Fase 2 (balances PDF por proyecto y consolidado) va en un plan aparte.
- Los emuladores de Firebase requieren Java (no instalado); las pruebas son de lógica pura
  (`extractSheetId`, `projectScope`) + verificación contra el proyecto real.
- La migración de datos existentes es trivial: Firestore está casi vacío y lo que haya se
  interpreta como STEAM (el proyecto activo por defecto).
