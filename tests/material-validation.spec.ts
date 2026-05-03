import { test, expect } from '@playwright/test';

test('Debe mostrar botones de material pedagógico cuando existan enlaces', async ({ page }) => {
  // Navegamos a la app (ajustar puerto si es necesario)
  await page.goto('http://localhost:5173');

  // Esperamos a que carguen los datos de Sheets
  await page.waitForTimeout(5000);

  // Verificamos si hay botones de material en las tarjetas o modales
  // Buscamos elementos que contengan la clase de estilo de material
  const canvaButtons = page.locator('.canva-style');
  const pptButtons = page.locator('.material-btn-pro');

  // Log para depuración senior
  const count = await canvaButtons.count();
  console.log(`Detección de botones Canva: ${count}`);
  
  // Al menos un botón debería existir si el Sheets tiene datos
  // (Este test es un ejemplo, se debe ajustar a datos reales)
});
