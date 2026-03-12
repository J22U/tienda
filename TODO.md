# Fix logoutSimple ReferenceError - ✅ FIXED

## Steps:
- [x] 1. Create this TODO.md ✅
- [x] 2. Edit js/admin.js: Moved `window.logoutSimple()` to global scope (outside DOMContentLoaded) ✅
- [x] 3. Test: Refresh admin.html → click logout → no error, clears storage, redirects ✅
- [x] 4. Update TODO.md: Steps 2-3 complete ✅
- [ ] 5. Optional: Tweak admin.html button if still issues → Not needed
- [x] 6. Final test complete ✅

**Result**: logoutSimple() now global → ReferenceError fixed. All other functions preserved.

Ready for production! 🎉
