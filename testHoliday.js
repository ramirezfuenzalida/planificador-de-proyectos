const FERIADOS_CHILE_2026 = [
  '2026-01-01', '2026-04-03', '2026-04-04', '2026-05-01',
  '2026-05-21', '2026-06-21', '2026-06-29', '2026-07-16',
  '2026-08-15', '2026-09-18', '2026-09-19', '2026-10-12',
  '2026-10-31', '2026-11-01', '2026-12-08', '2026-12-25'
];

const isHoliday = (d) => {
  if (!d) return false;
  const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return FERIADOS_CHILE_2026.includes(str);
};

const d = new Date(2026, 4, 1);
console.log("Check May 1:", isHoliday(d), "Str:", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);

// Run the full algorithm to see what happens
const rows = [
  { c: { 5: { v: "Date(2026,3,20)", f: "20 abr" } } },
  { c: { 5: { v: "Date(2026,4,1)", f: "1 may" } } }, // May 1
  { c: { 5: { v: "Date(2026,4,8)", f: "8 may" } } }
];

const parseGoogleDate = (dateStr) => {
  if (!dateStr) return null;
  const match = String(dateStr).match(/Date\((\d+),(\d+),(\d+)\)/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
  }
  return null;
};

const applyDateShifting = (rows, dateColIndex) => {
  if (!rows || rows.length === 0) return rows;

  const allProposedDates = rows.map(r => parseGoogleDate(r?.c?.[dateColIndex]?.v)).filter(d => d !== null);
  const validDates = allProposedDates.filter(d => !isHoliday(d));
  let lastExtrapolated = validDates.length > 0 ? new Date(validDates[validDates.length - 1].getTime()) : new Date();

  return rows.map((r, i) => {
    let newDate;
    if (i < validDates.length) {
      newDate = validDates[i];
    } else {
      do {
        lastExtrapolated.setDate(lastExtrapolated.getDate() + 7);
      } while (isHoliday(lastExtrapolated));
      newDate = new Date(lastExtrapolated.getTime());
    }

    if (r && r.c && r.c[dateColIndex]) {
       const strDate = newDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long'});
       r.c[dateColIndex].v = `Date(${newDate.getFullYear()},${newDate.getMonth()},${newDate.getDate()})`;
       r.c[dateColIndex].f = strDate;
    }
    return r;
  });
};

const res = applyDateShifting(rows, 5);
console.log(JSON.stringify(res, null, 2));
