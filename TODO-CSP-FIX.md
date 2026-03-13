# 🚀 TODO: Fix CSP + Socket Errors - PROGRESS [✅ 2/7]

**Status:** 40% admin.html ✅ | jsPDF CDN ✅ | 8/15 handlers fixed

## 📋 Completed Steps
**✅ STEP 1** Project analysis + TODO created
**✅ STEP 2a** jsPDF CDN added (CSP-safe jsdelivr.net)
**✅ STEP 2b** 8 inline handlers → data-action/data-tab

## ⏳ Remaining STEP 2 (admin.html)
```
- [ ] Backup/Import buttons (onclick → id)
- [ ] Filtro buttons (3 onclick → data-tab) 
- [ ] Dynamic lista-productos onclicks → event delegation
- [ ] Add delegation script before js/admin.js
```

## **NEXT: STEP 3 js/admin.js** (Critical)
```
1. Sync socket init (blocking) - Fix null.on() L1408
2. window.jspdf global ref 
3. Event delegation handler
4. socket?.on() guards
```

## 🔍 Test Current Changes
```
1. Ctrl+Shift+R admin.html
2. Console → CSP/jsPDF/socket errors gone?
3. Buttons work (logout/nuevo/tabs)?
```

**Run:** `start admin.html` → Report console after hard refresh.

## Expected Results (Full Fix)
```
✅ NO CSP errors (jsPDF loads)
✅ NO socket null errors  
✅ Cross-device works
✅ All dynamic onclicks delegated
```

**Next tool call:** Finish STEP 2 → STEP 3
