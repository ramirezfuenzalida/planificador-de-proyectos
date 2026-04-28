const fs = require('fs');

let appSrc = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add 'analytics' into the `view` type
appSrc = appSrc.replace(
  "useState<'courses' | 'classes' | 'reports'>('courses')",
  "useState<'courses' | 'classes' | 'reports' | 'analytics'>('courses')"
);

// 2. Add analytics icon
appSrc = appSrc.replace("PieChart,\n", "PieChart,\n  LineChart,\n  Filter,\n"); // If LineChart doesn't exist, we fallback. Let's just use BarChart2

// 3. Insert the global data states right under toastMessage
const globalStates = `
  const [globalData, setGlobalData] = useState<{pm: any[], sm: any[]}>({pm: [], sm: []});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsLevel, setAnalyticsLevel] = useState('All');
  const [analyticsPeriod, setAnalyticsPeriod] = useState('Anual');
  const [analyticsSubPeriod, setAnalyticsSubPeriod] = useState('Todos');
`;
appSrc = appSrc.replace(
  "const [toastMessage, setToastMessage] = useState<string | null>(null);",
  "const [toastMessage, setToastMessage] = useState<string | null>(null);\n" + globalStates
);

// 4. Insert parseDate helper
const dateHelpers = `
const parseGoogleDate = (dateStr: any) => {
  if (!dateStr) return null;
  const match = String(dateStr).match(/Date\\((\\d+),(\\d+),(\\d+)\\)/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
  }
  return null;
};
const getTrimester = (date: Date) => {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'Trimestre 1';
  if (m >= 5 && m <= 7) return 'Trimestre 2';
  if (m >= 8 && m <= 11) return 'Trimestre 3';
  return 'Verano';
};
const getMonthString = (date: Date) => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return months[date.getMonth()];
};
`;

appSrc = appSrc.replace("const App = () => {", dateHelpers + "\nconst App = () => {");

// 5. Add fetch global useEffect inside App
const globalFetchEffect = `
  useEffect(() => {
    if ((view === 'analytics' || view === 'reports') && globalData.pm.length === 0) {
      const fetchGlobal = async () => {
        setAnalyticsLoading(true);
        try {
          const res1 = await fetch(\`https://docs.google.com/spreadsheets/d/\${PRIMERO_MEDIO_SHEET}/gviz/tq?tqx=out:json&gid=1238478499\`);
          const text1 = await res1.text();
          const j1 = JSON.parse(text1.substring(text1.indexOf('{'), text1.lastIndexOf('}') + 1));
          
          const res2 = await fetch(\`https://docs.google.com/spreadsheets/d/\${SEGUNDO_MEDIO_SHEET}/gviz/tq?tqx=out:json\`);
          const text2 = await res2.text();
          const j2 = JSON.parse(text2.substring(text2.indexOf('{'), text2.lastIndexOf('}') + 1));
          
          setGlobalData({
            pm: j1.table.rows.filter((r: any) => r && r.c && r.c[1]?.v).map((r: any) => ({ clase: r.c[1]?.v, fecha: r.c[5]?.f || r.c[5]?.v })),
            sm: j2.table.rows.filter((r: any) => r && r.c && r.c[1]?.v).map((r: any) => ({ clase: r.c[1]?.v, fecha: r.c[4]?.f || r.c[4]?.v }))
          });
        } catch(e) { } finally { setAnalyticsLoading(false); }
      };
      fetchGlobal();
    }
  }, [view, globalData.pm.length]);
`;
appSrc = appSrc.replace("const PRIMERO_MEDIO_SHEET =", globalFetchEffect + "\n  const PRIMERO_MEDIO_SHEET =");

fs.writeFileSync('src/App.tsx', appSrc);
console.log("Patched state correctly.");
