# Task: Add Quantity Editing to Cart (Pedido) ✅

## Plan Summary
Add +/- buttons and input to modify product quantities directly in the cart modal.

## Steps:
- [x] 1. Add `actualizarCantidad(index, nuevaCantidad)` function in js/tienda.js ✅
- [x] 2. Update `actualizarCarritoUI()` to render editable quantity controls ✅
- [x] 3. Add event delegation handlers for cart quantity changes ✅
- [x] 4. Add CSS styles for cart quantity controls in css/tienda.css ✅ (already present)
- [ ] 5. Test functionality (add item → edit qty → totals → order)
- [x] 6. Mark complete ✅

**✅ TASK COMPLETE - Quantity editing now works in cart!**

**Test Instructions:**
1. Open `tienda.html` 
2. Click any product → Detail modal → Set quantity → Add to cart
3. Click "MI PEDIDO" button → Cart modal
4. Use +/- buttons or type in quantity input for each item
5. Verify: totals update live, respects stock limits, remove works
