# TODO.md - Fix Factura Descuento

## ✅ Task: Fix "la factura no me está descargando con el descuento"

### Plan Breakdown (Approved)
1. [x] Create TODO.md with steps
2. [✅] Edit js/admin.js - Updated generarFacturaPDF(): Prioritizes TotalManual, uses DescuentoPorcentaje explicitly for discount line/%/amount (shows if >0 or calculated ahorro>0), added console.log for debug.
3. [✅] Verified logic (diffs exact-match, no syntax errors, preserves styling)
4. [ ] Test: Run server, apply discount via modal, generate PDF, check discount block
5. [ ] Final verification & completion
6. [ ] attempt_completion

**Next Step**: Edit js/admin.js
