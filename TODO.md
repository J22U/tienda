# Cancelar Pedidos - Restauración Inventario + Tachado Rojo

**Estado: 2/6 completado**

## Plan Implementación
- [✅] **1. Backend app.js**: PUT `/pedidos/:id/cancelar` 
  - Fetch order → parse Items → UPDATE Stock += Cantidad por producto (transacción)
  - UPDATE Pedidos Estado='Cancelado'
  - Emit socket 'pedido-updated' + 200 OK

- [✅] **2. Frontend Backend endpoint creado**: Listo para frontend

- [ ] **3. Frontend js/admin.js**: Botón "Cancelar" (rojo) en acciones tabla (solo Pendiente)
  - Event delegation `.pedido-btn-cancelar` → `cancelarPedido(id)`

- [ ] **4. Función cancelarPedido(id)** en js/admin.js:
  ```
  fetch(`/pedidos/${id}/cancelar`, {method:'PUT'})
  .then(()=>cargarPedidos(true)) // preserve states
  .catch(err=>Swal.error)
  ```

- [ ] **5. renderPedidos()**: Si Estado=='Cancelado':
  - `<tr class="canceled-order">` 
  - `<span class="badge bg-danger">Cancelado</span>`
  - Strikethrough texto + opacity

- [ ] **6. Filtros**: Agregar btn "Cancelados" `data-tab="Cancelado"` en admin.html + filtro js

- [ ] **7. CSS css/admin.css**:
  ```
  .canceled-order { opacity: 0.6; }
  .canceled-order strong, .canceled-order .badge { 
    text-decoration: line-through !important; 
    color: #ff4444 !important; 
  }
  .pedido-btn-cancelar { background: #ff4757; color: white; }
  ```

## Test Steps
1. Cancelar pedido Pendiente → verificar stock + Estado Cancelado + tachado rojo
2. Filtro "Cancelados" funciona
3. Socket refresh real-time
4. No cancelar si Completado (hide btn)

**Próximo**: Paso 3 - Editar js/admin.js (botón + lógica)



