// OneSignal SDK v16 Fixed - Dynamic User ID + Persistence
// ✅ Fixes: v16 API (login()/User.id), no top-level await, unique externalId per session

const ONESIGNAL_APP_ID = 'a6a0e0fc-4caf-4ce6-adff-5856c98bfffe';

let OneSignalInitialized = false;
let OneSignalInstance = null;

async function initOneSignal() {
  if (OneSignalInitialized) {
    console.log('✅ OneSignal already initialized - checking sync');
    await checkAndRecoverSubscription();
    return OneSignalInstance;
  }

  return new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    OneSignalDeferred.push(async function(OneSignal) {
      try {
        OneSignalInstance = OneSignal;
        
        // Sync user ID immediately
        await checkAndRecoverSubscription();
        setupExternalIdListener();
        
        // Get current user ID
        const userId = getCurrentUserId();
        console.log('🔗 OneSignal init with userId:', userId);
        
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: './OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          notifyButton: { enable: false },
          welcomeNotification: { disable: true },
          promptOptions: { slidedown: { enabled: false } }
        });
        
        // ✅ v16 CORRECT: Use login(userId) - replaces deprecated setExternalUserId
        // FIXED v16 → v15 stable API
        if (OneSignalInstance.setExternalUserId) {
          await OneSignalInstance.setExternalUserId(userId);
        } else if (OneSignalInstance.login) {
          await OneSignalInstance.login(userId).catch(e => console.warn('v16 login fallback:', e));
        }
        
        OneSignalInitialized = true;
        console.log('✅ OneSignal ready - user:', userId);
        
        // Status check
        getSubscriptionStatus().then(status => {
          console.log('📊 Status:', status);
          updateNotificationUI();
        });

        // Event listeners
        OneSignalInstance.User.PushSubscription.addEventListener('stateChange', (event) => {
          console.log('📱 Subscription:', event);
          getSubscriptionStatus().then(updateNotificationUI);
        });

        resolve(OneSignalInstance);
      } catch (error) {
        console.error('❌ OneSignal init ERROR:', error);
        reject(error);
      }
    });
  });
}

function getCurrentUserId() {
  // FIXED: Always use FIXED 'admin_trebol' for server push matching
  const FIXED_ADMIN_ID = 'admin_trebol';
  
  // Preserve existing for localStorage compat
  let userId = localStorage.getItem('current_user_id') || FIXED_ADMIN_ID;
  
  // Always set/override to fixed ID
  localStorage.setItem('current_user_id', FIXED_ADMIN_ID);
  
  if (userId !== FIXED_ADMIN_ID) {
    console.log(`🔧 Fixed dynamic ID → ${FIXED_ADMIN_ID}`);
  }
  
  return FIXED_ADMIN_ID;
}

async function checkAndRecoverSubscription() {
  if (!OneSignalInstance) {
    console.log('⏳ OneSignalInstance not ready, skipping recovery');
    return;
  }
  
  try {
    const userId = getCurrentUserId();
    const currentId = OneSignalInstance.User.id || 'none';
    
    if (currentId !== userId) {
      console.log(`🔄 Recover: ${currentId} → ${userId}`);
      // FIXED API compatibility
      if (OneSignalInstance.setExternalUserId) {
        await OneSignalInstance.setExternalUserId(userId);
      } else if (OneSignalInstance.login) {
        await OneSignalInstance.login(userId).catch(e => console.warn('Recovery login:', e));
      }
      
      // Ensure subscribed + notify server
      const state = await OneSignalInstance.User.PushSubscription.state;
      if (state !== 'Subscribed' && state !== 'OptedIn') {
        await OneSignalInstance.User.PushSubscription.optIn();
      }
      
      localStorage.setItem('onesignal_user_id', userId);
      console.log('✅ Synced & SUBSCRIBED:', userId);
    } else {
      console.log('✅ Already synced:', userId);
    }
  } catch (e) {
    console.error('Recovery failed:', e);
  }
}

function setupExternalIdListener() {
  if (!OneSignalInstance) return;
  
  OneSignalInstance.User.PushSubscription.addEventListener('stateChange', async () => {
    const userId = getCurrentUserId();
    if (OneSignalInstance.User.id !== userId) {
      await OneSignalInstance.login(userId);
    }
  });
}

function isAdminPage() {
  return window.location.pathname.includes('admin') || document.title.toLowerCase().includes('admin');
}

async function getSubscriptionStatus() {
  if (!OneSignalInstance) return { ready: false };
  try {
    const permission = await OneSignalInstance.Notifications.permission;
    const state = await OneSignalInstance.User.PushSubscription.state;
    const subscribed = state === 'Subscribed' || state === 'OptedIn';
    return {
      ready: true,
      permission,
      subscribed,
      state,
      userId: OneSignalInstance.User.id || localStorage.getItem('onesignal_user_id') || 'none'
    };
  } catch (e) {
    return { ready: false, error: e.message };
  }
}

async function updateNotificationUI() {
  // Switch removed - no UI updates needed
  console.log('🔔 OneSignal status:', await getSubscriptionStatus());
}

async function requestNotificationPermission() {
  try {
    const permission = await OneSignalInstance.Notifications.requestPermission();
    if (permission === 'granted') {
      await OneSignalInstance.User.PushSubscription.optIn();
      updateNotificationUI();
    }
  } catch (e) {
    console.error(e);
  }
}

async function unsubscribeNotifications() {
  try {
    await OneSignalInstance.User.PushSubscription.optOut();
    updateNotificationUI();
  } catch (e) {
    console.error(e);
  }
}

// Auto-start + persistence listeners (with guard)
let initPromise = null;
async function safeInitOneSignal() {
  if (initPromise) return initPromise; // Prevent multiple inits
  initPromise = initOneSignal();
  return initPromise;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInitOneSignal);
} else {
  safeInitOneSignal();
}

// Tab/activity recovery
window.addEventListener('focus', checkAndRecoverSubscription);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkAndRecoverSubscription();
});

// Global API
window.OneSignalInit = {
  initOneSignal,
  getSubscriptionStatus,
  checkAndRecoverSubscription,
  getCurrentUserId,
  updateNotificationUI
};

console.log('🔔 OneSignal v16 Fixed loaded');
