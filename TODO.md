# TODO: Persistent Admin Login Session
Status: ✅ **PLAN APPROVED** - Implementing persistent login across tab/app closes

## 📋 Implementation Steps (Sequential)

### 1. **✅ Create TODO.md** (Current - Done)

### 2. **Update js/admin.js** (Primary Fix)
   - Copy `isPWA()`, `isSessionValid()`, `saveAdminSession()` from tienda.js
   - Replace `verificarSesion()` with complete validation + server sync
   - Add token refresh + socket reconnect logic
   - Mark as **✅ COMPLETED**

### 3. **Update admin.html** (Minor Cleanup)
   - Remove inline duplication of session check
   - Keep only protection redirect
   - Mark as **✅ COMPLETED**

### 4. **Test Persistent Login**
   ```
   1. Login in tienda.html
   2. Go to admin.html → Verify loads
   3. Close tab/browser → Reopen admin.html → Verify auto-login (no prompt)
   4. Check console: Socket connects with token
   5. Mark as **✅ PASS**

   Edge case: Wait 24h+ → Should require re-login
   ```

### 5. **Final Verification**
   - No regressions in existing features
   - Socket.io notifications working
   - **attempt_completion**

## Progress Tracker
- [x] Plan approved
- [x] **js/admin.js updated** ✅ Persistent session logic integrated (isSessionValid, refreshServerSession, full verificarSesion)
- [x] **admin.html cleaned** ✅ Removed inline duplication, now uses js/admin.js only
- [ ] Tests passed  
- [ ] Complete ✅

