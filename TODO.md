# OneSignal Notification Fix - TODO

✅ 1. Create .env template with OneSignal config instructions
✅ 2. Update app.js: Use .env variables, add key validation, better error logging

## [ ] 3. Add REST API Key to .env and restart server
## [ ] 4. Test new order notification
## [ ] 5. Complete task

**Instructions:**
1. Go to OneSignal Dashboard → Settings → Keys & IDs
2. Copy **REST API Key** (starts with N-...)
3. Edit `.env`: Replace `YOUR_REST_API_KEY_HERE` 
4. Restart server: Ctrl+C then `node app.js`
5. Test: Create new order from tienda.html → check console for ✅ OneSignal response

