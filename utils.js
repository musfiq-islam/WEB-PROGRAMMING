// utils.js — small shared helpers (no dependencies).

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  if (isNaN(d)) return isoDate;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function timeAgo(isoDateTime) {
  if (!isoDateTime) return "";
  const then = new Date(isoDateTime.replace(" ", "T") + "Z");
  const diffMs = Date.now() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Kept for compatibility with older markup; decorative emoji icons were removed.
function vehicleIcon() {
  return "";
}

/** Avatar circle showing the user's initials. */
function avatarHtml(user, extraStyle) {
  const style = extraStyle ? ` style="${extraStyle}"` : "";
  const initials = (user && (user.avatar_initials || (user.name || "U").slice(0, 2).toUpperCase())) || "U";
  return `<span class="avatar-chip"${style}>${escapeHtml(initials)}</span>`;
}

// ---------- Password show/hide (eye icon) ----------
const EYE_OPEN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function enhancePasswordFields(root) {
  (root || document).querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.dataset.eye) return;
    input.dataset.eye = "1";
    const wrap = document.createElement("div");
    wrap.className = "password-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "password-toggle";
    btn.setAttribute("aria-label", "Show password");
    btn.innerHTML = EYE_OPEN;
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.innerHTML = show ? EYE_OFF : EYE_OPEN;
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
    wrap.appendChild(btn);
  });
}

// ---------- Phone: exactly 11 digits ----------
function enforcePhoneFields(root) {
  (root || document).querySelectorAll('input[type="tel"]').forEach((input) => {
    if (input.dataset.phone) return;
    input.dataset.phone = "1";
    input.maxLength = 11;
    input.minLength = 11;
    input.pattern = "[0-9]{11}";
    input.inputMode = "numeric";
    input.placeholder = input.placeholder || "01XXXXXXXXX";
    input.title = "Phone number must be exactly 11 digits";
    input.addEventListener("input", () => {
      const clean = input.value.replace(/\D/g, "").slice(0, 11);
      if (clean !== input.value) input.value = clean;
    });
    input.value = input.value.replace(/\D/g, "").slice(0, 11);
  });
}

function enhanceForms(root) {
  enhancePasswordFields(root);
  enforcePhoneFields(root);
}
document.addEventListener("DOMContentLoaded", () => enhanceForms());

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Simple toast notifications. Requires a <div id="toast-root"></div> on the page
// (nav.js inserts one automatically).
function showToast(message, type = "info") {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    root.className = "toast-container";
    document.body.appendChild(root);
  }
  const el = document.createElement("div");
  el.className = `alert alert-${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setFormError(container, message) {
  container.innerHTML = message ? `<div class="alert alert-error">${escapeHtml(message)}</div>` : "";
}
