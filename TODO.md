# TODO: Remover botón/prompts de notificaciones - Solo admin recibe

✅ **Plan aprobado por usuario** - Procediendo paso a paso...

## Pasos del plan (secuencial):

### **Paso 1: Editar js/onesignal-init.js** ✅ **COMPLETADO**
- ✅ Deshabilitar `notifyButton: enable: false`
- ✅ Deshabilitar `promptOptions.slidedown: enabled: false, autoPrompt: false`
- ✅ Condicionar `updateNotificationUI()` solo para admin pages (`if (!isAdminPage()) return;`)
- ✅ Mantener `showAdminPrompt()` para admin.html

### **Paso 2: Editar admin.html** ✅ **COMPLETADO**
- ✅ Remover `<button id="btn-onesignal-status">` completo
- ✅ Agregado comentario: `<!-- Status: Admin auto-subscribed via js/onesignal-init.js -->`

### **Paso 3: Verificar tienda.html** ✅ **COMPLETADO**
- ✅ NO hay botones custom de notificaciones
- ✅ Hereda cambios de onesignal-init.js (notifyButton+prompts disabled)

### **Paso 4: FEEDBACK - Agregar Toggle Switch** ✅ **EN PROCESO**
**Usuario pidió:** Toggle/interruptor en admin para habilitar/deshabiltitar notificaciones

**Plan toggle:**
```
1. Agregar toggle switch en admin.html header
2. Toggle → setExternalUserId("admin_trebol") ON / removeExternalUserId() OFF
3. Guardar estado en localStorage
4. Load → restore toggle + setExternalUserId accordingly
5. Update UI + console logs
```

### **Paso 5: TESTING** [PENDIENTE]

**Estado actual:** ✅ **TODOS LOS ARCHIVOS EDITADOS** → Listo para testing
```
1. Abrir tienda.html → NO debe aparecer bell button ni slidedown prompt
2. Login admin → admin.html auto-subscribe silently (check console)
3. Hacer pedido desde tienda → Admin recibe push via OneSignal
4. OneSignal dashboard → Solo "admin_trebol" subscribed
```

### **Paso 5: COMPLETAR** [PENDIENTE]
- `attempt_completion`

**Estado actual:** Creando TODO.md → Listo para Paso 1
