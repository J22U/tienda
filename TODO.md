# 🛠️ TODO: Fix Admin Pedidos Details Bug
## Approved Plan - Status: ✅ In Progress

### 1. ✅ Create TODO.md
### 2. 🔄 Update js/admin.js
   - Fix event delegation order (buttons AFTER toggle)
   - Enhance populatePedidoDetails (JSON parse fallback + error handling)
   - Add loading spinner/error states

### 3. ⏳ Update server.js (/pedidos/:id)
   - Parse Productos JSON → Items array
   - Better 404/logging

### 4. ⏳ Update css/admin.css
   - Fix .table-row-details.show

### 5. ⏳ Test
   - Reload admin → Click pedido
   - Check console/Network tab
   - Verify expansion

### 6. ⏳ attempt_completion
