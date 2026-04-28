const data = require('fs').readFileSync('src/App.tsx', 'utf8');
const noPalette = data.indexOf('Palette') === -1;
if (noPalette) throw new Error("Palette missing");
console.log("All good!");
