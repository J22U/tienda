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
    // 🔄 AUTO-RECOVERY: Re-check subscription status
    checkAndRecoverSubscription();
    return OneSignalInstance;
  }

  return new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    OneSignalDeferred.push(async function(OneSignal) {
      try {
        OneSignalInstance = OneSignal;
        
        // 🔄 ENHANCED: Always check/recover admin subscription FIRST
        await checkAndRecoverSubscription();
        
        // ✅ CRITICAL: Set External ID IMMEDIATELY after init (toggle-aware)
        setupExternalIdListener();
        
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: './OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          notifyButton: {
            enable: false,
            size: 'medium',
            position: 'bottom-right',
            showCredit: false
          },
          welcomeNotification: {
            disable: true
          },
          promptOptions: {
            slidedown: {
              enabled: false,
              autoPrompt: false,
              timeDelay: 10000,
              pageViews: 1
            }
          }
        });

        OneSignalInitialized = true;
        console.log('✅ OneSignal v16 initialized:', OneSignal);
        
        // 🎯 DIAGNOSTICS: Log subscription status
        getSubscriptionStatus().then(status => {
          console.log('📊 OneSignal Status:', status);
          if (status.externalId === 'admin_trebol') {
            console.log('🎉 Admin subscription ready for server notifications');
          }
        });

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('stateChange', (event) => {
          console.log('📱 Push subscription changed:', event);
          getSubscriptionStatus().then(updateNotificationUI);
          localStorage.setItem('onesignal_subscription_state', JSON.stringify(event));
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
async function updateNotificationUI(retryCount = 0) {
  // ✅ DISABLED FOR CLIENTS: Only admin pages show UI
  if (!isAdminPage()) {
    console.log('🔇 Non-admin page: Skipping notification UI');
    return;
  }

  const statusBtn = document.getElementById('btn-onesignal-status');
  if (!statusBtn) return;

  if (!OneSignalInstance) {
    if (retryCount < 10) {
      console.log(`OneSignal UI update retry ${retryCount + 1}/10...`);
      setTimeout(() => updateNotificationUI(retryCount + 1), 500);
    }
    return;
  }

  try {
    const permission = await OneSignalInstance.Notifications.permission;
    const subscription = await OneSignalInstance.User.PushSubscription.optInStatus();

    if (permission === 'granted' && subscription === 1) {
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
    console.log('🔔 Notification UI updated');
  } catch (e) {
    console.log('UI update error:', e);
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


// 🆕 UTILITY FUNCTIONS

/**
 * Detect if current page is admin panel
 */
function isAdminPage() {
  return window.location.pathname.includes('admin.html') || 
         document.title.toLowerCase().includes('admin');
}

/**
 * Get complete subscription status + diagnostics
 */
async function getSubscriptionStatus() {
  if (!OneSignalInstance) {
    return { ready: false, permission: 'unknown', subscribed: false, externalId: null };
  }
  
  try {
    const permission = await OneSignalInstance.Notifications.permission;
    const subStatus = await OneSignalInstance.User.PushSubscription.optInStatus();
    const userId = OneSignalInstance.User.Id;
    const externalId = localStorage.getItem('onesignal_admin_id');
    
    const status = {
      ready: true,
      permission,
      subscribed: subStatus === 1,
      userId: userId || 'unknown',
      externalId: externalId || 'not_set',
      needsAdminPrompt: isAdminPage() && subStatus !== 1 && permission !== 'denied'
    };
    
    console.log('🔍 OneSignal Status:', status);
    return status;
  } catch (e) {
    console.error('Status check failed:', e);
    return { ready: false, error: e.message };
  }
}

/**
 * Force admin subscription prompt (for admin.html)
 */
async function showAdminPrompt() {
  const status = await getSubscriptionStatus();
  if (status.needsAdminPrompt) {
    console.log('🔔 Auto-prompting admin subscription...');
    await requestNotificationPermission();
  }
}

// 🔔 ADMIN TOGGLE SUPPORT
function initAdminNotificationToggle() {
  const toggle = document.getElementById('toggle-notificaciones');
  const statusEl = document.getElementById('toggle-status');
  if (!toggle || !isAdminPage()) return;

  // Load saved state (default OFF until user enables)
  let savedState = localStorage.getItem('admin_notifications_enabled');
  if (savedState === null) {
    savedState = 'false';
    localStorage.setItem('admin_notifications_enabled', 'false');
  }
  toggle.checked = savedState;
  updateToggleUI(savedState);

    toggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('admin_notifications_enabled', enabled);
    updateToggleUI(enabled);
    
    if (OneSignalInstance) {
      // 🔥 FIXED: Always setExternalUserId when ON (even if not subscribed)
      if (enabled) {
        await OneSignalInstance.login("admin_trebol");
        await OneSignalInstance.User.PushSubscription.optIn();
        console.log('🔑 Admin notifications ENABLED + External ID set');
        // Trigger recovery check
        await checkAndRecoverSubscription();
      } else {
        await OneSignalInstance.logout();
        await OneSignalInstance.removeExternalUserId();
        console.log('🔓 Admin notifications DISABLED - logged out');
      }
    }
  });

  // 🔄 Initial sync on load
  if (savedState && OneSignalInstance) {
    setTimeout(async () => {
      await OneSignalInstance.setExternalUserId("admin_trebol");
      console.log('🔄 Toggle sync: External ID restored on load');
    }, 1000);
  }
}

function updateToggleUI(enabled) {
  const toggle = document.getElementById('toggle-notificaciones');
  const label = document.querySelector('label[for="toggle-notificaciones"]');
  const statusEl = document.getElementById('toggle-status');
  
  if (enabled) {
    toggle.nextElementSibling.classList.add('text-success');
    toggle.nextElementSibling.classList.remove('text-danger');
    statusEl.textContent = 'ACTIVAS';
    statusEl.className = 'text-success fw-bold';
  } else {
    toggle.nextElementSibling.classList.add('text-danger');
    toggle.nextElementSibling.classList.remove('text-success');
    statusEl.textContent = 'DESACTIVADAS';
    statusEl.className = 'text-danger fw-bold';
  }
}

// 🔥 NEW UTILITIES: Auto-recovery + persistent external ID

/**
 * Check LS state and auto-recover broken subscriptions
 */
async function checkAndRecoverSubscription() {
  if (!isAdminPage()) return;
  
  // ✅ PERSISTENTE: Estado guardado sobrevive cerrar pestaña/app
  const savedUserId = localStorage.getItem('onesignal_user_id') || 'admin_trebol';
  const toggleEnabled = localStorage.getItem('admin_notifications_enabled') === 'true'; // Exact match
  const savedState = localStorage.getItem('onesignal_subscription_state');
  
  console.log('🔍 Recovery:', { savedUserId, toggleEnabled, savedState: savedState ? 'exists' : 'none' });
  
  if (toggleEnabled && OneSignalInstance && savedUserId) {
    // Restaurar external ID (persiste cross-session)
    await OneSignalInstance.setExternalUserId(savedUserId);
    localStorage.setItem('onesignal_admin_id', savedUserId);
    
    // Auto-subscribe si estaba activo antes
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.isSubscribed) {
          console.log('🔄 Restaurando suscripción previa...');
          await OneSignalInstance.User.PushSubscription.optIn();
        }
      } catch (e) {
        console.warn('Saved state invalid:', e);
      }
    }
    
    console.log(`🔑 External ID persistente: ${savedUserId} ✅`);
    updateNotificationUI();
  }
}

/**
 * Listen for subscription changes → always re-attach external ID if toggle ON
 */
function setupExternalIdListener() {
  if (!OneSignalInstance || !isAdminPage()) return;
  
  // Listen for subscription changes
  OneSignalInstance.User.PushSubscription.addEventListener('stateChange', async (event) => {
    console.log('📱 Push subscription changed:', event);
    
    // Always re-attach external ID when subscribed AND toggle enabled
    const toggleEnabled = localStorage.getItem('admin_notifications_enabled') !== 'false';
    if (event.isSubscribed && toggleEnabled && isAdminPage()) {
      await OneSignalInstance.setExternalUserId("admin_trebol");
      console.log('🔄 Re-attached external ID on subscription change');
    }
    
    await getSubscriptionStatus().then(updateNotificationUI);
    localStorage.setItem('onesignal_subscription_state', JSON.stringify(event));
  });
  
  console.log('🔗 External ID listener active');
}

// Auto-init + enhanced toggle
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await initOneSignal();
    initAdminNotificationToggle();
    await checkAndRecoverSubscription(); // 🔄 Recovery on load
  });
} else {
  initOneSignal();
  initAdminNotificationToggle();
  checkAndRecoverSubscription();
}

// Export enhanced API
window.OneSignalInit = { 
  initOneSignal, 
  updateNotificationUI, 
  requestNotificationPermission, 
  unsubscribeNotifications, 
  getSubscriptionStatus,
  isAdminPage,
  checkAndRecoverSubscription,  // 🆕 Recovery
  setupExternalIdListener       // 🆕 Listener
};

window.initOneSignal = initOneSignal;
