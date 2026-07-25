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

```
projects: [
  { id: 'steam',       type: 'STEAM',       name: '<nombre propio>', sheetPM: '<idPrimeros>', sheetSM: '<idSegundos>' },
  { id: 'sae',         type: 'SAE',         name: 'Humberstone VIVE', sheetPM: '',            sheetSM: '' },
  { id: 'transversal', type: 'Transversal', name: '<nombre propio>', sheetPM: '',             sheetSM: '' },
]
activeProjectId: 'sae'
```

- `type`: STEAM / SAE / Transversal (categoría fija, define el ícono/color).
- `name`: título libre que el usuario escribe (ej. "Humberstone VIVE"). Si se deja vacío,
  se muestra el tipo como nombre.
- El usuario pega el **URL completo** de cada Sheets; la app extrae el ID con
  `\/spreadsheets\/d\/([a-zA-Z0-9-_]+)`.
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
