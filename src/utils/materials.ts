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
  const s = String(url).trim();
  if (!s || s === "null" || s === "") return "#";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("www.")) return `https://${s}`;
  if (s.includes("docs.google.com") || s.includes("canva.com") || s.includes("sites.google.com")) {
    const cleaned = s.replace(/^https?:\/\//, "");
    return `https://${cleaned}`;
  }
  return "#";
};
