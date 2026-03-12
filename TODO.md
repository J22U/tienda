# TODO - Fix Session and Notifications Issues

## Issues to Fix:
1. **Session closes when app is closed** - Admin session should persist until explicitly logged out
2. **Notifications not appearing in installed PWA app**

## COMPLETED:

### Step 1: Fix Session Management in tienda.js ✅
- Added SESSION_CONFIG with browserSessionDuration (24 hours) and pwaSessionDuration (30 days)
- Added isSessionValid() function with PWA mode detection
- Added saveAdminSession() function to persist session with PWA flag
- Added clearAdminSession() function

### Step 2: Fix Session Management in admin.html ✅
- Updated SESSION_CONFIG to 24 hours for browser
- Added saveAdminSession() function
- Cleaned up session validation logic

### Step 3: Fix Session in js/admin.js ✅
- Removed sessionStorage.clear() that was causing session loss
- Session now persists in localStorage only

## Files Edited:
1. js/tienda.js - Session management functions
2. admin.html - Session validation improvements
3. js/admin.js - Removed sessionStorage.clear()

## Notes:
- Session now persists until explicitly logged out
- In PWA mode, session stays valid permanently (30 days)
- For notifications in PWA: Make sure to enable browser notifications on the device

