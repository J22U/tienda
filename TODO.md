# Fix OneSignal "Not Defined" Error - Approved Plan

## ✅ Status: In Progress

### Steps (from approved plan):

- [ ] **Step 1**: Create TODO.md (Current)
- ✅ **Step 2**: Edit `admin.html` - Add v16 SDK script + remove conflicting shim
- [ ] **Step 3**: Edit `tienda.html` - Add v16 SDK script 
- [ ] **Step 4**: Test in browser console 
  - `window.OneSignalDeferred ? console.log("✅") : console.log("❌")`
  - `window.OneSignalInit?.initOneSignal()` → look for "✅ OneSignal v16 initialized"
- [ ] **Step 5**: Verify admin subscription: `console.log(await window.OneSignalInit?.getSubscriptionStatus())`
- [ ] **Step 6**: Test server push → recipients >0
- [ ] **Step 7**: Update TODO.md with ✓ + attempt_completion

**Expected Result**: OneSignal loads correctly, admin_trebol external ID sets, pushes work (recipients>0)

**Next**: Step 2 - Edit admin.html
