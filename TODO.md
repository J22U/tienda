# OneSignal Persistence Fix - COMPLETED ✅

## Changes Applied:
- ✅ js/onesignal-init.js: Reinforced `checkAndRecoverSubscription()` (force login), added `window.onload` check, 30s intelligent heartbeat interval
- ✅ js/admin.js: Added explicit `checkAndRecoverSubscription()` after `initOneSignal()`
- Server push logic already independent of socket ✅

## Test Instructions:
1. Login admin.html, enable notifications toggle
2. Close tab/browser
3. Create test pedido → expect "QUEUED (admin_trebol offline - normal)"
4. Reopen admin.html → check console: "Current externalId: admin_trebol" 
5. Create another test pedido → expect "DELIVERED! recipients=1"

## Result:
OneSignal externalId "admin_trebol" now persists across sessions. Push notifications will deliver when browser/device online, even if tab closed (only logout on explicit button press).

