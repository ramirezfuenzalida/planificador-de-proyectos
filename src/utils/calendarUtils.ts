
export const isHoliday = (date: Date) => {
  const holidays = [
    '2026-01-01', '2026-04-03', '2026-04-04', '2026-05-01', 
    '2026-05-21', '2026-06-21', '2026-06-29', '2026-07-16', 
    '2026-08-15', '2026-09-18', '2026-09-19', '2026-10-12', 
    '2026-10-27', '2026-10-31', '2026-11-01', '2026-12-08', 
    '2026-12-25'
  ];
  const dateStr = date.toISOString().split('T')[0];
  return holidays.includes(dateStr);
};

export const getCalendarDays = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const days = [];
  const startOffset = firstDay.getDay(); // Sunday start
  
  // Previous month days
  for (let i = startOffset; i > 0; i--) {
    const prevDate = new Date(year, month, 1 - i);
    days.push({ day: prevDate.getDate(), currentMonth: false, date: prevDate });
  }
  
  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
  }

  // Next month days to complete the grid (up to 42 cells for 6 rows)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    days.push({ day: nextDate.getDate(), currentMonth: false, date: nextDate });
  }
  
  return days;
};

export const getTrimester = (date: Date) => {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'Trimestre 1';
  if (month >= 5 && month <= 7) return 'Trimestre 2';
  if (month >= 8 && month <= 11) return 'Trimestre 3';
  return 'Fuera de Período';
};

export const getMonthString = (date: Date) => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[date.getMonth()];
};

export const parseGoogleDate = (val: any) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  
  const str = String(val);
  
  // Handle Date(2026,3,1) format from Google Sheets gviz
  if (str.includes('Date(')) {
    const parts = str.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
    }
  }

  // Handle DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const y = parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
    return new Date(y, m, d);
  }

  // Handle ISO or other valid formats
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
};
