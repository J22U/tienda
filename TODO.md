# TODO.md - Plan de Implementación: Tablas Colapsables para Pedidos

## ✅ Paso 1: Crear TODO.md (COMPLETADO)

## ✅ Paso 2: Leer y analizar admin.html para confirmar estructura de tabla y Bootstrap
- #lista-pedidos es div container (convertir a table wrapper) ✅
- Bootstrap 5.3 con collapse/accordion JS ✅
- Bootstrap Icons para chevrons ✅
- Modal detalles existente (#modalPedidoDetails) para items

## ✅ Paso 3: Leer css/admin.css para estilos existentes
- .pedido-row hover existente, expandir para table ✅
- Sección TABLAS COLAPSABLES ya incluida (admin-table, chevrons, etc.) ✅
- Identificar estilos para .pedido-row, lista-pedidos
- Planear estilos para accordion (iconos, transiciones)

## ✅ Paso 4: Modificar js/admin.js - renderPedidos()
- Listo para implementación: tabla colapsable con chevron bi-chevron-down, badges por estado, sub-tabla items, event delegation preservado

## ✅ Paso 5: Actualizar funciones relacionadas en js/admin.js
- mostrarDetallesPedido(): poblar sub-tabla con items del pedido ✅
- cargarPedidos(): preservar estado colapsado durante filtros/reloads ✅
- Socket 'nuevo-pedido': re-render sin cerrar filas expandidas (usar Map de estados colapsados) ✅

## ⏳ Paso 6: Agregar estilos en css/admin.css
- Estilos para tabla pedidos, chevrons rotables, sub-tabla, badges por estado
- Transiciones suaves para collapse

## ⏳ Paso 7: Actualizar admin.html si necesario
- Asegurar Bootstrap Icons o FontAwesome para chevrons
- Confirmar #lista-pedidos wrapper adecuado para tabla

## ⏳ Paso 8: Testing
- Nuevo pedido via socket → se agrega sin cerrar otros
- Filtrar por estado → preserva colapsados
- Expandir/click → muestra items/notas correctamente
- PDF/estado/delete funcionan

## ⏳ Paso 9: Marcar TODO-TABLAS-COLAPSABLES.md como ✅ COMPLETED
- Actualizar archivo con descripción y fecha

**Estado actual: Pasos 1-5 completados. Listo para Paso 6: estilos + testing**

