// 🔔 OneSignal Admin Subscription - One-Click Activator v16
// Copia y pega TODO en consola de admin.html (F12)

(async () => {
  console.log('🚀 OneSignal Activator starting...');
  
  // 1. Enable admin mode
  localStorage.setItem('admin_logged', 'true');
  console.log('✅ Admin session enabled');
  
  // 2. Wait for init (3s debounce)
  await new Promise(r => setTimeout(r, 3000));
  
  // 3. Request permission (triggers browser popup)
  console.log('🔐 Requesting permission...');
  try {
    const permission = await Notification.requestPermission();
    console.log('Permission:', permission);
    
    if (permission !== 'granted') {
      console.error('❌ Permission DENIED - Click "Allow" in browser popup!');
      return;
    }
  } catch (e) {
    console.error('Permission failed:', e);
    return;
  }
  
  // 4. Init OneSignal
  await window.OneSignalInit.initOneSignal();
  
  // 5. Wait for OneSignalInstance
  let retries = 0;
  while (!window.OneSignalInstance && retries < 10) {
    await new Promise(r => setTimeout(r, 500));
    retries++;
  }
  
  if (!window.OneSignalInstance) {
    console.error('❌ OneSignalInstance not ready');
    return;
  }
  
  const OS = window.OneSignalInstance;
  
  // 6. Opt-in subscription
  await OS.User.PushSubscription.optIn();
  console.log('✅ Opt-in complete');
  
  // 7. Set external ID
  await OS.setExternalUserId('admin_trebol');
  console.log('✅ admin_trebol external ID set');
  
  // 8. Final status
  const status = await window.OneSignalInit.getSubscriptionStatus();
  console.table(status);
  
  const subId = OS.User.PushSubscription.id;
  console.log(`🎉 Subscription ID:`, subId ? subId : '❌ No ID');
  
  if (status.ready && status.subscribed && status.externalId === 'admin_trebol') {
    console.log('🎊 FULLY ACTIVATED! Test push should work now 🚀');
  } else {
    console.log('⚠️  Check logs above - permission or timing issue');
  }
})();

