# TODO: Fixar Logout Admin Panel

✅ **Approved Plan**: Simplify logout button - direct localStorage.clear() + redirect

**Progress:**
- ✅ Step 1: Create TODO.md
- ✅ Step 2: Edit admin.html - Added `onclick="logoutSimple()"` to logout button
- ✅ Step 3: Edit js/admin.js - Added `window.logoutSimple()` with full storage clear + redirect + logging
- [ ] Step 4: Test logout functionality  
- [ ] Step 5: Update TODO.md as completed
- [ ] Step 6: attempt_completion

**Test Instructions:**
1. Open admin.html in browser
2. Open DevTools > Console
3. Click "Cerrar Sesión" button
4. Watch console: "🚀 SIMPLIFIED LOGOUT" → "✅ Storage cleared" → "🔄 Force redirect"
5. Verify redirects to tienda.html WITHOUT admin access


