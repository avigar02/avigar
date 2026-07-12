const fs = require('fs');
const path = require('path');

const baseDir = './productos'; // Tu carpeta principal de productos
const outputFile = './productos.js'; // El archivo que vamos a sobreescribir

let productosTextos = [];

function explorarCarpetas(dir) {
    // Leemos qué hay dentro de la carpeta actual
    let archivos;
    try {
        archivos = fs.readdirSync(dir);
    } catch (error) {
        console.error(`¡Ojo! No se encontró la carpeta ${dir}. Asegúrate de crearla.`);
        return;
    }
    
    for (const archivo of archivos) {
        const rutaCompleta = path.join(dir, archivo);
        
        // Si es una carpeta (como 0001, 0002), nos metemos a buscar
        if (fs.statSync(rutaCompleta).isDirectory()) {
            explorarCarpetas(rutaCompleta);
        } 
        // Si es un archivo de texto (tus códigos generados)
        else if (archivo.endsWith('.txt')) {
            try {
                let contenido = fs.readFileSync(rutaCompleta, 'utf8');
                // Limpiamos espacios extra
                contenido = contenido.trim();
                
                // Si el panel le puso una coma al final (ej: "},"), se la dejamos,
                // si no la tiene, no pasa nada.
                productosTextos.push(contenido);
            } catch (error) {
                console.error(`Error leyendo el archivo: ${rutaCompleta}`);
            }
        }
    }
}

console.log("🛠️ Iniciando la construcción del catálogo...");
console.log("Buscando en la carpeta: /productos");

explorarCarpetas(baseDir);

// Armamos el archivo final. 
// Separamos cada producto con un salto de línea para que quede ordenado.
const contenidoFinal = `// ARCHIVO GENERADO AUTOMÁTICAMENTE - NO EDITAR A MANO\nconst productos = [\n${productosTextos.join('\n')}\n];`;

// Sobreescribimos el productos.js (como ya quitaste tus funciones de ahí, no hay peligro)
fs.writeFileSync(outputFile, contenidoFinal);

console.log(`✅ ¡Éxito, pai! Se integraron ${productosTextos.length} productos en ${outputFile}`);