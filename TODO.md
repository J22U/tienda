# 🛠️ TODO: Fix Admin Estado Cambio Pedidos
## Status: 🔄 Step 3 In Progress - Creating TODO.md & preparing edits

**✅ 1. Create TODO.md**  
**✅ 2. Update js/admin.js** (Client-side delegation fixed)  
**🔄 3. Update app.js** (Server verification + Socket emit)  
   - [ ] Global window.socket declaration  
   - [ ] Socket assignment on connect  
   - [ ] Null-checks + offline handling in cambiarEstado()  
   - [ ] Loading states + preserve collapsed/filter  
   - [ ] Test local: node app.js → admin.html → Test "Completar"  

**⏳ 4. Test**  
**⏳ 5. Deploy to Render**  

**Current Issue:** `ReferenceError: socket is not defined` (js/admin.js:659) - Scope fix incoming

