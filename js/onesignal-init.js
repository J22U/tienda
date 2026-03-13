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
        
// 🆕 PERSISTENCE FIX: Sync externalId with admin_logged state\n        OneSignalDeferred.push(async function(OneSignal) {\n            const adminLogueado = localStorage.getItem('admin_logged') === 'true';\n            const externalId = await OneSignal.User.getExternalId();\n\n            if (adminLogueado) {\n                if (externalId !== "admin_trebol") {\n                    await OneSignal.login("admin_trebol");\n                    await OneSignal.User.PushSubscription.optIn();\n                    console.log("✅ OneSignal: Identidad admin_trebol vinculada automáticamente");\n                }\n            } else {\n                if (externalId === "admin_trebol") {\n                    await OneSignal.logout();\n                    console.log("🔓 OneSignal: Sesión inactiva, identidad removida");\n                }\n            }\n        });\n        \n        // 🔄 REINFORCEMENT: Additional identity sync at end of init (per task)\n        OneSignal.push(async function() {\n            const adminLogueado = localStorage.getItem('admin_logged') === 'true';\n            const currentId = await OneSignal.User.getExternalId();\n\n            if (adminLogueado) {\n                // Si la sesión de Trébol está activa pero OneSignal no te reconoce\n                if (currentId !== "admin_trebol") {\n                    await OneSignal.login("admin_trebol");\n                    await OneSignal.User.PushSubscription.optIn();\n                    console.log("✅ Identidad 'admin_trebol' sincronizada con éxito");\n                }\n            } else {\n                // Seguridad: Si no hay sesión, borramos el rastro\n                if (currentId === "admin_trebol") {\n                    await OneSignal.logout();\n                }\n            }\n        });\n        \n        resolve(OneSignal);
        
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
async function initAdminNotificationToggle() {
  const toggle = document.getElementById('toggle-notificaciones');
  const statusEl = document.getElementById('toggle-status');
  if (!toggle || !isAdminPage()) return;

// PWA PERSISTENT: IndexedDB + localStorage fallback
  async function getToggleState() {
    try {
      // Try IndexedDB first (PWA persistent)
      const dbReq = indexedDB.open('OneSignalTrebol', 1);
      return new Promise((resolve) => {
        dbReq.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction(['toggle'], 'readonly');
          const store = tx.objectStore('toggle');
          const req = store.get('admin_notifications');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        };
        dbReq.onerror = () => resolve(null);
        dbReq.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('toggle')) {
            db.createObjectStore('toggle');
          }
          resolve(null);
        };
      });
    } catch (e) {
      console.warn('IndexedDB failed:', e);
      return localStorage.getItem('admin_notifications_enabled');
    }
  }

  let savedState = await getToggleState();
  if (savedState === null) {
    savedState = 'false';
    // MISSING: setToggleState('false'); - define or use localStorage.setItem
    localStorage.setItem('admin_notifications_enabled', 'false');
  }
  toggle.checked = savedState === 'true';
  updateToggleUI(savedState);

  toggle.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    // MISSING: await setToggleState(enabled.toString()); - define or use localStorage.setItem
    localStorage.setItem('admin_notifications_enabled', enabled.toString());
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
  
  const savedUserId = localStorage.getItem('onesignal_user_id') || 'admin_trebol';
  const toggleEnabled = localStorage.getItem('admin_notifications_enabled') === 'true';
  const adminLogged = localStorage.getItem('admin_logged') === 'true';
  const savedState = localStorage.getItem('onesignal_subscription_state');
  
  console.log('🔍 Recovery check:', { savedUserId, toggleEnabled, adminLogged });
  
  // 🆕 FORCE PERSISTENCE: If admin session active + toggle on, FORCE login regardless of current state
  if ((adminLogged || toggleEnabled) && OneSignalInstance && savedUserId === 'admin_trebol') {
    try {
      const currentId = await OneSignalInstance.User.getExternalId();
      console.log('Current externalId:', currentId);
      
      if (currentId !== 'admin_trebol') {
        console.log('🔧 FORCE: Setting admin_trebol externalId');\n        await OneSignalInstance.login('admin_trebol');  // login() sets externalId\n        // 🔒 TASK STEP 2: Anchor permission (survives app close/tab change)\n        await OneSignalInstance.User.PushSubscription.optIn();
        localStorage.setItem('onesignal_user_id', 'admin_trebol');
        localStorage.setItem('onesignal_admin_id', 'admin_trebol');
        
        // Trigger status update
        await getSubscriptionStatus();
        updateNotificationUI();
        console.log('✅ Forced admin_trebol identity - Persistence OK');
      } else {
        console.log('✅ externalId already admin_trebol - No action needed');
      }
    } catch (e) {
      console.error('Recovery failed:', e);
    }
  } else {
    console.log('⏭️ Skip recovery: No admin session/toggle');
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

// 🆕 ENHANCED PERSISTENCE: window.onload for PWA/reloads + 30s heartbeat
window.addEventListener('load', async () => {
  console.log('🌐 window.onload - OneSignal persistence check');
  await checkAndRecoverSubscription();
});

// 30s heartbeat: Intelligent re-attach if ID lost (user-approved suggestion)
let persistenceInterval = null;
function startPersistenceHeartbeat() {
  if (persistenceInterval) clearInterval(persistenceInterval);
  
  persistenceInterval = setInterval(async () => {
    if (!OneSignalInstance || !isAdminPage()) return;
    
    const adminLogged = localStorage.getItem('admin_logged') === 'true';
    const toggleEnabled = localStorage.getItem('admin_notifications_enabled') === 'true';
    
    if (adminLogged && toggleEnabled) {
      try {
        const currentId = await OneSignalInstance.User.getExternalId();
        if (currentId !== 'admin_trebol') {
          console.log('🔄 Heartbeat: Re-anclando admin_trebol...');
          await OneSignalInstance.login('admin_trebol');
          await OneSignalInstance.User.PushSubscription.optIn();
          localStorage.setItem('onesignal_user_id', 'admin_trebol');
        }
      } catch (e) {
        console.warn('Heartbeat check failed:', e);
      }
    }
  }, 30000); // 30s
}

// 🆕 PERSISTENCE ENHANCEMENTS: beforeunload + IndexedDB
window.addEventListener('beforeunload', saveExternalIdToIDB);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await initOneSignal();
    await loadExternalIdFromIDB();  // 🆕 Load persisted ID
    initAdminNotificationToggle();
    await checkAndRecoverSubscription();
    startPersistenceHeartbeat();
  });
} else {
  initOneSignal();
  loadExternalIdFromIDB();
  initAdminNotificationToggle();
  checkAndRecoverSubscription();
  startPersistenceHeartbeat();
}

// 🆕 IndexedDB for ExternalId (survives app close)
const IDB_NAME = 'OneSignalTrebol';
const IDB_STORE = 'externalId';
const IDB_VERSION = 2;

async function initIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
  });
}

async function saveExternalIdToIDB() {
  if (!OneSignalInstance || !isAdminPage()) return;
  try {
    const db = await initIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const currentId = await OneSignalInstance.User.getExternalId();
    if (currentId === 'admin_trebol') {
      await store.put({ id: 'admin_trebol', timestamp: Date.now() }, 'admin');
      console.log('💾 ExternalId saved to IndexedDB');
    }
  } catch (e) {
    console.warn('IDB save failed:', e);
  }
}

async function loadExternalIdFromIDB() {
  try {
    const db = await initIDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const persisted = await store.get('admin');
    if (persisted && persisted.id === 'admin_trebol') {
      console.log('💾 Restored externalId from IndexedDB');
      if (OneSignalInstance) {
        await OneSignalInstance.login('admin_trebol');
        await OneSignalInstance.User.PushSubscription.optIn();
      }
    }
  } catch (e) {
    console.warn('IDB load failed:', e);
  }
}

// 🆕 Test notification (admin only)
async function testAdminNotification() {
  if (!OneSignalInstance || !isAdminPage()) {
    console.error('❌ Test failed: OneSignal not ready or not admin page');
    return false;
  }
  
  try {
    const status = await getSubscriptionStatus();
    if (status.externalId !== 'admin_trebol') {
      console.error('❌ Test failed: Not subscribed as admin_trebol');
      return false;
    }
    
    // Send test via REST API (same as server)
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY || 'YOUR_KEY'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: ['admin_trebol'],
        headings: { 'es': '🧪 TEST - Admin Notification' },
        contents: { 'es': 'Persistence test successful! 🎉' }
      })
    });
    
    if (response.ok) {
      console.log('✅ Test notification sent!');
      return true;
    } else {
      console.error('❌ Test API failed:', await response.text());
      return false;
    }
  } catch (e) {
    console.error('❌ Test error:', e);
    return false;
  }
}


// Export enhanced API
window.OneSignalInit = { 
  initOneSignal, 
  updateNotificationUI, 
  requestNotificationPermission, 
  unsubscribeNotifications, 
  getSubscriptionStatus,
  isAdminPage,
  checkAndRecoverSubscription,
  setupExternalIdListener,
  testAdminNotification  // 🆕 Manual test
};

window.OneSignalTest = {
  testAdminNotification,
  forceRecovery: checkAndRecoverSubscription
};

window.initOneSignal = initOneSignal;

