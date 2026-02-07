const URL_API = 'http://localhost:3000/productos';

// 1. Cargar productos al abrir la página
async function cargarProductos() {
    const respuesta = await fetch(URL_API);
    const productos = await respuesta.json();
    
    const tabla = document.getElementById('tabla-productos');
    tabla.innerHTML = ''; // Limpiar tabla

    productos.forEach(p => {
        // Alerta visual si hay poco stock
        const claseStock = p.Stock < 5 ? 'table-danger' : '';

        tabla.innerHTML += `
            <tr class="${claseStock}">
                <td>${p.Codigo}</td>
                <td>${p.Nombre}</td>
                <td>${p.Marca}</td>
                <td><strong>${p.Stock}</strong></td>
                <td>$${p.Precio}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="venderUno(${p.ID})">Venta Rápida (-1)</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminar(${p.ID})">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

// 2. Función de Venta Rápida
async function venderUno(id) {
    const res = await fetch('http://localhost:3000/vender', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ productoId: id, cantidad: 1, nombreCliente: 'Venta Mostrador' })
    });

    if(res.ok) {
        Swal.fire('Vendido', 'El stock se actualizó en SQL Server', 'success');
        cargarProductos();
    } else {
        Swal.fire('Error', 'No hay suficiente stock', 'error');
    }
}

// 3. Función para guardar el producto desde el Panel Admin
async function guardarProducto(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('codigo', document.getElementById('codigo').value);
    formData.append('nombre', document.getElementById('nombre').value);
    formData.append('marca', document.getElementById('marca').value);
    formData.append('precio', document.getElementById('precio').value);
    formData.append('stock', document.getElementById('stock').value);
    formData.append('categoriaId', 1); // Por ahora asignamos la 1 (Motosierras)
    formData.append('imagen', document.getElementById('inputFoto').files[0]); // El archivo

    const res = await fetch('http://localhost:3000/productos', {
        method: 'POST',
        body: formData // Enviamos el formulario con la foto
    });

    if(res.ok) {
        alert("¡Producto guardado con éxito!");
        cargarProductos(); // Refrescar la tabla
    }
}

// Inicializar
cargarProductos();