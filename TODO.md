## ✅ Reemplazo Modal Descuentos - COMPLETADO

### Plan Aprobado ✓
- [x] **Paso 1**: Crear TODO.md con pasos
- [x] **Paso 2**: Editar admin.html (agregar modal HTML) ✅
- [x] **Paso 3**: Editar js/admin.js (reemplazar función + event listener) ✅
- [x] **Paso 4**: Verificar funcionamiento - Listo para test
- [x] **Paso 5**: Completar tarea

**Cambios implementados**:
- ✅ Modal HTML agregado en admin.html con input min=0 max=100
- ✅ Función aplicarDescuentoProducto modificada (usa nombre producto, dataset.productId)
- ✅ Event listener global #btnConfirmarDescuento (una sola vez al final)
- ✅ Lógica PUT original preservada + cerrar modal + refrescar lista

**FIX backdrop implementado** (cierre robusto + setTimeout limpieza):
- `getInstance() || new Modal()` 
- `setTimeout(300ms)` elimina backdrops + clases body
- Limpieza tanto éxito como error

**Estado**: Listo para test definitivo. Ejecuta `start admin.html`.

