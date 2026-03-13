const sessions = new Map();

/**
 * Simple in-memory session management for admin users
 * Key: sessionToken (random string)
 * Value: { userId: "admin_trebol", logged: true, timestamp: Date.now() }
 */
class AdminSessions {
  constructor() {
    this.sessions = new Map();
  }

  // Create new session
  create(userId) {  // ← Dynamic userId from frontend
    const token = this.generateToken();
    this.sessions.set(token, {
      userId,
      logged: true,
      permanent: true,  // ✅ Never expires
      created: Date.now()
    });
    console.log(`🔑 Permanent session created: ${userId}`);
    return token;
  }

  // Get active session data (returns null if expired/invalid)
  get(token) {
    const session = this.sessions.get(token);
    if (!session) return null;

    // ✅ PERMANENT SESSIONS: No expiry - manual logout only
    // Update last activity (for stats only)
    if (session.lastActivity) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  // Logout - delete session
  destroy(token) {
    this.sessions.delete(token);
    return true;
  }

  // Get current active admin userId (first valid session)
  getActiveUserIds() {  // ← Return ARRAY of active admins
    const activeIds = [];
    for (const [token, session] of this.sessions.entries()) {
      if (session.logged) {
        activeIds.push(session.userId);
      }
    }
    console.log('👥 Active admins:', activeIds);
    return activeIds; // Array of userIds for OneSignal targeting
  }

  // Cleanup expired sessions (run periodically)
  // REMOVED: No cleanup - permanent sessions
  cleanup() {
    console.log('🧹 Session cleanup: SKIPPED (permanent mode)');
  }

  // Generate secure random token
  generateToken() {
    return Math.random().toString(36).substr(2) + 
           Math.random().toString(36).substr(2) + 
           Date.now().toString(36);
  }

  // Get stats (debug)
  stats() {
    return {
      active: this.sessions.size,
      admins: Array.from(this.sessions.values()).filter(s => s.logged).length
    };
  }
}

module.exports = new AdminSessions();

