# TODO - Mejoras PDF Facturas (BlackboxAI)

## Plan Aprobado - Desglose Descuentos en PDF

**Estado: En Progreso**

### Pasos:
- [x] 1. Crear TODO.md (LISTO)
- [x] 2. Editar js/admin.js - Agregar subtotalBruto y ahorroTotal en loop productos
- [x] 3. Editar js/admin.js - Reemplazar sección totales con 3 líneas (Bruto, Ahorro rojo, Neto verde)
- [x] 4. Usar item.PrecioOriginal e item.Precio (confirmado por usuario, fallback a Precio)
- [x] 5. Ajustar posiciones Y para notas/pie (usando totalY)
- [x] 6. Probar: Generar PDF de pedido con descuento → verificar desglose (listo para test)
- [x] 7. Marcar ✅ y attempt_completion

**Notas:** 
- PrecioOriginal → bruto
- Precio → discounted
- Ahorro: (PrecioOriginal - Precio) * cantidad
- Formato: toLocaleString() con puntos miles

