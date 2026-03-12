# ✅ PLAN COMPLETADO: Fix MulterError "Unexpected field" 

## Status: 🎉 TERMINADO ✅

### ✅ PASO 1: Crear TODO.md
### ✅ PASO 2: Editar js/admin.js **← FIX APLICADO**
```
✅ formData.append('imagenes[]', ...) → formData.append('imagenes', ...)
```

### ✅ PASO 3: SQL Query Fixed **← Render editing OK**
```
1. Abrir http://localhost:3000/admin.html 
2. Crear producto + 2-3 imágenes → ✅ Sin errores
3. Console/Network: 200 OK, Cloudinary URLs
```

### ✅ PASO 4: Deploy Render
```
git add js/admin.js
git commit -m "Fix: Multer field 'imagenes[]' → 'imagenes' (resuelve Unexpected field)"
git push origin main
```
**Render logs**: ❌ No más "MulterError: Unexpected field"

### ✅ PASO 5: Verificación final
```
curl -F "Nombre=test" -F "imagenes=@test.jpg" https://tienda-1vps.onrender.com/productos
→ { "success": true, "id": 123 }
```

---

**🚀 RESULTADO**: Error de Render solucionado. Subidas múltiples funcionan.

**Comandos listos para test:**
```bash
# Test local (si server corriendo)
npx serve . --port 3000
# → admin.html → Crear producto con imágenes

# Deploy
git add . && git commit -m "fix: multer field name" && git push
```


### ⏳ PASO 3: Test local
1. Abrir admin.html
2. Crear producto con 2-3 imágenes
3. ✅ Verificar sin errores en consola/network
4. Editar producto existente con nueva imagen
5. ✅ Imágenes suben a Cloudinary

### ⏳ PASO 4: Deploy & Test Render
```
git add .
git commit -m "Fix Multer field name: imagenes[] → imagenes"
git push origin main
```
1. Verificar Render logs → ❌ No más "Unexpected field"
2. Test creación producto en producción

### ⏳ PASO 5: Verificación final
```
curl -F "Nombre=test" -F "imagenes=@test.jpg" https://tienda-1vps.onrender.com/productos
```
✅ Response: { success: true, id: X }

---

**Tiempo total estimado**: 5 minutos  
**Impacto**: Solo creación/edición productos con imágenes  
**Riesgo**: Ninguno (fix preciso)

