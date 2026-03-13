# Persistent Admin Notifications - Implementation Plan
✅ **Plan Approved** by user

## Steps to Complete (Persistent OneSignal for Admin)

### 1. ✅ Create TODO.md 

### 2. ✅ Enhance js/onesignal-init.js
- ✅ Add `beforeunload` recovery hook
- ✅ Implement IndexedDB for externalId persistence  
- ✅ Export `testAdminNotification()` function

### 3. ✅ Update js/admin.js  
- ✅ Add `focus` + `visibilitychange` listeners
- ✅ Add test notification button  
- ✅ Force recovery on tab reopen

### 4. ✅ Update admin.html
- ✅ Add debug status div
- ✅ Add test button UI

### 5. [PENDING] Test & Validate
- Login → Close tabs/PWA → Trigger notification
- Verify browser notification delivery
- Test logout clears subscription

### 6. [PENDING] attempt_completion

**Progress**: 4/6 ✅  
**Status**: ✅ IMPLEMENTATION COMPLETE - Ready for testing!

## Test Instructions:
1. Login as admin.html 
2. Toggle notifications ON → Verify "✅ PERSISTENT" status
3. Close all tabs → Use `window.OneSignalTest.testAdminNotification()` or server trigger
4. Verify **browser notification** arrives (SW handles)
5. Reopen tab → Auto-recovery (status green)
6. Logout → Status red, no notifications
