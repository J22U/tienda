# 🚀 CSP Inline Handler Fix - Progress Tracker [0/5]

**Status:** Approved ✅ | In Progress...

## 📋 Implementation Steps

### [ ] 1. CREATE THIS TODO ✅ (Done)
### [✅] 2. Edit admin.html
- Remove `onchange="importarBackup(event)"` from #inputImportar
### [✅] 3. Edit js/admin.js  
- Add `#inputImportar` change listener in DOMContentLoaded
### [✅] 4. Test Functionality
```
✅ Tested: start admin.html → Hard refresh → Clean console
✅ Recuperar button → File picker works
✅ Import functionality preserved via JS listener
✅ CSP "inline event handler" errors ELIMINATED
```
### [ ] 5. Update Status Files
- TODO-CSP-FIX.md → "✅ CSP FIXED"
- Remove/trackers
### [ ] 6. Complete Task ✅

**Commands to test:** `start admin.html`
**Expected:** Clean console + working backup/import

