/**
 * Utilidades Senior para la gestión de materiales pedagógicos en ZenitApp.
 */

export const getMaterialLinks = (cells: any[]) => {
  let canva: any = null, ppt: any = null, sites: any = null;
  if (!cells || !Array.isArray(cells)) return { canva, ppt, sites };
  
  // Nivel 1: Detección por Hipervínculos
  cells.forEach((cell: any) => {
    if (!cell || !cell.l) return;
    const link = String(cell.l).trim();
    const l = link.toLowerCase();
    if (l.includes("spreadsheets") || l.includes("viewform")) return;

    if (l.includes("presentation") || l.includes("docs.google.com/presentation") || l.endsWith(".pptx")) {
      ppt = link;
    } else if (l.includes("canva.com") || l.includes("canva.link") || l.includes("design")) {
      canva = link;
    } else if (l.includes("sites.google.com")) {
      sites = link;
    } else if (!canva && (l.includes("canva") || l.includes("drive.google.com"))) {
      canva = link;
    }
  });

  // Nivel 2: Detección por Texto
  cells.forEach((cell: any) => {
    if (!cell || cell.l) return;
    const val = String(cell.v || "").trim();
    if (!val || val === "null" || val.length < 5) return;
    const v = val.toLowerCase();

    if (!ppt && (v.includes("docs.google.com/presentation") || v.includes("presentation"))) {
      ppt = val;
    }
    if (!canva && (v.includes("canva.com") || v.includes("canva.link") || v.includes("design"))) {
      canva = val;
    }
    if (!sites && v.includes("sites.google.com")) {
      sites = val;
    }
  });

  return { canva, ppt, sites };
};

export const ensureHttps = (url: any) => {
  if (!url) return "#";
  let s = String(url).trim();
  if (!s || s === "null" || s === "") return "#";

  // Si la celda trae texto alrededor del enlace (ej. "1MA: https://... .pptx",
  // "Presentación: www.…"), extrae SOLO la URL. Sin esto, el <a> quedaba en "#"
  // y abría la portada en vez del material.
  const urlMatch = s.match(/https?:\/\/[^\s]+/i) || s.match(/\bwww\.[^\s]+/i);
  if (urlMatch) s = urlMatch[0];
  // Limpia puntuación/paréntesis pegados al final.
  s = s.replace(/[)\]\}>.,;]+$/, "");

  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("www.")) return `https://${s}`;
  // Cualquier cosa que parezca un dominio (contiene un punto y sin espacios) se
  // abre con https — cubre PowerPoint/OneDrive/SharePoint/Office además de Google.
  if (/^[^\s]+\.[^\s]+$/.test(s)) {
    return `https://${s.replace(/^https?:\/\//, "")}`;
  }
  return "#";
};

/**
 * URL para ABRIR una presentación. Se abre el enlace TAL CUAL (Drive, OneDrive,
 * SharePoint, Slides o archivo directo): cada plataforma/dispositivo usa su propio
 * visor. Antes se envolvía en el visor de Office online, pero ese solo funciona con
 * archivos públicos de acceso directo y fallaba ("no se pudo abrir el archivo") con
 * enlaces de Drive/OneDrive o privados.
 */
export const pptViewerUrl = (url: any) => {
  const s = ensureHttps(url);
  if (s === "#") return s;

  // Google Slides / Presentaciones: usar /preview LIMPIO (sin ?rtpof/&sd/&ouid ni
  // /edit). Es el modo más compatible para ver en iPhone/iPad, siempre que el
  // archivo esté compartido. Si es privado, Google igual pedirá permiso/sesión.
  const slidesId = s.match(/presentation\/d\/([A-Za-z0-9_-]+)/)?.[1];
  if (slidesId) return `https://docs.google.com/presentation/d/${slidesId}/preview`;

  // Google Drive (archivo): vista previa.
  if (s.includes("drive.google.com")) {
    const id = s.match(/\/file\/d\/([A-Za-z0-9_-]+)/)?.[1]
      || s.match(/[?&]id=([A-Za-z0-9_-]+)/)?.[1];
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  }
  return s;
};
