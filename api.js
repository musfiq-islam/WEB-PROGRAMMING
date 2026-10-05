// api.js — talks to the PHP backend under ../api/*.php.
// Authentication is a PHP session cookie (sent automatically by the
// browser on same-origin requests) rather than a bearer token.

const Api = {
  async request(method, path, body) {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const headers = isForm ? {} : { "Content-Type": "application/json" };

    let response;
    try {
      response = await fetch("../api" + path, {
        method,
        headers,
        credentials: "same-origin",
        body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
      });
    } catch (networkErr) {
      throw new Error("Could not reach the server. Is Apache/MySQL running in XAMPP?");
    }

    let data = null;
    const text = await response.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }

    if (!response.ok) {
      const message = (data && data.error) || `Request failed (${response.status})`;
      if (response.status === 401) {
        localStorage.removeItem("uiuride_user");
        if (!location.pathname.endsWith("login.html")) {
          location.href = "login.html?expired=1";
        }
      }
      throw new Error(message);
    }
    return data;
  },

  get(path) { return this.request("GET", path); },
  post(path, body) { return this.request("POST", path, body); },
  patch(path, body) { return this.request("PATCH", path, body); },
  del(path) { return this.request("DELETE", path); },
};
