# FIX Server Crash - adminSessions undefined

**Estado:** ✅ **Paso 1 COMPLETADO**

## Pasos del Plan (2/4):

### 1. ✅ **COMPLETADO** Editar app.js
```
✅ const adminSessions = require('./sessions'); agregado
```

### 2. **PENDIENTE** Test Local
```
npm start
```
**Esperado:** Sin ReferenceError, Socket.io listo.

### 3. **Test Endpoints** `/api/login`, socket
### 4. **Deploy Render** (git push)

**Progress: 1/4**
