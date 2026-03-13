// js/admin.js - Panel Admin Completo (CSP-safe) - Updated for Screenshot Layout
document.addEventListener('DOMContentLoaded', function() {
    // 🔒 Session check
    if (!localStorage.getItem('admin_logged')) {
        window.location.replace('tienda.html');
        return;
    }

    // 🌐 Socket.io real-time (CSP allowed)
    const socket = io();
    socket.on('connect', () => console.log('🔌 Socket admin conectado'));
    socket.on('nuevo-pedido', (data) => {
        mostrarNotificacion(`🛒 Nuevo pedido #${data.NumeroDisplay}`);
        cargarPedidos(); // Auto-reload
    });

    // 📱 Elements
    const listaProductos = document.getElementById('lista-productos');
    const listaPedidos = document.getElementById('lista-pedidos');
    const listaAgotados = document.getElementById('lista-agotados');
    const formProducto = document.getElementById('form-producto');
    const buscarProd = document.getElementById('buscar-prod');
    const totalCount = document.getElementById('total-count');
    const agotadosCount = document.getElementById('agotados-count');
    const orderCount = document.getElementById('order-count');

    let productos = [], pedidos = [], filtroEstado = 'Todos';

    // 🎛️ Tabs
    document.querySelectorAll('[data-bs-toggle="pill"]').forEach(btn => {
        btn.addEventListener('shown.bs.tab', (e) => {
            const tab = e.target.dataset.tab;
            if (tab === 'inventario') cargarProductos();
            if (tab === 'agotados') cargarAgotados();
            if (tab === 'pedidos') cargarPedidos();
        });
    });

    // 🔍 Buscador productos
    buscarProd.addEventListener('input', filtrarProductos);

    // 📝 Form submit
    formProducto.addEventListener('submit', guardarProducto);

    // 🚪 Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('admin_logged');
        window.location.replace('tienda.html');
    });

    // 🎯 Inicializar
    cargarProductos();
    cargarPedidos();

    // 🌍 Global functions for delegation
    window.prepararEdicion = prepararEdicion;
    window.eliminarProducto = eliminarProducto;
    window.aplicarDescuentoProducto = aplicarDescuentoProducto;
    window.filtrarPedidos = filtrarPedidos;
    window.exportarInventario = exportarInventario;
});

// 🛒 Load Products
async function cargarProductos() {
    const lista = document.getElementById('lista-productos');
    mostrarLoader(lista, true);
    
    try {
        const res = await fetch('/productos');
        productos = await res.json();
        renderProductos(productos, lista);
        actualizarContadores();
    } catch (err) {
        lista.innerHTML = `<div class="alert alert-warning">Error cargando productos: ${err.message}</div>`;
    } finally {
        mostrarLoader(lista, false);
    }
}

// 📦 Render Products - Fixed for Screenshot Layout
function renderProductos(prods, container) {
    if (!prods.length) {
        container.innerHTML = '<div class="text-center py-5"><i class="bi bi-boxes fs-1 text-muted mb-3"></i><p class="text-muted">No hay productos</p></div>';
        return;
    }
    
    container.innerHTML = prods.map(p => `
        <div class="product-row" data-producto='${JSON.stringify(p).replace(/'/g, "\\'")}'>
            <div class="actions-left">
                <button class="action-btn btn btn-sm btn-outline-primary me-1" data-action="edit" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="action-btn btn btn-sm btn-outline-danger me-1" data-action="delete" title="Eliminar"><i class="bi bi-trash"></i></button>
                <button class="action-btn btn btn-sm btn-outline-warning" data-action="discount" title="Descuento"><i class="bi bi-percent"></i></button>
            </div>
            <div class="product-img flex-shrink-0 ms-2">
                <img src="${p.ImagenURL || '/uploads/default.jpg'}" class="rounded" style="width:50px;height:50px;object-fit:cover;">
            </div>
            <div class="product-info flex-grow-1 ps-2">
                <div class="product-name fw-bold">${p.Nombre}</div>
                <small class="text-muted product-meta">${p.Marca || ''} ${p.CodigoSKU ? '| ' + p.CodigoSKU : ''}</small>
            </div>
            <div class="product-right text-end pe-2">
                <div class="price-highlight fw-bold fs-5">$ ${Number(p.Precio).toLocaleString('es-CO')}</div>
                <small class="badge stock-badge ${p.Stock > 5 ? 'bg-success' : p.Stock > 0 ? 'bg-warning' : 'bg-danger'}">${p.Stock} und</small>
            </div>
        </div>
    `).join('');
}

// 🔍 Filter Products
function filtrarProductos() {
    const termino = document.getElementById('buscar-prod').value.toLowerCase();
    const rows = document.querySelectorAll('.product-row');
    let visibles = 0;
    
    rows.forEach(row => {
        const texto = row.textContent.toLowerCase();
        const visible = texto.includes(termino);
        row.style.display = visible ? '' : 'none';
        if (visible) visibles++;
    });
    
    document.getElementById('total-count').textContent = `${visibles} items`;
}

// 📋 Load Orders - unchanged
async function cargarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    mostrarLoader(lista, true);
    
    try {
        const res = await fetch('/pedidos');
        pedidos = await res.json();
        renderPedidos(pedidos.filter(p => filtroEstado === 'Todos' || p.Estado === filtroEstado), lista);
        document.getElementById('order-count').textContent = `${pedidos.length} recibidos`;
    } catch (err) {
        lista.innerHTML = `<div class="alert alert-warning">Error cargando pedidos: ${err.message}</div>`;
    } finally {
        mostrarLoader(lista, false);
    }
}

// 📦 Render Orders - unchanged
function renderPedidos(peds, container) {
    if (!peds.length) {
        container.innerHTML = '<div class="text-center py-5"><i class="bi bi-cart-x fs-1 text-muted mb-3"></i><p class="text-muted">No hay pedidos</p></div>';
        return;
    }
    
    container.innerHTML = peds.map(p => `
        <div class="pedido-row p-3 border-bottom">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>#${p.PedidoID}</strong> - ${p.NombreCliente}
                    <br><small class="text-muted">${new Date(p.Fecha).toLocaleString('es-ES')}</small>
                </div>
                <div class="text-end">
                    <div class="fw-bold fs-5 text-primary">$${Number(p.Total).toLocaleString()}</div>
                    <span class="badge bg-${p.Estado === 'Completado' ? 'success' : 'warning'}">${p.Estado}</span>
                </div>
            </div>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-${p.Estado === 'Completado' ? 'success' : 'warning'} me-2" onclick="cambiarEstado(${p.PedidoID}, '${p.Estado === 'Completado' ? 'Pendiente' : 'Completado'}')">${p.Estado === 'Completado' ? 'Pendiente' : 'Completar'}</button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarPedido(${p.PedidoID})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

// 📦 Low Stock - unchanged
async function cargarAgotados() {
    const lista = document.getElementById('lista-agotados');
    lista.innerHTML = productos
        .filter(p => p.Stock <= 5 && p.Stock > 0)
        .map(p => `<div class="alert alert-warning d-flex"><img src="${p.ImagenURL}" class="rounded me-3" style="width:50px;height:50px"> <div><strong>${p.Nombre}</strong><br>Stock: <strong>${p.Stock}</strong></div></div>`)
        .join('') || '<div class="text-center py-5 text-success"><i class="bi bi-check-circle fs-1"></i><p>Todos los productos tienen stock suficiente</p></div>';
    
    document.getElementById('agotados-count').textContent = `${productos.filter(p => p.Stock <= 5).length} alertas`;
}

// ✏️ Edit Product - unchanged
function prepararEdicion(prod) {
    document.getElementById('prod-id').value = prod.ProductoID;
    document.getElementById('nombre').value = prod.Nombre;
    document.getElementById('marca').value = prod.Marca;
    document.getElementById('sku').value = prod.CodigoSKU || '';
    document.getElementById('precio').value = prod.Precio;
    document.getElementById('stock').value = prod.Stock;
    document.getElementById('caracteristicas').value = prod.Caracteristicas;
    document.getElementById('titulo-form').textContent = 'Editar Producto';
    document.getElementById('btn-nuevo').dataset.action = 'limpiarForm';
}

// 💾 Save Product - unchanged
async function guardarProducto(e) {
    e.preventDefault();
    const formData = new FormData(document.getElementById('form-producto'));
    const id = document.getElementById('prod-id').value;
    
    try {
        const url = id ? `/productos/${id}` : '/productos';
        const res = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        if (res.ok) {
            Swal.fire('¡Guardado!', 'Producto actualizado', 'success');
            document.getElementById('titulo-form').textContent = 'Crear Producto';
            document.getElementById('form-producto').reset();
            document.getElementById('prod-id').value = '';
            cargarProductos();
        }
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

// 🗑️ Delete Product - unchanged
async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
        await fetch(`/productos/${id}`, { method: 'DELETE' });
        Swal.fire('Eliminado', '', 'success');
        cargarProductos();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

// 💰 Discount - unchanged
async function aplicarDescuentoProducto(id, descuentoActual) {
    const descuento = prompt('Nuevo descuento % (0-100):', descuentoActual || '0');
    if (descuento === null || isNaN(descuento) || descuento < 0 || descuento > 100) return;
    
    try {
        await fetch(`/productos/${id}/descuento`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({descuento: parseFloat(descuento)})
        });
        Swal.fire('Descuento aplicado', '', 'success');
        cargarProductos();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

// 📊 Order actions - unchanged
async function cambiarEstado(id, estado) {
    try {
        await fetch(`/pedidos/${id}/${estado.toLowerCase()}`, { method: 'PUT' });
        cargarPedidos();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function eliminarPedido(id) {
    if (!confirm('¿Eliminar pedido?')) return;
    try {
        await fetch(`/pedidos/${id}`, { method: 'DELETE' });
        cargarPedidos();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

function filtrarPedidos(estado) {
    filtroEstado = estado;
    cargarPedidos();
}

// 💾 Backup - unchanged
async function exportarInventario() {
    try {
        const res = await fetch('/backup');
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_trebol_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    } catch (err) {
        Swal.fire('Error', 'No se pudo generar backup', 'error');
    }
}

// 🔄 Utils - unchanged
function mostrarLoader(container, show) {
    if (show) {
        container.innerHTML = '<div class="text-center py-5"><div class="spinner-border"></div><p>Cargando...</p></div>';
    }
}

function actualizarContadores() {
    document.getElementById('total-count').textContent = `${productos.length} items`;
    document.getElementById('agotados-count').textContent = `${productos.filter(p => p.Stock <= 5).length} alertas`;
}

function mostrarNotificacion(msg) {
    const notif = document.createElement('div');
    notif.className = 'alert alert-success position-fixed end-0 m-3 shadow';
    notif.style.cssText = 'top:20%; right:20px; z-index:9999; min-width:300px;';
    notif.innerHTML = `<i class="bi bi-bell me-2"></i>${msg}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 5000);
}

// 🔘 Limpiar form - unchanged
document.addEventListener('click', e => {
    if (e.target.matches('[data-action="limpiarForm"]')) {
        document.getElementById('form-producto').reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('titulo-form').textContent = 'Crear Producto';
    }
});
