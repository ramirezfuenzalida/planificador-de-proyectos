import { jsPDF } from 'jspdf';
import type { ActaGlobalizacion } from '../types';

// Misma URL de universo que usa el fondo del Acta (así ya está en caché del navegador).
const UNIVERSE_IMG = 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=2400&q=90&auto=format&fit=crop';
const LOGO_IMG = '/logo-proyecto.png';

/** Carga una imagen; resuelve null si falla (para no romper la exportación). */
function cargarImagen(src: string, crossOrigin = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Caché de imágenes para que al exportar no haya espera (mantiene el "gesto" del
// usuario intacto y permite abrir la hoja de compartir directamente).
let _universe: HTMLImageElement | null | undefined;
let _logo: HTMLImageElement | null | undefined;

/** Precarga las imágenes del acta. Llamar al montar la vista. */
export async function preloadActaAssets(): Promise<void> {
  if (_universe === undefined) _universe = await cargarImagen(UNIVERSE_IMG, true);
  if (_logo === undefined) _logo = await cargarImagen(LOGO_IMG, false);
}

/** Dibuja una imagen cubriendo (cover) el rectángulo dado, centrada. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const r = w / h;
  let dw: number, dh: number;
  if (ir > r) { dh = h; dw = h * ir; } else { dw = w; dh = w / ir; }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// ───────────────────────────── Utilidades ─────────────────────────────

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** '2026-07-25' → '25 de julio de 2026' (o el string tal cual si no parsea). */
export function fechaLarga(iso: string): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mm, dd] = m;
  const mes = MESES[parseInt(mm, 10) - 1] || '';
  return `${parseInt(dd, 10)} de ${mes} de ${y}`;
}

function horario(a: ActaGlobalizacion): string {
  if (a.horaInicio && a.horaFin) return `${a.horaInicio} – ${a.horaFin} hrs`;
  if (a.horaInicio) return `${a.horaInicio} hrs`;
  return '—';
}

function nombreArchivo(a: ActaGlobalizacion, ext: string): string {
  const base = (a.titulo || 'Acta de Globalizacion').trim();
  const fecha = a.fecha || new Date().toISOString().slice(0, 10);
  const limpio = base.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${limpio}_${fecha}.${ext}`;
}

// ═══════════════════════════════════════════════════════════════════════
//  EXPORTAR PDF  (vectorial, limpio, pensado para imprimir)
// ═══════════════════════════════════════════════════════════════════════

export function exportActaPDF(acta: ActaGlobalizacion): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const teal: [number, number, number] = [13, 148, 136];
  const dark: [number, number, number] = [30, 41, 59];
  const gray: [number, number, number] = [100, 116, 139];

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Encabezado institucional ──
  doc.setFillColor(...teal);
  doc.rect(0, 0, pageW, 4, 'F');

  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('LICEO BICENTENARIO WILLIAM TAYLOR', margin, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text('Equipo de Proyectos · ZenitApp', margin, y + 6.5);
  y += 14;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 9;

  // ── Título ──
  doc.setTextColor(...teal);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('ACTA DE GLOBALIZACIÓN', margin, y);
  y += 7.5;

  if (acta.titulo) {
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const tl = doc.splitTextToSize(acta.titulo, contentW);
    doc.text(tl, margin, y);
    y += tl.length * 6 + 1;
  }
  y += 3;

  // ── Metadatos (fecha, horario, lugar) ──
  const meta: [string, string][] = [
    ['Fecha', fechaLarga(acta.fecha)],
    ['Horario', horario(acta)],
    ['Lugar / Modalidad', acta.lugar || '—'],
  ];
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  const metaBoxH = 20;
  doc.roundedRect(margin, y, contentW, metaBoxH, 2, 2, 'FD');
  const colW = contentW / 3;
  meta.forEach(([label, val], i) => {
    const cx = margin + colW * i + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...teal);
    doc.text(label.toUpperCase(), cx, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...dark);
    const vl = doc.splitTextToSize(val, colW - 8);
    doc.text(vl, cx, y + 13);
  });
  y += metaBoxH + 9;

  // ── Participantes ──
  const sectionTitle = (t: string) => {
    ensureSpace(14);
    doc.setFillColor(...teal);
    doc.rect(margin, y - 3.2, 2.2, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...dark);
    doc.text(t, margin + 5, y);
    y += 6.5;
  };

  const bodyText = (t: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(t && t.trim() ? t.trim() : 'Sin registro.', contentW);
    lines.forEach((ln: string) => {
      ensureSpace(6);
      doc.text(ln, margin, y);
      y += 5.4;
    });
    y += 5;
  };

  sectionTitle(`Participantes (${acta.participantes.length})`);
  if (acta.participantes.length === 0) {
    bodyText('Sin participantes registrados.');
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    acta.participantes.forEach((p) => {
      ensureSpace(6);
      doc.setTextColor(...teal);
      doc.text('•', margin + 1, y);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(p, contentW - 6);
      doc.text(lines, margin + 6, y);
      y += lines.length * 5.4;
    });
    y += 5;
  }

  sectionTitle('Temas de la reunión');
  bodyText(acta.temas);

  sectionTitle('Propuesta de equipo');
  bodyText(acta.propuesta);

  sectionTitle('Acuerdos tomados');
  bodyText(acta.acuerdos);

  // ── Pie en cada página ──
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text('Acta de Globalización · ZenitApp', margin, pageH - 8);
    doc.text(`Página ${i} de ${total}`, pageW - margin, pageH - 8, { align: 'right' });
  }

  doc.save(nombreArchivo(acta, 'pdf'));
}

// ═══════════════════════════════════════════════════════════════════════
//  EXPORTAR IMAGEN JPG  (fondo de universo, para compartir por WhatsApp)
// ═══════════════════════════════════════════════════════════════════════

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  const paragraphs = (text || '').split('\n');
  for (const para of paragraphs) {
    if (para.trim() === '') { out.push(''); continue; }
    const words = para.split(/\s+/);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export type ActaImageResult = 'shared' | 'opened' | 'downloaded';
export interface ActaImagen { url: string; file: File; nombre: string; }

/** Dibuja el acta en un canvas (fondo de universo + logo + tarjeta). */
async function renderActaCanvas(acta: ActaGlobalizacion): Promise<HTMLCanvasElement> {
  // Usa la caché (si la vista la precargó) o carga ahora.
  await preloadActaAssets();
  const universe = _universe;
  const logo = _logo;

  const W = 1080;
  const PAD = 70;
  const CARD_X = 48;
  const CARD_W = W - CARD_X * 2;
  const INNER = CARD_X + 44;
  const INNER_W = CARD_W - 88;

  // Medición previa para calcular la altura necesaria (nada se corta).
  const meas = document.createElement('canvas').getContext('2d')!;
  const body = 27;
  const lh = 40;

  type Block =
    | { type: 'gap'; h: number }
    | { type: 'section'; label: string }
    | { type: 'lines'; lines: string[]; color: string; size: number; lineH: number; gapAfter: number }
    | { type: 'chips'; items: string[] };

  const blocks: Block[] = [];

  const pushText = (raw: string, opts?: { color?: string; size?: number }) => {
    meas.font = `400 ${opts?.size || body}px Inter, Arial, sans-serif`;
    const lines = wrapCanvasText(meas, raw && raw.trim() ? raw.trim() : 'Sin registro.', INNER_W);
    blocks.push({ type: 'lines', lines, color: opts?.color || 'rgba(255,255,255,0.88)', size: opts?.size || body, lineH: lh, gapAfter: 30 });
  };
  const pushSection = (label: string) => blocks.push({ type: 'section', label });

  pushSection('Participantes');
  if (acta.participantes.length) {
    blocks.push({ type: 'chips', items: acta.participantes });
  } else {
    pushText('Sin participantes registrados.');
  }
  blocks.push({ type: 'gap', h: 14 });
  pushSection('Temas de la reunión');
  pushText(acta.temas);
  pushSection('Propuesta de equipo');
  pushText(acta.propuesta);
  pushSection('Acuerdos tomados');
  pushText(acta.acuerdos);

  // Altura de chips (participantes) — layout tipo flujo.
  const CHIP_H = 52;
  const CHIP_GAP = 14;
  const CHIP_PADX = 24;
  const chipRows = (items: string[]): { rows: string[][] } => {
    meas.font = `600 24px Inter, Arial, sans-serif`;
    const rows: string[][] = [];
    let row: string[] = [];
    let x = 0;
    for (const it of items) {
      const w = meas.measureText(it).width + CHIP_PADX * 2;
      if (x + w > INNER_W && row.length) { rows.push(row); row = []; x = 0; }
      row.push(it);
      x += w + CHIP_GAP;
    }
    if (row.length) rows.push(row);
    return { rows };
  };

  // Calcular altura total del contenido.
  const HEADER_H = 360; // encabezado (logo, títulos, meta)
  let contentH = 0;
  for (const b of blocks) {
    if (b.type === 'gap') contentH += b.h;
    else if (b.type === 'section') contentH += 58;
    else if (b.type === 'lines') contentH += b.lines.length * b.lineH + b.gapAfter;
    else if (b.type === 'chips') {
      const { rows } = chipRows(b.items);
      contentH += rows.length * (CHIP_H + CHIP_GAP) + 16;
    }
  }
  const H = Math.max(1350, HEADER_H + contentH + PAD * 2 + 60);

  const canvas = document.createElement('canvas');
  const scale = 2; // nitidez retina
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // ── Fondo de universo (foto real; respaldo a degradado cósmico) ──
  if (universe) {
    drawCover(ctx, universe, 0, 0, W, H);
    // Velo oscuro para que el texto blanco sea legible.
    ctx.fillStyle = 'rgba(7,4,20,0.42)';
    ctx.fillRect(0, 0, W, H);
    const veil = ctx.createLinearGradient(0, 0, 0, H);
    veil.addColorStop(0, 'rgba(7,4,20,0.30)');
    veil.addColorStop(1, 'rgba(7,4,20,0.74)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a0620');
    bg.addColorStop(0.5, '#120a2e');
    bg.addColorStop(1, '#070311');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // Nebulosas (glows radiales)
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W * 0.15, H * 0.08, 520, 'rgba(124,58,237,0.38)');
  glow(W * 0.95, H * 0.02, 480, 'rgba(6,182,212,0.26)');
  glow(W * 0.85, H * 0.95, 560, 'rgba(217,70,239,0.20)');
  glow(W * 0.1, H * 0.9, 460, 'rgba(37,99,235,0.20)');

  // Estrellas extra solo si NO hay foto (la foto ya trae su propio cielo).
  let seed = 20260725;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const starCount = universe ? 0 : Math.floor((W * H) / 5200);
  for (let i = 0; i < starCount; i++) {
    const x = rnd() * W;
    const yy = rnd() * H;
    const r = rnd() * 1.6 + 0.3;
    const a = rnd() * 0.7 + 0.25;
    ctx.beginPath();
    ctx.arc(x, yy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
    if (r > 1.5) { // brillo en las más grandes
      ctx.beginPath();
      ctx.arc(x, yy, r * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a * 0.12})`;
      ctx.fill();
    }
  }

  // ── Tarjeta de vidrio ──
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const cardTop = 40;
  const cardH = H - 80;
  roundRect(CARD_X, cardTop, CARD_W, cardH, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();
  // luz superior
  ctx.save();
  roundRect(CARD_X, cardTop, CARD_W, cardH, 34);
  ctx.clip();
  const topGlow = ctx.createLinearGradient(0, cardTop, 0, cardTop + 160);
  topGlow.addColorStop(0, 'rgba(94,234,212,0.12)');
  topGlow.addColorStop(1, 'rgba(94,234,212,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(CARD_X, cardTop, CARD_W, 160);
  ctx.restore();

  // ── Encabezado con logo del proyecto ──
  ctx.textBaseline = 'alphabetic';
  const LOGO = 96;
  const logoY = cardTop + 52;
  const textX = logo ? INNER + LOGO + 26 : INNER;

  if (logo) {
    const cx = INNER + LOGO / 2;
    const cy = logoY + LOGO / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, LOGO / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    drawCover(ctx, logo, INNER, logoY, LOGO, LOGO);
    ctx.restore();
    // aro dorado
    ctx.beginPath();
    ctx.arc(cx, cy, LOGO / 2, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(251,191,36,0.7)';
    ctx.stroke();
  }

  ctx.font = '800 22px Inter, Arial, sans-serif';
  ctx.fillStyle = '#5eead4';
  ctx.fillText('LICEO WILLIAM TAYLOR · EQUIPO DE PROYECTOS', textX, logoY + 34);

  ctx.font = '900 46px Outfit, Inter, Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Acta de Globalización', textX, logoY + 82);

  let y = Math.max(logoY + LOGO, logoY + 96) + 14;

  if (acta.titulo) {
    y += 30;
    ctx.font = '700 30px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const tl = wrapCanvasText(ctx, acta.titulo, INNER_W);
    for (const ln of tl) { ctx.fillText(ln, INNER, y); y += 40; }
  }

  // Meta pills
  y += 34;
  const metaItems = [
    `📅  ${fechaLarga(acta.fecha)}`,
    `🕒  ${horario(acta)}`,
    ...(acta.lugar ? [`📍  ${acta.lugar}`] : []),
  ];
  ctx.font = '600 24px Inter, Arial, sans-serif';
  let mx = INNER;
  const metaY = y;
  for (const it of metaItems) {
    const w = ctx.measureText(it).width + 40;
    if (mx + w > INNER + INNER_W) { mx = INNER; y += 60; }
    roundRect(mx, y - 34, w, 48, 24);
    ctx.fillStyle = 'rgba(45,212,191,0.14)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(45,212,191,0.35)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(it, mx + 20, y - 2);
    mx += w + 14;
  }
  y = metaY + 62;

  // separador
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(INNER, y);
  ctx.lineTo(INNER + INNER_W, y);
  ctx.stroke();
  y += 40;

  // ── Bloques de contenido ──
  for (const b of blocks) {
    if (b.type === 'gap') { y += b.h; continue; }
    if (b.type === 'section') {
      ctx.fillStyle = '#2dd4bf';
      roundRect(INNER, y - 20, 6, 26, 3);
      ctx.fill();
      ctx.font = '800 28px Inter, Arial, sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(b.label.toUpperCase(), INNER + 20, y);
      y += 40;
      continue;
    }
    if (b.type === 'lines') {
      ctx.font = `400 ${b.size}px Inter, Arial, sans-serif`;
      ctx.fillStyle = b.color;
      for (const ln of b.lines) { ctx.fillText(ln, INNER, y); y += b.lineH; }
      y += b.gapAfter;
      continue;
    }
    if (b.type === 'chips') {
      const { rows } = chipRows(b.items);
      ctx.font = '600 24px Inter, Arial, sans-serif';
      for (const row of rows) {
        let cx = INNER;
        for (const it of row) {
          const w = ctx.measureText(it).width + CHIP_PADX * 2;
          roundRect(cx, y - 4, w, CHIP_H, 26);
          ctx.fillStyle = 'rgba(94,234,212,0.12)';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(94,234,212,0.32)';
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(it, cx + CHIP_PADX, y + CHIP_H / 2 + 4);
          cx += w + CHIP_GAP;
        }
        y += CHIP_H + CHIP_GAP;
      }
      y += 16;
      continue;
    }
  }

  // Marca de agua inferior
  ctx.font = '600 20px Inter, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('Generado con ZenitApp · Seguimiento 2026', INNER, cardTop + cardH - 34);

  return canvas;
}

/** Genera la imagen del acta y devuelve un URL para previsualizar + el File. */
export async function generarActaImagen(acta: ActaGlobalizacion): Promise<ActaImagen> {
  const canvas = await renderActaCanvas(acta);
  const nombre = nombreArchivo(acta, 'jpg');
  const blob: Blob = await new Promise((res) =>
    canvas.toBlob(b => res(b as Blob), 'image/jpeg', 0.94),
  );
  const url = URL.createObjectURL(blob);
  const file = new File([blob], nombre, { type: 'image/jpeg' });
  return { url, file, nombre };
}

/** Comparte la imagen ya generada (hoja nativa → WhatsApp; o abre; o descarga). */
export async function compartirActaImagen(img: ActaImagen): Promise<ActaImageResult> {
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [img.file] })) {
    try {
      await nav.share({ files: [img.file], title: 'Acta de Globalización' });
      return 'shared';
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'shared'; // el usuario cerró la hoja
    }
  }
  const win = window.open(img.url, '_blank');
  if (!win) { descargarActaImagen(img); return 'downloaded'; }
  return 'opened';
}

/** Descarga la imagen ya generada. */
export function descargarActaImagen(img: ActaImagen): void {
  const a = document.createElement('a');
  a.href = img.url;
  a.download = img.nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
