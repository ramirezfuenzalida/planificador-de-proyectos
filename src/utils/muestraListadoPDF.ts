/**
 * Listado oficial de equipos de la Muestra Pública, en PDF.
 *
 * Sigue el formato institucional que ya se usa en papel (banda de título,
 * "Profesores a cargo", tabla N° / Nombres / Curso) con la identidad visual
 * del Proyecto: azul marino y dorado, y los dos logos en el encabezado.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MuestraEquipo, MuestraPublica } from '../types';
import { colorDeEquipo } from '../types';
import { consolidarMiembro, type ExportContext } from './muestraExport';
import { compararPorApellido } from './formativeGrades';

type RGB = [number, number, number];

/** Convierte '#ec4899' al triplete que espera jsPDF. */
function hexARGB(hex: string): RGB {
  const limpio = hex.replace('#', '');
  return [
    parseInt(limpio.slice(0, 2), 16),
    parseInt(limpio.slice(2, 4), 16),
    parseInt(limpio.slice(4, 6), 16),
  ];
}

const MARINO: [number, number, number] = [15, 30, 61];
const DORADO: [number, number, number] = [212, 160, 23];
const DORADO_SUAVE: [number, number, number] = [253, 246, 227];
const GRIS: [number, number, number] = [107, 114, 128];
const TEXTO: [number, number, number] = [40, 48, 62];

const MARGEN = 14;
const ANCHO = 182; // 210 - 2*14

/** Carga una imagen de /public como data URI. Devuelve null si no se puede. */
async function cargarLogo(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    // En entorno sin fetch (tests) o si falta el archivo, el PDF sale sin logo.
    return null;
  }
}

export interface Logos {
  liceo: string | null;
  proyecto: string | null;
}

/** Carga los logos una vez para reutilizarlos en todas las páginas. */
export async function cargarLogos(): Promise<Logos> {
  const [liceo, proyecto] = await Promise.all([
    cargarLogo('/logo-liceo.png'),
    cargarLogo('/logo-proyecto.png'),
  ]);
  return { liceo, proyecto };
}

/**
 * Encabezado institucional con los dos logos y la banda de título.
 * Devuelve la Y donde puede seguir el contenido.
 */
function encabezado(
  doc: jsPDF, logos: Logos, nombreEquipo: string, titulo: string,
  docentes: string[], subtitulo: string, colorEquipo: RGB,
): number {
  // Franja superior con el color identificador del equipo.
  doc.setFillColor(...colorEquipo);
  doc.rect(0, 0, 210, 5, 'F');

  const LOGO = 20;
  if (logos.liceo) {
    doc.addImage(logos.liceo, 'PNG', MARGEN, 9, LOGO * (204 / 183), LOGO);
  }
  if (logos.proyecto) {
    doc.addImage(logos.proyecto, 'PNG', 210 - MARGEN - LOGO, 9, LOGO, LOGO);
  }

  // Membrete centrado entre los logos. El texto institucional va en dos líneas
  // para no chocar con los logos, y debajo el nombre del equipo.
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...MARINO);
  doc.text('LICEO BICENTENARIO COLEGIO', 105, 14, { align: 'center' });
  doc.text('METODISTA WILLIAM TAYLOR', 105, 19, { align: 'center' });

  // Nombre del equipo en una píldora de su color, para identificarlo al toque.
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  const anchoNombre = doc.getTextWidth(nombreEquipo.toUpperCase()) + 12;
  doc.setFillColor(...colorEquipo);
  doc.roundedRect(105 - anchoNombre / 2, 21.5, anchoNombre, 6.5, 3.25, 3.25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(nombreEquipo.toUpperCase(), 105, 26, { align: 'center' });

  let y = 33;

  // ── Banda de título (equivalente a "PROYECTO STEAM 2 MEDIO") ──────────
  doc.setFillColor(...MARINO);
  doc.rect(MARGEN, y, ANCHO, 10, 'F');
  // Filo del color del equipo al costado de la banda
  doc.setFillColor(...colorEquipo);
  doc.rect(MARGEN, y, 3.5, 10, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text(titulo.toUpperCase(), 105, y + 6.8, { align: 'center' });
  y += 10;

  // ── Banda de profesores a cargo ───────────────────────────────────────
  doc.setFillColor(...DORADO_SUAVE);
  doc.rect(MARGEN, y, ANCHO, 8.5, 'F');
  doc.setDrawColor(...DORADO);
  doc.setLineWidth(0.3);
  doc.rect(MARGEN, y, ANCHO, 8.5, 'S');

  const lista = docentes.length ? docentes.join(' · ') : 'Por asignar';
  doc.setFontSize(9);
  doc.setTextColor(...MARINO);
  doc.setFont('Helvetica', 'bold');
  const etiqueta = 'Profesores a cargo: ';
  const anchoEtiqueta = doc.getTextWidth(etiqueta);
  const anchoLista = doc.getTextWidth(lista);
  const inicio = 105 - (anchoEtiqueta + anchoLista) / 2;
  doc.text(etiqueta, inicio, y + 5.8);
  doc.setFont('Helvetica', 'normal');
  doc.text(lista, inicio + anchoEtiqueta, y + 5.8);
  y += 8.5;

  // ── Banda de contexto (asignatura · temática · fecha) ─────────────────
  if (subtitulo) {
    doc.setFillColor(245, 247, 250);
    doc.rect(MARGEN, y, ANCHO, 7, 'F');
    doc.setDrawColor(225, 230, 237);
    doc.rect(MARGEN, y, ANCHO, 7, 'S');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(subtitulo, 105, y + 4.7, { align: 'center' });
    y += 7;
  }

  return y;
}

/** Pie con numeración, aplicado a todas las páginas. */
function pie(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...DORADO);
    doc.setLineWidth(0.4);
    doc.line(MARGEN, 285, 210 - MARGEN, 285);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(
      `Emitido el ${new Date().toLocaleDateString('es-CL')} · ZenitApp`,
      MARGEN, 289.5,
    );
    doc.text(`Página ${i} de ${total}`, 210 - MARGEN, 289.5, { align: 'right' });
  }
}

/** Filas del listado, ordenadas por curso y luego por apellido. */
function filasDeEquipo(equipo: MuestraEquipo, ctx: ExportContext) {
  return equipo.miembros
    .map((m) => consolidarMiembro(equipo, m, ctx))
    .sort((a, b) =>
      a.miembro.courseTag.localeCompare(b.miembro.courseTag, 'es') ||
      compararPorApellido(a.miembro.name, b.miembro.name));
}

/** Tabla principal: N° / Nombres / Curso, más las notas. */
function tablaListado(
  doc: jsPDF, equipo: MuestraEquipo, ctx: ExportContext, startY: number, colorEquipo: RGB,
): void {
  const filas = filasDeEquipo(equipo, ctx);

  autoTable(doc, {
    startY,
    head: [['N°', 'Nombres', 'Curso', 'Prop.', 'Nota']],
    body: filas.map((f, i) => [
      i + 1,
      f.miembro.name.toUpperCase(),
      f.miembro.courseTag,
      f.notaPropuesta ?? '—',
      f.notaFinal || '',
    ]),
    styles: {
      fontSize: 8.5, cellPadding: 2.6, font: 'Helvetica',
      textColor: TEXTO, lineColor: [214, 221, 231], lineWidth: 0.2,
      valign: 'middle',
    },
    // El encabezado de la tabla toma el color del equipo.
    headStyles: {
      fillColor: colorEquipo, textColor: [255, 255, 255],
      fontStyle: 'bold', fontSize: 8.5, halign: 'center',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    // Los anchos suman 182mm = el ancho útil entre márgenes.
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 96, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
    },
    margin: { left: MARGEN, right: MARGEN, bottom: 20 },
  });
}

/** Contexto de una página del listado. */
function paginaEquipo(
  doc: jsPDF, logos: Logos, equipo: MuestraEquipo, muestra: MuestraPublica,
  ctx: ExportContext, indice = 0,
): void {
  const colorEquipo = hexARGB(colorDeEquipo(equipo, indice));
  const nivel = muestra.nivel === '1M' ? 'PRIMEROS MEDIOS' : 'SEGUNDOS MEDIOS';
  const contexto = [
    equipo.asignatura && `Asignatura: ${equipo.asignatura}`,
    equipo.tematica && `Temática: ${equipo.tematica}`,
    muestra.fecha && `Fecha: ${muestra.fecha}`,
  ].filter(Boolean).join('   ·   ');

  const y = encabezado(
    doc, logos,
    equipo.nombre,
    `${muestra.nombre} · ${nivel}`,
    equipo.docentes,
    contexto,
    colorEquipo,
  );

  tablaListado(doc, equipo, ctx, y + 6, colorEquipo);

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const cursos = new Set(equipo.miembros.map((m) => m.courseTag));

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...MARINO);
  doc.text(
    `Total: ${equipo.miembros.length} estudiantes de ${cursos.size} curso(s) — ${[...cursos].sort().join(', ') || '—'}`,
    MARGEN, finalY + 7,
  );

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRIS);
  doc.text('Prop. = nota propuesta por el sistema según su seguimiento formativo.', MARGEN, finalY + 12);
}

/** Construye el listado de UN equipo. Separado de `save` para poder testearlo. */
export async function construirListadoEquipo(
  equipo: MuestraEquipo, muestra: MuestraPublica, ctx: ExportContext, logos?: Logos,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  paginaEquipo(doc, logos ?? await cargarLogos(), equipo, muestra, ctx);
  pie(doc);
  return doc;
}

/** Listado oficial de UN equipo: construye y descarga. */
export async function exportarListadoEquipoPDF(
  equipo: MuestraEquipo, muestra: MuestraPublica, ctx: ExportContext,
): Promise<void> {
  const doc = await construirListadoEquipo(equipo, muestra, ctx);
  doc.save(`Listado_${equipo.nombre.replace(/\s+/g, '_')}.pdf`);
}

/** Construye el listado de toda la muestra, un equipo por página. */
export async function construirListadoCompleto(
  muestra: MuestraPublica, ctx: ExportContext, logos?: Logos,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgs = logos ?? await cargarLogos();

  muestra.equipos.forEach((equipo, idx) => {
    if (idx > 0) doc.addPage();
    paginaEquipo(doc, imgs, equipo, muestra, ctx, idx);
  });

  pie(doc);
  return doc;
}

/** Listado completo de la muestra: construye y descarga. */
export async function exportarListadoCompletoPDF(
  muestra: MuestraPublica, ctx: ExportContext,
): Promise<void> {
  const nivel = muestra.nivel === '1M' ? 'Primeros_Medios' : 'Segundos_Medios';
  const fecha = muestra.fecha || new Date().toISOString().slice(0, 10);
  const doc = await construirListadoCompleto(muestra, ctx);
  doc.save(`Listado_Muestra_Publica_${nivel}_${fecha}.pdf`);
}
