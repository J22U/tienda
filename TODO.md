# TODO - Fix product image save/update

## Plan
- [x] 1. Diagnose issue: `js/admin.js` sends JSON instead of FormData, so images never reach backend Multer.
- [ ] 2. Edit `js/admin.js`:
  - Build `FormData` manually with correct field names (`Nombre`, `Marca`, `CodigoSKU`, `Precio`, `Stock`, `Caracteristicas`).
  - Append files from `#imagenes` input with field name `imagenes` (Multer expects this exact name).
  - Remove `Content-Type: application/json` header so browser sets `multipart/form-data` automatically.
  - Keep `Authorization: Bearer ...` header for JWT.
  - Change hardcoded URL to relative `/productos`.
- [ ] 3. Test: Create product with images and edit product with new images.

