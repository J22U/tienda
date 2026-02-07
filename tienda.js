let carrito = [];
let productosData = [];

// 1. CARGAR PRODUCTOS DESDE EL BACKEND
async function cargarProductos() {
    try {
        const res = await fetch('https://tienda-1vps.onrender.com/productos');
        productosData = await res.json();
        const contenedor = document.getElementById('contenedor-productos');
        
        contenedor.innerHTML = productosData.map(p => {
            let fotos = [];
            try {
                fotos = p.ImagenURL.startsWith('[') ? JSON.parse(p.ImagenURL) : p.ImagenURL.split(',');
            } catch(e) { fotos = [p.ImagenURL]; }
            
            const fotoPrincipal = fotos[0] ? fotos[0].trim() : '';

            // --- LÓGICA DE STOCK PARA LA TARJETA ---
            const stockColor = p.Stock > 0 ? 'text-success' : 'text-danger';
            const stockTexto = p.Stock > 0 ? `${p.Stock} disponibles` : 'Agotado';

            return `
                <div class="col-md-4 col-lg-3">
                    <div class="product-card">
                        <div class="img-container" onclick="verDetalle(${p.ProductoID})">
                            <img src="http://localhost:3000${fotoPrincipal}" onerror="this.src='https://via.placeholder.com/250?text=Agro+Ferretería'">
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
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// 2. VER DETALLE CON CARRUSEL Y STOCK DINÁMICO
function verDetalle(id) {
    const p = productosData.find(item => item.ProductoID === id);
    if (!p) return;

    // Procesar Fotos para el carrusel
    let fotos = [];
    try {
        fotos = p.ImagenURL.startsWith('[') ? JSON.parse(p.ImagenURL) : p.ImagenURL.split(',');
    } catch(e) { fotos = [p.ImagenURL]; }

    const contenedorImagen = document.getElementById('contenedor-foto-modal');
    contenedorImagen.innerHTML = '';

    if (fotos.length > 1) {
        contenedorImagen.innerHTML = `
            <div id="carouselDetalle" class="carousel slide carousel-dark w-100" data-bs-ride="false">
                <div class="carousel-inner">
                    ${fotos.map((f, i) => `
                        <div class="carousel-item ${i === 0 ? 'active' : ''}">
                            <img src="http://localhost:3000${f.trim()}" class="d-block w-100" style="height: 350px; object-fit: contain;">
                        </div>
                    `).join('')}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carouselDetalle" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carouselDetalle" data-bs-slide="next">
                    <span class="carousel-control-next-icon"></span>
                </button>
            </div>`;
    } else {
        contenedorImagen.innerHTML = `<img src="http://localhost:3000${fotos[0].trim()}" class="img-fluid" style="max-height: 350px; object-fit: contain;">`;
    }

    // Actualizar Textos
    document.getElementById('detalle-nombre').innerText = p.Nombre;
    document.getElementById('detalle-precio').innerText = `$${Number(p.Precio).toLocaleString()}`;
    document.getElementById('detalle-caracteristicas').innerText = p.Caracteristicas;
    
    // ACTUALIZAR NÚMERO DE STOCK EN EL MODAL
    const stockLabel = document.getElementById('detalle-stock-numero');
    stockLabel.innerText = p.Stock;
    stockLabel.className = p.Stock > 0 ? "fw-bold text-success" : "fw-bold text-danger";

    // Configurar Input de Cantidad
    const inputCant = document.getElementById('detalle-cantidad');
    inputCant.value = 1;
    inputCant.max = p.Stock;
    inputCant.disabled = p.Stock <= 0;

    // Configurar Botón de agregar
    const btn = document.getElementById('detalle-btn-agregar');
    btn.disabled = p.Stock <= 0;
    btn.onclick = () => agregarAlPedido(p);

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetalleProducto')).show();
}

// 3. AGREGAR AL CARRITO CON VALIDACIÓN DE STOCK
function agregarAlPedido(producto) {
    const cantidad = parseInt(document.getElementById('detalle-cantidad').value);
    
    if (cantidad > producto.Stock) {
        Swal.fire('Error', 'No hay suficiente stock disponible', 'error');
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

// --- LÓGICA DE BÚSQUEDA ---
// Asegúrate de que esta función esté disponible después de cargar tus productos

const buscador = document.getElementById('buscador');

buscador.addEventListener('input', (e) => {
    const termino = e.target.value.toLowerCase();
    const productosCards = document.querySelectorAll('#contenedor-productos .col-md-4, #contenedor-productos .col-lg-3');

    productosCards.forEach(card => {
        // Obtenemos el nombre del producto dentro de la card
        const nombreProducto = card.querySelector('h5').textContent.toLowerCase();
        
        // Si el nombre incluye el término buscado, se muestra, si no, se oculta
        if (nombreProducto.includes(termino)) {
            card.style.display = 'block';
            // Opcional: añadir una pequeña animación de entrada
            card.style.animation = 'fadeIn 0.3s';
        } else {
            card.style.display = 'none';
        }
    });
});

// --- OPCIONAL: Estilo para la animación de búsqueda ---
// Puedes agregar esto a tu etiqueta <style> en el HTML
/*
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
*/

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

function procesarPago() {
    if (carrito.length === 0) return Swal.fire('Carrito vacío', '', 'warning');
    Swal.fire('¡Éxito!', 'Pedido confirmado. Nos contactaremos pronto.', 'success');
    carrito = [];
    actualizarCarritoUI();
    bootstrap.Modal.getInstance(document.getElementById('modalCarrito')).hide();
}

document.addEventListener('DOMContentLoaded', cargarProductos);