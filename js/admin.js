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

// 📦 Render Products - Modern Card Grid
function renderProductos(prods, container) {
    if (!prods.length) {
        container.innerHTML = '<div class="text-center py-5"><i class="bi bi-boxes fs-1 text-muted mb-3"></i><p class="text-muted">No hay productos</p></div>';
        return;
    }
    
    container.innerHTML = prods.map(p => {
        const stockClass = p.Stock > 5 ? 'stock-high' : p.Stock > 0 ? 'stock-medium' : 'stock-low';
        return `
        <div class="product-card" data-producto='${JSON.stringify(p).replace(/'/g, "\\'")}' tabindex="0">
            <div class="product-card-header">
                <img src="${p.ImagenURL || '/uploads/default.jpg'}" alt="${p.Nombre}" class="product-img-card">
                <div class="product-meta-card">
                    <div class="product-name-card">${p.Nombre}</div>
                    <div class="product-details">
                        ${p.Marca ? `<span>${p.Marca}</span>` : ''}
                        ${p.CodigoSKU ? `<span>#${p.CodigoSKU}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="product-body">
                <div class="price-container">
                    <div class="price-highlight-card">$ ${Number(p.Precio).toLocaleString('es-CO')}</div>
                </div>
                <div class="stock-info">
                    <div class="stock-label">
                        <i class="bi bi-box-seam-fill me-1"></i>
                        <span>${p.Stock} unidades</span>
                    </div>
                    <span class="stock-badge-card ${stockClass}">${p.Stock > 0 ? 'Disponible' : 'Agotado'}</span>
                </div>
                <div class="description-section">
                    ${p.Caracteristicas ? `
                        <div class="description-text" data-full-desc="${p.Caracteristicas.replace(/"/g, '"')}">${p.Caracteristicas.substring(0, 100)}${p.Caracteristicas.length > 100 ? '...' : ''}</div>
                        <button class="desc-toggle mt-1" onclick="toggleDesc(this)">${p.Caracteristicas.length > 100 ? 'Ver más' : ''}</button>
                    ` : '<p class="text-muted small mb-0">Sin descripción</p>'}
                </div>
                <div class="actions-card">
                    <button class="action-btn action-edit" data-action="edit" title="Editar" tabindex="0"><i class="bi bi-pencil"></i></button>
                    <button class="action-btn action-discount" data-action="discount" title="Descuento" tabindex="0"><i class="bi bi-percent"></i></button>
                    <button class="action-btn action-delete" data-action="delete" title="Eliminar" tabindex="0"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// 🔍 Filter Products
function filtrarProductos() {
    const termino = document.getElementById('buscar-prod').value.toLowerCase();
    const cards = document.querySelectorAll('.product-card');
    let visibles = 0;
    
    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        const visible = texto.includes(termino);
        card.style.display = visible ? '' : 'none';
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
    const bajos = productos.filter(p => p.Stock <= 5 && p.Stock > 0);
    if (bajos.length === 0) {
        lista.innerHTML = '<div class="text-center py-5 text-success"><i class="bi bi-check-circle fs-1"></i><p>Todos los productos tienen stock suficiente</p></div>';
    } else {
        lista.innerHTML = bajos.map(p => {
            const stockClass = p.Stock <= 2 ? 'stock-low' : 'stock-medium';
            return `
            <div class="product-card mb-3 p-3">
                <div class="d-flex align-items-start gap-3">
                    <img src="${p.ImagenURL || '/uploads/default.jpg'}" class="product-img-card flex-shrink-0">
                    <div class="flex-grow-1">
                        <h6 class="product-name-card mb-1">${p.Nombre}</h6>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="stock-badge-card ${stockClass}">${p.Stock} und ⚠️</span>
                            <small class="text-danger fw-bold">¡Reponer!</small>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    
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

// 🔘 Description toggle function
function toggleDesc(btn) {
    const textEl = btn.previousElementSibling;
    if (textEl.classList.contains('expanded')) {
        textEl.classList.remove('expanded');
        btn.textContent = 'Ver más';
        btn.parentElement.parentElement.parentElement.style.maxHeight = '380px';
    } else {
        textEl.classList.add('expanded');
        btn.textContent = 'Ver menos';
        btn.parentElement.parentElement.parentElement.style.maxHeight = 'none';
    }
}

// 🔘 Limpiar form - unchanged
document.addEventListener('click', e => {
    if (e.target.matches('[data-action="limpiarForm"]')) {
        document.getElementById('form-producto').reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('titulo-form').textContent = 'Crear Producto';
    }
});

