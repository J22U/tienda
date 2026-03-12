# Plan de Notificaciones Push - PWA Trébol ✅ COMPLETADO

## Objetivo
Implementar notificaciones push en la PWA que aparezcan cuando la app está cerrada/cerrada.

## Estado Final:
- ✅ OneSignal SDK integrado en admin.html
- ✅ Service Worker de OneSignal presente
- ✅ Botón de activación de notificaciones en el header
- ✅ Configuración completa de OneSignal con personalización

## Implementación Realizada

### 1. admin.html - Completado
- ✅ Botón "Activar" en el header para suscripciones
- ✅ Configuración avanzada de OneSignal con:
  - Botón flotante de notificaciones
  - Mensajes personalizados en español
  - Notificación de bienvenida
  - Manejo de estados de suscripción
- ✅ Funciones JavaScript:
  - `initOneSignal()` - Inicialización
  - `solicitarPermisoNotificaciones()` - Solicitar permiso
  - `actualizarBotonNotificaciones()` - UI dinámico
  - `probarNotificacion()` - Para pruebas

## Cómo Usar

### En el Panel de Admin:
1. Abre admin.html
2. Verás el botón amarillo "🔔 Activar" en el header
3. Haz clic para activar las notificaciones
4. El botón se volverá verde "Notificaciones ON"
5. ¡Listo! Recibirás notificaciones push incluso con la app cerrada

### Para que funcione cuando la app está cerrada:
- El servidor debe enviar notificaciones push a través de la API de OneSignal
- Cuando llega un nuevo pedido, el servidor debe llamar a OneSignal

## Nota Importante
Para recibir notificaciones **cuando la app está cerrada**, necesitas configurar el servidor (https://tienda-1vps.onrender.com) para que envíe notificaciones push a través de OneSignal API cuando se cree un nuevo pedido.

