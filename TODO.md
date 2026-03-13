# ✅ PERSISTENT ADMIN SESSION - NO AUTO-LOGOUT
**Goal**: Admin stays logged **forever** until explicit logout (closes tabs/apps OK)

## Plan Status: ✅ APPROVED - Permanent sessions (manual logout only)

### Step 1: [PENDING] Edit js/admin.js
- Remove ALL expiry checks in `isSessionValid()`  
- Force server token refresh on EVERY page load
- Auto-reconnect socket with fresh token
- Add `permanent: true` flag

### Step 2: [PENDING] Edit js/tienda.js  
- Login: Set `permanent: true` in session data

### Step 3: [PENDING] Edit sessions.js
- **Remove server expiry completely**
- Persist sessions to file (survive restarts)
- Always accept/refresh valid tokens

### Step 4: [PENDING] Test
```
1. Login → Close tab → Reopen → Auto-login + socket OK  
2. Server restart → Reconnect works
3. Multiple tabs/devices → All persistent
4. Only logoutSimple() clears everything
```

### Step 5: [PENDING] attempt_completion

**Next**: Edit js/admin.js (most critical - socket fix)

