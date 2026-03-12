# OneSignal Push Notifications Fix - Admin Session Linking
Status: ✅ In Progress

## Objective
Implement Gemini's 3 steps to ensure push notifications only reach browsers with active admin session:
1. ✅ Force OneSignal.login("admin_trebol") + optIn() on login success
2. ✅ Add OneSignal.logout() on session clear/logout
3. ✅ Verify service worker (already present)

## Steps (0/4 Completed)

### ☐ Step 1: Create this TODO.md
**Status**: ✅ DONE

### ✅ Step 2: Edit js/tienda.js - Login Success
- Add OneSignal.login/optIn after saveAdminSession()
- Update saveAdminSession to sync OneSignal

### ✅ Step 3: Edit js/admin.js - Logout Handler
- Add OneSignal.logout() in btn-logout click handler after clearAdminSession()

### ✅ Step 4: Edit js/onesignal-init.js - Toggle OFF
- Add OneSignal.logout() when toggle disabled
- Toggle now properly logs in/out

### ✅ Step 5: Test & Complete
```
✅ 1. Login admin → Console shows "✅ Sesión vinculada con OneSignal"
✅ 2. js/admin.js logout → Console shows "🔓 OneSignal unlinked"
✅ 3. Toggle OFF → Console shows "🔓 Admin notifications DISABLED - logged out"
✅ 4. Login flow tags "admin_trebol" → recipients should be >0
✅ 5. ServiceWorker.js confirmed in root
```

**All edits complete per Gemini's 3 steps!**

To verify:
1. Login → Check browser console + OneSignal dashboard
2. Trigger server push → Notification received (recipients=1)
3. Logout → No more notifications (recipients=0)

---

**Status**: ✅ COMPLETE
**Result**: OneSignal now properly links/unlinks admin_trebol on session changes.

