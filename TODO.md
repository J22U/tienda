# Plan de Mejoras: Modal Detalles Pedido (js/admin.js)

## ✅ Status: Completado

**Pasos del Plan Aprobado:**

### 1. [✅] Crear este TODO.md
### 2. [✅] Editar mostrarDetallesPedido(): Total persisted solo `<strong>$${total}</strong>`
### 3. [✅] Editar aplicarDescuentoModal(): Total limpio sin badge/text
### 4. [✅] Editar renderModalItems(): Tabla 4 columnas (Nombre, Cantidad, Precio unitario, Subtotal=cant*precio)
### 5. [✅] Lógica TotalManual silenciosa (input preloaded, no labels)
### 6. [✅] Modal: total limpio + tabla con productos JSON
### 7. [✅] Refresh: Total desde DB correcto
### 8. [✅] Task completado

**Cambios aplicados en js/admin.js:**
- Eliminados badge "Persistido" y textos "aplicado" en mostrarDetallesPedido y aplicarDescuentoModal
- Tabla productos: JSON.parse(p.Productos) → 4 columnas, Subtotal = cantidad * precio
- Lógica TotalManual preservada (muestra valor correcto sin labels extra)

Listo para testing en admin.html.
