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
        
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: './OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          notifyButton: { enable: false },
          welcomeNotification: { disable: true },
          promptOptions: { slidedown: { enabled: false } }
        });

        OneSignalInitialized = true;
        console.log('✅ OneSignal v16 initialized');
        
        getSubscriptionStatus().then(status => {
          console.log('📊 OneSignal Status:', status);
          if (status.externalId === 'admin_trebol') {
            console.log('🎉 Admin subscription ready');
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
    const subscription = await OneSignalInstance.User.PushSubscription.optInStatus();

    if (permission === 'granted' && subscription === 1) {
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
    const subStatus = await OneSignalInstance.User.PushSubscription.optInStatus();
    return {
      ready: true,
      permission, 
      subscribed: subStatus === 1,
      externalId: localStorage.getItem('onesignal_admin_id') || 'not_set'
    };
  } catch (e) {
    return { ready: false, error: e.message };
  }
}

async function checkAndRecoverSubscription() {
  if (!isAdminPage() || !OneSignalInstance) return;
  
  const adminLogged = localStorage.getItem('admin_logged') === 'true';
  const toggleEnabled = localStorage.getItem('admin_notifications_enabled') === 'true';
  
  if ((adminLogged || toggleEnabled) && OneSignalInstance) {
    try {
      const currentId = await OneSignalInstance.User.getExternalId();
      if (currentId !== 'admin_trebol') {
        console.log('🔧 FORCE: Setting admin_trebol externalId');
        await OneSignalInstance.login('admin_trebol');
        await OneSignalInstance.User.PushSubscription.optIn();
        localStorage.setItem('onesignal_user_id', 'admin_trebol');
        console.log('✅ Forced admin_trebol identity');
      }
    } catch (e) {
      console.error('Recovery failed:', e);
    }
  }
}

function setupExternalIdListener() {
  if (!OneSignalInstance || !isAdminPage()) return;
  OneSignalInstance.User.PushSubscription.addEventListener('stateChange', async (event) => {
    const toggleEnabled = localStorage.getItem('admin_notifications_enabled') !== 'false';
    if (event.isSubscribed && toggleEnabled) {
      await OneSignalInstance.setExternalUserId("admin_trebol");
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
  isAdminPage
};
