import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import csv from 'csv-parser';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function descargarImagen(url, nombreDestino) {
  try {
    const respuesta = await fetch(url);
    const arrayBuffer = await respuesta.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const rutaDestino = path.resolve('fotos', nombreDestino);
    fs.writeFileSync(rutaDestino, buffer);
    return true;
  } catch (err) {
    console.log(`⚠️ No se pudo descargar la foto desde el link: ${url}`);
    return false;
  }
}

const productos = [];
fs.createReadStream('productos.csv')
  .pipe(csv())
  .on('data', (row) => { productos.push(row); })
  .on('end', async () => {
    if (!fs.existsSync('fotos')) fs.mkdirSync('fotos');
    console.log(`\n🤖 GitHub conectado. Encontré ${productos.length} productos listos para procesar.`);
    
    const browser = await puppeteer.launch({ 
      headless: false, 
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    await page.goto('https://fourthwall.com', { waitUntil: 'domcontentloaded', timeout: 0 });

    console.log('\n============================================================');
    console.log('⏰ TIENES 120 SEGUNDOS PARA INICIAR SESIÓN EN LA VENTANA DE CHROME');
    console.log('============================================================\n');
    
    await delay(120000); 
    
    console.log('🚀 Iniciando la carga robótica completa...');

    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i];
      const nombre = producto.title || producto.Title;
      const precio = producto.Price || producto.price;
      const descripcion = producto.Description || producto.description || nombre;
      const linkImagen = producto.Images || producto.images || producto.Images;
      const nombreFotoTemporal = `foto_maqueta_${i}.jpg`;

      try {
        console.log(`\n📦 [${i+1}/${productos.length}] Subiendo: ${nombre}`);

        let imagenLista = false;
        if (linkImagen && linkImagen.startsWith('http')) {
          console.log('🌐 Bajando maqueta de internet...');
          imagenLista = await descargarImagen(linkImagen.trim(), nombreFotoTemporal);
        }

        await page.evaluate(() => {
          const botones = Array.from(document.querySelectorAll('button'));
          const btn = botones.find(b => b.textContent.includes('Product') || b.textContent.includes('Add') || b.textContent.includes('Create'));
          if (btn) btn.click();
        });
        await delay(5000);

        await page.evaluate(() => {
          const input = document.querySelector('input[type="text"]') || document.querySelector('input[placeholder*="title" i]');
          if (input) { input.focus(); input.click(); }
        });
        await delay(500);
        await page.keyboard.type(nombre, { delay: 60 });
        await delay(1000);

        if (descripcion) {
          console.log('📝 Redactando descripción automática...');
          await page.evaluate(() => {
            const txtArea = document.querySelector('textarea') || document.querySelector('div[contenteditable="true"]');
            if (txtArea) { txtArea.focus(); txtArea.click(); }
          });
          await delay(500);
          await page.keyboard.type(descripcion, { delay: 30 });
          await delay(1000);
        }

        await page.evaluate(() => {
          const inputPrecio = document.querySelector('input[type="number"]') || document.querySelector('input[placeholder*="0.00"]');
          if (inputPrecio) { inputPrecio.focus(); inputPrecio.click(); }
        });
        await delay(500);
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await delay(500);
        await page.keyboard.type(precio, { delay: 60 });
        await delay(1000);

        if (imagenLista) {
          const rutaLocalFoto = path.resolve('fotos', nombreFotoTemporal);
          console.log('📸 Adjuntando imagen de la maqueta...');
          const inputElement = await page.\$('input[type="file"]');
          if (inputElement) {
            await inputElement.uploadFile(rutaLocalFoto);
            await delay(8000);
          }
        }

        console.log('💾 Guardando en la tienda...');
        await page.evaluate(() => {
          const botones = Array.from(document.querySelectorAll('button'));
          const btnGuardar = botones.find(b => b.textContent.toLowerCase().includes('save') || b.textContent.toLowerCase().includes('guardar') || b.type === 'submit');
          if (btnGuardar) btnGuardar.click();
        });

        await delay(6000);
        
      } catch (err) {
        console.log('❌ Ocurrió un detalle con este producto, saltando al siguiente...');
        await delay(3000);
      }
    }
    console.log('\n🎉 ¡Felicidades! Se ha desplegado todo tu catálogo con fotos y descripciones.');
    await browser.close();
  });
