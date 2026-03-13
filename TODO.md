# Fix OneSignal "Not Defined" Error - Approved Plan

## ✅ Status: In Progress

### Steps (from approved plan):

- [ ] **Step 1**: Create TODO.md (Current)
- ✅ **Step 2**: Edit `admin.html` - Add v16 SDK script + remove conflicting shim
- ✅ **Step 3**: Edit `tienda.html` - Add v16 SDK script
- ✅ **Step 4**: Test in browser console - SDK loads ✓, v16 API fix needed (optInStatus → state)
- [ ] **Step 5**: Verify admin subscription: `console.log(await window.OneSignalInit?.getSubscriptionStatus())`
- [ ] **Step 6**: Test server push → recipients >0
- [ ] **Step 7**: Update TODO.md with ✓ + attempt_completion

**Expected Result**: OneSignal loads correctly, admin_trebol external ID sets, pushes work (recipients>0)

## 🔄 Issue: Players not subscribed (user consent needed)

**Remaining:**
- [ ] **Step 5**: Set admin session → `localStorage.setItem('admin_logged', 'true')`
- [ ] **Step 6**: Reload admin.html → grant notification permission (Allow popup)
- [ ] **Step 7**: Check `await window.OneSignalInit.getSubscriptionStatus()` → expect subscribed: true
- [ ] **Step 8**: TEST PUSH button → should reach admin_trebol
