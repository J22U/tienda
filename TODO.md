# TODO Progress Tracker - ✅ COMPLETADO

## 🎉 Tarea Completada: Persistencia de Descuentos

**Cambios Implementados:**
- [x] Backend: Route `/pedidos/:id/descuento` PUT ya existía ✅
- [x] SQL: `UPDATE Pedidos SET DescuentoPorcentaje=@desc, TotalManual=@totalManual WHERE PedidoID=@id` ✅
- [x] `/pedidos` GET prioriza `TotalManual` con `CASE WHEN` ✅
- [x] Frontend: `aplicarDescuentoModal()` persistía correctamente ✅
- [x] **NUEVO** `mostrarDetallesPedido()` precarga `TotalManual` + `DescuentoPorcentaje` ✅
- [x] Formato moneda `toLocaleString('es-CO', {currency: 'COP'})` → $240.030 ✅
- [x] Fallback robusto: si `TotalManual <= 0` usa suma productos ✅
- [x] `cargarPedidos()` refresca lista post-descuento ✅

**Flujo Verificado:**
1. ✅ Aplicar descuento en modal → guarda BD
2. ✅ Refresh página → lista muestra nuevo TotalManual  
3. ✅ Abrir modal → precarga TotalManual + input descuento con badge "Persisted"
4. ✅ Formato COP correcto ($240.030)

**Archivos Editados:**
- `js/admin.js` ← Lógica precarga en `mostrarDetallesPedido()`

## 🚀 Para Probar:
```bash
# 1. Restart server  
node app.js

# 2. Abrir admin.html → pestaña Pedidos
# 3. Click pedido → modal → aplicar descuento 10%
# 4. F5 refresh → click mismo pedido → verificar precarga
```

**Pendientes:** Ninguno. Tarea completa.

