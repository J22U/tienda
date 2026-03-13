// js/admin.js - Panel Admin Completo (CSP-safe) - filtroEstado FIXED ✅
// Global filter state for pedidos (fixes ReferenceError)
window.filtroEstado = 'Todos';

document.addEventListener('DOMContentLoaded', function() {
    // 🔒 Session check
    if (!localStorage.getItem('admin_logged')) {
        window.location.replace('tienda.html');
        return;
    }

    // 🌐 Socket.io real-time
    const socket = io();
    socket.on('connect', () => console.log('🔌 Socket admin conectado'));
    socket.on('nuevo-pedido', (data) => {
        mostrarNotificacion(`🛒 Nuevo pedido #${data.NumeroDisplay}`);
        cargarPedidos(); 
    });

    // 📱 Elements
    const listaProductos = document.getElementById('lista-productos');
    const formProducto = document.getElementById('form-producto');
    const buscarProd = document.getElementById('buscar-prod');

    let productos = [], pedidos = [];

    // 🎛️ Tabs
    document.querySelectorAll('[data-bs-toggle="pill"]').forEach(btn => {
        btn.addEventListener('shown.bs.tab', (e) => {
            const tab = e.target.dataset.tab;
            if (tab === 'inventario') cargarProductos();
            if (tab === 'agotados') cargarAgotados();
            if (tab === 'pedidos') cargarPedidos();
        });
    });

    // 🔍 Buscador
    buscarProd.addEventListener('input', filtrarProductos);

    // 📝 Form submit
    formProducto.addEventListener('submit', guardarProducto);

    // 🚪 Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('admin_logged');
        window.location.replace('tienda.html');
    });

// 🔥 EVENT DELEGATION - PRODUCTOS
    listaProductos.addEventListener('click', e => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

        const card = btn.closest('.product-card');
        const p = JSON.parse(card.dataset.producto.replace(/&apos;/g, "'"));
        const action = btn.dataset.action;

        console.log('Botón acción:', action, p.ProductoID);
        
        if (action === 'edit') prepararEdicion(p);
        if (action === 'delete') eliminarProducto(p.ProductoID);
        if (action === 'discount') aplicarDescuentoProducto(p.ProductoID, p.DescuentoPorcentaje || 0);
    });

    // 🔥 EVENT DELEGATION - PEDIDOS (CSP FIX)
    const listaPedidos = document.getElementById('lista-pedidos');
    listaPedidos.addEventListener('click', e => {
        const statusBtn = e.target.closest('.pedido-btn-status');
        if (statusBtn) {
            const id = statusBtn.dataset.pedidoId;
            const estado = statusBtn.dataset.newEstado;
            cambiarEstado(id, estado);
            return;
        }
        
        const deleteBtn = e.target.closest('.pedido-btn-delete');
        if (deleteBtn) {
            const id = deleteBtn.dataset.pedidoId;
            eliminarPedido(id);
        }
    });

    // 🎯 Inicializar
    cargarProductos();
    cargarPedidos();

    // Global functions
    window.cargarPedidos = cargarPedidos;
    window.cargarProductos = cargarProductos;
    window.filtrarPedidos = function(estado) { 
        window.filtroEstado = estado; 
        cargarPedidos(); 
    };
});

// 🛒 Cargar Productos
async function cargarProductos() {
    const lista = document.getElementById('lista-productos');
    mostrarLoader(lista, true);
    try {
        const res = await fetch('/productos');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        productos = await res.json();
        renderProductos(productos, lista);
        actualizarContadores();
    } catch (err) {
        console.error('Error productos:', err);
        lista.innerHTML = `<div class="alert alert-warning text-center">
            ❌ ${err.message}<br>
            <button class="btn btn-sm btn-warning mt-2" onclick="cargarProductos()">Reintentar</button>
        </div>`;
    } finally {
        mostrarLoader(lista, false);
    }
}

// 📦 Render Productos
function renderProductos(prods, container) {
    if (!prods.length) {
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-boxes fs-1 mb-3"></i>No hay productos</div>';
        return;
    }
    
    container.innerHTML = prods.map(p => {
        const stockClass = p.Stock > 5 ? 'stock-high' : p.Stock > 0 ? 'stock-medium' : 'stock-low';
        const safeJSON = JSON.stringify(p).replace(/'/g, "&apos;");
        
        return `
        <div class="product-card" data-producto="${safeJSON}">
            <div class="d-flex gap-3">
                <img src="${p.ImagenURL || '/uploads/default.jpg'}" class="product-img-card">
                <div class="flex-grow-1">
                    <h6 class="fw-bold mb-1">${p.Nombre}</h6>
                    <small class="text-muted">${p.Marca} #${p.CodigoSKU || 'N/A'}</small>
                    <div class="mt-2">
                        <div class="h4 text-success fw-bold">$${Number(p.Precio).toLocaleString()}</div>
                        <div class="stock-info mt-2">
                            <span class="badge ${stockClass}">${p.Stock} und</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="actions-card mt-3">
                <button class="action-btn action-edit" data-action="edit" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="action-btn action-discount" data-action="discount" title="Descuento">
                    <i class="bi bi-percent"></i>
                </button>
                <button class="action-btn action-delete" data-action="delete" title="Eliminar">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

// 📋 Cargar Pedidos
async function cargarPedidos() {
    const lista = document.getElementById('lista-pedidos');
    mostrarLoader(lista, true);
    try {
        const res = await fetch('/pedidos');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const allPedidos = await res.json();
        const filtered = allPedidos.filter(p => (window.filtroEstado || 'Todos') === 'Todos' || p.Estado === (window.filtroEstado || 'Todos'));
        renderPedidos(filtered, lista);
    } catch (err) {
        lista.innerHTML = `<div class="alert alert-danger text-center">
            ❌ ${err.message}<br>
            <button class="btn btn-sm btn-warning mt-2" onclick="cargarPedidos()">Reintentar</button>
        </div>`;
    } finally {
        mostrarLoader(lista, false);
    }
}

// 📦 Render Pedidos
function renderPedidos(peds, container) {
    if (!peds.length) {
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-cart-x fs-1 mb-3"></i>No hay pedidos</div>';
        return;
    }
    
    container.innerHTML = peds.map(p => {
        const newEstado = p.Estado === 'Completado' ? 'Pendiente' : 'Completado';
        const btnClass = p.Estado === 'Completado' ? 'success' : 'warning';
        const btnText = p.Estado === 'Completado' ? 'Pendiente' : 'Completar';
        return `
        <div class="pedido-row p-3 border-bottom">
            <div class="d-flex justify-content-between">
                <div>
                    <strong>#${p.PedidoID}</strong> - ${p.NombreCliente}
                    <br><small class="text-muted">${new Date(p.Fecha).toLocaleString('es-ES')}</small>
                </div>
                <div class="text-end">
                    <div class="h5 fw-bold text-primary">$${Number(p.Total).toLocaleString()}</div>
                    <span class="badge bg-${p.Estado === 'Completado' ? 'success' : p.Estado === 'Pendiente' ? 'warning' : 'secondary'}">${p.Estado}</span>
                </div>
            </div>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-${btnClass} me-2 pedido-btn-status" 
                        data-pedido-id="${p.PedidoID}" 
                        data-new-estado="${newEstado}">
                    ${btnText}
                </button>
                <button class="btn btn-sm btn-outline-danger pedido-btn-delete" 
                        data-pedido-id="${p.PedidoID}">
                    Eliminar
                </button>
            </div>
        </div>`;
    }).join('');
}

// 🔍 Filtrar productos
function filtrarProductos() {
    const termino = document.getElementById('buscar-prod').value.toLowerCase();
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(termino) ? '' : 'none';
    });
    actualizarContadores();
}

// 🛠️ Resto funciones (Edit, Save, Delete, etc.)
function prepararEdicion(prod) {
    document.getElementById('prod-id').value = prod.ProductoID;
    document.getElementById('nombre').value = prod.Nombre;
    document.getElementById('marca').value = prod.Marca;
    document.getElementById('sku').value = prod.CodigoSKU || '';
    document.getElementById('precio').value = prod.Precio;
    document.getElementById('stock').value = prod.Stock;
    document.getElementById('caracteristicas').value = prod.Caracteristicas;
    document.getElementById('titulo-form').textContent = 'Editar Producto';
}

async function guardarProducto(e) {
    e.preventDefault();
    const formData = new FormData(e.target.form);
    const id = document.getElementById('prod-id').value;
    
    try {
        const url = id ? `/productos/${id}` : '/productos';
        const res = await fetch(url, { method: 'POST', body: formData });
        if (res.ok) {
            Swal.fire('Guardado!', '', 'success');
            e.target.reset();
            document.getElementById('titulo-form').textContent = 'Nuevo Producto';
            cargarProductos();
        }
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function eliminarProducto(id) {
    if (!confirm('Eliminar producto?')) return;
    try {
        await fetch(`/productos/${id}`, { method: 'DELETE' });
        Swal.fire('Eliminado', '', 'success');
        cargarProductos();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function aplicarDescuentoProducto(id, descuentoActual) {
    const descuento = prompt('Descuento % (0-100):', descuentoActual || 0);
    if (!descuento || isNaN(descuento)) return;
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

// Pedidos actions
async function cambiarEstado(id, estado) {
    try {
        await fetch(`/pedidos/${id}/${estado.toLowerCase()}`, { method: 'PUT' });
        cargarPedidos();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

async function eliminarPedido(id) {
    if (!confirm('Eliminar pedido?')) return;
    try {
        await fetch(`/pedidos/${id}`, { method: 'DELETE' });
        cargarPedidos();
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    }
}

// Utils
function mostrarLoader(container, show) {
    if (show) container.innerHTML = '<div class="spinner-border text-primary" role="status"></div>';
}

function actualizarContadores() {
    document.getElementById('total-count').textContent = `${productos.length} items`;
    document.getElementById('agotados-count').textContent = `${productos.filter(p => p.Stock <= 5).length} alertas`;
}

function mostrarNotificacion(msg) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: msg,
        showConfirmButton: false,
        timer: 3000
    });
}

// Low Stock
async function cargarAgotados() {
    const lista = document.getElementById('lista-agotados');
    const bajos = productos.filter(p => p.Stock <= 5 && p.Stock > 0);
    if (!bajos.length) {
        lista.innerHTML = '<p class="text-success text-center py-5">✅ Stock OK</p>';
    } else {
        lista.innerHTML = bajos.map(p => `<div class="alert alert-warning"><strong>${p.Nombre}</strong> (${p.Stock} und)</div>`).join('');
    }
    document.getElementById('agotados-count').textContent = `${bajos.length} en riesgo`;
}

