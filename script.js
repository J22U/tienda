// Usamos tu URL real de Render
const URL_API = 'https://tienda-1vps.onrender.com/productos';

// 1. Cargar productos al abrir la página
async function cargarProductos() {
    try {
        const respuesta = await fetch(URL_API);
        const productos = await respuesta.json();
        
        const tabla = document.getElementById('tabla-productos');
        if (!tabla) return; // Seguridad por si el ID no existe en el HTML
        
        tabla.innerHTML = ''; // Limpiar tabla

        productos.forEach(p => {
            // Nota: SQL devuelve los nombres con Mayúsculas (ProductoID, Nombre, Stock, etc.)
            const claseStock = p.Stock < 5 ? 'table-danger' : '';
            const id = p.ProductoID; // Nombre exacto que viene de tu SQL

            tabla.innerHTML += `
                <tr class="${claseStock}">
                    <td>${p.CodigoSKU || 'S/N'}</td>
                    <td>${p.Nombre}</td>
                    <td>${p.Marca}</td>
                    <td><strong>${p.Stock}</strong></td>
                    <td>$${p.Precio}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="venderUno(${id})">Venta Rápida (-1)</button>
                        <button class="btn btn-sm btn-danger" onclick="eliminar(${id})">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// 2. Función de Venta Rápida
async function venderUno(id) {
    // IMPORTANTE: Asegúrate de tener esta ruta POST /vender en tu app.js
    const res = await fetch('https://tienda-1vps.onrender.com/vender', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ productoId: id, cantidad: 1, nombreCliente: 'Venta Mostrador' })
    });

    if(res.ok) {
        Swal.fire('Vendido', 'El stock se actualizó en SQL Server', 'success');
        cargarProductos();
    } else {
        Swal.fire('Error', 'No se pudo procesar la venta', 'error');
    }
}

// 3. Función para guardar el producto desde el Panel Admin
async function guardarProducto(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('sku', document.getElementById('codigo').value); // Coincidir con app.js
    formData.append('nombre', document.getElementById('nombre').value);
    formData.append('marca', document.getElementById('marca').value);
    formData.append('precio', document.getElementById('precio').value);
    formData.append('stock', document.getElementById('stock').value);
    formData.append('caracteristicas', ''); // Campo extra requerido en tu app.js
    
    // Si tienes un input de archivos
    const fotoInput = document.getElementById('inputFoto');
    if (fotoInput && fotoInput.files[0]) {
        formData.append('imagenes', fotoInput.files[0]);
    }

    const res = await fetch(URL_API, {
        method: 'POST',
        body: formData 
    });

    if(res.ok) {
        Swal.fire('¡Éxito!', 'Producto guardado en la nube', 'success');
        cargarProductos(); 
    }
}

// Inicializar
cargarProductos();