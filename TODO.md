# Plan: Añadir confirmación de eliminación de pedido

## Información recopilada:
- El botón "ELIMINAR" para pedidos está en la línea ~450 dentro de la función `cargarPedidos()` en `js/admin.js`
- La función `eliminarPedido(id)` está en las líneas ~535-550 y actualmente NO tiene ninguna confirmación
- Ya existe un buen ejemplo de confirmación usando `Swal.fire` en la función `eliminarProducto(id)`

## Plan de edición:

### 1. Modificar la función `eliminarPedido` en `js/admin.js`
- Añadir una confirmación usando `Swal.fire` (igual que en `eliminarProducto`)
- Mostrar mensaje: "¿Estás seguro de eliminar este pedido?"
- Incluir icono de advertencia (warning)
- Solo proceder con la eliminación si el usuario confirma

### Cambios específicos:
```javascript
async function eliminarPedido(id) {
    // Añadir confirmación antes de eliminar
    const result = await Swal.fire({
        title: '¿Eliminar pedido?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff7675',
        cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    
    // ... resto del código existente
}
```

## Archivos a editar:
1. `js/admin.js` - Función `eliminarPedido`

## Pasos siguientes:
1. Editar el archivo `js/admin.js` para añadir la confirmación
2. Probar que funciona correctamente

