# 🛒 Trébol OneSignal Push Notification Fix
## Status: 🔄 In Progress (0/7 completed)

### 📋 Step-by-Step Plan

**✅ Phase 1 Complete**: Create this TODO.md ✓

**1. [ ] Update js/onesignal-init.js**  
   - Fix init order: setExternalUserId AFTER init via OneSignal.push()  
   - Add isAdminPage() detection + auto-prompt for admins  
   - Add getSubscriptionStatus() diagnostics  
   - localStorage persistence  

**2. [ ] Update admin.html**  
   - Add subscription status badge (#status-bell)  
   - Auto-trigger subscription on load  

**3. [ ] Update js/admin.js**  
   - Integrate OneSignalInit.updateNotificationUI()  
   - Add testNotification() button  

**4. [ ] Update app.js**  
   - Enhanced sendPushNotification() error logging  
   - Parse OneSignal response.errors  

**5. [ ] Test Locally**  
   - Clear OneSignal state (DevTools → Application → Storage)  
   - admin.html → Accept prompt → Verify console "admin_trebol"  
   - Create test order → Receive push  

**6. [ ] Deploy & Test Production**  
   - git push → Render deploy  
   - Test full flow on tienda-1vps.onrender.com  

**7. [ ] Verify Dashboard**  
   - OneSignal.com → Audience → Search "admin_trebol" ✓

---

## Quick Test Commands
```bash
# Clear OneSignal (Chrome DevTools)
# Application → Storage → Clear site data → onesignal.com

# Test subscription  
curl -X POST https://api.onesignal.com/api/v1/notifications \\
  -H "Authorization: key YOUR_REST_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"app_id":"a6a0e0fc-4caf-4ce6-adff-5856c98bfffe","include_external_user_ids":["admin_trebol"],"contents":{"en":"Test"}}'
```

## Success Criteria
- ✅ Console: "Push subscription: {optedIn: true, external_user_id: admin_trebol}"  
- ✅ Admin UI: 🔔 Notificaciones ON (green)  
- ✅ New order → Admin push received instantly  
- ✅ OneSignal Dashboard: 1 device as "admin_trebol"

**Next**: Edit `js/onesignal-init.js` → Step 1"

