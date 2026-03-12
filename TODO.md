# TODO: Insignias de Notificaciones en Icono PWA (Badges) 🚀

## 📋 Estado: COMPLETADO (8/9) ✅

**Objetivo**: Agregar badges numéricos en el icono de la app PWA mostrando cantidad de pedidos 'Pendiente' no leídos.

### Pasos del Plan

- [ ] **1. Generar icono badge-monochrome.png** *(Optional - using logo fallback)*
- ✅ **2. Actualizar manifest.json** (16x16 badge icon ✓)
- ✅ **3. Endpoint /unread-count** (Pending pedidos last 24h ✓)
- ✅ **4. sw.js** (notificationclick → admin + sync ✓)
- ✅ **5. js/admin.js** (updateBadge, completePedido hook ✓)
- ✅ **6. js/tienda.js** (updateBadge ✓)
- [ ] **9. Testing + Deploy** (Chrome/Android, Safari/iOS + Render)

**Notas**:
- Badge = número de pedidos 'Pendiente'
- Limpia badge al abrir app o marcar completado
- Soporte: Chrome 102+, Safari 16.4+
- Deploy final: Render (git push)

**Próximo paso**: Comenzar con #1 (icono)

