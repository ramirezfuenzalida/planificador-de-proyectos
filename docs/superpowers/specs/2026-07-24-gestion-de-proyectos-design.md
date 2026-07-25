# Gestión de Proyectos (STEAM / SAE / Transversal) — Diseño

**Fecha:** 2026-07-24
**Proyecto:** seguimiento-lbc (ZenitApp)
**Estado:** aprobado en lo esencial, pendiente revisión del usuario

## Motivación

El liceo desarrolla **3 proyectos por año** —**STEAM**, **SAE** (Social, Artístico y
Expresivo) y **Transversal**— en orden variable. Cada proyecto tiene su propia
planificación en Google Sheets, con la misma estructura de columnas. STEAM ya finalizó.

Hoy la app tiene **dos IDs de Sheets hardcodeados** (uno Primeros, uno Segundos) y no
distingue proyectos: al terminar STEAM no hay forma de pasar a SAE conservando lo de STEAM.

El usuario quiere:
1. Pegar el link del Google Sheets de cada proyecto y que la app **se transforme** a ese proyecto.
2. Que **toda la información de los 3 proyectos quede preservada** en la app.
3. Al fin de año, un **balance por proyecto y por nivel**, exportable.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Proyectos | 3 fijos: STEAM, SAE, Transversal. Orden variable. |
| Planillas | 6 en total: cada proyecto tiene 2 Sheets (una Primeros, una Segundos). Una planilla = un proyecto + un nivel. |
| Selección | **Selector global**: un proyecto activo a la vez; toda la app (ambos niveles) refleja ese proyecto. |
| Datos | **Separados y preservados por proyecto.** STEAM queda archivado; SAE parte limpio. |
| Migración | Las planillas hardcodeadas actuales pasan a ser las del proyecto **STEAM**. |
| Almacenamiento | Config en Firebase; edición **solo admin**. |
| Balance anual | **Ambos**: informe por proyecto (exportable c/u) **y** un consolidado anual comparativo. Ambos a PDF. |

## Modelo de datos

### Configuración de proyectos (global, en Firebase)

Cada proyecto tiene un **tipo** (una de las 3 categorías fijas) y un **nombre propio**
que el usuario define cada año (ej. tipo SAE, nombre "Humberstone VIVE").

Cada proyecto tiene, **por nivel** (Primeros/Segundos), su planilla + los nombres de las
pestañas de planificación y de equipos (porque varían por proyecto).

```
projects: [
  {
    id: 'sae', type: 'SAE', name: 'Humberstone VIVE',
    pm: { sheetId: '1aI7...', planningTab: 'SAE PROYECTO 2', teamsTab: '1°TEAM BUILDING' },
    sm: { sheetId: '',        planningTab: '',               teamsTab: '' },
  },
  { id: 'steam', type: 'STEAM', name: '', pm: {...}, sm: {...} },
  { id: 'transversal', type: 'Transversal', name: '', pm: {...}, sm: {...} },
]
activeProjectId: 'sae'
```

- `type`: STEAM / SAE / Transversal (categoría fija, define ícono/color).
- `name`: título libre (ej. "Humberstone VIVE"). Si vacío, se muestra el tipo.
- `pm` / `sm`: por nivel, `{ sheetId, planningTab, teamsTab }`.
- El usuario pega el **URL completo** del Sheets; la app extrae el ID con
  `\/spreadsheets\/d\/([a-zA-Z0-9-_]+)`. Los nombres de pestaña se escriben tal cual.
- `projects` y `activeProjectId` se guardan como claves de documento único en Firebase,
  con **escritura solo para admin** (igual que `teacherRoles`).

### Datos de seguimiento (por proyecto)

Las claves de seguimiento se **namespacian por proyecto** para que STEAM y SAE no colisionen
(hoy la asistencia se guarda como `curso-clase`; si ambos proyectos tienen "Clase 1" del
mismo curso, chocarían).

**Claves globales (no cambian, sin proyecto):** `teacherRoles`, `menuPermissions`,
`studentGroups`, `projects`, `activeProjectId`.

**Claves por proyecto:** `registrations`, `formativeRegistrations`, `observations`,
`formativeEvaluations`, `calendarEvents`.

Implementación del namespace en Firestore: las claves particionadas por curso pasan a usar
el id de documento **`${projectId}__${curso}`** dentro de la misma colección. Ejemplo:
`registrations/steam__1 Medio A`. Ventaja: las reglas de Firestore **no cambian**
(`match /registrations/{documento}` acepta cualquier id de documento). `calendarEvents`
(documento único) pasa a `app_sync/calendarEvents__steam`.

El formato **interno** de las claves (`${curso}-${clase}`) no cambia, así que las vistas,
cálculos de adherencia y PDFs siguen funcionando sin tocarse.

## Planillas con 2 pestañas (nombres configurables por proyecto)

Cada planilla (por proyecto y nivel) tiene **dos pestañas relevantes**:
1. **Planificación** — clases, objetivos, materiales, etc. (la que la app ya lee).
2. **Equipos** — la construcción de los equipos de estudiantes y su rol.

**Los nombres de las pestañas NO son genéricos** — varían por proyecto (ej. planificación
"SAE PROYECTO 2", equipos "1°TEAM BUILDING"). Por eso, en la configuración de cada proyecto
el admin **indica el nombre de la pestaña de planificación y el de la pestaña de equipos**
(por nivel). La app apunta a cada una con `&sheet=<Nombre>` en el endpoint `gviz/tq`.

- **Equipos = fuente de verdad el Sheets.** Se leen de la pestaña de equipos y se muestran
  tal cual; **no se editan en la app** ni se guardan en Firebase. Reemplaza los
  `studentGroups` hardcodeados. Son **por proyecto** (del Sheets del proyecto activo).

### Formato ÚNICO de la pestaña de equipos (horizontal)

Se estandariza en el formato horizontal (el de "1°TEAM BUILDING"). Todos los proyectos
deben usar este formato. Layout verificado en la planilla real:

- Los cursos van en **bloques de 4 columnas**: A→cols 0-3, B→4-7, C→8-11, D→12-15.
- Dentro de cada bloque: **nombre** en la columna de offset 0, **rol** en la de offset 2.
- Fila 0: encabezado del curso ("PRIMERO MEDIO A", etc.).
- Luego, por cada equipo: una fila **"EQUIPO N°X"** seguida de 4 filas (nombre + rol:
  COORDINADOR, INVESTIGADOR, MEDIADOR, SECRETARIO). Filas vacías separan equipos.
- 10 equipos por curso, 4 estudiantes cada uno.

Parseo → produce el formato que ya usa la app:
`${courseTag}-G${n}` → `[{ name, role }, ...]` (ej. `1MA-G1`). El nº de equipo `n` se
incrementa por cada "EQUIPO N°X" dentro del bloque del curso.

### Formato de la pestaña de planificación

Columnas por título (la app ya las mapea): Semana, Clase, Día, Horario, Fecha,
Etapa de proyecto, Objetivo, Contenido, Actividad, [Aula invertida], Responsable,
Diseño de Materiales, Solicitudes Informática, Link Clase, Link Google Sites,
Docente que realiza la clase. No cambia.

## Flujo de cambio de proyecto

1. El usuario elige el proyecto activo en el **selector global** (sidebar).
2. `fetchData` lee las planillas **del proyecto activo** (`sheetPM`/`sheetSM`) en vez de los
   IDs fijos de hoy.
3. `dataService` carga/guarda los datos de seguimiento del **namespace del proyecto activo**.
4. Toda la app (Cursos, Analítica, Reportes, Radar, Dashboard) se transforma sola, porque
   todas consumen el mismo estado de React.

## Interfaz

Todo lo de proyectos vive en el **Panel de Administrador** (`AdminPanelView`), accesible
solo para admin. Se agrega una sección **"Gestión de Proyectos"** con:

- **Selector de proyecto activo:** STEAM / SAE / Transversal, marca cuál está activo.
  Cambiarlo recarga los datos y transforma la app para todos los usuarios (es global).
- **Configuración de cada proyecto:** tipo (STEAM/SAE/Transversal) + **nombre propio**
  (ej. "Humberstone VIVE") + 2 campos para pegar los links de Sheets (Primeros y Segundos).
  Valida que el URL sea de Google Sheets y extrae el ID.

### El nombre del proyecto en la portada

La portada de Cursos (`DashboardView`) muestra el **nombre propio del proyecto activo** de
forma destacada, con su tipo como subtítulo/etiqueta. Ejemplo: título grande
**"Humberstone VIVE"** con la etiqueta **SAE**. Si el proyecto no tiene nombre propio, se
muestra el tipo. Este texto reemplaza/complementa el actual "Bienvenido al sistema de
seguimiento" para que quede claro en qué proyecto se está trabajando.

Se reutiliza el `ProjectConfigManager` existente, integrado dentro del Panel de Admin (no
como pantalla suelta).

- **Indicador (solo lectura) en la sidebar:** junto a "Seguimiento 2026" se muestra el
  nombre del proyecto activo, para que cualquier docente sepa en qué proyecto está la app.
  No es un control; cambiarlo es exclusivo del admin desde el Panel.

## Balance de fin de año

Como los datos de los 3 proyectos quedan preservados, se puede consolidar:

1. **Informe por proyecto (exportable c/u):** por cada proyecto, un balance por nivel
   (adherencia, clases realizadas/incompletas/no realizadas, por curso). Reutiliza
   `pdfGenerator` y el estilo de `ReportsView`.
2. **Consolidado anual comparativo:** un informe único que compara los 3 proyectos entre sí,
   por nivel (ej. adherencia STEAM vs SAE vs Transversal para Primeros y para Segundos).
   Exportable a PDF.

Para calcular el balance de un proyecto que **no** es el activo, el generador de reportes
lee ese proyecto desde su namespace en Firebase (carga puntual, sin cambiar el proyecto
activo de la sesión).

## Alcance

**Incluye:** modelo de datos de proyectos, extracción de ID desde URL, selector global,
pantalla de configuración (admin), namespace de datos por proyecto, migración de las
planillas actuales a STEAM, informe por proyecto y consolidado anual, ambos a PDF.

**No incluye:** cambiar la estructura de las planillas ni el parseo de columnas; el
rediseño cósmico ya hecho; ampliar los datos que se leen de cada clase.

## Riesgos y notas

- **Reglas de Firestore:** `projects` y `activeProjectId` deben ser escribibles solo por
  admin. Se agregan dos `match` específicos en `firestore.rules` (como `teacherRoles`).
- **Planillas públicas:** cada Sheets debe estar compartido como "cualquiera con el enlace
  puede ver" (igual que hoy), porque se lee por el endpoint `gviz/tq` sin credenciales.
- **Fragilidad de columnas:** se mantiene el parseo actual (con respaldos por posición);
  no se aborda en este trabajo.
- **Compatibilidad de datos actuales:** Firestore está prácticamente vacío (migración
  reciente). Los pocos datos que existan se tratan como del proyecto STEAM.
