// OneSignal SDK v16 Unified Init - Trébol Repuestos
// Clean, shared init for admin.html & tienda.html

const ONESIGNAL_APP_ID = 'a6a0e0fc-4caf-4ce6-adff-5856c98bfffe'; // Public - rotate in dashboard if compromised

let OneSignalInitialized = false;
let OneSignalInstance = null;

/**
 * Initialize OneSignal SDK (deferred loading)
 */
async function initOneSignal() {
  if (OneSignalInitialized) {
    console.log('✅ OneSignal already initialized');
    return OneSignalInstance;
  }

  return new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    OneSignalDeferred.push(async function(OneSignal) {
      try {
        OneSignalInstance = OneSignal;
        
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: './OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          notifyButton: {
            enable: true,
            size: 'medium',
            position: 'bottom-right',
            showCredit: false
          },
          welcomeNotification: {
            title: '🔔 Trébol Repuestos',
            message: 'Notificaciones activadas. Recibirás alertas de nuevos pedidos.',
            url: window.location.href
          },
          promptOptions: {
            slidedown: {
              enabled: true,
              autoPrompt: true,
              timeDelay: 10000, // 10s
              pageViews: 1
            }
          }
        });

        OneSignalInitialized = true;
        console.log('✅ OneSignal v16 initialized:', OneSignal);

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('stateChange', (event) => {
          console.log('📱 Push subscription changed:', event);
          updateNotificationUI();
        });

        // Update UI immediately
        updateNotificationUI();
        resolve(OneSignal);
        
      } catch (error) {
        console.error('❌ OneSignal init failed:', error);
        reject(error);
      }
    });
  });
}

/**
 * Update notification button/UI status
 */
async function updateNotificationUI() {
  if (!OneSignalInstance) return;

  try {
    // Check for status button (admin.html)
    const statusBtn = document.getElementById('btn-onesignal-status');
    if (statusBtn) {
      const permission = await OneSignalInstance.Notifications.permission;
      const subscription = await OneSignalInstance.User.PushSubscription.optInStatus();

      if (permission === 'granted' && subscription === 1) { // subscribed
        statusBtn.innerHTML = '<i class="bi bi-bell-fill"></i> Notificaciones ON';
        statusBtn.className = 'btn btn-success rounded-pill fw-bold btn-sm px-3';
        statusBtn.onclick = () => unsubscribeNotifications();
      } else if (permission === 'denied') {
        statusBtn.innerHTML = '<i class="bi bi-bell-slash"></i> Bloqueadas';
        statusBtn.className = 'btn btn-danger rounded-pill fw-bold btn-sm px-3';
      } else {
        statusBtn.innerHTML = '<i class="bi bi-bell"></i> Activar';
        statusBtn.className = 'btn btn-warning rounded-pill fw-bold btn-sm px-3';
        statusBtn.onclick = () => requestNotificationPermission();
      }
    }
  } catch (e) {
    console.log('UI update: OneSignal not ready yet');
  }
}

/**
 * Request notification permission & subscribe
 */
async function requestNotificationPermission() {
  if (!OneSignalInstance) return;
  
  try {
    const permission = await OneSignalInstance.Notifications.requestPermission();
    console.log('Permission granted:', permission);
    
    if (permission) {
      await OneSignalInstance.User.PushSubscription.optIn();
      updateNotificationUI();
    }
  } catch (error) {
    console.error('Permission request failed:', error);
  }
}

/**
 * Unsubscribe from notifications
 */
async function unsubscribeNotifications() {
  if (!OneSignalInstance) return;
  
  try {
    await OneSignalInstance.User.PushSubscription.optOut();
    updateNotificationUI();
    console.log('Unsubscribed from notifications');
  } catch (error) {
    console.error('Unsubscribe failed:', error);
  }
}

/**
 * Test notification (admin only)
 */
async function testNotification() {
  if (!OneSignalInstance) {
    alert('OneSignal not initialized');
    return;
  }
  
  try {
    const isSubscribed = await OneSignalInstance.User.PushSubscription.optInStatus();
    if (isSubscribed !== 1) {
      alert('Subscribe first');
      return;
    }
    
    OneSignalInstance.Notifications.addEventListener('click', (event) => {
      console.log('Notification clicked:', event);
      window.focus();
    });
    
    OneSignalInstance.Notifications.displayNotification({
      title: '🛒 Test Notification - Trébol',
      message: 'Push notifications working!',
      icon: 'https://res.cloudinary.com/donc8a6tc/image/upload/v1770738241/LOGO_TR%C3%89BOL-removebg-preview_uyamlw.png',
      url: window.location.href
    });
  } catch (e) {
    console.error('Test failed:', e);
  }
}

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOneSignal);
} else {
  initOneSignal();
}

// Export for global use
window.OneSignalInit = { initOneSignal, updateNotificationUI, requestNotificationPermission, unsubscribeNotifications, testNotification };

// Expose for backward compatibility
window.initOneSignal = initOneSignal;
