// driver.js — driver-only flows. Vehicle info always comes from the
// authenticated driver's stored profile; the offer-ride form never
// asks for it again.

const OfferRidePage = {
  async init() {
    const user = Auth.requirePage({ role: "driver" });
    Nav.render("offer-ride.html");
    document.getElementById("date").min = todayIso();

    try {
      const me = await Api.get("/auth_me.php");
      const dp = me.driverProfile;
      document.getElementById("vehicle-readout").innerHTML = `
        <strong>${escapeHtml(dp.vehicle_type)}</strong> —
        ${escapeHtml(dp.vehicle_model)} · ${escapeHtml(dp.vehicle_plate)}
        <div class="hint">Pulled automatically from your driver profile. Update it any time from Profile.</div>
      `;
    } catch (err) {
      showToast(err.message, "error");
    }

    document.getElementById("offer-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.submit();
    });

    // Answering a community ride proposal: pre-fill the form from the post.
    this.postId = getQueryParam("post");
    if (this.postId) await this.prefillFromProposal();
  },

  async prefillFromProposal() {
    const banner = document.getElementById("proposal-banner");
    try {
      const post = await Api.get(`/community_post.php?id=${this.postId}`);
      if (post.status !== "open") throw new Error("This ride proposal is no longer open.");
      if (post.youOffered) throw new Error("You have already offered a ride for this proposal.");
      document.getElementById("pickup").value = post.pickup || "";
      document.getElementById("destination").value = post.destination || "";
      if (post.travel_date) document.getElementById("date").value = post.travel_date;
      if (post.travel_time) document.getElementById("time").value = post.travel_time.slice(0, 5);
      document.getElementById("pickup").dispatchEvent(new Event("input"));
      banner.innerHTML = `<div class="alert alert-info" style="margin-bottom:16px;">
        Offering a ride for <strong>${escapeHtml(post.author.name)}</strong>'s proposal:
        “${escapeHtml(post.content)}”. Set your seats and fare, then publish.</div>`;
    } catch (err) {
      this.postId = null;
      banner.innerHTML = `<div class="alert alert-error" style="margin-bottom:16px;">${escapeHtml(err.message)}</div>`;
    }
  },

  async submit() {
    const errorBox = document.getElementById("offer-error");
    setFormError(errorBox, "");
    const payload = {
      pickup: document.getElementById("pickup").value.trim(),
      destination: document.getElementById("destination").value.trim(),
      date: document.getElementById("date").value,
      time: document.getElementById("time").value,
      seats: Number(document.getElementById("seats").value),
      fare: Number(document.getElementById("fare").value || 0),
      notes: document.getElementById("notes").value.trim(),
    };
    if (this.postId) payload.postId = Number(this.postId);
    const pairError = uiuPairError(payload.pickup, payload.destination);
    if (pairError) {
      setFormError(errorBox, pairError);
      return;
    }
    try {
      await Api.post("/rides.php", payload);
      showToast(this.postId ? "Your ride is live and linked to the proposal!" : "Your ride is live!", "success");
      window.location.href = "my-offered-rides.html";
    } catch (err) {
      setFormError(errorBox, err.message);
    }
  },
};

const MyOfferedRidesPage = {
  async init() {
    Auth.requirePage({ role: "driver" });
    Nav.render("my-offered-rides.html");
    await this.load();
  },

  async load() {
    const list = document.getElementById("rides-list");
    list.innerHTML = `<div class="loading-state">Loading your offered rides…</div>`;
    try {
      const rides = await Api.get("/rides_mine.php");
      if (rides.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            
            <p>You haven't offered any rides yet.</p>
            <a class="btn btn-primary" href="offer-ride.html">Offer a ride</a>
          </div>`;
        return;
      }
      list.innerHTML = rides.map((r) => this.card(r)).join("");
    } catch (err) {
      list.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  card(ride) {
    const statusBadge = {
      scheduled: '<span class="badge badge-verified">Scheduled</span>',
      active: '<span class="badge badge-warn">Active</span>',
      completed: '<span class="badge badge-role">Completed</span>',
      cancelled: '<span class="badge badge-danger">Cancelled</span>',
    }[ride.status];

    const actions = [];
    if (ride.status === "scheduled") {
      actions.push(`<button class="btn btn-secondary btn-sm" onclick="MyOfferedRidesPage.setStatus(${ride.id}, 'active')">Start Ride</button>`);
      actions.push(`<button class="btn btn-ghost btn-sm" onclick="MyOfferedRidesPage.setStatus(${ride.id}, 'cancelled')">Cancel</button>`);
    } else if (ride.status === "active") {
      actions.push(`<button class="btn btn-primary btn-sm" onclick="MyOfferedRidesPage.setStatus(${ride.id}, 'completed')">Mark Completed</button>`);
    }

    return `
      <div class="ride-card">
        <div class="ride-route">
          <span>${escapeHtml(ride.pickup)}</span><span class="arrow">→</span><span>${escapeHtml(ride.destination)}</span>
          ${statusBadge}
        </div>
        <div class="ride-meta">
          <span>${formatDate(ride.ride_date)}</span>
          <span>${formatTime(ride.ride_time)}</span>
          <span>${escapeHtml(ride.vehicle_model)}</span>
          <span>${ride.available_seats}/${ride.total_seats} seats left</span>
          <span>৳${ride.fare_per_person}/seat</span>
        </div>
        <div class="ride-footer">
          <a class="btn btn-outline btn-sm" href="ride-requests.html?id=${ride.id}">Manage Requests</a>
          <div style="display:flex; gap:8px;">${actions.join("")}</div>
        </div>
      </div>`;
  },

  async setStatus(rideId, status) {
    try {
      await Api.patch(`/ride.php?id=${rideId}`, { status });
      showToast("Ride updated.", "success");
      this.load();
    } catch (err) {
      showToast(err.message, "error");
    }
  },
};

const RideRequestsPage = {
  async init() {
    Auth.requirePage({ role: "driver" });
    Nav.render("my-offered-rides.html");
    this.rideId = getQueryParam("id");
    await this.load();
  },

  async load() {
    const list = document.getElementById("requests-list");
    if (!this.rideId) {
      list.innerHTML = `<div class="alert alert-error">No ride specified.</div>`;
      return;
    }
    list.innerHTML = `<div class="loading-state">Loading requests…</div>`;
    try {
      const [ride, requests] = await Promise.all([
        Api.get(`/ride.php?id=${this.rideId}`),
        Api.get(`/ride_requests.php?ride_id=${this.rideId}`),
      ]);
      document.getElementById("ride-summary").innerHTML = `
        <strong>${escapeHtml(ride.pickup)} → ${escapeHtml(ride.destination)}</strong>
        <span class="text-muted"> · ${formatDate(ride.ride_date)} · ${formatTime(ride.ride_time)} ·
        ${ride.available_seats}/${ride.total_seats} seats left</span>`;

      if (requests.length === 0) {
        list.innerHTML = `<div class="empty-state"><p>No requests yet for this ride.</p></div>`;
        return;
      }
      list.innerHTML = requests.map((r) => this.card(r)).join("");
    } catch (err) {
      list.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  card(req) {
    const statusBadge = {
      pending: '<span class="badge badge-warn">Pending</span>',
      accepted: '<span class="badge badge-verified">Accepted</span>',
      rejected: '<span class="badge badge-danger">Rejected</span>',
      cancelled: '<span class="badge badge-role">Cancelled</span>',
    }[req.status];

    let actions = "";
    if (req.status === "pending") {
      actions = `
        <button class="btn btn-primary btn-sm" onclick="RideRequestsPage.decide(${req.id}, 'accepted')">Accept</button>
        <button class="btn btn-ghost btn-sm" onclick="RideRequestsPage.decide(${req.id}, 'rejected')">Reject</button>`;
    }

    return `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;">
              ${escapeHtml(req.rider_name)}
              ${req.rider_verified ? '<span class="badge badge-verified">UIU Verified ✓</span>' : ""}
            </div>
            <div class="text-muted" style="font-size:0.82rem;">${req.seats} seat(s) · ${escapeHtml(req.rider_phone || "no phone on file")}</div>
            ${req.message ? `<p style="margin-top:8px;">"${escapeHtml(req.message)}"</p>` : ""}
          </div>
          <div style="display:flex; gap:8px; align-items:center;">${statusBadge}${actions}</div>
        </div>
      </div>`;
  },

  async decide(requestId, status) {
    try {
      await Api.patch(`/request.php?id=${requestId}`, { status });
      showToast(`Request ${status}.`, "success");
      this.load();
    } catch (err) {
      showToast(err.message, "error");
    }
  },
};
