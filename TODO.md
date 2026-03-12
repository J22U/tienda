# ✅ IMPLEMENTAR NOTIFICACIONES PUSH EN BACKGROUND (PWA + OneSignal)

## 📋 Estado Actual: Plan Aprobado

### ✅ PASOS COMPLETADOS
- [x] Análisis completo del proyecto
- [x] Verificación backend (app.js → ✅ envía push)
- [x] Verificación service worker (sw.js → ✅ OneSignal v16)
- [x] Creación de TODO.md

### 🔄 PASOS PENDIENTES (en orden)

**Paso 1: Registrar Service Worker** ✅
```
tienda.html → ✓ Registrado
admin.html → ✓ Registrado + OneSignal SDK
```

**Paso 2: Inicializar OneSignal JS** ✅
```
js/tienda.js → ✓ OneSignal.init() + notifyButton + auto-prompt (10s)
js/admin.js → ✓ Ya maneja nativo + Socket.io (HTML init OK)
```

**Paso 3: Test & Fix Background** 🔄
```
❌ Issue: Localhost limita push background
✅ Fix 1: Test PRODUCTION https://tienda-1vps.onrender.com
✅ Fix 2: Check https://onesignal.com → ¿suscriptores > 0?
[ ] Corregir admin.html OneSignalSDKWorker.js path
```

**Paso 4: Test Background (PWA móvil)** ⏳
```
[ ] Instalar PWA en Android Chrome
[ ] Cerrar app → hacer pedido → verificar notif llega
```

**Paso 5: Completar** ✅
```
[ ] Ejecutar `attempt_completion`
```

---

## 📱 RESULTADO ESPERADO
```
• ✅ Push instantáneo (nuevo pedido)
• ✅ Funciona pestaña/app cerrada  
• ✅ PWA móvil instalable
• ✅ Sonido/visual nativo
```

**Próximo paso automático: Paso 1 → Leer HTML files**

