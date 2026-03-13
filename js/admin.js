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
        const safeJSON = JSON.stringify(p).replace(/'/g, "&apos;");
        
        return `
        <div class="product-card" data-producto="${safeJSON}">
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
                        ${p.Caracteristicas ? `<small class="text-muted d-block mt-1 fs-6">${p.Caracteristicas.length > 100 ? p.Caracteristicas.substring(0, 100) + '...' : p.Caracteristicas}</small>` : ''}
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
        <div class="pedido-row p-3 border-bottom">
            <div class="d-flex justify-content-between">
                <div>
                    <strong>#${numeroVisual}</strong> - ${p.NombreCliente}
                    <br><small class="text-muted">${new Date(p.Fecha).toLocaleString('es-ES')}</small>
                </div>
                <div class="text-end">
                    <div class="h5 fw-bold text-primary">$${Number(p.Total).toLocaleString()}</div>
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

// 🚀 FACTURA GENERATOR (User-provided)
async function generarFacturaPDFParaPedido(pedidoId) {
    try {
        const res = await fetch(`/pedidos/${pedidoId}`);
        if (!res.ok) throw new Error('Pedido no encontrado');
        const p = await res.json();
        const numeroPedido = p.NumeroDisplay || p.PedidoID;
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
        const descuento = item.DescuentoPorcentaje || 0;
        const precioDesc = Number(item.Precio) * (1 - descuento / 100);
        const subtotalDesc = item.cantidad * precioDesc;
        return [
            item.cantidad,
            { content: `${item.Nombre}${descuento > 0 ? ` (-${descuento}%)` : ''}`, styles: { fontStyle: 'bold' } },
            `$ ${Number(item.Precio).toLocaleString()}`,
            `$ ${subtotalDesc.toLocaleString()}`
        ];
    });

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

    // 6. RESUMEN DE TOTALES
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(130, finalY, 65, 12, 'F');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL NETO:", 135, finalY + 8);
    doc.text(`$ ${Number(p.Total).toLocaleString()}`, 190, finalY + 8, { align: 'right' });

    // 7. MÉTODOS DE PAGO Y NOTAS
    const notasY = finalY + 25;
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
async function mostrarDetallesPedido(pedidoId) {
    try {
        const res = await fetch(`/pedidos/${pedidoId}`);
        const p = await res.json();
        
        // Parse productos
        let productosArr = [];
        try { 
            productosArr = typeof p.Productos === 'string' ? JSON.parse(p.Productos) : p.Productos; 
        } catch(e) { productosArr = []; }
        
        // All details
        document.getElementById('modalPedidoNum').textContent = `#${p.NumeroDisplay || p.PedidoID}`;
        document.getElementById('modalCliente').textContent = p.NombreCliente;
        document.getElementById('modalFecha').textContent = new Date(p.Fecha).toLocaleString('es-ES');
        document.getElementById('modalEstado').textContent = p.Estado;
        document.getElementById('modalTotal').textContent = `$${Number(p.Total).toLocaleString()}`;
        document.getElementById('modalTelefono').textContent = p.Telefono || 'N/A';
        document.getElementById('modalDocumento').textContent = p.Documento || 'N/A';
        document.getElementById('modalDireccion').textContent = p.Direccion || 'N/A';
        document.getElementById('modalBtnFactura').dataset.pedidoId = pedidoId;
        document.getElementById('modalDescuentoInput').dataset.productoId = ''; // Reset
        
        // Items table with descuentos
        const tbody = document.querySelector('#modalItemsTable tbody');
        tbody.innerHTML = productosArr.map(item => {
            const precioFinal = Number(item.Precio) * (1 - (item.DescuentoPorcentaje || 0)/100);
            const subtotal = item.cantidad * precioFinal;
            return `
                <tr>
                    <td>${item.Nombre}</td>
                    <td>${item.cantidad}</td>
                    <td>$${Number(item.Precio).toLocaleString()}</td>
                    <td>${item.DescuentoPorcentaje || 0}%</td>
                    <td><strong>$${subtotal.toLocaleString()}</strong></td>
                </tr>`;
        }).join('');
        
        // Show modal
        new bootstrap.Modal(document.getElementById('modalPedidoDetails')).show();
    } catch(err) {
        Swal.fire('Error', 'No se pudieron cargar detalles', 'error');
    }
}

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

