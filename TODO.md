# 🛠️ TODO: Fix Admin Estado Cambio Pedidos
## Status: ✅ Step 2 Complete - Client-side fixed

**✅ 1. Create TODO.md**  
**✅ 2. Update js/admin.js**  
   - Fixed remote URLs → local paths (`/pedidos/...`)  
   - Added fetch error handling + offline fallback  
   - Enhanced `cambiarEstado()` with retry + better UX  
   - Preserved toggle/details functionality  

**⏳ 3. Update server.js** (Next)  
   - Verify/create `/pedidos/:id/completar` + `/pedidos/:id/pendiente` PUT routes  
   - Socket.io emit for real-time updates  

**⏳ 4. Test**  
   - `npm start` → admin.html  
   - Click "Completar" button → check Network tab  
   - Verify DB update + UI refresh  

**⏳ 5. Deploy to Render** (if needed)  

**Current Issue:** Remote Render returns 404. Local server runs but needs routes.

