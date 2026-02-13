/* ============================================================================
   LÓGICA ADMIN - TRÉBOL
   ============================================================================ */

const BASE_URL = 'https://tienda-1vps.onrender.com';
let editando = false;
let cargandoPedidosFlag = false;
let productosLocal = []; 

/* ============================================================================
   PRODUCTOS - RENDERIZADO Y CARGA
   ============================================================================ */

function renderizarProducto(p) {
    // 1. DETECTIVE DE RUTAS - Busca en todas las propiedades posibles
    let rutaEncontrada = null;

    if (p.FotoReal) rutaEncontrada = p.FotoReal;
    else if (p.ImagenURL) rutaEncontrada = p.ImagenURL;
    else if (p.Galeria && p.Galeria.length > 0) {
        const gal = typeof p.Galeria === 'string' ? JSON.parse(p.Galeria) : p.Galeria;
        if (gal[0] && gal[0].ImagenURL) rutaEncontrada = gal[0].ImagenURL;
    }

    // 2. CONSTRUIR URL FINAL
    let imgPath = 'https://placehold.co/150?text=Sin+Imagen';
    
    if (rutaEncontrada) {
        imgPath = rutaEncontrada.startsWith('http') 
                  ? rutaEncontrada 
                  : `${BASE_URL}${rutaEncontrada}`;
    }

    console.log(`Producto: ${p.Nombre} | Ruta detectada: ${rutaEncontrada} | URL Final: ${imgPath}`);

    const skuValido = p.CodigoSKU || 'S/N';
    const prodJson = JSON.stringify(p).replace(/'/g, "&apos;");
    
    return `
    <div class="product-row shadow-sm">
        <div class="img-box">
            <img src="${imgPath}" 
                 alt="${p.Nombre}" 
                 onerror="this.onerror=null; this.src='https://placehold.co/150?text=Error+Carga';">
        </div>
        <div class="flex-grow-1">
            <h6 class="mb-0 fw-bold">${p.Nombre || 'Sin nombre'}</h6>
            <small class="text-muted d-block" style="font-size:0.7rem">SKU: ${skuValido}</small>
            <div class="desc-text">${p.Caracteristicas || 'Sin descripción.'}</div>
        </div>
        <div class="text-end px-2" style="min-width: 100px;">
            <div class="price-badge">$${Number(p.Precio || 0).toLocaleString()}</div>
            <small class="fw-bold ${p.Stock < 10 ? 'text-danger' : 'text-success'}">${p.Stock || 0} unds</small>
        </div>
        <div class="d-flex">
            <button class="action-btn btn-edit" onclick='prepararEdicion(${prodJson})'><i class="bi bi-pencil-fill"></i></button>
            <button class="action-btn btn-delete" onclick="eliminarProducto(${p.ProductoID})"><i class="bi bi-trash-fill"></i></button>
        </div>
    </div>`;
}

async function cargarInventario() {
    try {
        const res = await fetch(`${BASE_URL}/productos`);
        let data = await res.json();

        // Orden alfabético
        data.sort((a, b) => a.Nombre.localeCompare(b.Nombre));

        productosLocal = data; 
        mostrarProductos(productosLocal);
    } catch (err) { 
        console.error("Error inventario:", err); 
    }
}

function mostrarProductos(data) {
    document.getElementById('total-count').innerText = `${data.length} Items`;
    document.getElementById('lista-productos').innerHTML = data.map(renderizarProducto).join('');
}

function filtrarProductos() {
    const termino = document.getElementById('buscar-prod').value.toLowerCase();
    const filtrados = productosLocal.filter(p => 
        p.Nombre.toLowerCase().includes(termino) || 
        (p.CodigoSKU && p.CodigoSKU.toLowerCase().includes(termino)) ||
        (p.Marca && p.Marca.toLowerCase().includes(termino))
    );
    mostrarProductos(filtrados);
}

async function cargarAgotados() {
    try {
        const res = await fetch(`${BASE_URL}/productos`);
        const data = await res.json();
        const agotados = data.filter(p => p.Stock < 10);
        document.getElementById('agotados-count').innerText = `${agotados.length} Alertas`;
        const lista = document.getElementById('lista-agotados');
        lista.innerHTML = agotados.length === 0 ? 
            '<div class="text-center p-5 text-muted">No hay stock bajo.</div>' : 
            agotados.map(renderizarProducto).join('');
    } catch (err) { console.error("Error agotados:", err); }
}

function prepararEdicion(p) {
    editando = true;
    document.getElementById('titulo-form').innerText = "Editando Producto";
    document.getElementById('btn-guardar').innerText = "ACTUALIZAR";
    document.getElementById('btn-guardar').style.background = "#2ecc71";
    document.getElementById('prod-id').value = p.ProductoID;
    document.getElementById('nombre').value = p.Nombre;
    document.getElementById('marca').value = p.Marca;
    document.getElementById('sku').value = p.CodigoSKU || '';
    document.getElementById('precio').value = p.Precio;
    document.getElementById('stock').value = p.Stock;
    document.getElementById('caracteristicas').value = p.Caracteristicas || '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarProducto(id) {
    const result = await Swal.fire({
        title: '¿Eliminar?',
        text: 'Se borrará permanentemente',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff7675',
        cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    try {
        const res = await fetch(`${BASE_URL}/productos/${id}`, { method: 'DELETE' });
        if (res.ok) { 
            cargarInventario(); 
            cargarAgotados(); 
            Swal.fire('Eliminado', '', 'success');
        }
    } catch (err) { console.error(err); }
}

function limpiarForm() {
    editando = false;
    document.getElementById('form-producto').reset();
    document.getElementById('titulo-form').innerText = "Crear Producto";
    document.getElementById('btn-guardar').innerText = "GUARDAR PRODUCTO";
    document.getElementById('btn-guardar').style.background = "var(--accent)";
    document.getElementById('prod-id').value = "";

    // Generar SKU automático
    const autoSKU = "TRB-" + Date.now().toString().slice(-8); 
    document.getElementById('sku').value = autoSKU;
}

/* ============================================================================
   FORMULARIO - GUARDAR PRODUCTO
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    // PROTECCIÓN DE HISTORIAL - Prevenir back button
    window.history.pushState(null, null, window.location.href);
    window.addEventListener('popstate', function() {
        window.history.pushState(null, null, window.location.href);
    });
    
    const formProducto = document.getElementById('form-producto');
    
    if (formProducto) {
        formProducto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('prod-id').value;
            const url = editando ? `${BASE_URL}/productos/${id}` : `${BASE_URL}/productos`;
            const method = editando ? 'PUT' : 'POST';

            const formData = new FormData();
            formData.append('Nombre', document.getElementById('nombre').value);
            formData.append('Marca', document.getElementById('marca').value);
            formData.append('CodigoSKU', document.getElementById('sku').value);
            formData.append('Precio', document.getElementById('precio').value);
            formData.append('Stock', document.getElementById('stock').value);
            formData.append('Caracteristicas', document.getElementById('caracteristicas').value);

            const fotoInput = document.getElementById('imagenes');
            if (fotoInput.files.length > 0) {
                formData.append('imagenes', fotoInput.files[0]);
            }

            try {
                Swal.fire({ 
                    title: 'Guardando...', 
                    allowOutsideClick: false, 
                    didOpen: () => Swal.showLoading() 
                });

                const res = await fetch(url, { 
                    method: method, 
                    body: formData
                });

                const result = await res.json();

                if (res.ok) {
                    await Swal.fire('¡Éxito!', 'Producto guardado correctamente', 'success');
                    limpiarForm();
                    cargarInventario();
                    cargarAgotados();
                } else {
                    throw new Error(result.error || 'Error al guardar');
                }
            } catch (err) {
                console.error("Error completo:", err);
                Swal.fire('Error', err.message, 'error');
            }
        });
    }
    
    // BOTÓN LOGOUT
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();

            const result = await Swal.fire({
                title: '¿Cerrar sesión?',
                text: "Tendrás que ingresar la clave nuevamente para entrar al panel.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#2d5a27',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar',
                reverseButtons: true
            });

            if (result.isConfirmed) {
                // Limpiar todos los datos de sesión
                localStorage.clear();
                sessionStorage.clear();
                
                // Esperar un poco antes de redirigir
                setTimeout(() => {
                    window.location.replace('tienda.html');
                }, 300);
            }
        });
    }
});

/* ============================================================================
   PEDIDOS - DESCUENTOS Y FACTURACIÓN
   ============================================================================ */

function aplicarDescuentoVisual(pedidoId, totalOriginal, porcentaje) {
    const desc = parseFloat(porcentaje) || 0;
    const nuevoTotal = totalOriginal - (totalOriginal * desc / 100);
    
    const inputTotal = document.getElementById(`input-total-${pedidoId}`);
    if (inputTotal) {
        inputTotal.value = nuevoTotal.toFixed(0);
    }
}

async function guardarTotalManual(pedidoId, valor) {
    try {
        await fetch(`${BASE_URL}/pedidos/${pedidoId}/total-manual`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalManual: parseFloat(valor) })
        });
        console.log("Total actualizado");
    } catch (err) {
        console.error("Error al guardar total:", err);
    }
}

async function guardarDescuentoServidor(pedidoId, porcentaje) {
    try {
        const res = await fetch(`${BASE_URL}/pedidos/${pedidoId}/descuento`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descuento: parseFloat(porcentaje) || 0 })
        });

        if (res.ok) {
            console.log(`Descuento del ${porcentaje}% guardado para el pedido ${pedidoId}`);
        }
    } catch (err) {
        console.error("Error al guardar descuento:", err);
    }
}

function prepararFacturaConDescuento(p, numeroPedido, pedidoId) {
    const inputDesc = document.querySelector(`#collapsePedido${pedidoId} input[type="number"]`);
    const porcentaje = parseFloat(inputDesc.value) || 0;
    
    const totalOriginal = Number(p.Total);
    const valorDescuento = totalOriginal * (porcentaje / 100);
    const totalFinal = totalOriginal - valorDescuento;

    const pedidoParaPDF = { 
        ...p, 
        Total: totalFinal, 
        DescuentoValor: valorDescuento,
        DescuentoPorcentaje: porcentaje 
    };
    
    generarFacturaPDF(pedidoParaPDF, numeroPedido);
}

async function generarFacturaPDF(p, numeroPedido) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // LOGO
    const logoURL = 'https://res.cloudinary.com/donc8a6tc/image/upload/v1770738241/LOGO_TR%C3%89BOL-removebg-preview_uyamlw.png';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        doc.addImage(img, 'PNG', 15, 10, 30, 30);
        
        // ENCABEZADO
        doc.setFillColor(108, 92, 231);
        doc.rect(0, 0, 210, 45, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text('FACTURA TRÉBOL', 130, 25, { align: 'right' });
        doc.setFontSize(10);
        doc.text(`#${numeroPedido}`, 130, 32, { align: 'right' });

        // DATOS DEL CLIENTE
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Cliente: ${p.Cliente || 'Cliente General'}`, 20, 55);
        doc.text(`Email: ${p.Email || 'N/A'}`, 20, 62);
        doc.text(`Teléfono: ${p.Telefono || 'N/A'}`, 20, 69);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 76);

        // TABLA DE PRODUCTOS
        const tableColumn = ['Artículo', 'Cantidad', 'Precio', 'Subtotal'];
        const tableRows = [];

        if (p.Productos && Array.isArray(p.Productos)) {
            p.Productos.forEach(prod => {
                const nombreProd = typeof prod === 'string' ? prod : prod.Nombre || 'Producto';
                const cantidad = prod.Cantidad || 1;
                const precio = prod.Precio || 0;
                const subtotal = cantidad * precio;

                tableRows.push([
                    nombreProd,
                    cantidad,
                    `$${precio.toLocaleString()}`,
                    `$${subtotal.toLocaleString()}`
                ]);
            });
        }

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 85,
            headStyles: { fillColor: [108, 92, 231], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        // TOTAL
        let finalY = doc.lastAutoTable.finalY + 10;
        
        if (p.DescuentoPorcentaje && p.DescuentoPorcentaje > 0) {
            doc.setFontSize(10);
            doc.text(`Subtotal: $${Number(p.Total + p.DescuentoValor).toLocaleString()}`, 130, finalY);
            doc.text(`Descuento (${p.DescuentoPorcentaje}%): -$${Number(p.DescuentoValor).toLocaleString()}`, 130, finalY + 7);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`TOTAL: $${Number(p.Total).toLocaleString()}`, 130, finalY + 15, { align: 'right' });
        } else {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`TOTAL: $${Number(p.Total).toLocaleString()}`, 130, finalY, { align: 'right' });
        }

        // Descargar
        doc.save(`factura_${numeroPedido}.pdf`);
    };
    img.src = logoURL;
}

async function cargarPedidos() {
    if (cargandoPedidosFlag) return;
    cargandoPedidosFlag = true;

    try {
        const res = await fetch(`${BASE_URL}/pedidos`);
        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error("Pedidos no es un array:", data);
            cargandoPedidosFlag = false;
            return;
        }

        document.getElementById('order-count').innerText = `${data.length} recibidos`;
        
        document.getElementById('lista-pedidos').innerHTML = data.map((p, idx) => {
            const numeroPedido = p.PedidoID;
            const pedidoId = p.PedidoID;
            const estaCompletado = p.Completado === 1;
            // Asegurar que `Productos` sea un array (a veces viene como JSON string)
            const productos = (function() {
                try {
                    if (!p.Productos) return [];
                    if (Array.isArray(p.Productos)) return p.Productos;
                    if (typeof p.Productos === 'string') return JSON.parse(p.Productos);
                    return [];
                } catch (err) {
                    console.warn('Error parsing Productos for pedido', p.PedidoID, err);
                    return [];
                }
            })();
            const colorBorde = estaCompletado ? '#28a745' : '#e67e22';
            const colorTexto = estaCompletado ? '#28a745' : '#e67e22';
            const statusClass = estaCompletado ? 'status-completado' : 'status-pendiente';
            const statusText = estaCompletado ? 'Entregado' : 'Pendiente';
            const statusIcon = estaCompletado ? 'bi-check-circle-fill' : 'bi-clock-fill';

            const displayNumber = idx + 1;

            return `
<div class="order-card-compact mb-4 card shadow-sm" style="border: 3px solid ${colorBorde}; border-radius: 20px;">
    <div class="order-summary-line order-collapse-trigger p-3 d-flex justify-content-between align-items-center" data-bs-toggle="collapse" data-bs-target="#collapsePedido${pedidoId}" role="button" aria-expanded="false" aria-controls="collapsePedido${pedidoId}" style="cursor: pointer; background: linear-gradient(135deg, ${estaCompletado ? '#f0fdf4' : '#fffbf5'} 0%, #ffffff 100%); border-radius: 17px 17px 0 0;">
        <div class="d-flex align-items-center gap-3">
            <div class="badge bg-secondary text-white rounded-pill" style="font-size: 0.95rem; padding: 10px 12px; min-width:48px; text-align:center;">#${displayNumber}</div>
            <div>
                <h5 class="fw-bold mb-0" style="color:#2d3436;">${p.NombreCliente || 'Cliente General'}</h5>
            </div>
        </div>
        <div class="d-flex align-items-center gap-3">
            <h6 class="fw-bold mb-0" style="color: ${colorTexto}; font-size: 1.25rem;">$${Number(p.Total).toLocaleString()}</h6>
            <i class="bi bi-caret-down-fill text-muted"></i>
        </div>
    </div>

    <div class="collapse" id="collapsePedido${pedidoId}">
        <div class="card-body p-4" style="background: #f8f9fa; border-radius: 0 0 17px 17px;">
            <hr style="border-top: 2px solid ${colorTexto}; margin-bottom: 20px;">
            
            <div class="row mb-4">
                <div class="col-md-6">
                    <h6 class="fw-bold mb-3"><i class="bi bi-info-circle me-2" style="color: ${colorTexto};"></i>Información de Envío</h6>
                    <div style="background: white; padding: 15px; border-radius: 10px; border-left: 4px solid ${colorTexto};">
                        <div class="mb-3">
                            <small class="text-muted d-block">CONTACTO</small>
                            <small class="fw-bold d-block"><i class="bi bi-telephone me-2"></i>${p.Telefono || 'N/A'}</small>
                            <small class="fw-bold d-block"><i class="bi bi-envelope me-2"></i>${p.Correo || 'N/A'}</small>
                        </div>
                        <div>
                            <small class="text-muted d-block">DIRECCIÓN Y FECHA DE PEDIDO</small>
                            <small class="fw-bold d-block"><i class="bi bi-geo-alt me-2"></i>${p.Direccion || 'N/A'}</small>
                            <small class="fw-bold d-block"><i class="bi bi-calendar me-2"></i>${new Date(p.Fecha).toLocaleString('es-CO')}</small>
                        </div>
                    </div>
                </div>

                <div class="col-md-6">
                    <h6 class="fw-bold mb-3"><i class="bi bi-box-seam me-2" style="color: ${colorTexto};"></i>Productos</h6>
                    <div style="background: white; padding: 15px; border-radius: 10px; border-left: 4px solid ${colorTexto};">
                        ${productos && productos.length ? productos.map((prod, pidx) => {
                            // Normalizar producto (puede venir como string o como objeto con distintas keys)
                            let nombre = typeof prod === 'string' ? prod : (prod.Nombre || prod.nombre || prod.Producto || 'Producto');
                            // Detectar cantidad en varios campos posibles
                            let cantidad = 1;
                            const possibleQtyKeys = ['Cantidad','CantidadVendida','cantidad','qty','quantity','CantidadProducto','CantidadPedida','cantidad_vendida'];
                            if (typeof prod === 'object' && prod !== null) {
                                for (const k of possibleQtyKeys) {
                                    if (prod[k] != null) {
                                        const n = Number(prod[k]);
                                        if (!Number.isNaN(n)) { cantidad = n; break; }
                                    }
                                }
                            }

                            // Si no hay cantidad numérica, intentar extraerla del nombre (ej. "15x Kit carburador")
                            try {
                                const m = String(nombre).trim().match(/^\s*(\d+)\s*[xX]\s*(.+)$/);
                                if (m) {
                                    const parsedN = Number(m[1]);
                                    if (!Number.isNaN(parsedN)) {
                                        cantidad = parsedN;
                                        nombre = m[2];
                                    }
                                }
                            } catch (e) {
                                // ignore
                            }

                            // Precio en varias keys posibles
                            let precio = 0;
                            if (typeof prod === 'object' && prod !== null) {
                                precio = prod.Precio || prod.PrecioUnitario || prod.precio || prod.PrecioVenta || 0;
                            }
                            precio = Number(precio) || 0;

                            const subtotal = cantidad * precio;

                            return `
                            <div class="d-flex justify-content-between align-items-center ${pidx < productos.length - 1 ? 'pb-2 mb-2 border-bottom' : ''}">
                                <div>
                                    <small class="fw-bold d-block text-dark">${nombre}</small>
                                    <small class="text-muted">Cantidad: <strong>${cantidad}</strong></small>
                                </div>
                                <div class="text-end">
                                    <small class="text-muted d-block">$${precio.toLocaleString()}</small>
                                    <small class="fw-bold" style="color: ${colorTexto};">$${subtotal.toLocaleString()}</small>
                                </div>
                            </div>`;
                        }).join('') : '<p class="text-muted text-center">Sin productos</p>'}
                    </div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-12">
                    <h6 class="fw-bold mb-3"><i class="bi bi-percent me-2" style="color: ${colorTexto};"></i>Ajustes Finales</h6>
                    <div style="background: white; padding: 20px; border-radius: 10px; border-left: 4px solid ${colorTexto};">
                        <div class="row">
                            <div class="col-md-6">
                                <label class="form-label fw-bold small">Descuento (%)</label>
                                <div class="input-group">
                                    <input type="number" class="form-control" min="0" max="100" value="${p.DescuentoPorcentaje || 0}" 
                                           placeholder="0"
                                           onchange="guardarDescuentoServidor(${pedidoId}, this.value)"
                                           oninput="aplicarDescuentoVisual(${pedidoId}, ${Number(p.Total)}, this.value)">
                                    <span class="input-group-text fw-bold">%</span>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold small">Total Final (\$)</label>
                                <input type="number" id="input-total-${pedidoId}" class="form-control form-control-lg fw-bold" 
                                       value="${Number(p.Total)}"
                                       style="color: ${colorTexto}; font-size: 1.2rem;"
                                       onblur="guardarTotalManual(${pedidoId}, this.value)">
                            </div>
                        </div>
                        <small id="nuevo-total-${pedidoId}" class="text-muted d-block mt-2">Total actualizado: <strong style="color: ${colorTexto};">$${Number(p.Total).toLocaleString()}</strong></small>
                    </div>
                </div>
            </div>

            <div class="order-actions d-grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
                <button class="btn btn-dark fw-bold rounded-pill" 
                        onclick="prepararFacturaConDescuento(${JSON.stringify(p).replace(/'/g, "&apos;")}, '${numeroPedido}', ${pedidoId})">
                    <i class="bi bi-file-pdf me-2"></i>FACTURA
                </button>
                <button class="btn btn-success fw-bold rounded-pill" 
                        onclick="completarPedido(${pedidoId})">
                    <i class="bi bi-check-lg me-2"></i>COMPLETAR
                </button>
                <button class="btn btn-outline-danger fw-bold rounded-pill" 
                        onclick="eliminarPedido(${pedidoId})">
                    <i class="bi bi-trash me-2"></i>Eliminar
                </button>
            </div>
        </div>
    </div>
</div>`;
        }).join('');
    } catch (err) { console.error(err); } 
    finally { cargandoPedidosFlag = false; }
}

async function eliminarPedido(id) {
    try {
        const res = await fetch(`${BASE_URL}/pedidos/${id}`, { method: 'DELETE' });
        
        if (!res.ok) {
            const errorTexto = await res.text(); 
            console.error("Error del servidor:", errorTexto);
            throw new Error("Fallo en el servidor");
        }
        
        Swal.fire('Eliminado', '', 'success');
        cargarPedidos();
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'El servidor respondió con un error 500. Revisa los logs.', 'error');
    }
}

async function completarPedido(id) {
    try {
        const res = await fetch(`${BASE_URL}/pedidos/${id}/completar`, { method: 'PUT' });
        if (res.ok) { 
            Swal.fire('¡Excelente!', 'Pedido entregado', 'success');
            cargarPedidos(); 
        }
    } catch (err) { console.error(err); }
}

/* ============================================================================
   BACKUP E IMPORTACIÓN
   ============================================================================ */

function exportarInventario() {
    const datos = (typeof productosLocal !== 'undefined') ? productosLocal : [];
    
    if (datos.length === 0) {
        Swal.fire("Aviso", "No hay productos para exportar", "info");
        return;
    }

    const texto = JSON.stringify(datos, null, 4);
    const paquete = new Blob([texto], { type: "application/json" });
    const urlTemporal = URL.createObjectURL(paquete);
    
    const enlace = document.createElement("a");
    enlace.href = urlTemporal;
    enlace.download = `backup_trebol_${new Date().toISOString().slice(0,10)}.json`;
    
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(urlTemporal);
}

async function importarBackup(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = async (e) => {
        try {
            const productosBackup = JSON.parse(e.target.result);
            
            const confirm = await Swal.fire({
                title: '¿Restaurar Inventario?',
                text: `Se procesarán ${productosBackup.length} productos. Los que ya existan (mismo SKU) se omitirán para evitar duplicados.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#27ae60',
                confirmButtonText: 'Iniciar Restauración'
            });

            if (!confirm.isConfirmed) return;

            Swal.fire({
                title: 'Restaurando...',
                html: 'Producto: <b></b>',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            let creados = 0;
            let omitidos = 0;

            for (const p of productosBackup) {
                Swal.getHtmlContainer().querySelector('b').innerText = p.Nombre;

                const existe = productosLocal.some(local => local.CodigoSKU === p.CodigoSKU);

                if (!existe) {
                    await fetch(`${BASE_URL}/productos`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            Nombre: p.Nombre,
                            Marca: p.Marca,
                            Precio: p.Precio,
                            Stock: p.Stock,
                            CodigoSKU: p.CodigoSKU || `REC-${Date.now()}`,
                            Caracteristicas: p.Caracteristicas || ""
                        })
                    });
                    creados++;
                } else {
                    omitidos++;
                }
            }

            await Swal.fire({
                title: 'Proceso Finalizado',
                text: `Éxito: ${creados} | Omitidos por duplicidad: ${omitidos}`,
                icon: 'success'
            });

            cargarInventario();

        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'El archivo no es válido o hubo un problema con el servidor.', 'error');
        } finally {
            event.target.value = '';
        }
    };
    lector.readAsText(archivo);
}

/* ============================================================================
   SESIÓN - LOGOUT
   ============================================================================ */

/* ============================================================================
   PROTECCIÓN DE SESIÓN
   ============================================================================ */

function verificarSesion() {
    const adminLogged = localStorage.getItem('admin_logged');
    if (!adminLogged) {
        window.location.replace('tienda.html');
    }
}

function limpiarHistorial() {
    // Reemplazar múltiples veces para sobrescribir el historial
    for (let i = 0; i < 5; i++) {
        window.history.replaceState({ page: i }, null, window.location.href);
    }
}

/* ============================================================================
   INICIALIZACIÓN
   ============================================================================ */

// Cargar inventario y pedidos al iniciar
cargarInventario();
cargarPedidos();
cargarAgotados();
