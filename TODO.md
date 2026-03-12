# Fix 500 Error on PUT /productos/80 - Trébol Admin

## Status: ✅ Backend Enhanced - Ready for Testing

### Completed Steps:
- [x] 1. Create TODO.md tracking progress ✅
- [x] 2. Enhance app.js with detailed logging/debug endpoints ✅
  - Separate DB pool error handling
  - Enhanced existence check with SELECT *
  - Specific SQL error logging (number/code/state/class)
  - Debug endpoints: `/debug/product/:id`, `/health`
  - Better console output for diagnosis

### Next Steps:
- [ ] 3. **Deploy to Render** (git push or Render dashboard)
- [ ] 4. Test endpoints:
  | Endpoint | Purpose | Expected |
  |----------|---------|----------|
  | `https://tienda-1vps.onrender.com/health` | DB connection | `{status: 'OK'}` |
  | `https://tienda-1vps.onrender.com/debug/product/80` | Check ID 80 | `{exists: true/false, product: {...}}` |
  | Admin PUT update | Full flow | Success without 500
- [ ] 5. Check Render **LOGS** for detailed SQL error
- [ ] 6. Fix root cause & test complete
- [ ] 7. Remove debug endpoints

**Deploy now & test the new endpoints. Share Render logs for next diagnosis!**

