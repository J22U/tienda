// js/admin.js - Panel Admin Completo (CSP-safe) - filtroEstado FIXED ✅
// Global filter state for pedidos (fixes ReferenceError)
window.filtroEstado = 'Todos';

document.addEventListener('DOMContentLoaded', function() {
    // 🔒 Session check
    if (!localStorage.getItem('admin_logged')) {
        window.location.replace('tienda.html');
        return;
    }

    // 🌐 Socket.io real-time (CSP/SIMPLE AUTH FIX)
    const socket = io({
        auth: {
            simpleAuth: localStorage.getItem('admin_logged') === 'true'
        }
    });
    socket.on('connect', () => console.log('🔌 Socket admin conectado'));
    socket.on('nuevo-pedido', (data) => {
        mostrarNotificacion(`🛒 Nuevo pedido #${data.NumeroDisplay}`);
        cargarPedidos(); 
    });
    socket.on('connect_error', (err) => {
        console.warn('⚠️ Socket connect error:', err.message);
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
document.getElementById('btn-logout').addEventListener('click', async () => {
        const result = await Swal.fire({
            title: '¿Cerrar sesión?',
            text: '¿Estás seguro de que quieres cerrar sesión?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            localStorage.removeItem('admin_logged');
            window.location.replace('tienda.html');
        }
    });

// 🔥 EVENT DELEGATION - PRODUCTOS
    listaProductos.addEventListener('click', e => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

        const card = btn.closest('.product-card');
        try {
            const p = JSON.parse(decodeURIComponent(card.dataset.producto));
            const action = btn.dataset.action;

            console.log('Botón acción:', action, p.ProductoID);
            
            if (action === 'edit') prepararEdicion(p);
            if (action === 'delete') eliminarProducto(p.ProductoID);
            if (action === 'discount') aplicarDescuentoProducto(p.ProductoID, p.DescuentoPorcentaje || 0, p.Nombre);
        } catch (err) {
            console.error('Error parsing producto JSON:', err);
            Swal.fire('Error', 'Datos del producto corruptos. Recarga la página.', 'error');
        }
    });

    // 🔥 EVENT DELEGATION - PEDIDOS (CSP FIX)
    const listaPedidos = document.getElementById('lista-pedidos');
    listaPedidos.addEventListener('click', e => {
        // 🆕 Click pedido-row → details (stopPropagation on buttons)
        const pedidoRow = e.target.closest('.pedido-row');
        if (pedidoRow && !e.target.closest('button')) {
            const pedidoIdEl = pedidoRow.querySelector('[data-pedido-id]');
            if (pedidoIdEl) {
                mostrarDetallesPedido(pedidoIdEl.dataset.pedidoId);
            }
            return;
        }
        
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
            return;
        }
        
        const facturaBtn = e.target.closest('.pedido-btn-factura');
        if (facturaBtn) {
            const id = facturaBtn.dataset.pedidoId;
            generarFacturaPDFParaPedido(id);
            return;
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
        const productoSafe = encodeURIComponent(JSON.stringify(p));
        
        return `
        <div class="product-card" data-producto="${productoSafe}">
            <div class="d-flex gap-3">
                <img src="${p.ImagenURL || '/uploads/default.jpg'}" class="product-img-card">
                <div class="flex-grow-1">
                    <h6 class="fw-bold mb-1">${p.Nombre}</h6>
                    <small class="text-muted">${p.Marca} #${p.CodigoSKU || 'N/A'}</small>
                    <div class="mt-2">
                        ${p.DescuentoPorcentaje && p.DescuentoPorcentaje > 0 ? `
                            <div class="text-decoration-line-through text-muted fs-6 mb-1">$${Number(p.Precio).toLocaleString()}</div>
                            <div class="h4 text-success fw-bold mb-1">$${Number(p.Precio * (1 - p.DescuentoPorcentaje / 100)).toLocaleString()}
                                <small class="badge bg-success ms-1">${p.DescuentoPorcentaje}% OFF</small>
                            </div>` : `
                            <div class="h4 text-success fw-bold">$${Number(p.Precio).toLocaleString()}</div>`
                        }
                        <div class="stock-info mt-2">
                            <span class="badge ${stockClass}">${p.Stock} und</span>
                        </div>
                        ${p.Caracteristicas ? `<small class="description-text text-muted d-block mt-1 fs-6">${p.Caracteristicas}</small>` : ''}
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
        let allPedidos = await res.json();
// 🔄 Sort newest first (Fecha DESC) + highest # stable
        allPedidos.sort((a, b) => {
            const dateA = new Date(a.Fecha);
            const dateB = new Date(b.Fecha);
            if (dateB > dateA) return 1;
            if (dateA > dateB) return -1;
            // Same date: highest NumeroDisplay
            const numA = parseInt(a.NumeroDisplay || '0');
            const numB = parseInt(b.NumeroDisplay || '0');
            return numB - numA;
        });
        console.log('Pedidos cargados:', allPedidos.map(p => ({ID: p.PedidoID, Cliente: p.NombreCliente})));
        const filtered = allPedidos.filter(p => (window.filtroEstado || 'Todos') === 'Todos' || p.Estado === (window.filtroEstado || 'Todos'));
        renderPedidos(filtered, lista);
        document.getElementById('order-count').textContent = `${filtered.length} pedidos`;
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
    
    container.innerHTML = peds.map((p, index) => {
        const newEstado = p.Estado === 'Completado' ? 'Pendiente' : 'Completado';
        const btnClass = p.Estado === 'Completado' ? 'success' : 'warning';
        const btnText = p.Estado === 'Completado' ? 'Pendiente' : 'Completar';
        const numeroVisual = peds.length - index;
        return `
        <div class="pedido-row p-3 border-bottom" data-pedido-id="${p.PedidoID}">
            <div class="d-flex justify-content-between">
                <div>
                    <strong>#${numeroVisual}</strong> - ${p.NombreCliente}
                    <br><small class="text-muted">${new Date(p.Fecha).toLocaleString('es-ES')}</small>
                </div>
                <div class="text-end" style="min-width: 120px;">
                    ${p.DescuentoPorcentaje > 0 ? `
                        <small style="text-decoration: line-through; color: #888; font-size: 0.75em; display: block;">$${Number(p.Total).toLocaleString()}</small>
                    ` : ''}
                    <div class="h5 fw-bold text-success" style="color: #27ae60 !important;">$${Number(p.TotalManual || p.Total).toLocaleString()}</div>
                    <span class="badge bg-${p.Estado === 'Completado' ? 'success' : p.Estado === 'Pendiente' ? 'warning' : 'secondary'}">${p.Estado}</span>
                </div>
            </div>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-${btnClass} me-1 pedido-btn-status" 
                        data-pedido-id="${p.PedidoID}" 
                        data-new-estado="${newEstado}">
                    ${btnText}
                </button>
                <button class="btn btn-sm btn-primary me-1 pedido-btn-factura" 
                        data-pedido-id="${p.PedidoID}">
                    <i class="bi bi-file-earmark-pdf me-1"></i>Factura
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
    
    // 🔄 Update button for edit mode (blue)
    const saveBtn = document.getElementById('btn-guardar');
    if (saveBtn) {
        saveBtn.textContent = '💾 ACTUALIZAR PRODUCTO';
        saveBtn.classList.add('edit-mode');
    }
    
// ✨ UX Improvements: Enhanced Edit Experience
    // 1. Precise scroll to form (handles fixed headers)
    const formContainer = document.querySelector('.col-lg-5 .bento-card');
    if (formContainer) {
        formContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
        });
    }
    
    // 2. Green glow highlight
    if (formContainer) {
        formContainer.style.transition = 'all 0.3s ease';
        formContainer.style.boxShadow = '0 0 30px rgba(39, 174, 96, 0.4), 0 0 60px rgba(39, 174, 96, 0.2)';
        formContainer.style.border = '2px solid rgba(39, 174, 96, 0.5)';
        
        // Fade out after 2s
        setTimeout(() => {
            formContainer.style.boxShadow = '';
            formContainer.style.border = '';
        }, 2000);
    }
    
    // 3. Focus on nombre field
    setTimeout(() => {
        const nombreField = document.getElementById('nombre');
        if (nombreField) {
            nombreField.focus();
            nombreField.select(); // Select text for easy edit
        }
    }, 600);
}

async function guardarProducto(e) {
    e.preventDefault();
    
    const id = document.getElementById('prod-id').value;
    console.log('DEBUG - ID para editar:', id);
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token') || localStorage.getItem('admin_session');
    console.log('DEBUG - Token recuperado:', token ? 'SÍ (' + token.substring(0,20) + '...)' : 'NO');
    
    if (!token) {
        Swal.fire('Error', 'Tu sesión expiró. Por favor inicia sesión de nuevo.', 'error');
        // window.location.href = 'tienda.html'; // COMENTADO PARA DEBUG
        return;
    }

    const formData = new FormData(e.target.form);
    const productoData = {
        Nombre: document.getElementById('nombre').value,
        Marca: document.getElementById('marca').value,
        CodigoSKU: document.getElementById('sku').value,
        Precio: parseFloat(document.getElementById('precio').value),
        Stock: parseInt(document.getElementById('stock').value),
        Caracteristicas: document.getElementById('caracteristicas').value
    };

    const url = id ? `https://tienda-1vps.onrender.com/productos/${id}` : 'https://tienda-1vps.onrender.com/productos';
    console.log('DEBUG - URL final:', url);
    console.log('Enviando Token:', token);
    
    try {
        console.log('DEBUG - Headers enviados:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
        const response = await fetch(url, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productoData)
        });
        console.log('DEBUG - Response status:', response.status, response.statusText);

        if (response.status === 401) {
            console.log('DEBUG - 401 recibido. Token usado:', token.substring(0, 20) + '...');
            throw new Error('Sesión inválida - 401');
        }

        if (response.ok) {
            Swal.fire('¡Éxito!', id ? 'Producto actualizado' : 'Producto creado', 'success');
    e.target.reset();
    document.getElementById('titulo-form').textContent = 'Crear Producto';
    document.getElementById('prod-id').value = '';
    
    // 🔄 Reset button to new mode (green)
    const saveBtn = document.getElementById('btn-guardar');
    if (saveBtn) {
        saveBtn.textContent = '💾 GUARDAR PRODUCTO';
        saveBtn.classList.remove('edit-mode');
    }
            cargarProductos();
        } else {
            const errorData = await response.json();
            Swal.fire('Error', errorData.message || 'No se pudo guardar', 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        if (error.message === 'Sesión inválida') {
            localStorage.removeItem('token');
            localStorage.removeItem('admin_logged');
            window.location.href = 'tienda.html';
        } else {
            Swal.fire('Error', error.message, 'error');
        }
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

async function aplicarDescuentoProducto(id, descuentoActual, nombreProducto) {
    // Llenar modal y mostrar
    document.getElementById('modal-product-name').textContent = nombreProducto || 'Producto';
    document.getElementById('inputDescuento').value = descuentoActual || 0;
    document.getElementById('inputDescuento').dataset.productId = id;
    document.getElementById('btnConfirmarDescuento').dataset.productId = id;
    new bootstrap.Modal(document.getElementById('modalDescuento')).show();
}

// Pedidos actions
async function cambiarEstado(id, nuevoEstado) {
    try {
        const accion = nuevoEstado.toLowerCase() === 'completado' ? 'completar' : 'pendiente';
        const url = `/pedidos/${id}/${accion}`;
        console.log('✅ PUT /pedidos/' + id + '/' + accion);
        const response = await fetch(url, { method: 'PUT' });
        console.log('📊 Status:', response.status, response.statusText);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error:', response.status, errorText);
            throw new Error(`HTTP ${response.status} - ${errorText}`);
        }
        cargarPedidos();
    } catch (err) {
        console.error('💥 cambiarEstado failed:', err);
        Swal.fire('Error', `Estado no actualizado: ${err.message}`, 'error');
    }
}

async function eliminarPedido(id) {
    const result = await Swal.fire({
        title: '¿Eliminar pedido?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
        try {
            await fetch(`/pedidos/${id}`, { method: 'DELETE' });
            Swal.fire('Eliminado', 'Pedido eliminado correctamente', 'success');
            cargarPedidos();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    }
}

// 🚀 FACTURA GENERATOR (User-provided)
async function generarFacturaPDFParaPedido(pedidoId) {
    try {
        const res = await fetch(`/pedidos/${pedidoId}`);
        if (!res.ok) throw new Error('Pedido no encontrado');
        const p = await res.json();
        const numeroPedido = obtenerNumeroVisualActual(pedidoId);
        generarFacturaPDF(p, numeroPedido);
    } catch(err) {
        Swal.fire('Error', `No se pudo cargar factura: ${err.message}`, 'error');
    }
}

// Your existing function (copied exactly)
async function generarFacturaPDF(p, numeroPedido) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let productosArr = [];
    try { 
        productosArr = typeof p.Productos === 'string' ? JSON.parse(p.Productos) : p.Productos; 
    } catch (e) { productosArr = []; }

    let subtotalBruto = 0;

    // --- CONFIGURACIÓN DE COLORES ---
    const primaryColor = [34, 74, 43]; // Verde Trébol Profundo
    const accentColor = [108, 92, 231]; // Morado suave (opcional para detalles)
    const textColor = [45, 52, 54];
    const lightGray = [240, 242, 245];

    // 1. BARRA LATERAL DE DISEÑO (Opcional, da un toque moderno)
    doc.setFillColor(34, 74, 43);
    doc.rect(0, 0, 5, 297, 'F');

    // 2. ENCABEZADO: LOGO Y DATOS EMPRESA
    // Si tienes el logo en URL, jsPDF puede tardar. Aquí usamos texto con estilo de marca.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(34, 74, 43);
    doc.text("TRÉBOL S.A.S", 20, 25);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Herramientas profesionales", 20, 31);
    doc.text("NIT: 900.555.123-1", 20, 36);
    doc.text("El Peñol, Antioquia | Cel: 310 123 4567", 20, 41);
    doc.text("trebol@gmail.com", 20, 46);

    // 3. BLOQUE DE INFO DE FACTURA (Cuadro elegante)
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(130, 15, 65, 35, 3, 3, 'F');
    doc.setDrawColor(230);
    doc.roundedRect(130, 15, 65, 35, 3, 3, 'D');

    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(10);
    doc.text("ORDEN DE SERVICIO", 135, 25);
    doc.setFontSize(20);
    doc.text(`# ${numeroPedido.toString().padStart(4, '0')}`, 135, 35);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Fecha: ${new Date(p.Fecha).toLocaleDateString()}`, 135, 43);

    // 4. INFORMACIÓN DEL CLIENTE (Diseño en columnas)
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 195, 55);

    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("FACTURADO A:", 20, 65);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(p.NombreCliente.toUpperCase(), 20, 72);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`C.C./NIT: ${p.Documento || '---'}`, 20, 78);
    doc.text(`Teléfono: ${p.Telefono}`, 20, 83);
    doc.text(`Dirección: ${p.Direccion || 'Entrega en local'}`, 20, 88);

    // 5. TABLA DE PRODUCTOS (Estilo moderno y limpio)
    const rows = productosArr.map(item => {
        const precioOriginal = Number(item.PrecioOriginal) || Number(item.Precio);
        const precioVenta = Number(item.Precio);
        const subtotalBrutoItem = item.cantidad * precioOriginal;
        subtotalBruto += subtotalBrutoItem;
        const descuentoPct = precioOriginal > 0 ? Math.round(((precioOriginal - precioVenta) / precioOriginal) * 100) : 0;
        const subtotalNetoItem = item.cantidad * precioVenta;
        return [
            item.cantidad,
            { content: `${item.Nombre}${descuentoPct > 0 ? ` (-${descuentoPct}%)` : ''}`, styles: { fontStyle: 'bold' } },
            `$ ${precioOriginal.toLocaleString()}`,
            `$ ${subtotalNetoItem.toLocaleString()}`
        ];
    });

    const totalPedido = Number(p.Total);
    const ahorroTotal = subtotalBruto - totalPedido;

    doc.autoTable({
        startY: 95,
        head: [['CANT.', 'DESCRIPCIÓN', 'VALOR UNIT.', 'SUBTOTAL']],
        body: rows,
        headStyles: { 
            fillColor: primaryColor, 
            textColor: [255, 255, 255], 
            fontSize: 10,
            halign: 'center'
        },
        bodyStyles: { 
            fontSize: 9, 
            cellPadding: 5 
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            2: { halign: 'right' },
            3: { halign: 'right' }
        },
        theme: 'striped',
        margin: { left: 20, right: 15 }
    });

    // 6. RESUMEN DE TOTALES - CON DESGLOSADO ✅
    const finalY = doc.lastAutoTable.finalY + 10;
    
    // Subtotal Bruto (gris claro)
    doc.setFillColor(248, 249, 250);
    doc.rect(130, finalY, 65, 8, 'F');
    doc.setDrawColor(200);
    doc.rect(130, finalY, 65, 8, 'S');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text("SUBTOTAL BRUTO:", 135, finalY + 6);
    doc.text(`$${subtotalBruto.toLocaleString()}`, 190, finalY + 6, { align: 'right' });
    
    // Línea de Descuento (rojo claro)
    const descuentoY = finalY + 10;
    doc.setFillColor(255, 240, 240);
    doc.rect(130, descuentoY, 65, 8, 'F');
    doc.setDrawColor(220, 50, 50);
    doc.rect(130, descuentoY, 65, 8, 'S');
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 50, 50);
    const descuentoPctGlobal = p.DescuentoPorcentaje || Math.round(((subtotalBruto - Number(p.Total)) / subtotalBruto) * 100);
    doc.text(`Descuento (${descuentoPctGlobal}%):`, 135, descuentoY + 6);
    doc.setTextColor(200, 0, 0);
    doc.text(`-$${(subtotalBruto - Number(p.Total)).toLocaleString()}`, 170, descuentoY + 6, { align: 'right' });
    
    // Total Neto (verde)
    const totalY = ahorroY + 10;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(130, totalY, 65, 12, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL NETO:", 135, totalY + 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 180, 0);
    doc.text(`$${Number(p.Total).toLocaleString() }`, 190, totalY + 8, { align: 'right' });

    // 7. MÉTODOS DE PAGO Y NOTAS
    const notasY = totalY + 20;
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(10);
    doc.text("MÉTODOS DE PAGO:", 20, notasY);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("• Nequi / Bancolombia: 310 123 4567", 20, notasY + 6);
    doc.text("• Efectivo en local", 20, notasY + 11);

    // 8. PIE DE PÁGINA LEGAL (Muy importante para la validez)
    doc.setFontSize(7);
    doc.setTextColor(150);
    const legal1 = "Esta es una representación gráfica de una cuenta de cobro / orden de venta interna.";
    const legal2 = "No somos responsables de IVA. Régimen Simplificado. Art. 774 del Código de Comercio.";
    doc.text(legal1, 105, 280, { align: 'center' });
    doc.text(legal2, 105, 284, { align: 'center' });
    
    // Frase final
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("¡GRACIAS POR SU COMPRA!", 105, 270, { align: 'center' });

    // Descargar
    doc.save(`Factura_Trebol_${numeroPedido}.pdf`);
    
    Swal.fire({
        title: 'Factura Generada',
        text: 'Se ha descargado la factura exitosamente.',
        icon: 'success',
        confirmButtonColor: '#224a2b'
    });
}

// 🆕 Pedido Details Modal
window.productosModalArr = []; // Global for discount updates
window.pedidoModalData = null; // Global pedido data (con DescuentoPorcentaje)

async function mostrarDetallesPedido(pedidoId) {
    try {
        console.log('🔍 Intentando cargar pedido ID:', pedidoId, 'desde BD');
        const res = await fetch(`/pedidos/${pedidoId}`);
        console.log('Respuesta servidor:', res.status, res.statusText);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText} para ID ${pedidoId}`);
        }
        const p = await res.json();
        console.log('✅ Pedido cargado:', p.PedidoID, p.NombreCliente);
        
        // Store full pedido data
        window.pedidoModalData = p;
        
        // Parse productos → global (safe)
        window.productosModalArr = [];
        if (p.Productos) {
            try { 
                window.productosModalArr = typeof p.Productos === 'string' ? JSON.parse(p.Productos) : p.Productos; 
                console.log('✅ Productos parseados:', window.productosModalArr.length, 'items');
            } catch(e) { 
                console.error('JSON.parse error:', e, 'Productos:', p.Productos);
                window.productosModalArr = []; 
            }
        } else {
            console.warn('p.Productos es null/undefined');
        }
        
        // All details (DOM safe check)
        const numeroVisualPedido = obtenerNumeroVisualActual(pedidoId);
        const elNum = document.getElementById('modalPedidoNum');
        const elCliente = document.getElementById('modalCliente');
        const elFecha = document.getElementById('modalFecha');
        const elEstado = document.getElementById('modalEstado');
        const elTelefono = document.getElementById('modalTelefono');
        const elDocumento = document.getElementById('modalDocumento');
        const elDireccion = document.getElementById('modalDireccion');
        const elBtnFactura = document.getElementById('modalBtnFactura');
        
        if (elNum) elNum.textContent = `#${p.PedidoID}`;
        if (elCliente) elCliente.textContent = p.NombreCliente || 'N/A';
        if (elFecha) elFecha.textContent = new Date(p.Fecha || Date.now()).toLocaleString('es-ES');
        if (elEstado) elEstado.textContent = p.Estado || 'N/A';
        if (elTelefono) elTelefono.textContent = p.Telefono || 'N/A';
        if (elDocumento) elDocumento.textContent = p.Documento || 'N/A';
        if (elDireccion) elDireccion.textContent = p.Direccion || 'N/A';
        if (elBtnFactura) elBtnFactura.dataset.pedidoId = pedidoId;
        
        const descuentoInput = document.getElementById('modalDescuentoInput');
        const modalTotalEl = document.getElementById('modalTotal');
        descuentoInput.dataset.productoId = '';
        descuentoInput.value = '';
        
        // Total limpio + mostrar descuento aplicado
        const formattedTotal = Number(p.TotalManual || p.Total).toLocaleString();
        const descuentoBadge = p.DescuentoPorcentaje > 0 ? `<span style="background:#27ae60; color:white; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:10px;">Dto. ${p.DescuentoPorcentaje}%</span>` : '';
        modalTotalEl.innerHTML = `<strong>$${formattedTotal}</strong>${descuentoBadge}`;
        
        descuentoInput.value = p.DescuentoPorcentaje || '';
        descuentoInput.disabled = p.DescuentoPorcentaje > 0;
        renderModalItems();
        descuentoInput.addEventListener('input', livePreviewTotal);
        
        // Show modal
        new bootstrap.Modal(document.getElementById('modalPedidoDetails')).show();
    } catch(err) {
        Swal.fire('Error', 'No se pudieron cargar detalles', 'error');
    }
}

function renderModalItems() {
    const productosArr = window.productosModalArr;
    const tbody = document.getElementById('modalProductosBody');
    if (!tbody) {
        console.error('modalProductosBody not found');
        return;
    }
    let html = '';
    const descuentoPct = window.pedidoModalData?.DescuentoPorcentaje || 0;
    const bruto = window.productosModalArr.reduce((acc, i) => acc + (i.cantidad * i.Precio), 0);
    const dtoPesos = bruto * (descuentoPct / 100);
    const neto = bruto - dtoPesos;
    
    for (let item of productosArr) {
        const subtotal = item.cantidad * item.Precio;
        html += `<tr>
            <td>${item.Nombre}</td>
            <td>${item.cantidad}</td>
            <td>$${Number(item.Precio).toLocaleString()}</td>
            <td style="text-align:right;"><strong>$${Number(subtotal).toLocaleString()}</strong></td>
        </tr>`;
    }
    
    html += `
        <tr style="border-top: 1px solid #ddd;">
            <td colspan="3" style="text-align:right; padding: 5px; color: #666;">Suma Bruta:</td>
            <td style="text-align:right; padding: 5px; color: #666;">$${bruto.toLocaleString()}</td>
        </tr>
        <tr style="color:#d32f2f;">
            <td colspan="3" style="text-align:right; padding: 5px;">Descuento (${descuentoPct}%):</td>
            <td style="text-align:right; padding: 5px;">-$${dtoPesos.toLocaleString()}</td>
        </tr>
        <tr style="background:#f0f0f0; font-weight:bold;">
            <td colspan="3" style="text-align:right; padding: 10px;">TOTAL FINAL:</td>
            <td style="text-align:right; color:#27ae60; padding: 10px;">$${Math.round(neto).toLocaleString()}</td>
        </tr>`;
    tbody.innerHTML = html || '<tr><td colspan="4" class="text-center text-muted py-4">Sin productos</td></tr>';
    console.log('Tabla brutos + resumen:', productosArr.length, 'items | Bruto:', bruto, 'Dto:', dtoPesos, 'Neto:', neto);
}

function recalcularModalTotal() {
    const productosArr = window.productosModalArr;
    let total = 0;
    productosArr.forEach(item => {
        total += item.cantidad * Number(item.Precio) * (1 - (item.DescuentoPorcentaje || 0)/100);
    });
    document.getElementById('modalTotal').innerHTML = `<strong>$${Number(total).toLocaleString()}</strong>`;
}

// 🆕 Live preview for discount input (non-persisted)
function livePreviewTotal() {
    const input = document.getElementById('modalDescuentoInput');
    const descuento = parseFloat(input.value) || 0;
    const productosArr = window.productosModalArr;
    
    let totalOriginal = 0;
    productosArr.forEach(item => {
        totalOriginal += item.cantidad * Number(item.Precio);
    });
    
    const totalPreview = totalOriginal * (1 - descuento / 100);
    document.getElementById('modalTotal').innerHTML = `
        <strong>Preview: $${Number(totalPreview).toLocaleString()}</strong>
        <small class="text-muted">-${descuento.toFixed(2)}%</small>
    `;
}

window.aplicarDescuentoModal = async function() {
    const input = document.getElementById('modalDescuentoInput');
    const pedidoId = document.querySelector('#modalBtnFactura')?.dataset.pedidoId;
    
    if (!pedidoId) return Swal.fire('Error', 'Pedido no encontrado', 'warning');
    
    const descuento = parseFloat(input.value) || 0;
    if (isNaN(descuento) || descuento < 0 || descuento > 100) {
        return Swal.fire('Error', 'Descuento 0-100%', 'warning');
    }
    
    try {
        const res = await fetch(`/pedidos/${pedidoId}/descuento`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descuentoPorcentaje: descuento })
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        
        // ✅ Update modal total (clean)
        const formattedManual = Number(data.totalManual || data.Total).toLocaleString();
        document.getElementById('modalTotal').innerHTML = `<strong>$${formattedManual}</strong>`;
        
        input.disabled = true; // Lock after persist
        
        // ✅ Auto-refresh main pedidos table
        await cargarPedidos();
        
        Swal.fire({
            title: '✅ Descuento Guardado en BD',
            html: `TotalManual: <strong>$${formattedManual}</strong><br>
                   DescuentoPorcentaje: <strong>${descuento.toFixed(2)}%</strong><br>
                   Tabla actualizada`,
            icon: 'success',
            confirmButtonText: 'OK'
        });
    } catch (err) {
        console.error('Error descuento:', err);
        Swal.fire('Error', err.message, 'error');
    }
};

// Click row discount
document.addEventListener('click', e => {
    const row = e.target.closest('#modalItemsTable tr');
    if (row) {
        const idx = parseInt(row.dataset.productoIndex);
        if (window.productosModalArr[idx]) {
            const input = document.getElementById('modalDescuentoInput');
            input.dataset.productoId = idx;
            input.value = window.productosModalArr[idx].DescuentoPorcentaje || '';
            input.focus();
            input.placeholder = `Descuento ${window.productosModalArr[idx].Nombre}`;
        }
    }

    // 🔥 CSP FIX: Modal discount button (delegation)
    if (e.target.matches('#modalDescuentoBtn')) {
        window.aplicarDescuentoModal();
    }
});

// Modal factura button
document.addEventListener('click', e => {
    if (e.target.closest('#modalBtnFactura')) {
        const id = e.target.closest('#modalBtnFactura').dataset.pedidoId;
        generarFacturaPDFParaPedido(id);
    }
});

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

// 🔢 Get screen # for pedido (same as list display)
window.pedidosActuales = []; // Cache current filtered list

function renderPedidos(peds, container) {
    window.pedidosActuales = peds; // Cache for numeroVisual lookup
    if (!peds.length) {
        container.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-cart-x fs-1 mb-3"></i>No hay pedidos</div>';
        return;
    }
    
    container.innerHTML = peds.map((p, index) => {
        const newEstado = p.Estado === 'Completado' ? 'Pendiente' : 'Completado';
        const btnClass = p.Estado === 'Completado' ? 'success' : 'warning';
        const btnText = p.Estado === 'Completado' ? 'Pendiente' : 'Completar';
        const numeroVisual = peds.length - index;
        return `
        <div class="pedido-row p-3 border-bottom" data-pedido-id="${p.PedidoID}" data-numero-visual="${numeroVisual}">
            <div class="d-flex justify-content-between">
                <div>
                    <strong>#${numeroVisual}</strong> - ${p.NombreCliente}
                    <br><small class="text-muted">${new Date(p.Fecha).toLocaleString('es-ES')}</small>
                </div>
                <div class="text-end">
                    ${p.DescuentoPorcentaje > 0 ? `
                        <div>
                            <small style="text-decoration: line-through; color: #888; font-size: 0.8em;">$${Number(p.Total).toLocaleString()}</small>
                            <span style="background:#27ae60; color:white; padding:2px 5px; border-radius:4px; font-size:0.7em; margin-left:5px;">-${p.DescuentoPorcentaje}%</span>
                        </div>
                    ` : ''}
                    <div class="h5 fw-bold" style="color: #2563eb;">$${Number(p.TotalManual || p.Total).toLocaleString()}</div>
                    <span class="badge bg-${p.Estado === 'Completado' ? 'success' : p.Estado === 'Pendiente' ? 'warning' : 'secondary'}">${p.Estado}</span>
                </div>
            </div>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-${btnClass} me-1 pedido-btn-status" 
                        data-pedido-id="${p.PedidoID}" 
                        data-new-estado="${newEstado}">
                    ${btnText}
                </button>
                <button class="btn btn-sm btn-primary me-1 pedido-btn-factura" 
                        data-pedido-id="${p.PedidoID}">
                    <i class="bi bi-file-earmark-pdf me-1"></i>Factura
                </button>
                <button class="btn btn-sm btn-outline-danger pedido-btn-delete" 
                        data-pedido-id="${p.PedidoID}">
                    Eliminar
                </button>
            </div>
        </div>`;
    }).join('');
}

function obtenerNumeroVisualActual(pedidoId) {
    const pedidoRow = document.querySelector(`.pedido-row[data-pedido-id="${pedidoId}"]`);
    return pedidoRow ? pedidoRow.dataset.numeroVisual : 'N/A';
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

function forzarCierreModal() {
    // 1. Ocultar el modal
    const modalEl = document.getElementById('modalDescuento');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    // 2. ELIMINAR EL GRIS A LA FUERZA
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '0';
}

// 🏷️ EVENT LISTENER GLOBAL PARA MODAL DESCUENTO - Forzar limpieza total
document.addEventListener('click', function(e) {
    if (e.target.matches('#btnConfirmarDescuento')) {
        const btn = e.target;
        const id = btn.dataset.productId;
        const descuentoEl = document.getElementById('inputDescuento');
        const descuento = parseFloat(descuentoEl.value);
        
        if (isNaN(descuento) || descuento < 0 || descuento > 100) {
            Swal.fire('Error', 'Descuento debe estar entre 0-100%', 'warning');
            return;
        }
        
        // Ejecutar PUT
        fetch(`/productos/${id}/descuento`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({descuento: descuento})
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(() => {
            forzarCierreModal();
            
            descuentoEl.value = '';
            descuentoEl.dataset.productId = '';
            btn.dataset.productId = '';
            Swal.fire('Descuento aplicado', '', 'success');
            cargarProductos();
        })
        .catch(err => {
            forzarCierreModal();
            Swal.fire('Error', err.message, 'error');
        });
    }
});

// Asignar forzarCierreModal a Cancelar y X
document.addEventListener('DOMContentLoaded', function() {
    const btnCancelar = document.getElementById('btnCancelarDescuento');
    const btnClose = document.querySelector('#modalDescuento .btn-close');
    
    if (btnCancelar) btnCancelar.onclick = forzarCierreModal;
    if (btnClose) btnClose.onclick = forzarCierreModal;
});

