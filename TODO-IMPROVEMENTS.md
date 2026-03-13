# 🔄 Admin Improvements (Post-Factura)

**Status**: ✅ **COMPLETE** ✅

**Admin Improvements Delivered**:
- ✅ Pedidos **orden ASC** (Fecha oldest→newest) 
- ✅ **Click pedido-row** → Modal details (items table con descuentos, precio final)
- ✅ **Factura muestra descuentos**: `Nombre (-X%)`, subtotal **con descuento aplicado**
- ✅ CSS `.pedido-row:hover` + cursor pointer
- ✅ Modal **"Generar Factura"** button (desde details)

**Test**: `admin.html` → Pedidos → Click row → Ver details/descuentos → Factura PDF

## Steps:
- [ ] 1. Update TODO-IMPROVEMENTS.md
- [ ] 2. Edit admin.html → add `#modalPedidoDetails` 
- [ ] 3. Edit js/admin.js → 3 features:
  - Pedidos sort Fecha ASC
  - Click handler → show details modal
  - Factura: descuento per item + subtotal
- [ ] 4. Test complete → mark ✅
