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

// Recupera el pedido desde el servidor por id y llama a la generación de factura
async function prepararFacturaPorId(pedidoId, numeroPedido) {
    try {
        Swal.fire({ title: 'Preparando factura...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        // Intentar obtener el pedido por ID (ruta preferida)
        let pedido = null;
        let res = await fetch(`${BASE_URL}/pedidos/${pedidoId}`);
        if (res.ok) {
            pedido = await res.json();
        } else if (res.status === 404) {
            // Si el servidor no tiene la ruta o no encuentra el id, hacer fallback a obtener todos y buscar localmente
            console.warn(`Pedido ${pedidoId} no encontrado vía /pedidos/:id (404). Intentando /pedidos y buscando localmente.`);
            const resAll = await fetch(`${BASE_URL}/pedidos`);
            if (!resAll.ok) {
                const txt = await resAll.text().catch(() => '');
                Swal.close();
                console.error('Error obteniendo lista de pedidos:', resAll.status, txt);
                Swal.fire('Error', `No se pudo obtener la lista de pedidos (${resAll.status}) ${txt}`, 'error');
                return;
            }
            const lista = await resAll.json();
            pedido = lista.find(x => Number(x.PedidoID) === Number(pedidoId));
        } else {
            const txt = await res.text().catch(() => '');
            Swal.close();
            console.error('Error obteniendo pedido:', res.status, txt);
            Swal.fire('Error', `No se pudo obtener el pedido (${res.status}) ${txt}`, 'error');
            return;
        }

        if (!pedido) {
            Swal.close();
            Swal.fire('Error', 'Pedido no encontrado para generar factura', 'error');
            return;
        }

        Swal.close();
        prepararFacturaConDescuento(pedido, numeroPedido, pedidoId);
    } catch (err) {
        console.error('Error preparando factura por id:', err);
        Swal.close();
        Swal.fire('Error', `No se pudo preparar la factura: ${err.message}`, 'error');
    }
}

async function generarFacturaPDF(p, numeroPedido) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const logoURL = 'https://res.cloudinary.com/donc8a6tc/image/upload/v1770738241/LOGO_TR%C3%89BOL-removebg-preview_uyamlw.png';

    // Render function que dibuja todo; acepta la imagen (puede ser undefined)
    function renderConLogo(img) {
        // --- CONFIGURACIÓN DE COLORES Y ESTILOS ---
        const verdeTrebol = [45, 90, 39]; // Verde institucional
        const grisOscuro = [45, 52, 54];
        const grisClaro = [245, 245, 245];

        // --- ENCABEZADO Y LOGOTIPO ---
        // Rectángulo lateral decorativo (estilo profesional)
        doc.setFillColor(verdeTrebol[0], verdeTrebol[1], verdeTrebol[2]);
        doc.rect(0, 0, 10, 297, 'F');

        // Si hay imagen, dibujarla a la izquierda superior (encima del lateral)
        if (img) {
            try {
                // Subir un poco más el logo y reducir tamaño
                doc.addImage(img, 'PNG', 14, -6, 52, 52);
            } catch (err) { /* si falla, continuar sin logo */ }
        }

        // Datos de la Empresa (Derecha superior)
        doc.setTextColor(verdeTrebol[0], verdeTrebol[1], verdeTrebol[2]);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('TRÉBOL.', 200, 25, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
        doc.setFont('helvetica', 'normal');
        doc.text('', 200, 31, { align: 'right' });
        doc.text('El Peñol, Antioquia | Cel: 322 9568362', 200, 36, { align: 'right' });
        doc.text('trebol@gmail.com', 200, 41, { align: 'right' });

        // --- BLOQUE DE INFORMACIÓN DE FACTURA ---
        doc.setFillColor(grisClaro[0], grisClaro[1], grisClaro[2]);
        doc.roundedRect(20, 50, 175, 25, 3, 3, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.text('FACTURA N°:', 30, 60);
        doc.setFont('helvetica', 'normal');
        doc.text(String(numeroPedido).padStart(6, '0'), 65, 60);
        
        doc.setFont('helvetica', 'bold');
        doc.text('FECHA:', 130, 60);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString(), 155, 60);

        // --- INFORMACIÓN DEL CLIENTE ---
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(verdeTrebol[0], verdeTrebol[1], verdeTrebol[2]);
        doc.text('FACTURADO A:', 20, 90);
        
        doc.setDrawColor(verdeTrebol[0], verdeTrebol[1], verdeTrebol[2]);
        doc.line(20, 92, 70, 92);

        doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(`Cliente: ${p.NombreCliente || p.Cliente || p.Nombre || 'Cliente'}`, 20, 100);
        doc.setFont('helvetica', 'normal');
        doc.text(`Teléfono: ${p.Telefono || 'N/A'}`, 20, 106);
        doc.text(`Email: ${p.Correo || 'N/A'}`, 20, 112);
        doc.text(`Dirección: ${p.Direccion || 'N/A'}`, 20, 118);

        // --- TABLA DE PRODUCTOS con DESCRIPCIÓN ---
        const tableColumn = ["CANT.", "DESCRIPCIÓN", "VALOR UNIT.", "SUBTOTAL"];
        const tableRows = [];

        // Normalizar productos (acepta string JSON o array)
        let productosArr = [];
        try {
            if (!p.Productos) productosArr = [];
            else if (Array.isArray(p.Productos)) productosArr = p.Productos;
            else if (typeof p.Productos === 'string') productosArr = JSON.parse(p.Productos);
        } catch (err) { productosArr = []; }

        productosArr.forEach(prod => {
            const obj = (typeof prod === 'string') ? { Nombre: prod, Cantidad: 1, Precio: 0 } : prod;
            const nombre = obj.Nombre || obj.Producto || 'Producto';
            const descripcion = obj.Descripcion || obj.descripcion || obj.Caracteristicas || '';
            const cant = Number(obj.Cantidad || obj.cantidad || obj.qty || 1) || 1;
            const precio = Number(obj.Precio || obj.precio || obj.PrecioUnitario || obj.ValorUnitario || 0) || 0;
            const subtotal = cant * precio;

            const descripcionCompleta = descripcion ? `${nombre}\n${descripcion}` : nombre;

            tableRows.push([
                cant,
                descripcionCompleta,
                `$${Number(precio).toLocaleString()}`,
                `$${Number(subtotal).toLocaleString()}`
            ]);
        });

        doc.autoTable({
            startY: 125,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: verdeTrebol, textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' },
                2: { halign: 'right' },
                3: { halign: 'right' }
            }
        });

        // --- TOTALES ---
        let finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 200;
        
        doc.setFontSize(10);
        doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
        
        const subtotalGeneral = productosArr.length ? productosArr.reduce((acc, curr) => {
            const c = Number(curr.Cantidad || curr.cantidad || curr.qty || 1) || 1;
            const pUnit = Number(curr.Precio || curr.precio || curr.PrecioUnitario || curr.ValorUnitario || 0) || 0;
            return acc + (c * pUnit);
        }, 0) : (Number(p.Total) || 0);
        const descuentoValor = subtotalGeneral - Number(p.Total || 0);

        doc.text(`Subtotal:`, 140, finalY);
        doc.text(`$${Number(subtotalGeneral).toLocaleString()}`, 190, finalY, { align: 'right' });

        if (descuentoValor > 0) {
            doc.setTextColor(200, 0, 0); // Rojo para descuento
            doc.text(`Descuento (${p.DescuentoPorcentaje || 0}%):`, 140, finalY + 7);
            doc.text(`-$${Number(descuentoValor).toLocaleString()}`, 190, finalY + 7, { align: 'right' });
            finalY += 7;
        }

        // Cuadro de Total Neto
        finalY += 10;
        doc.setFillColor(verdeTrebol[0], verdeTrebol[1], verdeTrebol[2]);
        doc.roundedRect(135, finalY - 7, 60, 12, 2, 2, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL NETO:`, 140, finalY);
        doc.text(`$${Number(p.Total).toLocaleString()}`, 190, finalY, { align: 'right' });

        // --- PIE DE PÁGINA ---
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Esta factura es un documento oficial de venta.', 105, 285, { align: 'center' });
        doc.text('Gracias por su compra en Trébol S.A.S.', 105, 290, { align: 'center' });

        // Descargar PDF
        doc.save(`Factura_Trebol_${numeroPedido}.pdf`);
    }

    // Intentar cargar logo; si falla, renderizar sin él
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() { renderConLogo(img); };
    img.onerror = function() { renderConLogo(); };
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
        data.sort((a, b) => b.PedidoID - a.PedidoID);

        document.getElementById('lista-pedidos').innerHTML = data.map((p, idx) => {
            const pedidoId = p.PedidoID;
            const estaCompletado = p.Estado === 'Completado';
            const displayNumber = idx + 1; 

            // --- PROCESAMIENTO DE FECHA (CORRECCIÓN DE DESFASE 5H) ---
            // Convertimos a string y quitamos la 'Z' o desfases UTC para que JS no reste horas
            const fechaRaw = p.Fecha ? p.Fecha.toString().replace('Z', '').split('+')[0] : new Date();
            const fechaObj = new Date(fechaRaw);

            const fechaFormateada = fechaObj.toLocaleDateString('es-CO', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            const horaFormateada = fechaObj.toLocaleTimeString('es-CO', {
                hour: '2-digit', minute: '2-digit', hour12: true
            });

            const porcentajeDcto = parseFloat(p.DescuentoPorcentaje) || 0;
            const totalBase = Number(p.Total) || 0;
            const totalConDescuento = totalBase - (totalBase * (porcentajeDcto / 100));

            const productos = (function() {
                try {
                    if (!p.Productos) return [];
                    if (Array.isArray(p.Productos)) return p.Productos;
                    if (typeof p.Productos === 'string') return JSON.parse(p.Productos);
                    return [];
                } catch (err) { return []; }
            })();

            const colorBorde = estaCompletado ? '#28a745' : '#e67e22';
            const colorTexto = estaCompletado ? '#28a745' : '#e67e22';

            return `
<div class="order-card-wrapper" data-estado="${p.Estado || 'Pendiente'}">
    <div class="order-card-compact mb-4 card shadow-sm" style="border: 3px solid ${colorBorde}; border-radius: 20px;">
        <div class="order-summary-line order-collapse-trigger p-3 d-flex justify-content-between align-items-center" data-bs-toggle="collapse" data-bs-target="#collapsePedido${pedidoId}" role="button" style="cursor: pointer; background: linear-gradient(135deg, ${estaCompletado ? '#f0fdf4' : '#fffbf5'} 0%, #ffffff 100%); border-radius: 17px 17px 0 0;">
            <div class="d-flex align-items-center gap-3">
                <div class="badge bg-secondary text-white rounded-pill" style="min-width:48px;">#${displayNumber}</div>
                <div>
                    <h5 class="fw-bold mb-0" style="color:#2d3436;">${p.NombreCliente || 'Cliente General'}</h5>
                    <small class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-clock me-1"></i>${fechaFormateada} - ${horaFormateada}</small>
                    ${porcentajeDcto > 0 ? `<div class="mt-1"><small class="text-muted text-decoration-line-through">$${totalBase.toLocaleString()}</small></div>` : ''}
                </div>
            </div>
            <div class="d-flex align-items-center gap-3">
                <h6 id="precio-header-${pedidoId}" class="fw-bold mb-0" style="color: ${colorTexto}; font-size: 1.25rem;">$${totalConDescuento.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h6>
                <i class="bi bi-caret-down-fill text-muted"></i>
            </div>
        </div>

        <div class="collapse" id="collapsePedido${pedidoId}">
            <div class="card-body p-4" style="background: #f8f9fa; border-radius: 0 0 17px 17px;">
                <hr style="border-top: 2px solid ${colorTexto};">
                
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h6 class="fw-bold mb-3"><i class="bi bi-info-circle me-2" style="color: ${colorTexto};"></i>Detalles del Pedido</h6>
                        <div style="background: white; padding: 15px; border-radius: 10px; border-left: 4px solid ${colorTexto};">
                            <small class="text-muted d-block">RECIBIDO EL:</small>
                            <small class="fw-bold d-block mb-2">${fechaFormateada} a las ${horaFormateada}</small>
                            
                            <small class="text-muted d-block">CONTACTO:</small>
                            <small class="fw-bold d-block"><i class="bi bi-telephone me-2"></i>${p.Telefono || 'N/A'}</small>
                            <small class="fw-bold d-block"><i class="bi bi-envelope me-2"></i>${p.Correo || 'N/A'}</small>
                            <small class="text-muted d-block mt-2">DIRECCIÓN:</small>
                            <small class="fw-bold d-block"><i class="bi bi-geo-alt me-2"></i>${p.Direccion || 'N/A'}</small>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <h6 class="fw-bold mb-3"><i class="bi bi-box-seam me-2" style="color: ${colorTexto};"></i>Productos</h6>
                        <div style="background: white; padding: 15px; border-radius: 10px; border-left: 4px solid ${colorTexto};">
                            ${productos.map((prod, pidx) => {
                                let nombre = prod.Nombre || prod.nombre || 'Producto';
                                let cantidad = prod.cantidad || prod.Cantidad || 1;
                                let precio = Number(prod.Precio || prod.precio || 0);
                                return `
                                <div class="d-flex justify-content-between align-items-center ${pidx < productos.length - 1 ? 'pb-2 mb-2 border-bottom' : ''}">
                                    <div><small class="fw-bold d-block">${nombre}</small><small class="text-muted">Cant: ${cantidad}</small></div>
                                    <div class="text-end"><small class="fw-bold" style="color: ${colorTexto};">$${(cantidad * precio).toLocaleString()}</small></div>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>
                <div class="order-actions d-grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));">
                    <button class="btn btn-dark fw-bold rounded-pill" onclick="prepararFacturaPorId(${pedidoId}, ${displayNumber})"><i class="bi bi-file-pdf"></i> FACTURA</button>
                    <button class="btn btn-success fw-bold rounded-pill" onclick="completarPedido(${pedidoId})">COMPLETAR</button>
                    <button class="btn btn-outline-danger fw-bold rounded-pill" onclick="eliminarPedido(${pedidoId})">ELIMINAR</button>
                </div>
            </div>
        </div>
    </div>
</div>`;
        }).join('');
    } catch (err) { console.error(err); } 
    finally { cargandoPedidosFlag = false; }
}

function filtrarPedidos(estado) {
    const tarjetas = document.querySelectorAll('.order-card-wrapper');
    const botones = {
        'Todos': document.getElementById('btn-filtro-Todos'),
        'Pendiente': document.getElementById('btn-filtro-Pendiente'),
        'Completado': document.getElementById('btn-filtro-Completado')
    };

    // 1. Resetear estilos de botones
    Object.keys(botones).forEach(key => {
        botones[key].classList.remove('btn-dark', 'btn-warning', 'btn-success', 'active');
        botones[key].classList.add('btn-outline-dark'); 
        // Nota: cambié a btn-outline-dark para que se vean limpios cuando no están activos
    });

    // 2. Aplicar color al botón activo
    const btnActivo = botones[estado];
    btnActivo.classList.remove('btn-outline-dark');
    if (estado === 'Todos') btnActivo.classList.add('btn-dark');
    if (estado === 'Pendiente') btnActivo.classList.add('btn-warning');
    if (estado === 'Completado') btnActivo.classList.add('btn-success');
    btnActivo.classList.add('active');

    // 3. Filtrar visualmente
    tarjetas.forEach(t => {
        if (estado === 'Todos') {
            t.style.display = 'block';
        } else {
            t.style.display = (t.getAttribute('data-estado') === estado) ? 'block' : 'none';
        }
    });
}

// Función de apoyo para que el descuento se guarde sin recargar toda la página si no quieres
async function guardarDescuentoSimple(pedidoId, valor) {
    try {
        await fetch(`${BASE_URL}/pedidos/${pedidoId}/descuento`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descuento: valor })
        });

        // Capturamos el total base del elemento oculto que pusimos arriba
        const totalBase = parseFloat(document.getElementById(`total-base-${pedidoId}`).innerText);
        const porcentaje = parseFloat(valor) || 0;
        const nuevoNeto = totalBase - (totalBase * (porcentaje / 100));

        // Formateador de moneda con 2 decimales
        const formateador = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2
        });

        // Actualizamos los textos sin recargar la lista
        document.getElementById(`precio-header-${pedidoId}`).innerText = formateador.format(nuevoNeto);
        document.getElementById(`precio-neto-final-${pedidoId}`).innerText = `Neto: ${formateador.format(nuevoNeto)}`;

        console.log("Actualizado con decimales:", nuevoNeto);
    } catch (err) {
        console.error("Error:", err);
    }
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

async function guardarDescuentoEnBD(pedidoId, valor) {
    try {
        await fetch(`${BASE_URL}/pedidos/${pedidoId}/descuento`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descuento: valor })
        });
        console.log("Porcentaje guardado. Al refrescar, el JS calculará el neto solo.");
    } catch (err) {
        console.error("Error al guardar descuento:", err);
    }
}

/* ============================================================================
   INICIALIZACIÓN
   ============================================================================ */

// Cargar inventario y pedidos al iniciar
cargarInventario();
cargarPedidos();
cargarAgotados();