// rides.js — rider-facing ride search, details, and "my rides" logic.
// All data comes from the PHP API. Nothing here is hardcoded.

function rideCardHtml(ride, actionsHtml) {
  return `
    <div class="ride-card">
      <div class="ride-route">
        <span>${escapeHtml(ride.pickup)}</span>
        <span class="arrow">→</span>
        <span>${escapeHtml(ride.destination)}</span>
      </div>
      <div class="ride-meta">
        <span>${formatDate(ride.ride_date)}</span>
        <span>${formatTime(ride.ride_time)}</span>
        <span>${escapeHtml(ride.vehicle_type)}</span>
        <span>${ride.available_seats}/${ride.total_seats} seats</span>
      </div>
      <div class="ride-footer">
        <div class="driver-mini">
          <span class="avatar-chip">${escapeHtml((ride.driver && ride.driver.name || "?").slice(0, 2).toUpperCase())}</span>
          <div>
            <div style="font-weight:700; font-size:0.88rem;">
              ${escapeHtml(ride.driver ? ride.driver.name : "Driver")}
              ${ride.driver && ride.driver.verified ? '<span class="badge badge-verified">Verified</span>' : ""}
            </div>
            <div style="font-size:0.76rem; color:var(--text-muted);">
              ${ride.driver && ride.driver.rating ? `★ ${ride.driver.rating}` : "No ratings yet"} ·
              ${ride.driver ? ride.driver.completedRides : 0} rides completed
            </div>
          </div>
        </div>
        <div class="fare-tag">${ride.fare_per_person > 0 ? "৳" + ride.fare_per_person : "Free"}</div>
      </div>
      ${actionsHtml || ""}
    </div>`;
}

const FindRidePage = {
  async init() {
    Auth.requirePage({ role: "rider" });
    Nav.render("find-ride.html");

    document.getElementById("search-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.search();
    });
    document.getElementById("date").min = todayIso();
    await this.search();
  },

  async search() {
    const results = document.getElementById("results");
    results.innerHTML = `<div class="loading-state">Searching for rides…</div>`;
    const pickup = document.getElementById("pickup").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const date = document.getElementById("date").value;
    const params = new URLSearchParams();
    if (pickup) params.set("pickup", pickup);
    if (destination) params.set("destination", destination);
    if (date) params.set("date", date);

    try {
      const rides = await Api.get(`/rides.php?${params.toString()}`);
      if (rides.length === 0) {
        results.innerHTML = `
          <div class="empty-state">
            
            <p>No rides match your search yet.</p>
            <p class="text-muted">Try a different route or check back later — or post it in Community.</p>
          </div>`;
        return;
      }
      results.innerHTML = rides
        .map((r) => rideCardHtml(r, `<a class="btn btn-primary btn-block" href="ride-details.html?id=${r.id}">View & Request</a>`))
        .join("");
    } catch (err) {
      results.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },
};

const RideDetailsPage = {
  ride: null,

  async init() {
    const user = Auth.requirePage({ role: "rider" });
    Nav.render("find-ride.html");
    this.rideId = getQueryParam("id");
    if (!this.rideId) {
      document.getElementById("ride-detail-container").innerHTML =
        `<div class="alert alert-error">No ride specified.</div>`;
      return;
    }
    await this.load();

    document.getElementById("request-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitRequest();
    });
  },

  async load() {
    const container = document.getElementById("ride-detail-container");
    container.innerHTML = `<div class="loading-state">Loading ride…</div>`;
    try {
      this.ride = await Api.get(`/ride.php?id=${this.rideId}`);
      container.innerHTML = rideCardHtml(this.ride, "");
      document.getElementById("seats").max = this.ride.available_seats;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      document.getElementById("request-panel").style.display = "none";
    }
  },

  async submitRequest() {
    const errorBox = document.getElementById("request-error");
    setFormError(errorBox, "");
    const seats = Number(document.getElementById("seats").value || 1);
    const message = document.getElementById("message").value.trim();
    try {
      await Api.post(`/ride_requests.php?ride_id=${this.rideId}`, { seats, message });
      showToast("Request sent to the driver!", "success");
      window.location.href = "my-rides.html";
    } catch (err) {
      setFormError(errorBox, err.message);
    }
  },
};

const MyRidesPage = {
  async init() {
    Auth.requirePage({ role: "rider" });
    Nav.render("my-rides.html");
    await this.load();
  },

  async load() {
    const list = document.getElementById("requests-list");
    list.innerHTML = `<div class="loading-state">Loading your rides…</div>`;
    try {
      const requests = await Api.get("/requests_mine.php");
      if (requests.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            
            <p>You haven't requested any rides yet.</p>
            <a class="btn btn-primary" href="find-ride.html">Find a ride</a>
          </div>`;
        return;
      }
      list.innerHTML = requests.map((r) => this.requestCard(r)).join("");
    } catch (err) {
      list.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  requestCard(r) {
    const statusBadge = {
      pending: '<span class="badge badge-warn">Pending</span>',
      accepted: '<span class="badge badge-verified">Accepted ✓</span>',
      rejected: '<span class="badge badge-danger">Declined</span>',
      cancelled: '<span class="badge badge-role">Cancelled</span>',
    }[r.status];

    let rateButton = "";
    if (r.status === "accepted" && r.ride_status === "completed") {
      rateButton = `<button class="btn btn-outline btn-sm" onclick="MyRidesPage.rate(${r.ride_id})">Rate this ride</button>`;
    }

    return `
      <div class="ride-card">
        <div class="ride-route">
          <span>${escapeHtml(r.pickup)}</span><span class="arrow">→</span><span>${escapeHtml(r.destination)}</span>
        </div>
        <div class="ride-meta">
          <span>${formatDate(r.ride_date)}</span>
          <span>${formatTime(r.ride_time)}</span>
          <span>${vehicleIcon(r.vehicle_type)} ${escapeHtml(r.vehicle_type)}</span>
          <span>${r.seats} seat(s) requested</span>
        </div>
        <div class="ride-footer">
          ${statusBadge}
          ${rateButton}
        </div>
      </div>`;
  },

  async rate(rideId) {
    const stars = prompt("Rate this driver from 1 to 5 stars:");
    const n = Number(stars);
    if (!n || n < 1 || n > 5) return;
    try {
      await Api.post(`/ride_rate.php?ride_id=${rideId}`, { stars: n });
      showToast("Thanks for rating your driver!", "success");
      MyRidesPage.load();
    } catch (err) {
      showToast(err.message, "error");
    }
  },
};
