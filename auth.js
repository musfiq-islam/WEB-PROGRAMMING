// auth.js — registration, login, logout, and page guards.
// Real login state lives in the PHP session (cookie). We also cache
// the user object in localStorage purely so pages can render the
// right nav/role instantly without waiting on a network round trip;
// every actual permission check still happens on the server.

const Auth = {
  getUser() {
    const raw = localStorage.getItem("uiuride_user");
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user) {
    localStorage.setItem("uiuride_user", JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem("uiuride_user");
  },

  isLoggedIn() {
    return !!this.getUser();
  },

  isDriver() {
    const u = this.getUser();
    return !!u && u.role === "driver";
  },

  isRider() {
    const u = this.getUser();
    return !!u && (u.role === "student" || u.role === "faculty");
  },

  async register(payload) {
    const result = await Api.post("/auth_register.php", payload);
    this.setUser(result.user);
    return result.user;
  },

  async login(email, password) {
    const result = await Api.post("/auth_login.php", { email, password });
    this.setUser(result.user);
    return result.user;
  },

  async logout() {
    try { await Api.post("/auth_logout.php", {}); } catch (_) { /* ignore */ }
    this.clearSession();
    window.location.href = "login.html";
  },

  async refreshUser() {
    const user = await Api.get("/auth_me.php");
    this.setUser(user);
    return user;
  },

  /** Call at the top of every protected page. Redirects if not logged in,
   *  or if the page is restricted to a role the current user doesn't have. */
  requirePage({ role } = {}) {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
      throw new Error("redirecting");
    }
    const user = this.getUser();
    if (role === "driver" && user.role !== "driver") {
      window.location.href = "student-home.html";
      throw new Error("redirecting");
    }
    if (role === "rider" && user.role === "driver") {
      window.location.href = "driver-home.html";
      throw new Error("redirecting");
    }
    return user;
  },

  homeForRole(role) {
    return role === "driver" ? "driver-home.html" : "student-home.html";
  },
};
