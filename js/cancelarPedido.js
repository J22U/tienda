// Función cancelarPedido - CSP-safe (window scope)
window.cancelarPedido = async function(id) {
    const result = await Swal.fire({
        title: '¿Cancelar pedido?',
        html: 'Se restaurará el stock de productos automáticamente.<br><strong>Esta acción no se puede deshacer.</strong>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        // Loading state
        const btn = event?.target.closest('.pedido-btn-cancelar');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        }

        const response = await fetch(`/pedidos/${id}/cancelar`, { method: 'PUT' });

        if (!response.ok) {
            const error = await response.json().catch(() => ({error: 'Error desconocido'}));
            throw new Error(error.error || 'Error del servidor');
        }

        const data = await response.json();
        Swal.fire('¡Cancelado!', data.message || 'Pedido cancelado y stock restaurado', 'success');

        // Refresh pedidos preserving states/filters
        window.cargarPedidos(true);
        
    } catch (err) {
        console.error('Error cancelarPedido:', err);
        Swal.fire('Error', err.message, 'error');
    } finally {
        // Restore button
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-x-circle"></i>';
        }
    }
};

