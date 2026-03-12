# ✅ Ferreteria Fixes - Socket + OneSignal Persistence
*Status: 0/5 COMPLETED - Approved Plan*

## 📋 Implementation Steps

### 1. 🔌 Fix Socket Auth (js/admin.js) 
- [x] Add `auth: { token: localStorage.getItem('server_session_token') }` to socket connection
- [x] Test: No more "Socket rechazado", see "✅ Socket admin: admin_trebol"

**Status: 1/5 COMPLETED**

### 2. 🔔 OneSignal PWA Persistence (js/onesignal-init.js)
- [ ] Add IndexedDB fallback for toggle state
- [ ] Test: Toggle stays ON after PWA close/reopen

### 3. 📱 Add Socket Status UI (admin.html) 
- [ ] Add connection indicator next to toggle

### 4. 🧪 Test Both Fixes
- [ ] Restart server, login, verify socket + toggle persistence

### 5. 🎉 Complete Task
- [ ] attempt_completion with demo commands

**Next:** Edit js/admin.js (Step 1)

