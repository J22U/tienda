# OneSignal Persistence Fix - Trébol Repuestos ✅

## Status: ✅ IMPLEMENTED & READY FOR TESTING

### Completed Steps:
1. ✅ Create TODO.md with detailed steps
2. ✅ Edit `js/onesignal-init.js`: Inserted 🆕 persistence block using OneSignalDeferred.push() inside initOneSignal(), syncing 'admin_logged' with externalId="admin_trebol". Preserves existing recovery/toggle logic.
3. ✅ Verified edit: Code inserted correctly before resolve(OneSignal); no syntax errors.

### Pending Tests (Manual - Browser):
4. 🧪 Test persistence: Open admin.html → login (set admin_logged=true) → close tab → reopen → check console for "✅ OneSignal: Identidad admin_trebol vinculada automáticamente" + OneSignal.User.getExternalId() === "admin_trebol".
5. 🧪 Test logout: Set admin_logged=false → reload → check "🔓 OneSignal: Sesión inactiva, identidad removida".
6. ✅ Updated TODO.md with ✓ marks.
7. 🧪 Run: Open `admin.html` in browser (cmd: `start admin.html`), inspect console, simulate login/logout.

**Success Criteria:** Console shows sync logs; push notifications target "admin_trebol" correctly even after app close.

**Files Changed:**
- `js/onesignal-init.js` (added persistence sync)

Task complete! Test in browser to confirm persistence fix works.

