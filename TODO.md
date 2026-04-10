# Ferreteria Admin - Fix Pedido Details (Número + Correo)

**Task**: Asegurar que:
1. Número del pedido en detalles = Número visual en lista (NumeroDisplay)
2. Correo del cliente SIEMPRE visible en detalles expandidos

## ✅ PLAN APROBADO (Solo js/admin.js)

### Pasos:

#### 1. [PENDIENTE] ✅ Editar js/admin.js
```
- renderPedidos(): Ya OK - cards usan NumeroDisplay
- mostrarDetallesPedido(id, numeroVisual): Pasar numeroVisual AL populatePedidoDetails
- populatePedidoDetails(id, numeroVisual): 
  * Recibir numeroVisual
  * Mostrar "#${numeroVisual}" en header
  * ✅ MOSTRAR CORREO: Verificar p.Correo existe → mostrar siempre
  * Si !p.Correo → mostrar 'Sin correo registrado'
```

#### 2. [PENDIENTE] 🔄 Test Local
```
cd c:/Users/johnr/Ferreteria
# Asegurar servidor corriendo
node app.js  (o npm start)
Abrir http://localhost:3000/admin.html → Pestaña Pedidos
→ Expandir pedidos → verificar:
  ✓ Número = el mismo de la lista  
  ✓ Correo visible (incluso si vacío)
```

#### 3. [PENDIENTE] 🎉 Completar
```
attempt_completion()
```

**Estado**: Listo para editar js/admin.js → test → ✅ DONE

