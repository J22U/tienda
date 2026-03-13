# TODO: Modificar notificaciones para todos los admins logueados

✅ **Plan aprobado por usuario**

## Pasos del plan (breakdown):

### 1. ✅ **COMPLETADO** Editar app.js
- `include_external_user_ids: adminSessions.getActiveUserIds().length > 0 ? adminSessions.getActiveUserIds() : ["admin_trebol"]`
- Logs mejorados: recipients count + active admins

### 2. ✅ **COMPLETADO** Reiniciar servidor
```
node app.js ✅ (ejecutándose)
```

### 3. [PENDIENTE] Testing Notificaciones
- Login múltiples admins (pestañas separadas)
- Hacer pedido desde tienda.html  
- Verificar push a **TODOS** (abiertas/cerradas)

### 4. [PENDIENTE] Verificar OneSignal dashboard
- Confirmar recipients >1

**Progress: 2/4 completado** (✅ Notificaciones + ✅ Logout confirm)

**NUEVA TAREA completada: Doble verificación logout con SweetAlert2**
