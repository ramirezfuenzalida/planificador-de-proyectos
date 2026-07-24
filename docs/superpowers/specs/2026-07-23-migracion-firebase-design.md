# Migración de Supabase a Firebase — Diseño

**Fecha:** 2026-07-23
**Proyecto:** seguimiento-lbc (ZenitApp / Planificador de Proyectos)
**Estado:** aprobado, pendiente de plan de implementación

## Motivación

La app comparte hoy el proyecto Supabase `ejjobdbywnolopistcvs` (visible en el dashboard
como **oswtapp**) con `GESTION OSWT APP`. Esto mezcla dos aplicaciones sin relación:
comparten base de datos y, sobre todo, la tabla `auth.users`, de modo que una cuenta
creada en una entra a la otra.

El plan gratuito de Supabase permite 2 proyectos activos y ambos están ocupados
(`inventOS` y `oswtapp`), así que no hay cupo para separar el planificador dentro de
Supabase. Migrar a Firebase resuelve la separación sin depender de políticas de cupo.

Beneficio adicional: Firebase Auth trae recuperación de contraseña integrada, lo que
corrige dos defectos actuales documentados más abajo.

### Restricción dura

**No romper `GESTION OSWT APP`.** Cualquier operación sobre el proyecto Supabase debe ser
acotada y verificada. Verificación ya realizada: OSWT usa 23 tablas y ninguna es
`app_sync` ni `logs_auditoria`. El único recurso compartido es `auth.users`.

## Estado actual

### Qué vive en Supabase

**Tabla `app_sync`** — almacén clave/valor con 8 claves JSON:

| Clave | Contenido | Espejo en localStorage |
|---|---|---|
| `registrations` | Registros de asistencia por clase | `zenit_regs` |
| `formativeRegistrations` | Seguimiento formativo | `zenit_formative_regs` |
| `formativeEvaluations` | Evaluaciones formativas | `zenit_formative_evaluations` |
| `observations` | Observaciones por alumno | `zenit_observations` |
| `calendarEvents` | Eventos personalizados de calendario | `zenit_calendar_events` |
| `studentGroups` | Grupos de estudiantes | `zenit_student_groups` |
| `teacherRoles` | Correos autorizados y roles | — |
| `menuPermissions` | Permisos de menú por rol | — |

**Tabla `logs_auditoria`** — bitácora de errores del front. Desechable, se regenera sola.

**`auth.users`** — cuentas de acceso, compartidas con OSWT.

### Qué NO vive en Supabase

- La planificación pedagógica real (clases, contenidos, materiales, PPTs) se lee en vivo
  desde dos Google Sheets, referenciadas en `src/App.tsx`. **Fuera de alcance.**
- Los listados de estudiantes están en el código fuente.
- Métricas, adherencia y KPIs son calculados, no almacenados.

### Superficie de código afectada

6 archivos importan `supabase`: `App.tsx`, `LoginView.tsx`, `Sidebar.tsx`,
`lib/supabase.ts`, `services/dbService.ts`, `services/monitoringService.ts`.
En total 8 llamadas de autenticación y 4 suscripciones `postgres_changes`.

### Defectos actuales que esta migración corrige

1. **No existe recuperación de contraseña.** Un usuario que olvida su clave queda
   bloqueado sin salida. Es lo que ocurrió el 2026-07-23 con `exequiel.ramirez@cmwt.cl`.
2. **El auto-registro de `LoginView` está roto.** El proyecto Supabase tiene
   `mailer_autoconfirm: false`, de modo que cualquier docente nuevo autorizado recibiría
   "Email not confirmed" y no podría entrar. Además, para una cuenta ya existente el
   `signUp` no hace nada y el reintento lanza el error crudo en inglés.
3. **Errores sin traducir**, mostrados en inglés al usuario final.

## Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Datos existentes | **No se migran** | El usuario confirmó que son datos de prueba. Se parte limpio. |
| Alta de cuentas | **El admin las crea desde el Panel de Admin** | Control total; nadie se registra solo. |
| Cuentas de usuario | **Separadas de OSWT** | Cada proyecto Firebase tiene su propio pool. |
| Modelo de datos | **Particionado por curso** (enfoque B) | Evita el techo de 1 MiB por documento. |
| Limpieza de Supabase | **Después de verificar Firebase** | Ruta reversible ante sorpresas. |
| Plan de Firebase | **Spark (gratuito)** | Sin Cloud Functions, que exigirían Blaze. |

### Enfoques descartados

- **A — Copia calcada** (8 documentos con los blobs tal cual). Heredaba el techo de 1 MiB:
  `registrations` se estimó en ~600 KB a fin de año escolar. Además cada marca de
  asistencia reescribía el blob completo y despertaba a todos los clientes conectados.
- **C — Rediseño documental completo** (colecciones para estudiantes, clases y cada
  registro como documento). Correcto si la app creciera a varios establecimientos, pero
  obliga a reescribir todas las vistas, que asumen la forma de diccionario plano.
  Descartado por YAGNI.

## Arquitectura

Todo Firebase queda detrás de dos servicios. Hoy `supabase` se importa en 6 archivos;
después `firebase` se importará en exactamente uno (`lib/firebase.ts`). Si algún día
Firebase tampoco sirve, se cambian dos archivos y no seis.

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/lib/firebase.ts` | nuevo | Inicializa la app; exporta `auth` y `db`. |
| `src/services/authService.ts` | nuevo | Sesión, recuperación de clave, alta de docentes. |
| `src/services/dataService.ts` | reemplaza `dbService.ts` | Persistencia; oculta la partición. |
| `src/services/monitoringService.ts` | modificado | `insert` → `addDoc`. |
| `src/App.tsx` | modificado | Consume los dos servicios. |
| `src/components/LoginView.tsx` | modificado | Auth + recuperación de contraseña. |
| `src/components/AdminPanelView.tsx` | modificado | Alta de docentes. |
| `src/components/Sidebar.tsx` | modificado | Cierre de sesión. |
| `src/lib/supabase.ts` | **eliminado** | — |
| `firestore.rules` | nuevo | Reglas de seguridad versionadas. |
| `package.json` | modificado | Fuera `@supabase/supabase-js`, dentro `firebase`. |

### Configuración

Las credenciales van en variables `VITE_FIREBASE_*` dentro de `.env.local`, que ya está
cubierto por `.gitignore` (patrón `.env*.local`). Nunca se hardcodean en el código, a
diferencia de `src/lib/supabase.ts` hoy.

Acceso operativo: el usuario ejecuta `firebase login` una vez (autentica en su propio
navegador vía OAuth; la CLI guarda un token de refresco local). Para operaciones
administrativas se usa una service account en JSON, también en `.env.local`. En ningún
caso se solicita ni se almacena la contraseña de Google del usuario.

## Modelo de datos

```
app_sync/{clave}                → teacherRoles, menuPermissions, studentGroups,
                                   calendarEvents
registrations/{curso}           → "1 Medio A" … "2 Medio D"
formativeRegistrations/{curso}
observations/{curso}
formativeEvaluations/{curso}
logs_auditoria/{idAuto}         → un documento por error
```

`formativeEvaluations` se particiona aunque su tamaño esté acotado por la cantidad de
estudiantes y no por el paso del tiempo: sus claves ya llevan el curso como prefijo
(`${courseTag}-G${groupId}-${studentId}`) y contiene comentarios de texto libre, el único
campo sin cota clara. Reutilizar la partición cuesta cero y elimina el riesgo.

Cursos válidos como identificador de documento: `1 Medio A`, `1 Medio B`, `1 Medio C`,
`1 Medio D`, `2 Medio A`, `2 Medio B`, `2 Medio C`, `2 Medio D`.

### Partición

Las claves de `registrations`, `formativeRegistrations`, `observations` y
`formativeEvaluations` llevan siempre el curso como prefijo (`${activeCourse}-${...}`,
`${courseTag}-${clsId}`, `${courseTag}-G${groupId}-${studentId}`) — verificado en el código.

`dataService` deriva el curso **comparando el inicio de la clave contra la lista conocida
de cursos**, no cortando en el primer guion. Cortar por guion se rompería el día que un
curso se llame "1 Medio A-1"; comparar contra la lista, no.

Si una clave no coincide con ningún curso conocido, se guarda en el documento
`_sin_curso` de la misma colección. Así ningún dato se pierde silenciosamente y la
anomalía queda visible.

Tamaño estimado por documento particionado: ~75 KB contra un límite de 1 MiB.

### Interfaz de `dataService`

Tres métodos, deliberadamente pocos:

- `loadAll()` → devuelve el diccionario plano completo, reensamblando las particiones.
- `save(clave, datos)` → dirige la escritura al documento correcto.
- `subscribe(callback)` → registra los `onSnapshot` y devuelve una función de limpieza.

**El estado en React no cambia.** La partición vive tras esta interfaz, así que las vistas,
los cálculos de adherencia y la generación de PDFs no se tocan.

## Autenticación

| Operación | Implementación |
|---|---|
| Entrar | `signInWithEmailAndPassword` |
| Salir | `signOut` |
| Escuchar sesión | `onAuthStateChanged` |
| Recuperar contraseña | `sendPasswordResetEmail` — enlace nuevo en `LoginView` |
| Cambiar contraseña | `updatePassword` |
| Alta de docente | `createUserWithEmailAndPassword` sobre una **segunda instancia** |

### Alta de docentes sin perder la sesión

`createUserWithEmailAndPassword` inicia sesión automáticamente con el usuario recién
creado, lo que expulsaría al administrador de su propia sesión en cada alta.

Solución: inicializar una segunda instancia de Firebase en memoria
(`initializeApp(config, 'admin-secundaria')`), crear el usuario contra su `auth`, y
descartar la instancia. La sesión del administrador queda intacta.

Se descarta la alternativa de Cloud Functions con el Admin SDK porque exige el plan Blaze.

### Cambios en el flujo de login

- **Se elimina el auto-registro.** Con altas desde el panel deja de tener sentido, y era
  el origen del error engañoso descrito en "Defectos actuales".
- **Errores traducidos:** mapa de códigos de Firebase a español
  (`auth/wrong-password`, `auth/user-not-found`, `auth/too-many-requests`, etc.).
  Ningún mensaje crudo llega al usuario.

## Reglas de seguridad

Firestore parte cerrado. Las reglas viven en `firestore.rules`, versionadas en el repo:

| Colección | Lectura | Escritura |
|---|---|---|
| `app_sync/teacherRoles` | autenticado | **solo admin** |
| `app_sync/menuPermissions` | autenticado | **solo admin** |
| `app_sync/*` (resto) | autenticado | autenticado |
| `registrations`, `formativeRegistrations`, `observations`, `formativeEvaluations` | autenticado | autenticado |
| `logs_auditoria` | solo admin | abierta |

Hoy la restricción de roles y permisos se aplica solo en el cliente, lo cual es cosmético:
un usuario autenticado podría escribir directo contra la base. Moverla a las reglas la
vuelve real.

El rol de admin se determina por el correo del usuario autenticado, comparado contra la
constante `ADMIN_EMAIL` (`exequiel.ramirez@cmwt.cl`).

## Tiempo real, offline y errores

Cada colección lleva un `onSnapshot`, sustituyendo las 4 suscripciones `postgres_changes`.
Se conserva el guardado con *debounce* y el mecanismo `lastSupabaseData` que evita
reescrituras redundantes (renombrado a `lastRemoteData`).

Comportamiento offline: se mantiene el espejo en `localStorage` y se suma la caché propia
de Firestore, de modo que la app sigue usable sin red.

Errores: toda falla de red o permisos se registra en `monitoringService` y se muestra al
usuario en español. La app nunca queda en blanco por un fallo de backend; ante error de
carga cae a `localStorage` y, si tampoco hay, a los valores por defecto.

## Verificación

- **Emulador de Firebase** (local y gratuito) para: reensamblado de particiones en
  `dataService`, reglas de seguridad (que un no-admin no pueda escribir `teacherRoles`),
  y alta de docente comprobando que la sesión del admin sobrevive.
- **Playwright** sobre la app real al final, replicando la verificación ya usada en este
  proyecto: cargar, entrar, navegar y confirmar ausencia de errores en consola.
- **Criterio de aceptación:** login real funcionando, datos persistiendo entre recargas,
  sincronización en vivo entre dos pestañas, y alta de un docente de prueba sin perder
  la sesión de administrador.

## Limpieza de Supabase

Solo después de que el usuario confirme que Firebase funciona en uso real:

1. `DROP TABLE app_sync;` — verificado que OSWT no la usa.
2. `DROP TABLE logs_auditoria;` — verificado que OSWT no la usa (OSWT referencia
   `Logs_Auditoria`, con mayúsculas, que es otra tabla y hoy devuelve 404).
3. En `auth.users`, borrar **únicamente** las cuentas del planificador, una por una y con
   la lista a la vista. Es el único recurso compartido; nada de borrados masivos.
4. `GESTION OSWT APP` no se toca en ningún momento.

### Limpieza en el propio repo

Retirar el bypass de login de desarrollo introducido el 2026-07-23: las constantes
`DEV_BYPASS_AUTH` y `DEV_SESSION` en `App.tsx`, y la variable `VITE_AUTH_BYPASS` de
`.env.local`. Con la autenticación funcionando y recuperación de contraseña disponible,
deja de ser necesario.

## Fuera de alcance

- Los Google Sheets siguen siendo la fuente de la planificación pedagógica. No se mueven.
- No se cambia el diseño visual.
- No se hace el *code splitting* pendiente (`React.lazy`) ni se unifican los imports
  duplicados de jsPDF. Son mejoras reales, pero de otro trabajo.

## Hallazgo lateral (no es parte de este trabajo)

`GESTION OSWT APP` referencia las tablas `Logs_Auditoria` y `students`, y ambas devuelven
HTTP 404 contra la API. Esas referencias están rotas en esa aplicación. Queda registrado
para revisión futura.
