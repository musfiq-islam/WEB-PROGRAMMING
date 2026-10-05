// nav.js — renders the header + bottom nav from a single source of
// truth per role, so nav markup is never duplicated across pages.

const NAV_ITEMS = {
  rider: [
    { href: "student-home.html", label: "Home" },
    { href: "find-ride.html", label: "Find Ride" },
    { href: "community.html", label: "Community" },
    { href: "my-rides.html", label: "My Rides" },
    { href: "profile.html", label: "Profile" },
  ],
  driver: [
    { href: "driver-home.html", label: "Home" },
    { href: "offer-ride.html", label: "Offer Ride" },
    { href: "community.html", label: "Proposals" },
    { href: "my-offered-rides.html", label: "My Rides" },
    { href: "profile.html", label: "Profile" },
  ],
};

const Nav = {
  render(activeHref) {
    const user = Auth.getUser();
    if (!user) return;
    const items = NAV_ITEMS[user.role === "driver" ? "driver" : "rider"];
    const currentPage = activeHref || location.pathname.split("/").pop();

    this.renderHeader(user, items, currentPage);
    this.renderBottomNav(items, currentPage);
    this.wireUserMenu();
    if (user.role !== "driver") this.loadNotificationBadge();
  },

  /** Red count on the Community link when drivers have offered rides for the rider's posts. */
  async loadNotificationBadge() {
    try {
      const { unread } = await Api.get("/notifications.php?count=1");
      if (!unread) return;
      document
        .querySelectorAll('.desktop-nav a[href="community.html"], .bottom-nav a[href="community.html"]')
        .forEach((a) => {
          const target = a.querySelector("span") || a;
          target.insertAdjacentHTML("beforeend", `<span class="nav-badge">${unread}</span>`);
        });
    } catch (err) {
      /* badge is optional — ignore */
    }
  },

  renderHeader(user, items, currentPage) {
    const header = document.getElementById("app-header");
    if (!header) return;
    const desktopLinks = items
      .map(
        (item) =>
          `<a href="${item.href}" class="${item.href === currentPage ? "active" : ""}">${item.label}</a>`
      )
      .join("");

    header.innerHTML = `
      <a href="${Auth.homeForRole(user.role)}" class="brand">
        <img class="brand-logo" src="../assets/logo-white.png" alt="UIU Ride">
      </a>
      <nav class="desktop-nav">${desktopLinks}</nav>
      <div class="header-actions">
        <div class="header-user" id="user-menu-trigger" style="cursor:pointer; position:relative;">
          ${avatarHtml(user)}
          <span class="visually-hidden">Account menu</span>
          <div id="user-menu" style="display:none; position:absolute; top:44px; right:0; background:#fff; color:#0f172a; border-radius:12px; box-shadow:var(--shadow-lg); min-width:160px; overflow:hidden; z-index:60;">
            <div style="padding:12px 14px; border-bottom:1px solid var(--border);">
              <div style="font-weight:700;">${escapeHtml(user.name)}</div>
              <div style="font-size:0.72rem; color:var(--text-muted); text-transform:capitalize;">${escapeHtml(user.role)}</div>
            </div>
            <a href="profile.html" style="display:block; padding:10px 14px; color:#0f172a;">My Profile</a>
            <a href="settings.html" style="display:block; padding:10px 14px; color:#0f172a;">Settings</a>
            <a href="#" id="logout-link" style="display:block; padding:10px 14px; color:var(--danger-red); font-weight:700;">Log out</a>
          </div>
        </div>
      </div>
    `;
  },

  renderBottomNav(items, currentPage) {
    const bottom = document.getElementById("bottom-nav");
    if (!bottom) return;
    bottom.innerHTML = items
      .map(
        (item) => `
        <a href="${item.href}" class="${item.href === currentPage ? "active" : ""}">
          <span>${item.label}</span>
        </a>`
      )
      .join("");
  },

  wireUserMenu() {
    const trigger = document.getElementById("user-menu-trigger");
    const menu = document.getElementById("user-menu");
    if (!trigger || !menu) return;
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === "none" ? "block" : "none";
    });
    document.addEventListener("click", () => (menu.style.display = "none"));
    const logoutLink = document.getElementById("logout-link");
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      Auth.logout();
    });
  },
};
