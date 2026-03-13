// 🛠️ CSP-Safe Product Button Delegation (loaded after DOMContentLoaded)
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.action-btn[data-action]');
  if (!btn) return;
  
  const row = btn.closest('[data-producto]');
  if (!row) return;
  
  const prodData = JSON.parse(row.dataset.producto);
  
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
});

console.log('[Admin] Product delegation handler ready ✅');

