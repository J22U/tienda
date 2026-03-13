let carrito = [];
let productosData = [];
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
        const contenedor = document.getElementById('contenedor-productos');
        
        if (!contenedor) return;

        contenedor.innerHTML = ""; 

        const htmlProductos = productosData.map(p => {
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

            // Calcular precio con descuento
            const descuento = parseFloat(p.DescuentoPorcentaje) || 0;
            const precioBase = Number(p.Precio) || 0;
            const precioConDescuento = precioBase - (precioBase * descuento / 100);
            const tieneOferta = descuento > 0;

            return `
                <div class="col-md-4 col-lg-3">
                    <div class="card product-card ${claseAgotado} h-100">
                        <div class="img-container position-relative" onclick="${estaAgotado ? '' : `verDetalle(${p.ProductoID})`}">  
                            ${tieneOferta ? `<div class="position-absolute top-0 end-0 bg-danger text-white px-2 py-1 rounded-start fw-bold" style="font-size: 0.8rem; z-index: 10;">-${descuento}%</div>` : ''}
                            <img src="${srcFinal}" onerror="this.src='https://placehold.co/250x250/e74c3c/white?text=Error+al+cargar'"
                                 style="${estaAgotado ? 'filter: grayscale(1); opacity: 0.6;' : ''}">
                        </div>
                        <div class="p-4 text-center">
                            <small class="text-uppercase fw-bold text-muted">${p.Marca || 'Genérico'}</small>
                            <h5 class="fw-bold mb-1 ${estaAgotado ? 'text-muted' : ''}">${p.Nombre}</h5>
                            ${tieneOferta ? 
                            `<div class="price-tag mb-1 text-decoration-line-through text-muted" style="font-size: 0.9rem;">$${precioBase.toLocaleString()}</div>
                            <div class="price-tag mb-1" style="background: #e74c3c; display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; font-weight: bold;">$${precioConDescuento.toLocaleString()}</div>` : 
                            `<div class="price-tag mb-1">$${precioBase.toLocaleString()}</div>`}
                            
                            <div class="small fw-bold ${stockColor} mb-3">
                                <i class="bi ${estaAgotado ? 'bi-x-circle' : 'bi-box-seam'} me-1"></i>${stockTexto}
                            </div>

                            <button class="btn ${estaAgotado ? 'btn-secondary' : 'btn-success'} w-100 fw-bold rounded-pill" 
                                    onclick="verDetalle(${p.ProductoID})" 
                                    ${estaAgotado ? 'disabled' : ''}>
                                ${estaAgotado ? 'AGOTADO' : '<i class="bi bi-cart-plus me-2"></i>AÑADIR'}
                            </button>
                        </div>
                    </div>
                </div>`;
        }).join('');

        contenedor.innerHTML = htmlProductos;
    } catch (error) {
        console.error("Error cargando productos:", error);
        Swal.fire('Error', 'No se pudieron cargar los productos. Verifique su conexión.', 'error');
    }
}

/* ============================================================================
   DETALLE DE PRODUCTO
   ============================================================================ */

function verDetalle(id) {
    const p = productosData.find(item => item.ProductoID === id);
    if (!p) return;

    const contenedorImagen = document.getElementById('contenedor-foto-modal');
    contenedorImagen.innerHTML = '';

    let fotos = [];
    if (p.ImagenURL) fotos.push(p.ImagenURL);
    if (p.Galeria) {
        // Normalize string array to object format for backward compatibility
        const galeriaNorm = Array.isArray(p.Galeria) 
            ? p.Galeria.map(url => ({ ImagenURL: String(url || '').trim() })) 
            : [];
        galeriaNorm.forEach(g => { 
            const imgUrl = g.ImagenURL || g;
            if (imgUrl && !fotos.includes(imgUrl)) fotos.push(imgUrl); 
        });
    }

    if (fotos.length > 1) {
        contenedorImagen.innerHTML = `
            <div id="carouselDetalle" class="carousel slide carousel-dark w-100" data-bs-ride="false">
                <div class="carousel-inner">
                    ${fotos.map((f, i) => {
                        const fClean = f ? String(f).trim() : '';
                        const srcFull = fClean.startsWith('http') ? fClean : `${BASE_URL}${fClean}`;
                        return `
                        <div class="carousel-item ${i === 0 ? 'active' : ''}">
                            <img src="${srcFull}" class="d-block w-100" style="height: 350px; object-fit: contain;" 
                                 onerror="this.src='https://placehold.co/400x400/e74c3c/white?text=Error+al+cargar'">
                        </div>`;
                    }).join('')}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carouselDetalle" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carouselDetalle" data-bs-slide="next">
                    <span class="carousel-control-next-icon"></span>
                </button>
            </div>`;
    } else {
        const fotoURL = fotos.length > 0 ? fotos[0].trim() : '';
        const singleSrc = fotoURL.startsWith('http') 
            ? fotoURL 
            : (fotoURL ? `${BASE_URL}${fotoURL}` : 'https://placehold.co/400x400?text=Sin+Imagen');
            
        contenedorImagen.innerHTML = `<img src="${singleSrc}" class="img-fluid" style="max-height: 350px; object-fit: contain;" onerror="this.src='https://placehold.co/400x400/e74c3c/white?text=Error+al+cargar'">`;
    }

    // Calcular precio con descuento para el modal
    const descuento = parseFloat(p.DescuentoPorcentaje) || 0;
    const precioBase = Number(p.Precio) || 0;
    const precioConDescuento = precioBase - (precioBase * descuento / 100);
    const tieneOferta = descuento > 0;

    document.getElementById('detalle-nombre').innerText = p.Nombre;
    
    if (tieneOferta) {
        document.getElementById('detalle-precio').innerHTML = `
            <span class="text-decoration-line-through text-muted">$${precioBase.toLocaleString()}</span>
            <span class="text-danger fw-bold ms-2">$${precioConDescuento.toLocaleString()}</span>
            <span class="badge bg-danger ms-1">-${descuento}%</span>`;
    } else {
        document.getElementById('detalle-precio').innerText = `$${precioBase.toLocaleString()}`;
    }
    
    document.getElementById('detalle-caracteristicas').innerText = p.Caracteristicas || 'Sin descripción';
    
    const stockLabel = document.getElementById('detalle-stock-numero');
    stockLabel.innerText = p.Stock;
    stockLabel.className = p.Stock > 0 ? "fw-bold text-success" : "fw-bold text-danger";

    const inputCant = document.getElementById('detalle-cantidad');
    inputCant.value = 1;
    inputCant.max = p.Stock;
    inputCant.disabled = p.Stock <= 0;

    const btn = document.getElementById('detalle-btn-agregar');
    btn.disabled = p.Stock <= 0;
    btn.innerText = p.Stock <= 0 ? "SIN STOCK" : "AÑADIR AL PEDIDO";
    
    // Guardar el precio con descuento en el producto para el carrito
    p.PrecioConDescuento = precioConDescuento;
    p.TieneOferta = tieneOferta;
    btn.onclick = () => agregarAlPedido(p);

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetalleProducto')).show();
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
    bootstrap.Modal.getInstance(document.getElementById('modalDetalleProducto')).hide();
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Agregado al pedido', showConfirmButton: false, timer: 1500 });
}

function actualizarCarritoUI() {
    const lista = document.getElementById('lista-compra');
    const totalLabel = document.getElementById('total-compra');
    const badge = document.getElementById('cont-carrito');
    
    let total = 0;
    let itemsCount = 0;

    lista.innerHTML = carrito.map((item, i) => {
        total += item.Precio * item.cantidad;
        itemsCount += item.cantidad;
        return `
            <li class="list-group-item py-3">
                <div class="d-flex align-items-center justify-content-between w-100">
                    <div class="flex-grow-1 me-3">
                        <strong>${item.Nombre}</strong>
                        <div class="text-muted small">$${Number(item.Precio).toLocaleString()} c/u</div>
                    </div>
                    <div class="quantity-controls d-flex align-items-center gap-1">
                        <button class="btn btn-outline-secondary btn-sm" onclick="decrementar(${i})" ${item.stock <= 1 ? 'disabled' : ''}>
                            <i class="bi bi-dash"></i>
                        </button>
                        <input type="number" class="form-control qty-input text-center" style="width: 70px;" 
                               value="${item.cantidad}" min="1" max="${item.stock}"
                               onchange="actualizarCantidad(${i}, this.value)"
                               data-index="${i}">
                        <button class="btn btn-outline-secondary btn-sm" onclick="incrementar(${i})" ${item.cantidad >= item.stock ? 'disabled' : ''}>
                            <i class="bi bi-plus"></i>
                        </button>
                        <span class="text-muted small ms-2">/ ${item.stock} stock</span>
                    </div>
                    <button class="btn btn-sm ms-2 text-danger" onclick="eliminarItem(${i})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <div class="mt-2 pt-2 border-top">
                    <strong class="text-success">Subtotal: $${(item.Precio * item.cantidad).toLocaleString()}</strong>
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

// Nuevas funciones para editar cantidades
function incrementar(index) {
    const item = carrito[index];
    if (item.cantidad < item.stock) {
        item.cantidad++;
        actualizarCarritoUI();
    } else {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Stock máximo', timer: 1500 });
    }
}

function decrementar(index) {
    const item = carrito[index];
    if (item.cantidad > 1) {
        item.cantidad--;
        actualizarCarritoUI();
    }
}

function actualizarCantidad(index, nuevaCant) {
    const item = carrito[index];
    const cant = parseInt(nuevaCant);
    
    if (isNaN(cant) || cant < 1) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Mínimo 1', timer: 1500 });
        actualizarCarritoUI(); // Reset to valid
        return;
    }
    
    if (cant > item.stock) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: `Máx: ${item.stock}`, timer: 1500 });
        actualizarCarritoUI();
        return;
    }
    
    item.cantidad = cant;
    actualizarCarritoUI();
}

/* ============================================================================
   BÚSQUEDA
   ============================================================================ */

const buscador = document.getElementById('buscador');
if(buscador) {
    buscador.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const productosCards = document.querySelectorAll('#contenedor-productos > div');

        productosCards.forEach(card => {
            const nombreElement = card.querySelector('h5');
            const marcaElement = card.querySelector('small');
            if(nombreElement && marcaElement) {
                const nombreProducto = nombreElement.textContent.toLowerCase();
                const marcaProducto = marcaElement.textContent.toLowerCase();
                card.style.display = (nombreProducto.includes(termino) || marcaProducto.includes(termino)) ? 'block' : 'none';
            }
        });
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

    // Check if user explicitly wants to view the store (via ?view=store parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const viewStore = urlParams.get('view');

    // Prevent infinite loop: Check BOTH conditions
    // Skip auto-login if: ?view=store OR no valid admin session
    if (viewStore !== 'store' && localStorage.getItem('admin_logged') === 'true') {
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
            const email = document.getElementById('admin-email').value;
            const pass = document.getElementById('admin-password').value;

            Swal.fire({
                title: 'Nuevo Sistema de Login Seguro',
                html: `
                    <div class="text-center">
                        <p class="mb-4"><strong>Login ahora vía servidor JWT:</strong></p>
                        <code class="bg-light p-2 rounded d-block mb-3">POST /api/login<br>{"user":"admin","pass":"newpass123"}</code>
                        <p class="text-muted small">Para desarrollo, use las credenciales por defecto o configure <code>.env</code></p>
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'Cerrar'
            });
        });
    }

});

