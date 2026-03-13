// 🛠️ CSP-Safe Product Button Delegation (loaded after DOMContentLoaded)
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.action-btn[data-action]');
  if (!btn) return;
  
  const row = btn.closest('[data-producto]');
  if (!row) return;
  
  try {
    const prodData = JSON.parse(decodeURIComponent(row.dataset.producto));
    
    switch(btn.dataset.action) {
      case 'edit':
        window.prepararEdicion(prodData);
        break;
      case 'delete':
        window.eliminarProducto(prodData.ProductoID);
        break;
      case 'discount':
        window.aplicarDescuentoProducto(prodData.ProductoID, prodData.DescuentoPorcentaje || 0);
        break;
    }
  } catch (err) {
    console.error('Error parsing producto JSON:', err);
    window.Swal?.fire('Error', 'Datos del producto corruptos. Recarga la página.', 'error');
  }
});

console.log('[Admin] Product delegation handler ready ✅');

