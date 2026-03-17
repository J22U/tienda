# PDF Logo/QR CSP Fix - Execution Tracker (Approved Plan)

## Current Progress: 1/5 ✓

### Breakdown from Plan:
- [x] **Step 1**: Test current PDF generation → `start admin.html` executed successfully. Awaiting browser test results (localStorage.setItem('admin_logged','true') → Pedidos → Factura → console/PDF check).
- [ ] **Step 2**: If broken, ensure canvasToDataURL scope (add dynamic import to js/admin.js if needed).
- [ ] **Step 3**: Fix paths/CORS if 404 errors (uploads/logo-trebol.png accessible).
- [ ] **Step 4**: Add polish (PDF loading spinner, better error handling).
- [ ] **Step 5**: Update TODO.md/TODO-LOGO-QR-Facturas.md → ✅ FIXED. Test full flow. attempt_completion.

**Next Action**: In browser (admin.html open):
1. F12 → Console: `localStorage.setItem('admin_logged', 'true')`
2. Refresh → Pedidos tab → Factura button → Download PDF
3. Check: Logo top-left / QR top-right visible? Console errors/fallback?
4. Reply with results/console logs.

**Status**: Test initiated. Awaiting manual verification.

