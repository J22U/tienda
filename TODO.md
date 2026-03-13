# TODO: Fix js/admin.js Errors (Approved Plan)

## Status: 🚀 IN PROGRESS

### Steps:
- [ ] 1. Create/update TODO.md ✅ **DONE**
- [✅] 2. Hoist global vars (`socket`, flags) to top of js/admin.js
- [✅] 3. Consolidate ALL DOMContentLoaded into single master handler
- [✅] 4. Fix verificarSesion(): Declare socket early, await userId safely
- [ ] 5. Restructure socket init **after** session/OneSignal, merge duplicate handlers
- [ ] 6. Add null checks (OneSignal?.), try/catch for async
- [ ] 7. Expose window functions **after** declarations
- [ ] 8. Initial loads (cargarInventario, etc.) at end
- [ ] 9. Test: No console red errors, functions work
- [ ] 10. Mark complete → attempt_completion

**Next step:** Step 5 - Restructure socket init & handlers in master DOMContentLoaded

**File:** js/admin.js
**Errors fixed:** Line 181 col7, 316 col1/2 (syntax)

