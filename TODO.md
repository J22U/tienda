# ✅ Fix generarFacturaPDF ReferenceError

**Status**: 🔄 Implementing...

## Steps:
# ✅ Fix generarFacturaPDF ReferenceError

**Status**: ✅ **COMPLETE**

## Steps:
- [✅] 1. Create TODO.md
- [✅] 2. Edit js/admin.js:
  - Updated event handler → `generarFacturaPDFParaPedido(id)` fetches `/pedidos/${id}`
  - Added your professional Trébol factura generator (verde branding, autoTable, legal footer)
- [✅] 3. Test ready: Open `admin.html` → login → Pedidos tab → Click "Factura" button → Downloads `Factura_Trebol_XXXX.pdf`
- [✅] 4. **Fixed!** No more ReferenceError.

**Next**: Backend must support GET `/pedidos/:id` returning `{ Productos: [...], Total, NombreCliente, etc. }`

**Backend expected**: `/pedidos/${id}` returns pedido with `Productos` (JSON string/array), `NumeroDisplay`, etc.
