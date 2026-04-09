let carrito = [];
let productosData = [];
let productosFiltrados = [];
let paginaActual = 1;
const productosPorPagina = 16;
const BASE_URL = 'https://tienda-1vps.onrender.com';

/* ============================================================================
   PWA DETECTION - Must match admin.html logic
   ============================================================================ */

function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.matchMedia('(display-mode: fullscreen)').matches ||
           window.matchMedia('(display-mode: minimal-ui)').matches ||
           window.navigator.standalone === true;
}

/* ============================================================================
   SESSION MANAGEMENT - Persistent for PWA
   ============================================================================ */

// Session configuration - longer duration for PWA
const SESSION_CONFIG = {
    browserSessionDuration: 24 * 60 * 60 * 1000, // 24 hours for browser
    pwaSessionDuration: 30 * 24 * 60 * 60 * 1000  // 30 days for PWA (effectively permanent)
};

// Check if session is valid
function isSessionValid() {
    const sessionStr = localStorage.getItem('admin_session');
    if (!sessionStr) {
        console.log('[Session] No session string found');
        return false;
    }
    
    try {
        const session = JSON.parse(sessionStr);
        console.log('[Session] Parsed session:', session);
        
        // If session is not marked as logged in, it's invalid
        if (session.logged !== true) {
            console.log('[Session] Session not logged in');
            return false;
        }
        
        // If currently running as PWA, session is always valid
        if (isPWA()) {
            console.log('[Session] Currently in PWA mode - session valid');
            return true;
        }
        
        // If session was created in PWA mode, it's always valid
        if (session.isPWA === true) {
            console.log('[Session] Session created in PWA mode - session valid');
            return true;
        }
        
        // For browser sessions, check expiration
        if (session.timestamp) {
            const elapsed = Date.now() - session.timestamp;
            const isValid = elapsed < SESSION_CONFIG.browserSessionDuration;
            console.log('[Session] Browser mode - elapsed:', elapsed, 'isValid:', isValid);
            return isValid;
        }
        
        console.log('[Session] Session invalid - no valid flags');
        return false;
    } catch (e) {
        console.log('[Session] Error parsing session:', e);
        return false;
    }
}

// Save session with PWA flag
function saveAdminSession() {
    const sessionData = {
        logged: true,
        permanent: true,
        isPWA: isPWA()
    };
    localStorage.setItem('admin_session', JSON.stringify(sessionData));
    localStorage.setItem('admin_logged', 'true');
    
    console.log('✅ Permanent admin session saved');
    
    // 🔗 ONESIGNAL: Sync dynamic user ID
    setTimeout(async () => {
      const USER_ID = await window.OneSignalInit?.getCurrentUserId();
      if (USER_ID) {
        localStorage.setItem('current_user_id', USER_ID);
        console.log('🔗 Session linked to OneSignal userId:', USER_ID);
      }
      if (window.OneSignalInit?.checkAndRecoverSubscription) {
        await window.OneSignalInit.checkAndRecoverSubscription();
      }
    }, 100);
}

// Auto-login if session is valid (called on page load)
function autoLoginIfValid() {
    if (isSessionValid()) {
        const isPWA_mode = isPWA();
        console.log(`[Session] Auto-login successful (${isPWA_mode ? 'PWA' : 'browser'})`);
        // Redirect to admin panel
        window.location.href = 'admin.html';
    }
}

// Clear session on logout only
function clearAdminSession() {
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_logged');
    console.log('[Session] Admin session cleared');
}

/* ============================================================================
   PRODUCTOS - CARGA Y RENDERIZADO
   ============================================================================ */

async function cargarProductos() {
    try {
        const res = await fetch(`${BASE_URL}/productos`);
        if (!res.ok) {
            const errText = await res.text();
            console.error('Productos fetch failed:', res.status, errText);
            throw new Error(`Error ${res.status}: ${errText.substring(0,100)}`);
        }

        productosData = await res.json();
        productosFiltrados = [...productosData];
        paginaActual = 1;

        renderizarProductos();
        renderizarPaginacion();

        // Si el usuario llegó con ?producto=ID, abrir detalle del producto
        abrirProductoPorQuery();
    } catch (error) {
        console.error("Error cargando productos:", error);
        Swal.fire('Error', 'No se pudieron cargar los productos. Verifique su conexión.', 'error');
    }
}

async function cargarPromociones() {
    try {
        const res = await fetch(`${BASE_URL}/promociones?activa=true`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const promocionesActivas = await res.json();
        renderPromociones(promocionesActivas);
    } catch (error) {
        console.error('Error cargando promociones:', error);
        const cont = document.getElementById('contenedor-promociones');
        if (cont) cont.innerHTML = '<div class="text-center py-4 text-muted">No hay promociones disponibles.</div>';
    }
}

function renderPromociones(promocionesActivas) {
    const seccionPromos = document.getElementById('promociones');
    const cont = document.getElementById('contenedor-promociones');
    if (!cont || !seccionPromos) return;

    if (!promocionesActivas || promocionesActivas.length === 0) {
        seccionPromos.style.display = 'none';
        cont.innerHTML = '';
        return;
    }

    seccionPromos.style.display = 'block';

    const slideItems = promocionesActivas.map((p, index) => {
        const img = p.ImagenURL || 'https://placehold.co/600x350?text=Sin+imagen';
        const fecha = p.FechaInicio && p.FechaFin ? `${new Date(p.FechaInicio).toLocaleDateString()} - ${new Date(p.FechaFin).toLocaleDateString()}` : '';
        return `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <div class="d-flex justify-content-center">
                    <div class="card promo-card text-center shadow-sm" style="width: 280px;">
                        <img src="${img}" class="card-img-top" alt="${p.Titulo}" onerror="this.src='https://placehold.co/600x350?text=Error+imagen'" style="height: 170px; object-fit: cover;">
                        <div class="card-body">
                            <h6 class="card-title mb-1">${p.Titulo}</h6>
                            <p class="card-text small mb-2">${p.Descripcion || ''}</p>
                            ${fecha ? `<p class="text-muted small mb-2">${fecha}</p>` : ''}
                            <span class="badge bg-success">Activa</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }).join('');

    cont.innerHTML = `
        <div id="carouselPromociones" class="carousel slide promo-carousel" data-bs-ride="carousel" data-bs-interval="4000">
            <div class="carousel-inner">${slideItems}</div>
            <button class="carousel-control-prev" type="button" data-bs-target="#carouselPromociones" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Anterior</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#carouselPromociones" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Siguiente</span>
            </button>
        </div>`;
}

function armarHtmlProducto(p) {
    let fotoPrincipal = '';
    if (p.ImagenURL) {
        fotoPrincipal = p.ImagenURL;
    } else if (p.Galeria && p.Galeria.length > 0) {
        fotoPrincipal = p.Galeria[0].ImagenURL;
    }

    const srcFinal = (fotoPrincipal && fotoPrincipal.startsWith('http'))
        ? fotoPrincipal
        : (fotoPrincipal ? `${BASE_URL}${fotoPrincipal}` : 'https://placehold.co/250x250?text=Sin+Imagen');

    const estaAgotado = p.Stock <= 0;
    const claseAgotado = estaAgotado ? 'product-out-of-stock' : '';
    const stockColor = estaAgotado ? 'text-danger' : 'text-success';
    const stockTexto = estaAgotado ? '¡SIN EXISTENCIAS!' : `${p.Stock} disponibles`;

    const descuento = parseFloat(p.DescuentoPorcentaje) || 0;
    const precioBase = Number(p.Precio) || 0;
    const precioConDescuento = precioBase - (precioBase * descuento / 100);
    const tieneOferta = descuento > 0;

    return `
        <div class="col-md-4 col-lg-3">
            <div class="card product-card ${claseAgotado} h-100">
                <div class="img-container position-relative">
                    ${tieneOferta ? `<div class="position-absolute top-0 end-0 bg-danger text-white px-2 py-1 rounded-start fw-bold" style="font-size: 0.8rem; z-index: 10;">-${descuento}%</div>` : ''}
                    <img src="${srcFinal}" class="img-producto" data-id="${p.ProductoID}" onerror="this.src='https://placehold.co/250x250/e74c3c/white?text=Error+al+cargar'" style="${estaAgotado ? 'filter: grayscale(1); opacity: 0.6; cursor: not-allowed; pointer-events: none;' : ''}">
                </div>
                <div class="p-4 text-center">
                    <small class="text-uppercase fw-bold text-muted">${p.Marca || 'Genérico'}</small>
                    <h5 class="fw-bold mb-1 ${estaAgotado ? 'text-muted' : ''}">${p.Nombre}</h5>
                    ${tieneOferta ?
                        `<div class="price-tag mb-1 text-decoration-line-through text-muted" style="font-size: 0.9rem;">$${precioBase.toLocaleString()}</div>
                         <div class="price-tag mb-1" style="background: #e74c3c; display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; font-weight: bold;">$${precioConDescuento.toLocaleString()}</div>`
                        : `<div class="price-tag mb-1">$${precioBase.toLocaleString()}</div>`}
                    <div class="small fw-bold ${stockColor} mb-3">
                        <i class="bi ${estaAgotado ? 'bi-x-circle' : 'bi-box-seam'} me-1"></i>${stockTexto}
                    </div>

                    <button class="btn ${estaAgotado ? 'btn-secondary' : 'btn-añadir btn-success'} w-100 fw-bold rounded-pill" data-id="${p.ProductoID}" ${estaAgotado ? 'disabled' : ''}>
                        ${estaAgotado ? 'AGOTADO' : '<i class="bi bi-cart-plus me-2"></i>AÑADIR'}
                    </button>
                    <button class="btn btn-outline-primary w-100 fw-bold rounded-pill mt-2 btn-compartir" data-id="${p.ProductoID}">
                        <i class="bi bi-share-fill me-2"></i>Compartir
                    </button>
                </div>
            </div>
        </div>`;
}

function renderizarProductos() {
    const contenedor = document.getElementById('contenedor-productos');
    if (!contenedor) return;

    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const paginaProductos = productosFiltrados.slice(inicio, fin);

    contenedor.innerHTML = paginaProductos.map(p => armarHtmlProducto(p)).join('');
}

function renderizarPaginacion() {
    const paginacionEl = document.getElementById('paginacion-productos');
    if (!paginacionEl) return;

    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina) || 1;
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    let html = '';
    const rango = 2;
    const inicio = Math.max(1, paginaActual - rango);
    const fin = Math.min(totalPaginas, paginaActual + rango);

    if (paginaActual > 1) {
        html += `<li class="page-item"><button class="page-link" data-page="${paginaActual - 1}">Anterior</button></li>`;
    } else {
        html += `<li class="page-item disabled"><span class="page-link">Anterior</span></li>`;
    }

    for (let i = inicio; i <= fin; i++) {
        html += `<li class="page-item ${i === paginaActual ? 'active' : ''}"><button class="page-link" data-page="${i}">${i}</button></li>`;
    }

    if (paginaActual < totalPaginas) {
        html += `<li class="page-item"><button class="page-link" data-page="${paginaActual + 1}">Siguiente</button></li>`;
    } else {
        html += `<li class="page-item disabled"><span class="page-link">Siguiente</span></li>`;
    }

    paginacionEl.innerHTML = html;
}

function cambiarPagina(nuevaPagina) {
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina) || 1;
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    paginaActual = nuevaPagina;
    renderizarProductos();
    renderizarPaginacion();
}

function abrirProductoPorQuery() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('producto');
    if (!id) return;

    // Si abrimos desde /?producto=ID o ruta distinta, redirigimos a tienda.html para asegurar carga correcta (móvil/servidor)
    if (!window.location.pathname.endsWith('tienda.html')) {
        window.location.replace(`/tienda.html?producto=${encodeURIComponent(id)}`);
        return;
    }

    const producto = productosData.find(item => item.ProductoID == id);
    if (!producto) {
        console.warn('No se encontró producto en query:', id);
        return;
    }

    // Scroll to el producto para orientación UX (si está visible después del render)
    const card = document.querySelector(`#contenedor-productos [data-id='${id}']`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    verDetalle(id);

    // Limpia query de URL para evitar reapertura al refrescar o volver atrás
    window.history.replaceState({}, document.title, window.location.pathname);
}

function compartirProducto(producto) {
    const rutaTienda = window.location.pathname.endsWith('tienda.html') ? window.location.pathname : '/tienda.html';
    const urlProducto = `${window.location.origin}${rutaTienda}?producto=${encodeURIComponent(producto.ProductoID)}`;
    const nombre = producto.Nombre || 'Producto';
    const precio = Number(producto.Precio || 0).toLocaleString();
    const texto = `Mira este producto en Trébol:\n${nombre}\nPrecio: $${precio}`;
    const textoConUrl = `${texto}\n${urlProducto}`; // fallback para copiar manual

    if (navigator.share) {
        return navigator.share({
            title: `Repuesto: ${nombre}`,
            text: texto,
            url: urlProducto
        }).then(() => {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Producto compartido correctamente', timer: 1500 });
        }).catch(err => {
            console.warn('Compartir cancelado o falló:', err);
        });
    }

    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(textoConUrl).then(() => {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Enlace copiado al portapapeles', timer: 1500 });
        }).catch(err => {
            console.warn('No se pudo copiar al portapapeles:', err);
            prompt('Copia el enlace para compartir:', urlProducto);
        });
    }

    prompt('Copia el enlace para compartir:', urlProducto);
}

/* ============================================================================
   DETALLE DE PRODUCTO
   ============================================================================ */

function verDetalle(id) {
    console.log('verDetalle called with ID:', id);
    const p = productosData.find(item => item.ProductoID == id);
    if (!p) {
        console.error('Producto no encontrado:', id);
        return;
    }
    console.log('Producto encontrado:', p.Nombre);

    // Gallery images
    let fotos = [];
    if (p.ImagenURL) fotos.push(p.ImagenURL);
    if (p.Galeria) {
        const galeriaNorm = Array.isArray(p.Galeria) ? p.Galeria : (typeof p.Galeria === 'string' ? JSON.parse(p.Galeria) : []);
        galeriaNorm.forEach(g => {
            const imgUrl = g.ImagenURL || g;
            if (imgUrl && !fotos.includes(imgUrl)) fotos.push(imgUrl);
        });
    }

    // Images carousel
    const contenedorImagen = document.getElementById('carouselDetalle-inner') || document.querySelector('#carouselDetalle .carousel-inner');
    if (contenedorImagen) {
        contenedorImagen.innerHTML = fotos.map((f, i) => {
            const fClean = f.trim();
            const srcFull = fClean.startsWith('http') ? fClean : `${BASE_URL}${fClean}`;
            return `
                <div class="carousel-item ${i === 0 ? 'active' : ''}">
                    <img src="${srcFull}" class="d-block w-100" style="height: 400px; object-fit: contain;" 
                         alt="${p.Nombre}" onerror="this.src='https://placehold.co/500x400?text=Sin+imagen'">
                </div>`;
        }).join('');
    }

    // Update info
    document.getElementById('detalle-nombre').textContent = p.Nombre;
    
    const descuento = parseFloat(p.DescuentoPorcentaje) || 0;
    const precioBase = parseFloat(p.Precio) || 0;
    const precioDesc = precioBase * (1 - descuento / 100);
    if (descuento > 0) {
        document.getElementById('detalle-precio').innerHTML = `
            <span class="text-decoration-line-through text-muted h5">$${precioBase.toLocaleString()}</span>
            <span class="text-danger h3 fw-bold ms-3">$${precioDesc.toLocaleString()}</span>
            <span class="badge bg-danger ms-2 fs-6">${descuento}% OFF</span>`;
    } else {
        document.getElementById('detalle-precio').innerHTML = `<span class="h3 text-success fw-bold">$${precioBase.toLocaleString()}</span>`;
    }
    
    document.getElementById('detalle-caracteristicas').innerHTML = p.Caracteristicas 
        ? p.Caracteristicas.replace(/\n/g, '<br>') 
        : '<em class="text-muted">Sin descripción disponible</em>';
    
    document.getElementById('detalle-stock-numero').textContent = p.Stock;
    
    const inputCant = document.getElementById('detalle-cantidad');
    inputCant.value = 1;
    inputCant.max = Math.max(1, p.Stock);
    inputCant.disabled = p.Stock <= 0;
    
    // Update button states after loading product
    setTimeout(window.updateQtyButtons, 100);
    
    const btnAgregar = document.getElementById('detalle-btn-agregar');
    btnAgregar.disabled = p.Stock <= 0;
    btnAgregar.dataset.productoId = p.ProductoID;
    btnAgregar.textContent = p.Stock <= 0 ? 'SIN STOCK' : 'AÑADIR AL CARRITO';
    
    // Store product data on button for delegation
    btnAgregar.dataset.productoNombre = p.Nombre;
    btnAgregar.dataset.productoPrecio = precioDesc.toFixed(2);
    
    // Show modal
    const modalEl = document.getElementById('modalDetalleProducto');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

/* ============================================================================
   CARRITO - AGREGAR Y REMOVER
   ============================================================================ */

function agregarAlPedido(producto) {
    const inputCant = document.getElementById('detalle-cantidad');
    const cantidad = parseInt(inputCant.value);
    
    if (cantidad > producto.Stock || cantidad <= 0) {
        Swal.fire('Error', 'Cantidad no válida o supera el stock', 'error');
        return;
    }

    const itemExistente = carrito.find(item => item.ProductoID === producto.ProductoID);
    if (itemExistente) {
        if ((itemExistente.cantidad + cantidad) > producto.Stock) {
            Swal.fire('Error', 'Ya tienes el máximo disponible en tu carrito', 'error');
            return;
        }
        itemExistente.cantidad += cantidad;
        itemExistente.stock = producto.Stock; // Preserve stock for editing
    } else {
        // Usar el precio con descuento si hay oferta
        const precioFinal = producto.TieneOferta ? producto.PrecioConDescuento : producto.Precio;
        carrito.push({ 
            ProductoID: producto.ProductoID,
            cantidad, 
            Nombre: producto.Nombre,
            Precio: precioFinal,
            stock: producto.Stock // Add stock for quantity limits
        });
    }

    actualizarCarritoUI();
    
    // Safe modal close - prevent TypeError if modal not initialized
    const detalleModalEl = document.getElementById('modalDetalleProducto');
    if (detalleModalEl) {
        const modalInstance = bootstrap.Modal.getInstance(detalleModalEl);
        if (modalInstance) {
            modalInstance.hide();
        }
    }
    
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Agregado al pedido', showConfirmButton: false, timer: 1500 });
}

function actualizarCarritoUI() {
    const lista = document.getElementById('lista-compra');
    const totalLabel = document.getElementById('total-compra');
    const badge = document.getElementById('cont-carrito');
    
    let total = 0;
    let itemsCount = 0;

    if (carrito.length === 0) {
        lista.innerHTML = '<li class="list-group-item text-center py-3">Tu carrito está vacío</li>';
        totalLabel.innerText = "$0";
        badge.innerText = "0";
        return;
    }

    lista.innerHTML = carrito.map((item, i) => {
        total += item.Precio * item.cantidad;
        itemsCount += item.cantidad;
        return `
            <li class="list-group-item py-3" data-index="${i}">
                <div class="d-flex align-items-center justify-content-between w-100">
                    <div class="flex-grow-1 me-3">
                        <strong>${item.Nombre}</strong>
                        <div class="text-muted small">$${Number(item.Precio).toLocaleString()} c/u</div>
                    </div>
                    <div class="quantity-display d-flex align-items-center gap-2 flex-column flex-md-row">
                        <small class="text-muted mb-1 mb-md-0">/ ${item.stock} disponibles</small>
                        <div class="input-group input-group-sm quantity-controls ms-md-2">
                            <button class="btn btn-outline-secondary cart-minus" type="button" data-index="${i}">-</button>
                            <input type="number" class="form-control qty-input text-center fw-bold" data-index="${i}" value="${item.cantidad}" min="1" max="${item.stock}">
                            <button class="btn btn-outline-secondary cart-plus" type="button" data-index="${i}">+</button>
                        </div>
                    </div>
                    <button class="btn btn-outline-danger btn-sm qty-remove ms-2" data-index="${i}"><i class="bi bi-trash"></i></button>
                </div>
                <div class="mt-2 pt-2 border-top">
                    <strong class="text-success" id="subtotal-${i}">$${Math.round(item.Precio * item.cantidad).toLocaleString()}</strong>
                </div>
            </li>`;
    }).join('');


    totalLabel.innerText = `$${total.toLocaleString()}`;
    badge.innerText = itemsCount;
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
}

// Nueva función para actualizar cantidad en carrito
function actualizarCantidad(index, nuevaCantidad) {
    if (index < 0 || index >= carrito.length) return false;
    
    const item = carrito[index];
    nuevaCantidad = Math.max(1, Math.min(nuevaCantidad, item.stock));
    
    if (nuevaCantidad !== item.cantidad) {
        item.cantidad = nuevaCantidad;
        actualizarTotalSolo(); // Fast update without full re-render
        
        // Sync UI display
        setTimeout(() => updateCartQuantityDisplay(index), 10);
        return true;
    }
    return false;
}

// Sync input value and button states for specific cart item
function updateCartQuantityDisplay(index) {
    const input = document.querySelector(`.qty-input[data-index="${index}"]`);
    const minusBtn = document.querySelector(`.cart-minus[data-index="${index}"]`);
    const plusBtn = document.querySelector(`.cart-plus[data-index="${index}"]`);
    
    if (!input || !carrito[index]) return;
    
    const item = carrito[index];
    input.value = item.cantidad;
    input.max = item.stock;
    
    if (minusBtn) minusBtn.disabled = item.cantidad <= 1;
    if (plusBtn) plusBtn.disabled = item.cantidad >= item.stock;
}


// Nuevas funciones para editar cantidades



// FUNCIÓN DE APOYO PARA EL TOTAL (Vital para quitar el lag)
function actualizarTotalSolo() {
    let total = 0;
    carrito.forEach(item => {
        total += item.Precio * item.cantidad;
    });
    const totalElement = document.getElementById('total-compra');
    if (totalElement) {
        totalElement.innerText = `$${Math.round(total).toLocaleString()}`;
    }
    // Update subtotals
    carrito.forEach((item, i) => {
        const subtotalEl = document.getElementById(`subtotal-${i}`);
        if (subtotalEl) {
            subtotalEl.innerText = `$${Math.round(item.Precio * item.cantidad).toLocaleString()}`;
        }
    });
}

/* ============================================================================
   BÚSQUEDA INTELIGENTE + AUTOCOMPLETE
   ============================================================================ */

const buscador = document.getElementById('buscador');
const sugerencias = document.getElementById('search-suggestions');
let sugerenciaActivaIndex = -1;

function ocultarSugerencias() {
    if(sugerencias) {
        sugerencias.classList.add('d-none');
        sugerencias.innerHTML = '';
        sugerenciaActivaIndex = -1;
    }
}

function mostrarSugerencias(items) {
    if(!sugerencias) return;
    if(!items || items.length === 0) {
        sugerencias.innerHTML = '<div class="suggestion-item suggestion-empty">No se encontraron productos.</div>';
        sugerencias.classList.remove('d-none');
        return;
    }

    sugerencias.innerHTML = items.map((p, idx) => `
        <div class="suggestion-item" data-id="${p.ProductoID}" data-index="${idx}">
            <strong>${p.Nombre}</strong> <small class="text-muted">${p.Marca || ''}</small>
        </div>
    `).join('');
    sugerencias.classList.remove('d-none');
}

function actualizarResultadosBusqueda(texto) {
    const termino = texto.trim().toLowerCase();

    if(!termino) {
        productosFiltrados = [...productosData];
        paginaActual = 1;
        renderizarProductos();
        renderizarPaginacion();
        ocultarSugerencias();
        return;
    }

    const coincidentes = productosData
        .map(p => ({
            producto: p,
            score: ((p.Nombre || '').toLowerCase().includes(termino) ? 10 : 0) +
                   ((p.Marca || '').toLowerCase().includes(termino) ? 6 : 0) +
                   ((p.Categoria || '').toLowerCase().includes(termino) ? 4 : 0)
        }))
        .filter(r => r.score > 0)
        .sort((a,b) => b.score - a.score)
        .map(r => r.producto);

    productosFiltrados = coincidentes;
    paginaActual = 1;
    renderizarProductos();
    renderizarPaginacion();
    mostrarSugerencias(coincidentes.slice(0, 7));
}

if (buscador) {
    buscador.addEventListener('input', (e) => {
        sugerenciaActivaIndex = -1;
        actualizarResultadosBusqueda(e.target.value);
    });

    buscador.addEventListener('keydown', (e) => {
        const items = sugerencias ? sugerencias.querySelectorAll('.suggestion-item') : [];
        if (!items || items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            sugerenciaActivaIndex = Math.min(items.length - 1, sugerenciaActivaIndex + 1);
            items.forEach((item, i) => item.classList.toggle('active', i === sugerenciaActivaIndex));
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            sugerenciaActivaIndex = Math.max(0, sugerenciaActivaIndex - 1);
            items.forEach((item, i) => item.classList.toggle('active', i === sugerenciaActivaIndex));
            return;
        }

        if (e.key === 'Enter' && sugerenciaActivaIndex >= 0 && sugerenciaActivaIndex < items.length) {
            e.preventDefault();
            items[sugerenciaActivaIndex].click();
        }
    });
}

if (sugerencias) {
    sugerencias.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (!item || !item.dataset.id) return;

        const id = item.dataset.id;
        const productoSeleccionado = productosData.find(p => p.ProductoID == id);
        if (!productoSeleccionado) return;

        buscador.value = productoSeleccionado.Nombre || '';
        productosFiltrados = [productoSeleccionado];
        paginaActual = 1;
        renderizarProductos();
        renderizarPaginacion();
        ocultarSugerencias();
        verDetalle(id);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            ocultarSugerencias();
        }
    });
}

/* ============================================================================
   PROCESAR PAGO
   ============================================================================ */

async function procesarPago() {
    if (carrito.length === 0) return Swal.fire('Carrito vacío', '', 'warning');

    const nombre = document.getElementById('fac-nombre').value.trim();
    const correo = document.getElementById('fac-correo').value.trim();
    const telefono = document.getElementById('fac-tel').value.trim();
    const documento = document.getElementById('fac-doc').value.trim();
    const direccion = document.getElementById('fac-dir').value.trim();

    if (!nombre || !correo || !telefono || !direccion) {
        return Swal.fire('Campos incompletos', 'Por favor llena todos los campos de envío', 'error');
    }

    // 💾 SAVE CLIENT DATA FIRST (non-blocking)
    try {
        await fetch(`${BASE_URL}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre,
                correo,
                telefono,
                documento: documento || null,
                direccion
            })
        }).catch(saveErr => console.warn('Client save failed:', saveErr));
    } catch {}

    const datosPedido = {
        nombre, correo, telefono,
        documento: documento || "No proporcionado",
        direccion,
        productos: carrito.map(item => ({
            ProductoID: item.ProductoID,
            cantidad: item.cantidad,
            Nombre: item.Nombre,
            Precio: item.Precio
        })),
        total: carrito.reduce((sum, item) => sum + (item.Precio * item.cantidad), 0)
    };

    try {
        Swal.fire({
            title: 'Procesando tu pedido...',
            text: 'Actualizando inventario y registrando compra',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const response = await fetch(`${BASE_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosPedido)
        });


        const result = await response.json();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: '¡Pedido Confirmado!',
                text: 'Gracias por tu compra. Se enviará la factura al correo registrado.',
                confirmButtonColor: '#2d5a27'
            });
            carrito = [];
            actualizarCarritoUI();
            document.getElementById('form-factura').reset();
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalCarrito'));
            if (modalInstance) modalInstance.hide();
            cargarProductos();
        } else {
            throw new Error(result.error || 'Error al procesar el pedido');
        }
    } catch (error) {
        Swal.fire('Error', error.message || 'No pudimos registrar tu pedido.', 'error');
    }
}

/* ============================================================================
   LOGIN ADMIN
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();

    // CSP-safe event delegation for products + qty controls
    // Define updateQtyButtons globally first
    window.updateQtyButtons = function() {
        const input = document.getElementById('detalle-cantidad');
        const stockEl = document.getElementById('detalle-stock-numero');
        const minusBtn = document.querySelector('#modalDetalleProducto .btn-minus');
        const plusBtn = document.querySelector('#modalDetalleProducto .btn-plus');
        const stock = parseInt(stockEl ? stockEl.textContent : 0) || 0;
        const qty = parseInt(input ? input.value : 1) || 1;

        if (minusBtn) minusBtn.disabled = qty <= 1;
        if (plusBtn) plusBtn.disabled = qty >= stock || stock <= 0;
    };

// CLIENT AUTOFILL SYSTEM
async function loadClientData(nombre) {
    try {
        const response = await fetch(`${BASE_URL}/clientes/${encodeURIComponent(nombre)}`);
        if (!response.ok) {
            console.warn('Cliente no encontrado:', response.status);
            return null;
        }
        const client = await response.json();
        console.log('Cliente loaded:', client);
        return client;
    } catch (err) {
        console.error('Autofill error:', err);
        return null;
    }
}

// Debounced autofill
let autofillTimeout;
function setupClientAutofill() {
    const nombreInput = document.getElementById('fac-nombre');
    if (!nombreInput) return;
    
    nombreInput.addEventListener('input', async (e) => {
        clearTimeout(autofillTimeout);
        const nombre = e.target.value.trim();
        if (nombre.length < 3) return;
        
        autofillTimeout = setTimeout(async () => {
            console.log('🔍 Buscando cliente:', `"${nombre}"`);
            const client = await loadClientData(nombre);
            console.log('🔍 Raw response:', client);
            if (client && client.ClienteID && client.Nombre.toLowerCase().startsWith(nombre.toLowerCase())) {
                document.getElementById('fac-correo').value = client.Correo || '';
                document.getElementById('fac-tel').value = client.Telefono || '';
                document.getElementById('fac-doc').value = client.Documento || '';
                document.getElementById('fac-dir').value = client.Direccion || '';
                
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: `Datos cargados para ${client.Nombre}`,
                    showConfirmButton: false,
                    timer: 2500
                });
            }
        }, 600); // Debounce 600ms
    });
}


// Separate input event for real-time manual quantity updates
    document.addEventListener('input', function(e) {
        if (e.target.matches('.qty-input')) {
            const index = parseInt(e.target.dataset.index);
            if (!isNaN(index) && index < carrito.length) {
                const input = e.target;
                const nuevaQty = parseInt(input.value) || 1;
                const item = carrito[index];
                
                // Live validation
                if (nuevaQty > item.stock) {
                    input.value = item.stock;
                } else if (nuevaQty < 1) {
                    input.value = 1;
                } else {
                    // Update immediately on valid input
                    actualizarCantidad(index, nuevaQty);
                }
            }
        }
    });

    
    document.addEventListener('click', function(e) {
        if (e.target.matches('.img-producto')) {
            const id = e.target.dataset.id;
            if (id) verDetalle(id);
        }
        if (e.target.matches('.btn-compartir')) {
            const id = e.target.dataset.id;
            if (id) {
                const producto = productosData.find(p => p.ProductoID == id);
                if (producto) {
                    compartirProducto(producto);
                }
            }
            return; // evita que el evento siga y haga otras acciones
        }
        if (e.target.matches('.btn-añadir')) {
            const id = e.target.dataset.id;
            if (id) {
                const producto = productosData.find(p => p.ProductoID == id);
                if (producto && producto.Stock > 0) {
                    const precioFinal = parseFloat(producto.Precio || 0);
                    carrito.push({
                        ProductoID: producto.ProductoID,
                        cantidad: 1,
                        Nombre: producto.Nombre,
                        Precio: precioFinal,
                        stock: producto.Stock
                    });
                    actualizarCarritoUI();
                    Swal.fire({
                        toast: true, position: 'top-end', icon: 'success', 
                        title: `${producto.Nombre} agregado`, timer: 1500
                    });
                }
            }
        }
        // +/- Quantity controls for detail modal
        if (e.target.matches('#modalDetalleProducto .btn-minus')) {
            const input = document.getElementById('detalle-cantidad');
            const stockEl = document.getElementById('detalle-stock-numero');
            const stock = parseInt(stockEl ? stockEl.textContent : 0) || 0;
            let qty = parseInt(input.value) || 1;
            if (qty > 1) {
                input.value = qty - 1;
            }
            window.updateQtyButtons();
        }
        if (e.target.matches('#modalDetalleProducto .btn-plus')) {
            const input = document.getElementById('detalle-cantidad');
            const stockEl = document.getElementById('detalle-stock-numero');
            const stock = parseInt(stockEl ? stockEl.textContent : 0) || 0;
            let qty = parseInt(input.value) || 1;
            if (qty < stock) {
                input.value = qty + 1;
            }
            window.updateQtyButtons();
        }
        if (e.target.matches('#detalle-btn-agregar')) {
            const id = e.target.dataset.productoId;
            const cantidad = parseInt(document.getElementById('detalle-cantidad').value) || 1;
            const producto = productosData.find(p => p.ProductoID == id);
            if (producto && cantidad <= producto.Stock) {
                const precioFinal = parseFloat(e.target.dataset.productoPrecio || producto.Precio || 0);
                const itemExistente = carrito.find(item => item.ProductoID === id);
                if (itemExistente) {
                    itemExistente.cantidad += cantidad;
                } else {
                    carrito.push({
                        ProductoID: id,
                        cantidad,
                        Nombre: e.target.dataset.productoNombre || producto.Nombre,
                        Precio: precioFinal,
                        stock: producto.Stock
                    });
                }
                actualizarCarritoUI();
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalleProducto'));
                if (modal) modal.hide();
                Swal.fire({
                    toast: true, position: 'top-end', icon: 'success', 
                    title: `${cantidad} x ${e.target.dataset.productoNombre || 'Producto'} agregado`, 
                    timer: 2000
                });
            }
        }
        if (e.target.id === 'btn-procesar-pago') {
            procesarPago();
        }
// Cart remove only
        // Cart quantity controls - +/- buttons
        if (e.target.matches('.cart-minus, .cart-plus')) {
            const index = parseInt(e.target.dataset.index);
            if (!isNaN(index) && index < carrito.length) {
                const item = carrito[index];
                const delta = e.target.matches('.cart-minus') ? -1 : 1;
                if ((delta === -1 && item.cantidad > 1) || (delta === 1 && item.cantidad < item.stock)) {
                    actualizarCantidad(index, item.cantidad + delta);
                }
            }
            return; // Prevent bubbling
        }
        
        // Manual input changes (click/focus events)
        if (e.target.matches('.qty-input')) {
            const index = parseInt(e.target.dataset.index);
            if (!isNaN(index) && index < carrito.length) {
                // Debounced sync on blur/enter
                const input = e.target;
                clearTimeout(input.dataset.syncTimeout);
                input.dataset.syncTimeout = setTimeout(() => {
                    const nuevaQty = parseInt(input.value) || 1;
                    if (actualizarCantidad(index, nuevaQty)) {
                        input.value = carrito[index].cantidad;
                    }
                }, 300);
            }
        }
        
        // Input events for real-time validation (separate delegation)
        if (e.target.matches('.qty-input') && ['input', 'change'].includes(e.type)) {
            const index = parseInt(e.target.dataset.index);
            const input = e.target;
            const val = parseInt(input.value) || 1;
            const item = carrito[index];
            if (item && val > item.stock) {
                input.value = item.stock;
            } else if (val < 1) {
                input.value = 1;
            }
        }
        
        if (e.target.matches('.qty-remove')) {

            const index = parseInt(e.target.dataset.index);
            if (!isNaN(index) && index < carrito.length) {
                if (confirm('¿Eliminar este producto del carrito?')) {
                    eliminarItem(index);
                }
            }
        }
    });


    // Update +/- button states (disabled/enabled)
    function updateQtyButtons() {
        const input = document.getElementById('detalle-cantidad');
        const stockEl = document.getElementById('detalle-stock-numero');
        const minusBtn = document.querySelector('#modalDetalleProducto .btn-minus');
        const plusBtn = document.querySelector('#modalDetalleProducto .btn-plus');
        const stock = parseInt(stockEl ? stockEl.textContent : 0) || 0;
        const qty = parseInt(input ? input.value : 1) || 1;

        if (minusBtn) minusBtn.disabled = qty <= 1;
        if (plusBtn) plusBtn.disabled = qty >= stock || stock <= 0;
    }

    // Check if user explicitly wants to view the store (via ?view=store parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const viewStore = urlParams.get('view');

    // Cargar promociones siempre (antes de navegación de productos)
    cargarPromociones();
    const productoParam = urlParams.get('producto');

    // Prevent infinite loop: Check BOTH conditions
    // Skip auto-login if: ?view=store OR ?producto=ID OR no valid admin session
    if (viewStore !== 'store' && !productoParam && localStorage.getItem('admin_logged') === 'true') {
        if (isSessionValid()) {
            console.log('[Session] Valid admin session - redirecting to admin.html');
            window.location.replace('admin.html');
        } else {
            console.log('[Session] admin_logged=true but invalid session - clearing');
            localStorage.removeItem('admin_logged');
            localStorage.removeItem('admin_session');
        }
    } else {
        console.log('[Session] Viewing store (?view=store or no session) - no redirect');
    }

    // ============================================================================
    // ACCESSIBILITY FIX: Prevent aria-hidden focus issue on modals
    // ============================================================================
    // This fixes the error: "aria-hidden on a focused element" when closing modals
    // Source: https://www.digitala11y.com/accessible-modal-hiding/
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function() {
            // When modal is hidden, check if there's an active element
            const activeElement = document.activeElement;
            if (activeElement && modal.contains(activeElement)) {
                // Move focus to body to prevent aria-hidden on focused element
                document.body.focus();
            }
        });
    });

    const formLogin = document.getElementById('form-login-admin');
    if (formLogin) {
formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('admin-email').value;
            const pass = document.getElementById('admin-password').value;

            try {
                const res = await fetch(`${BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user, pass })
                });
                const data = await res.json();
                
                if (data.success) {
                    // Guardar JWT token
                    localStorage.setItem('admin_token', data.token);
                    localStorage.setItem('admin_logged', 'true');
                    
                    Swal.fire({
                        title: '¡Login Exitoso!',
                        text: 'Redirigiendo al panel admin...',
                        icon: 'success',
                        timer: 1500,
                        willClose: () => {
                            window.location.replace('admin.html');
                        }
                    });
                } else {
                    Swal.fire('Error', data.error || 'Credenciales inválidas', 'error');
                }
            } catch (err) {
                Swal.fire('Error', 'Error de conexión. Verifique su internet.', 'error');
            }
        });
    }

    // ✅ CLIENT AUTOFILL - Initialize after DOM ready
    setupClientAutofill();

});
