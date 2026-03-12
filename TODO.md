# Fix 500 Error on Admin Product Form ✅

## Plan Steps (Completed)

### 1. ✅ Create TODO.md
### 2. ✅ Edit app.js - Multer fix
   - POST /productos: `upload.single('imagenes')` → `upload.array('imagenes', 6)`
   - PUT /productos/:id: `single` → `array('imagenes', 6)`
   - POST: `if (req.files && req.files.length > 0)` → loop insert ProductoImagenes
   - PUT: DELETE old images → loop insert new `req.files`

### 3. 🧪 Test locally
   ```
   node app.js
   ```
   Open http://localhost:3000/admin.html → Submit form (try with/without images)

### 4. 🔍 Verify DB/.env
   - Ensure .env DB vars match deployed config
   - Check Cloudinary uploads + ProductoImagenes inserts

### 5. 🚀 Deploy to Render
   ```
   git add . && git commit -m "Fix 500: multer multiple images" && git push
   ```

**Next: Run `node app.js` to test the fix!**


