let carrito = [];
let productosData = [];
const BASE_URL = 'https://tienda-1vps.onrender.com';

// 1. CARGAR PRODUCTOS DESDE EL BACKEND
async function cargarProductos() {
    try {
        const res = await fetch(`${BASE_URL}/productos`);
        productosData = await res.json();
        const contenedor = document.getElementById('contenedor-productos');
        
        if (!contenedor) return;

        // CORRECCIÓN: Limpiar el contenedor antes de mapear para evitar duplicados
        contenedor.innerHTML = ""; 

        const htmlProductos = productosData.map(p => {
            let fotos = [];
            try {
                const imgStr = p.ImagenURL || '';
                fotos = imgStr.startsWith('[') ? JSON.parse(imgStr) : imgStr.split(',');
            } catch(e) { fotos = [p.ImagenURL]; }
            
            const fotoPrincipal = fotos[0] ? fotos[0].trim() : '';
            const srcFinal = fotoPrincipal.startsWith('http') ? fotoPrincipal : `${BASE_URL}${fotoPrincipal}`;

            const stockColor = p.Stock > 0 ? 'text-success' : 'text-danger';
            const stockTexto = p.Stock > 0 ? `${p.Stock} disponibles` : 'Agotado';

            return `
                <div class="col-md-4 col-lg-3">
                    <div class="product-card">
                        <div class="img-container" onclick="verDetalle(${p.ProductoID})">
                            <img src="${srcFinal}" onerror="this.src='https://via.placeholder.com/250?text=Agro+Ferretería'">
                        </div>
                        <div class="p-4 text-center">
                            <small class="text-uppercase fw-bold text-muted">${p.Marca}</small>
                            <h5 class="fw-bold mb-1">${p.Nombre}</h5>
                            <div class="price-tag mb-1">$${Number(p.Precio).toLocaleString()}</div>
                            
                            <div class="small fw-bold ${stockColor} mb-3">
                                <i class="bi bi-box-seam me-1"></i>${stockTexto}
                            </div>

                            <button class="btn btn-success w-100 fw-bold rounded-pill" onclick="verDetalle(${p.ProductoID})" ${p.Stock <= 0 ? 'disabled' : ''}>
                                ${p.Stock <= 0 ? 'AGOTADO' : '<i class="bi bi-cart-plus me-2"></i>AÑADIR'}
                            </button>
                        </div>
                    </div>
                </div>`;
        }).join('');

        contenedor.innerHTML = htmlProductos;
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// 2. VER DETALLE
function verDetalle(id) {
    const p = productosData.find(item => item.ProductoID === id);
    if (!p) return;

    let fotos = [];
    try {
        const imgStr = p.ImagenURL || '';
        fotos = imgStr.startsWith('[') ? JSON.parse(imgStr) : imgStr.split(',');
    } catch(e) { fotos = [p.ImagenURL]; }

    const contenedorImagen = document.getElementById('contenedor-foto-modal');
    contenedorImagen.innerHTML = '';

    if (fotos.length > 1) {
        contenedorImagen.innerHTML = `
            <div id="carouselDetalle" class="carousel slide carousel-dark w-100" data-bs-ride="false">
                <div class="carousel-inner">
                    ${fotos.map((f, i) => {
                        const srcFull = f.trim().startsWith('http') ? f.trim() : `${BASE_URL}${f.trim()}`;
                        return `
                        <div class="carousel-item ${i === 0 ? 'active' : ''}">
                            <img src="${srcFull}" class="d-block w-100" style="height: 350px; object-fit: contain;">
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
        const fotoURL = fotos[0] ? fotos[0].trim() : '';
        const singleSrc = fotoURL.startsWith('http') ? fotoURL : `${BASE_URL}${fotoURL}`;
        contenedorImagen.innerHTML = `<img src="${singleSrc}" class="img-fluid" style="max-height: 350px; object-fit: contain;">`;
    }

    document.getElementById('detalle-nombre').innerText = p.Nombre;
    document.getElementById('detalle-precio').innerText = `$${Number(p.Precio).toLocaleString()}`;
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
    btn.onclick = () => agregarAlPedido(p);

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetalleProducto')).show();
}

// 3. AGREGAR AL CARRITO
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
    } else {
        carrito.push({ ...producto, cantidad });
    }

    actualizarCarritoUI();
    bootstrap.Modal.getInstance(document.getElementById('modalDetalleProducto')).hide();
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Agregado al pedido', showConfirmButton: false, timer: 1500 });
}

// 4. BÚSQUEDA
const buscador = document.getElementById('buscador');
if(buscador) {
    buscador.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const productosCards = document.querySelectorAll('#contenedor-productos > div');

        productosCards.forEach(card => {
            const nombreProducto = card.querySelector('h5').textContent.toLowerCase();
            card.style.display = nombreProducto.includes(termino) ? 'block' : 'none';
        });
    });
}

// 5. UI CARRITO
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
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">${item.Nombre}</span><br>
                    <small>${item.cantidad} x $${Number(item.Precio).toLocaleString()}</small>
                </div>
                <button class="btn btn-sm text-danger" onclick="eliminarItem(${i})"><i class="bi bi-trash"></i></button>
            </li>`;
    }).join('');

    totalLabel.innerText = `$${total.toLocaleString()}`;
    badge.innerText = itemsCount;
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
}

// 6. PROCESAR PAGO (CORREGIDO: Sin duplicidad de lógica)
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
        productos: carrito,
        total: carrito.reduce((sum, item) => sum + (item.Precio * item.cantidad), 0)
    };

    try {
        Swal.fire({
            title: 'Procesando tu pedido...',
            text: 'Por favor espera un momento',
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
                text: 'Gracias por tu compra. Nos contactaremos pronto.',
                confirmButtonColor: '#2d5a27'
            });
            
            carrito = [];
            actualizarCarritoUI();
            document.getElementById('form-factura').reset();
            
            const modalElement = document.getElementById('modalCarrito');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();
            
        } else {
            throw new Error(result.error || 'Error al procesar el pedido');
        }
    } catch (error) {
        console.error("Error al enviar pedido:", error);
        Swal.fire('Error', 'No pudimos registrar tu pedido. Intenta de nuevo.', 'error');
    }
}

// Inicialización única
document.addEventListener('DOMContentLoaded', cargarProductos);