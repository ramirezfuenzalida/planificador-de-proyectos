import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface StudentData {
  name: string;
  role: string;
  groupId: number;
  history: Array<{ classId: string; date: string; status: 'green' | 'yellow' | 'red' | 'none' }>;
  proposed: number | null;
  grade: string;
  comment: string;
  counts: { green: number; yellow: number; red: number };
}

export const exportStudentPDF = (
  student: StudentData,
  courseTag: string,
  levelClasses: any[]
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [109, 40, 217]; // Violeta #6d28d9

  // 1. ENCABEZADO INSTITUCIONAL
  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, 210, 8, 'F'); // Franja superior violeta

  // Membrete
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128); // Gris medio
  doc.text('LICEO METODISTA WILLIAM TAYLOR', 14, 18);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Departamento de Aprendizaje Basado en Proyectos (ABP)', 14, 22);
  doc.text('Co-Responsabilidad y Roles Cooperativos · Alto Hospicio', 14, 26);

  // Línea decorativa
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(14, 29, 196, 29);

  // Título del reporte
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55); // Gris oscuro
  doc.text('INFORME DE EVALUACIÓN FORMATIVA Y ACTITUDINAL', 14, 38);
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`Periodo Escolar: Año Académico 2026 · Reporte emitido el: ${new Date().toLocaleDateString()}`, 14, 43);

  // 2. TABLA DE IDENTIFICACIÓN DEL ESTUDIANTE
  (doc as any).autoTable({
    startY: 48,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [55, 65, 81],
      font: 'Helvetica'
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: primaryColor, width: 40 },
      1: { width: 60 },
      2: { fontStyle: 'bold', textColor: primaryColor, width: 35 },
      3: { width: 55 }
    },
    body: [
      ['Estudiante:', student.name.toUpperCase(), 'Curso:', courseTag],
      ['Rol Asignado:', student.role, 'Grupo de Trabajo:', `Equipo N° ${student.groupId}`],
      ['Instrumento:', 'Rúbrica de Hitos Formativos', 'Estado Académico:', student.grade ? 'Calificado' : 'Evaluación Continua']
    ]
  });

  const nextY = (doc as any).lastAutoTable.finalY + 6;

  // 3. TABLA DE MÉTRICAS Y CALIFICACIONES
  (doc as any).autoTable({
    startY: nextY,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
      halign: 'center',
      textColor: [55, 65, 81],
      lineColor: [229, 231, 235]
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    head: [['Hitos Logrados (L)', 'En Desarrollo (PL)', 'No Logrados (NL)', 'Clases Evaluadas', 'Nota Propuesta', 'Calificación Oficial']],
    body: [[
      student.counts.green.toString(),
      student.counts.yellow.toString(),
      student.counts.red.toString(),
      student.history.length.toString(),
      student.proposed ? student.proposed.toFixed(1) : '—',
      student.grade ? student.grade : 'Pendiente'
    ]]
  });

  const tableY = (doc as any).lastAutoTable.finalY + 8;

  // 4. HISTORIAL CRONOLÓGICO DE SESIONES
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  doc.text('HISTORIAL CRONOLÓGICO DE HITOS EVALUADOS', 14, tableY);

  const histBody = student.history.map((h) => {
    const classData = levelClasses.find(c => String(c.clase) === String(h.classId));
    const objetivo = classData ? classData.objetivo : 'Objetivo de la sesión formativa';
    
    let statusText = 'Sin Evaluar';
    if (h.status === 'green') statusText = 'Logrado (L)';
    else if (h.status === 'yellow') statusText = 'En Desarrollo (PL)';
    else if (h.status === 'red') statusText = 'No Logrado (NL)';

    return [
      `Sesión ${h.classId}`,
      h.date,
      objetivo.length > 70 ? objetivo.substring(0, 68) + '...' : objetivo,
      statusText
    ];
  });

  (doc as any).autoTable({
    startY: tableY + 3,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [75, 85, 99],
      lineColor: [243, 244, 246]
    },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 25, halign: 'center' },
      1: { width: 22, halign: 'center' },
      2: { width: 105 },
      3: { fontStyle: 'bold', width: 38, halign: 'center' }
    },
    head: [['Sesión', 'Fecha', 'Objetivo de Aprendizaje / Hito', 'Desempeño']],
    body: histBody.length > 0 ? histBody : [['—', '—', 'No se registran sesiones evaluadas para el estudiante en este periodo.', '—']]
  });

  const feedbackY = (doc as any).lastAutoTable.finalY + 8;

  // 5. SECCIÓN DE RETROALIMENTACIÓN DEL DOCENTE
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 41, 55);
  doc.text('RETROALIMENTACIÓN PEDAGÓGICA Y OBSERVACIONES', 14, feedbackY);

  // Tarjeta de fondo para la retroalimentación
  const commentText = student.comment 
    ? student.comment 
    : 'No se registran observaciones cualitativas para el estudiante en este periodo. Se destaca el cumplimiento general de su rol asignado en las sesiones de trabajo cooperativo en aula.';

  const splitComment = doc.splitTextToSize(commentText, 172);
  const cardHeight = Math.max(18, splitComment.length * 5 + 8);

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(14, feedbackY + 3, 182, cardHeight, 3, 3, 'FD');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text(splitComment, 18, feedbackY + 9);

  // 6. ÁREA DE FIRMAS
  const signatureY = Math.min(270, feedbackY + cardHeight + 25);

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.4);

  // Línea Firma Docente
  doc.line(25, signatureY, 85, signatureY);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Firma Docente Guía', 55, signatureY + 4, { align: 'center' });
  doc.text('Liceo William Taylor', 55, signatureY + 8, { align: 'center' });

  // Línea Firma UTP
  doc.line(125, signatureY, 185, signatureY);
  doc.text('Unidad Técnica Pedagógica', 155, signatureY + 4, { align: 'center' });
  doc.text('Dirección Académica', 155, signatureY + 8, { align: 'center' });

  // Guardar documento
  const fileName = `Informe_Formativo_${student.name.replace(/\s+/g, '_')}_${courseTag}.pdf`;
  doc.save(fileName);
};
