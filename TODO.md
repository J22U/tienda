# TODO - Permitir ver tienda desde admin sin cerrar sesión

## Objetivo
Cuando el usuario esté en el panel de admin, pueda hacer clic en "VER TIENDA" y ver la tienda sin ser redirigido de vuelta a admin por el auto-login.

## Plan de implementación:

1. [x] Analizar el código actual (admin.html, tienda.html, js/tienda.js)
2. [x] Modificar js/tienda.js para detectar parámetro URL
3. [x] Implementar lógica para omitir auto-login cuando view=store
4. [ ] Probar la funcionalidad

## Detalles técnicos:
- admin.html pasa `?view=store` al ir a tienda.html
- tienda.js debe verificar este parámetro antes de ejecutar autoLoginIfValid()
- Si view=store está presente, omitir redirección y permitir ver la tienda

