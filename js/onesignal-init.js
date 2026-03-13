// OneSignal SDK v16 Unified Init - Trébol Repuestos - FIXED SYNTAX
// Clean, shared init for admin.html & tienda.html

const ONESIGNAL_APP_ID = 'a6a0e0fc-4caf-4ce6-adff-5856c98bfffe';

let OneSignalInitialized = false;
let OneSignalInstance = null;

async function initOneSignal() {
  if (OneSignalInitialized) {
    console.log('✅ OneSignal already initialized');
    checkAndRecoverSubscription();
    return OneSignalInstance;
  }

  return new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    OneSignalDeferred.push(async function(OneSignal) {
      try {
        OneSignalInstance = OneSignal;
        await checkAndRecoverSubscription();
        setupExternalIdListener();
        
        // Get user ID BEFORE init
        const userId = await getCurrentUserId();
        
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: './OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          notifyButton: { enable: false },
          welcomeNotification: { disable: true },
          promptOptions: { slidedown: { enabled: false } }
        });
        
        // IMMEDIATE set external ID after init
        await OneSignalInstance.setExternalUserId(userId);

        OneSignalInitialized = true;
        console.log('✅ OneSignal v16 initialized');
        
        getSubscriptionStatus().then(async (status) => {
          console.log('📊 OneSignal Status:', status);
          const expectedId = await getCurrentUserId();
          if (status.externalId === expectedId) {
            console.log('🎉 User subscription ready:', expectedId);
          } else {
            console.log('⚠️ ID mismatch - auto-recovery:', status.externalId, '≠', expectedId);
            await checkAndRecoverSubscription();
          }
        });

        OneSignal.User.PushSubscription.addEventListener('stateChange', (event) => {
          console.log('📱 Push subscription changed:', event);
          getSubscriptionStatus().then(updateNotificationUI);
        });

        updateNotificationUI();
        resolve(OneSignal);
      } catch (error) {
        console.error('❌ OneSignal init failed:', error);
        reject(error);
      }
    });
  });
}

async function updateNotificationUI() {
  if (!isAdminPage()) return;
  const statusBtn = document.getElementById('btn-onesignal-status');
  if (!statusBtn || !OneSignalInstance) return;

  try {
    const permission = await OneSignalInstance.Notifications.permission;
    const subscriptionState = await OneSignalInstance.User.PushSubscription.state;
    const subscribed = subscriptionState === 'Subscribed' || subscriptionState === 'OptedIn';

    if (permission === 'granted' && subscribed) {
      statusBtn.innerHTML = '<i class="bi bi-bell-fill"></i> Notificaciones ON';
      statusBtn.className = 'btn btn-success rounded-pill fw-bold btn-sm px-3';
      statusBtn.onclick = unsubscribeNotifications;
    } else if (permission === 'denied') {
      statusBtn.innerHTML = '<i class="bi bi-bell-slash"></i> Bloqueadas';
      statusBtn.className = 'btn btn-danger rounded-pill fw-bold btn-sm px-3';
    } else {
      statusBtn.innerHTML = '<i class="bi bi-bell"></i> Activar';
      statusBtn.className = 'btn btn-warning rounded-pill fw-bold btn-sm px-3';
      statusBtn.onclick = requestNotificationPermission;
    }
  } catch (e) {
    console.log('UI update error:', e);
  }
}

async function requestNotificationPermission() {
  if (!OneSignalInstance) return;
  try {
    const permission = await OneSignalInstance.Notifications.requestPermission();
    if (permission) {
      await OneSignalInstance.User.PushSubscription.optIn();
      updateNotificationUI();
    }
  } catch (error) {
    console.error('Permission request failed:', error);
  }
}

async function unsubscribeNotifications() {
  if (!OneSignalInstance) return;
  try {
    await OneSignalInstance.User.PushSubscription.optOut();
    updateNotificationUI();
  } catch (error) {
    console.error('Unsubscribe failed:', error);
  }
}

function isAdminPage() {
  return window.location.pathname.includes('admin.html') || document.title.toLowerCase().includes('admin');
}

async function getSubscriptionStatus() {
  if (!OneSignalInstance) return { ready: false };
  try {
    const permission = await OneSignalInstance.Notifications.permission;
    
    // v16: Use state instead of optInStatus()
    const subscriptionState = await OneSignalInstance.User.PushSubscription.state;
    const subscribed = subscriptionState === 'Subscribed' || subscriptionState === 'OptedIn';
    
    return {
      ready: true,
      permission, 
      subscribed,
      subscriptionState,
      externalId: localStorage.getItem('onesignal_admin_id') || 'not_set'
    };
  } catch (e) {
    return { ready: false, error: e.message };
  }
}

async function getCurrentUserId() {
  // Prioridad: localStorage → server session → generate unique
  let userId = localStorage.getItem('current_user_id');
  
  if (!userId) {
    // Try server session token as fallback
    userId = localStorage.getItem('server_session_token')?.slice(0,32) || null;
  }
  
  if (!userId) {
    // Generate unique session ID
    userId = `admin_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    localStorage.setItem('current_user_id', userId);
    console.log('🆕 Generated new userId:', userId);
  }
  
  return userId;
}

async function checkAndRecoverSubscription() {
  if (!OneSignalInstance) return;
  
  try {
    const userId = await getCurrentUserId();
    const currentId = await OneSignalInstance.User.getExternalId();
    
    if (currentId !== userId) {
      console.log(`🔄 Syncing OneSignal externalId: ${currentId || 'none'} → ${userId}`);
      await OneSignalInstance.setExternalUserId(userId);
      
      // Ensure subscription active
      const subState = await OneSignalInstance.User.PushSubscription.state;
      if (subState !== 'Subscribed' && subState !== 'OptedIn') {
        await OneSignalInstance.User.PushSubscription.optIn();
      }
      
      localStorage.setItem('onesignal_user_id', userId);
      console.log('✅ User identity synced:', userId);
    }
  } catch (e) {
    console.error('Recovery failed:', e);
  }
}

function setupExternalIdListener() {
  if (!OneSignalInstance) return;
  
  OneSignalInstance.User.PushSubscription.addEventListener('stateChange', async (event) => {
    if (event.isSubscribed) {
      const userId = await getCurrentUserId();
      await OneSignalInstance.setExternalUserId(userId);
      console.log('🔄 Auto-sync externalId on subscription change:', userId);
    }
  });
}

// Start persistence
document.addEventListener('DOMContentLoaded', async () => {
  await initOneSignal();
  updateNotificationUI();
  checkAndRecoverSubscription();
});

window.OneSignalInit = {
  initOneSignal,
  updateNotificationUI,
  checkAndRecoverSubscription,
  getSubscriptionStatus,
  isAdminPage,
  getCurrentUserId  // ← NEW: expose for other files
};
