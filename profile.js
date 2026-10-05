// profile.js — one profile page, adapted for rider vs driver.

const ProfilePage = {
  async init() {
    Auth.requirePage();
    Nav.render("profile.html");
    await this.load();

    document.getElementById("profile-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.save();
    });
  },

  async load() {
    try {
      const user = await Auth.refreshUser();
      this.renderSummary(user);
      this.renderForm(user);
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  renderSummary(user) {
    const isDriver = user.role === "driver";
    const dp = user.driverProfile;
    document.getElementById("profile-summary").innerHTML = `
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <div>
          ${avatarHtml(user, "width:84px;height:84px;font-size:1.8rem;")}
        </div>
        <div>
          <h2 style="margin-bottom:4px;">${escapeHtml(user.name)}
            ${user.is_verified ? '<span class="badge badge-verified">Verified ✓</span>' : ""}
          </h2>
          <span class="badge badge-role" style="text-transform:capitalize;">${escapeHtml(user.role)}</span>
          ${isDriver ? `<span class="badge badge-driver">${escapeHtml(dp.vehicle_type)}</span>` : ""}
        </div>
      </div>
      ${
        isDriver
          ? `<div class="stat-grid" style="margin-top:20px;">
              <div class="stat-card"><div class="stat-value">${dp.completed_rides}</div><div class="stat-label">Completed Rides</div></div>
              <div class="stat-card"><div class="stat-value">${dp.rating_count ? (dp.rating_sum / dp.rating_count).toFixed(1) : "—"}</div><div class="stat-label">Avg. Rating</div></div>
              <div class="stat-card"><div class="stat-value">${escapeHtml(dp.vehicle_model)}</div><div class="stat-label">Vehicle</div></div>
              <div class="stat-card"><div class="stat-value">${escapeHtml(dp.vehicle_plate)}</div><div class="stat-label">Plate</div></div>
            </div>`
          : ""
      }
    `;
  },

  renderForm(user) {
    const isDriver = user.role === "driver";
    const dp = user.driverProfile;
    document.getElementById("profile-form").innerHTML = `
      <div class="form-row cols-2">
        <div class="field">
          <label for="name">Full name</label>
          <input type="text" id="name" value="${escapeHtml(user.name)}" required>
        </div>
        <div class="field">
          <label for="phone">Phone number</label>
          <input type="tel" id="phone" value="${escapeHtml(user.phone || "")}">
        </div>
      </div>
      <div class="field">
        <label>Email (cannot be changed)</label>
        <div class="readonly-field">${escapeHtml(user.email)}</div>
      </div>
      ${
        !isDriver
          ? `<div class="form-row cols-2">
              <div class="field"><label>UIU ID</label><div class="readonly-field">${escapeHtml(user.uiu_id || "—")}</div></div>
              <div class="field">
                <label for="department">Department</label>
                <input type="text" id="department" value="${escapeHtml(user.department || "")}">
              </div>
            </div>`
          : `<div class="form-row cols-2">
              <div class="field">
                <label for="vehicleModel">Vehicle model</label>
                <input type="text" id="vehicleModel" value="${escapeHtml(dp.vehicle_model)}" required>
              </div>
              <div class="field">
                <label for="vehiclePlate">Vehicle plate</label>
                <input type="text" id="vehiclePlate" value="${escapeHtml(dp.vehicle_plate)}" required>
              </div>
            </div>
            <div class="field">
              <label>NID number (set at registration)</label>
              <div class="readonly-field">${escapeHtml(dp.nid_number ? "•".repeat(Math.max(dp.nid_number.length - 4, 0)) + dp.nid_number.slice(-4) : "Not provided")}</div>
            </div>
            <div class="field">
              <label>Vehicle type (set at registration)</label>
              <div class="readonly-field">${escapeHtml(dp.vehicle_type)}</div>
            </div>`
      }
      <div id="profile-error"></div>
      <button type="submit" class="btn btn-primary">Save Changes</button>
    `;
    enhanceForms(document.getElementById("profile-form"));
  },

  async save() {
    const errorBox = document.getElementById("profile-error");
    setFormError(errorBox, "");
    const user = Auth.getUser();
    if (!/^\d{11}$/.test(document.getElementById("phone").value.trim())) {
      setFormError(errorBox, "Phone number must be exactly 11 digits.");
      return;
    }
    const payload = {
      name: document.getElementById("name").value.trim(),
      phone: document.getElementById("phone").value.trim(),
    };
    if (user.role === "driver") {
      payload.vehicleModel = document.getElementById("vehicleModel").value.trim();
      payload.vehiclePlate = document.getElementById("vehiclePlate").value.trim();
    } else {
      payload.department = document.getElementById("department").value.trim();
    }
    try {
      const updated = await Api.patch("/profile.php", payload);
      Auth.setUser(updated);
      showToast("Profile updated.", "success");
      this.renderSummary(updated);
      Nav.render("profile.html");
    } catch (err) {
      setFormError(errorBox, err.message);
    }
  },
};
