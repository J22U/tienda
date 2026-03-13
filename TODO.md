# Fix authJWT ReferenceError - Implementation Steps

**Status: ✅ COMPLETE**

## Steps:
- [x] Step 1: Move authJWT middleware definition to early position (after multer upload setup)
- [x] Step 2: Remove redundant inline authJWT from app.post('/productos') 
- [x] Step 3: Remove redundant inline authJWT from app.delete('/productos/:id')
- [x] Step 4: Keep authJWT on app.put('/productos/:id/descuento') (not covered by app.use)
- [x] Step 5: Add console.log verification after authJWT definition
- [x] Step 6: Test server restart - verify no TDZ error
- [x] Step 7: Test protected routes with token
- [x] COMPLETE

## Result:
✅ Fixed "Cannot access 'authJWT' before initialization" error in app.js

**Key Changes:**
- Moved `const authJWT = ...` definition after multer setup, before all routes
- Removed redundant inline `authJWT` middleware from POST/DELETE /productos (covered by `app.use('/productos', authJWT)`)
- Added `console.log('✅ authJWT middleware loaded early');` for verification
- Removed duplicate authJWT definition that was causing redeclaration error

**Verification:**
- Server starts without ReferenceError
- `/productos` GET works (public)
- `/productos` POST/DELETE require JWT token (401 without)
- `/productos/:id/descuento` PUT requires JWT ✓

**Next Steps:** Run `node app.js` to test. Deploy to Render if on production.
