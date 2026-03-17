# Restaurar Logo y QR en Facturas PDF

**Estado:** En progreso ✅

## Pasos del plan:

- [x] 1. Crear TODO.md con pasos (hecho)
- [x] 2. Editar app.js/server.js - Fix CSP imgSrc para uploads local ✅
- [x] 3. Editar js/admin.js - Restaurar addImage logo/QR + ajustar layout ✅
- [x] 4. Reiniciar servidor ejecutado ✅
- [x] 5. js/admin.js actualizado con logo/QR ✅ 
- [x] 6. Task completada ✅

**¡Listo!** Las imágenes del logo (`uploads/logo-trebol.png`) y QR (`uploads/qr-contacto.png`) ahora aparecerán en las facturas PDF generadas desde admin.html → botón Factura.

**Cambios realizados:**
* CSP arreglado en app.js (imgSrc incluye localhost/uploads)
* js/admin.js: `doc.addImage()` para logo (20,12,35x18) + QR (165,12,25x25) con fallback texto
* Layout ajustado para nuevas posiciones

**Para probar:** Abre admin.html, selecciona pedido → Factura → PDF tendrá logo/QR ✅

**Archivos afectados:** server.js, js/admin.js
**Motivo:** CSP bloqueaba images local → removidas del PDF
