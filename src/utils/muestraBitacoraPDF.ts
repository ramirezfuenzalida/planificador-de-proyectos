/**
 * Bitácora de un equipo de la Muestra Pública, en PDF.
 *
 * Documento aparte del listado de estudiantes: reúne la planificación de la
 * muestra (fecha, hora, lugar, detalle) y todas las sesiones previas con sus
 * acuerdos y observaciones.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MuestraEquipo, MuestraPublica, SesionMuestra } from '../types';
import { colorDeEquipo } from '../types';
import { cargarLogos, type Logos } from './muestraListadoPDF';

type RGB = [number, number, number];

const MARINO: RGB = [15, 30, 61];
const GRIS: RGB = [107, 114, 128];
const TEXTO: RGB = [40, 48, 62];
const MARGEN = 14;
const ANCHO = 182;
const PIE = 285;

function hexARGB(hex: string): RGB {
  const l = hex.replace('#', '');
  return [
    parseInt(l.slice(0, 2), 16),
    parseInt(l.slice(2, 4), 16),
    parseInt(l.slice(4, 6), 16),
  ];
}

/** Encabezado con logos y el nombre del equipo. Devuelve la Y de continuación. */
function encabezado(
  doc: jsPDF, logos: Logos, equipo: MuestraEquipo, muestra: MuestraPublica, color: RGB,
): number {
  doc.setFillColor(...color);
  doc.rect(0, 0, 210, 5, 'F');

  const LOGO = 20;
  if (logos.liceo) doc.addImage(logos.liceo, 'PNG', MARGEN, 9, LOGO * (204 / 183), LOGO);
  if (logos.proyecto) doc.addImage(logos.proyecto, 'PNG', 210 - MARGEN - LOGO, 9, LOGO, LOGO);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...MARINO);
  doc.text('LICEO BICENTENARIO COLEGIO', 105, 14, { align: 'center' });
  doc.text('METODISTA WILLIAM TAYLOR', 105, 19, { align: 'center' });

  doc.setFontSize(9);
  const ancho = doc.getTextWidth(equipo.nombre.toUpperCase()) + 12;
  doc.setFillColor(...color);
  doc.roundedRect(105 - ancho / 2, 21.5, ancho, 6.5, 3.25, 3.25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(equipo.nombre.toUpperCase(), 105, 26, { align: 'center' });

  const y = 33;
  doc.setFillColor(...MARINO);
  doc.rect(MARGEN, y, ANCHO, 10, 'F');
  doc.setFillColor(...color);
  doc.rect(MARGEN, y, 3.5, 10, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  const nivel = muestra.nivel === '1M' ? 'PRIMEROS MEDIOS' : 'SEGUNDOS MEDIOS';
  doc.text(`BITÁCORA · ${muestra.nombre.toUpperCase()} · ${nivel}`, 105, y + 6.8, { align: 'center' });

  return y + 10;
}

function pie(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.4);
    doc.line(MARGEN, PIE, 210 - MARGEN, PIE);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRIS);
    doc.text(`Emitido el ${new Date().toLocaleDateString('es-CL')} · ZenitApp`, MARGEN, PIE + 4.5);
    doc.text(`Página ${i} de ${total}`, 210 - MARGEN, PIE + 4.5, { align: 'right' });
  }
}

/** Escribe un bloque de texto con su rótulo, saltando de página si hace falta. */
function bloqueTexto(doc: jsPDF, rotulo: string, texto: string, y: number, color: RGB): number {
  const contenido = texto.trim() || '—';
  const lineas = doc.splitTextToSize(contenido, ANCHO - 6);
  const alto = lineas.length * 4.4 + 9;

  if (y + alto > PIE - 6) { doc.addPage(); y = 20; }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...color);
  doc.text(rotulo.toUpperCase(), MARGEN, y);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXTO);
  doc.text(lineas, MARGEN, y + 5);

  return y + alto;
}

/** Ficha de una sesión: cabecera de datos + acuerdos y observaciones. */
function bloqueSesion(
  doc: jsPDF, s: SesionMuestra, numero: number, y: number, color: RGB,
): number {
  if (y > PIE - 46) { doc.addPage(); y = 20; }

  doc.setFillColor(246, 248, 251);
  doc.rect(MARGEN, y, ANCHO, 9, 'F');
  doc.setFillColor(...(s.realizada ? [16, 185, 129] as RGB : color));
  doc.rect(MARGEN, y, 3, 9, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...MARINO);
  doc.text(`${numero}. ${s.tema || 'Sin tema'}`, MARGEN + 6, y + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  const meta = [
    s.fecha || 'sin fecha',
    s.responsable || 'sin responsable',
    s.realizada ? 'Realizada' : 'Pendiente',
    `${s.avance}%`,
  ].join('  ·  ');
  doc.text(meta, 210 - MARGEN - 2, y + 6, { align: 'right' });

  y += 13;
  y = bloqueTexto(doc, 'Acuerdos', s.acuerdos, y, color);
  y = bloqueTexto(doc, 'Observaciones', s.observaciones, y, color);
  return y + 3;
}

/** Construye la bitácora. Separado de `save` para poder testearlo. */
export async function construirBitacora(
  equipo: MuestraEquipo, muestra: MuestraPublica, logos?: Logos,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const color = hexARGB(colorDeEquipo(equipo));
  const imgs = logos ?? await cargarLogos();

  let y = encabezado(doc, imgs, equipo, muestra, color) + 8;
  const pres = equipo.presentacion;

  // ── Datos de la muestra ──
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.5, textColor: TEXTO, font: 'Helvetica' },
    // Solo se fija el rótulo; el valor toma el ancho restante. Fijar ambas
    // hacía que autoTable avisara "content could not fit page" por redondeo.
    tableWidth: ANCHO,
    columnStyles: { 0: { fontStyle: 'bold', textColor: color, cellWidth: 38 } },
    margin: { left: MARGEN, right: MARGEN },
    body: [
      ['Asignatura', equipo.asignatura || '—'],
      ['Temática', equipo.tematica || '—'],
      ['Docentes', equipo.docentes.length ? equipo.docentes.join(' · ') : '—'],
      ['Integrantes', `${equipo.miembros.length} estudiantes`],
      ['Fecha y hora', [pres?.fecha, pres?.hora].filter(Boolean).join(' · ') || '—'],
      ['Lugar', pres?.lugar || '—'],
    ],
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  y = bloqueTexto(doc, 'Detalle de la muestra', pres?.descripcion || '', y, color);
  y = bloqueTexto(doc, 'Acuerdos del día de la muestra', pres?.acuerdos || '', y, color);
  y = bloqueTexto(doc, 'Evaluación y observaciones del día', pres?.observaciones || '', y, color);

  // ── Sesiones previas ──
  const sesiones = [...(equipo.sesiones || [])].sort((a, b) =>
    (a.fecha || '9999').localeCompare(b.fecha || '9999'));

  y += 6;
  if (y > PIE - 30) { doc.addPage(); y = 20; }

  doc.setFillColor(...MARINO);
  doc.rect(MARGEN, y, ANCHO, 9, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`SESIONES PREVIAS (${sesiones.length})`, 105, y + 6.2, { align: 'center' });
  y += 14;

  if (sesiones.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GRIS);
    doc.text('Sin sesiones registradas.', MARGEN, y);
  } else {
    sesiones.forEach((s, i) => { y = bloqueSesion(doc, s, i + 1, y, color); });
  }

  pie(doc);
  return doc;
}

/** Construye y descarga la bitácora del equipo. */
export async function exportarBitacoraPDF(
  equipo: MuestraEquipo, muestra: MuestraPublica,
): Promise<void> {
  const doc = await construirBitacora(equipo, muestra);
  doc.save(`Bitacora_${equipo.nombre.replace(/\s+/g, '_')}.pdf`);
}
