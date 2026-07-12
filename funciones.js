 
      
    function ejecutarBusqueda() {
    const input = document.getElementById('inputBuscador');
    if (!input) return;
    
    const texto = input.value.toLowerCase().trim();
    
    if (texto === "") {
        if (typeof aplicarFiltrosCruzados === 'function') {
            aplicarFiltrosCruzados(); 
        }
        mostrarProductosPorBloque(true); 
        return;
    }
    
 // Filtramos usando el nombre donde están tus códigos
    productosFiltrados = productos.filter(prod => {
        const nombre = prod.nombre ? String(prod.nombre).toLowerCase() : '';
        return nombre.includes(texto);
    });
    
    mostrarProductosPorBloque(true);
}
// Variable global para recordar qué producto tenemos abierto en el modal
let productoActual = null;

// Esta es la función que conectamos al HTML
// Esta es la función que conectamos al HTML
window.cambiarImagenSegunColor = function() {
    // 1. Usamos tu variable real (productoSeleccionadoActual)
    if (!productoSeleccionadoActual) return;

    // 2. Obtenemos el color que el usuario eligió
    const colorSeleccionado = document.getElementById('selector-color').value;
    
    // 3. Buscamos la foto vinculada (funcionará con la nueva estructura del Admin)
    if (productoSeleccionadoActual.variantes) {
        const variante = productoSeleccionadoActual.variantes.find(v => v.nombre === colorSeleccionado);
        
        if (variante && variante.imagen) {
            // 4. Usamos el ID real de tu foto (modal-foto-principal)
            document.getElementById('modal-foto-principal').src = variante.imagen;
        }
    }
};window.abrirGuiaTallas = function() {
    // Si no hay producto o no tiene guía, no hace nada
    if (!productoSeleccionadoActual || !productoSeleccionadoActual.guiaTallas) return;
    
    // Le pasamos la foto al modal y lo abrimos
    document.getElementById('img-guia-tallas').src = productoSeleccionadoActual.guiaTallas;
    document.getElementById('modalGuiaTallas').style.display = 'flex';
};

window.cerrarGuiaTallas = function() {
    document.getElementById('modalGuiaTallas').style.display = 'none';
};