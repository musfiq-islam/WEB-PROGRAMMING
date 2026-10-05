// community.js — student/faculty community posts. Drivers can't post
// (enforced server-side too) but they can browse them. A post with both a
// pickup and a destination is a "ride proposal": every driver sees it and can
// answer it with "Offer this ride", which opens the offer form pre-filled.

/** Route + date/time line shared by every post card. */
function postRouteLine(post) {
  if (!(post.pickup && post.destination)) return "";
  return `<div class="ride-meta"><span>${escapeHtml(post.pickup)} → ${escapeHtml(post.destination)}</span>
    ${post.travel_date ? `<span>${formatDate(post.travel_date)}</span>` : ""}
    ${post.travel_time ? `<span>${formatTime(post.travel_time)}</span>` : ""}</div>`;
}

/** "2 drivers offered · ৳50–৳80 · Bike, CNG" (empty string when nobody has offered yet). */
function offerSummaryHtml(post) {
  if (!post.isProposal || !post.offerCount) return "";
  const price =
    post.offerMinFare === post.offerMaxFare
      ? `৳${post.offerMinFare}`
      : `৳${post.offerMinFare}–৳${post.offerMaxFare}`;
  return `<div class="offer-summary" style="margin-top:8px;">${post.offerCount} driver${post.offerCount === 1 ? "" : "s"} offered · ${price} · ${escapeHtml(post.offerVehicles || "")}</div>`;
}

/** A ride-proposal card (used on the driver home page and the community page). */
function proposalCardHtml(post) {
  return `
    <div class="post-card">
      <a href="post-details.html?id=${post.id}" style="display:block; color:inherit;">
        <div class="post-author">
          <span class="avatar-chip">${escapeHtml(post.author.avatar_initials || "U")}</span>
          <div>
            <div class="name-line">
              ${escapeHtml(post.author.name)}
              ${post.author.is_verified ? '<span class="badge badge-verified">Verified ✓</span>' : ""}
              <span class="badge badge-role">${escapeHtml(post.author.role)}</span>
            </div>
            <div class="post-time">${timeAgo(post.created_at)}</div>
          </div>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        ${postRouteLine(post)}
        ${offerSummaryHtml(post)}
        <div class="post-actions">
          <span>${post.interestCount} interested</span>
          <span>${post.offerCount} driver offer${post.offerCount === 1 ? "" : "s"}</span>
        </div>
      </a>
      <a class="btn btn-primary btn-block" style="margin-top:12px;" href="offer-ride.html?post=${post.id}">Offer this ride</a>
    </div>`;
}

const CommunityPage = {
  async init() {
    const user = Auth.requirePage();
    Nav.render("community.html");

    const composer = document.getElementById("composer");
    if (user.role === "driver") {
      document.querySelector(".page-heading h1").textContent = "Ride Proposals";
      document.querySelector(".page-heading .subtitle").textContent = "Riders post where they want to go. Offer a ride to answer a proposal.";
      composer.innerHTML = `<div class="alert alert-info">Posts with a pickup and destination are ride proposals from students and faculty. Tap <strong>Offer this ride</strong> on any proposal and your ride form opens pre-filled.</div>`;
    } else {
      document.getElementById("post-form").addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitPost();
      });
    }
    if (user.role !== "driver") this.loadNotifications();
    await this.load();
  },

  /** Notification panel: which drivers offered rides for my posts, at what price, in which vehicle. */
  async loadNotifications() {
    const panel = document.getElementById("notifications-panel");
    try {
      const { unread, items } = await Api.get("/notifications.php");
      if (!items.length) {
        panel.innerHTML = "";
        return;
      }
      // Group the offers by the community post they answer.
      const groups = new Map();
      items.forEach((n) => {
        if (!groups.has(n.post_id)) groups.set(n.post_id, []);
        groups.get(n.post_id).push(n);
      });
      const groupHtml = [...groups.entries()]
        .map(([postId, offers]) => {
          const first = offers[0];
          const fares = offers.map((o) => Number(o.fare_per_person));
          const lo = Math.min(...fares), hi = Math.max(...fares);
          const vehicles = [...new Set(offers.map((o) => o.vehicle_type))].join(", ");
          const route = first.post_pickup && first.post_destination
            ? `${escapeHtml(first.post_pickup)} → ${escapeHtml(first.post_destination)}`
            : escapeHtml(first.post_content.slice(0, 60));
          return `
            <div class="notif-group">
              <div><strong>${route}</strong></div>
              <div class="notif-summary">${offers.length} driver${offers.length === 1 ? "" : "s"} accepted your ride request · ${lo === hi ? "৳" + lo : "৳" + lo + "–৳" + hi} · ${escapeHtml(vehicles)}</div>
              ${offers
                .map(
                  (o) => `
                <div class="notif-offer ${o.is_read == 0 ? "is-new" : ""}">
                  <span>
                    <strong>${escapeHtml(o.driver_name)}</strong>${o.is_read == 0 ? '<span class="notif-new-tag">NEW</span>' : ""}
                    · ${escapeHtml(o.vehicle_type)}${o.vehicle_model ? " (" + escapeHtml(o.vehicle_model) + ")" : ""}
                    · ৳${o.fare_per_person} per person
                    · ${formatDate(o.ride_date)} ${formatTime(o.ride_time)}
                    · ${o.available_seats} seat${o.available_seats == 1 ? "" : "s"}
                  </span>
                  <a class="btn btn-primary btn-sm" href="ride-details.html?id=${o.ride_id}">View &amp; request</a>
                </div>`
                )
                .join("")}
            </div>`;
        })
        .join("");
      panel.innerHTML = `
        <div class="card notif-panel">
          <div class="notif-head">
            <h3>Driver offers${unread ? ` <span class="nav-badge">${unread} new</span>` : ""}</h3>
            ${unread ? '<button type="button" class="btn btn-ghost btn-sm" id="mark-read">Mark all as read</button>' : ""}
          </div>
          ${groupHtml}
        </div>`;
      const markBtn = document.getElementById("mark-read");
      if (markBtn) {
        markBtn.addEventListener("click", async () => {
          try {
            await Api.post("/notifications.php", { all: true });
            this.loadNotifications();
            document.querySelectorAll(".nav-badge").forEach((b) => b.remove());
          } catch (err) {
            showToast(err.message, "error");
          }
        });
      }
    } catch (err) {
      panel.innerHTML = "";
    }
  },

  async load() {
    const list = document.getElementById("posts-list");
    list.innerHTML = `<div class="loading-state">Loading community posts…</div>`;
    try {
      const posts = await Api.get("/community_posts.php");
      if (posts.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            
            <p>No community posts yet. Be the first to post a ride!</p>
          </div>`;
        return;
      }
      this.isDriver = Auth.getUser().role === "driver";
      list.innerHTML = posts.map((p) => this.postCard(p)).join("");
    } catch (err) {
      list.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  postCard(post) {
    // Drivers get the proposal card with an "Offer this ride" button.
    if (this.isDriver && post.isProposal) return proposalCardHtml(post);
    return `
      <a class="post-card" href="post-details.html?id=${post.id}" style="display:block; color:inherit;">
        <div class="post-author">
          <span class="avatar-chip">${escapeHtml((post.author.avatar_initials || "U"))}</span>
          <div>
            <div class="name-line">
              ${escapeHtml(post.author.name)}
              ${post.author.is_verified ? '<span class="badge badge-verified">Verified ✓</span>' : ""}
              <span class="badge badge-role">${escapeHtml(post.author.role)}</span>
            </div>
            <div class="post-time">${timeAgo(post.created_at)}</div>
          </div>
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        ${postRouteLine(post)}
        ${offerSummaryHtml(post)}
        <div class="post-actions">
          <span>${post.interestCount} interested</span>
          <span>${post.commentCount} comments</span>
          ${post.isProposal ? `<span>${post.offerCount} driver offer${post.offerCount === 1 ? "" : "s"}</span>` : ""}
        </div>
      </a>`;
  },

  async submitPost() {
    const errorBox = document.getElementById("post-error");
    setFormError(errorBox, "");
    const payload = {
      content: document.getElementById("content").value.trim(),
      pickup: document.getElementById("pickup").value.trim(),
      destination: document.getElementById("destination").value.trim(),
      date: document.getElementById("date").value,
      time: document.getElementById("time").value,
    };
    const pairError = uiuPairError(payload.pickup, payload.destination);
    if (pairError) {
      setFormError(errorBox, pairError);
      return;
    }
    try {
      await Api.post("/community_posts.php", payload);
      document.getElementById("post-form").reset();
      showToast("Posted to community!", "success");
      this.load();
    } catch (err) {
      setFormError(errorBox, err.message);
    }
  },
};

const PostDetailsPage = {
  async init() {
    Auth.requirePage();
    Nav.render("community.html");
    this.postId = getQueryParam("id");
    document.getElementById("comment-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addComment();
    });
    await this.load();
  },

  async load() {
    const container = document.getElementById("post-container");
    container.innerHTML = `<div class="loading-state">Loading post…</div>`;
    try {
      const post = await Api.get(`/community_post.php?id=${this.postId}`);
      this.post = post;
      const routeLine = postRouteLine(post);
      const isDriver = Auth.getUser().role === "driver";
      container.innerHTML = `
        <div class="post-card">
          <div class="post-author">
            <span class="avatar-chip">${escapeHtml(post.author.avatar_initials || "U")}</span>
            <div>
              <div class="name-line">
                ${escapeHtml(post.author.name)}
                ${post.author.is_verified ? '<span class="badge badge-verified">Verified ✓</span>' : ""}
                <span class="badge badge-role">${escapeHtml(post.author.role)}</span>
              </div>
              <div class="post-time">${timeAgo(post.created_at)}</div>
            </div>
          </div>
          <div class="post-content">${escapeHtml(post.content)}</div>
          ${routeLine}
          <div class="post-actions">
            <button id="interest-btn" class="${post.youAreInterested ? "active" : ""}">
              ${post.youAreInterested ? "Interested" : "Interested?"} (${post.interestCount})
            </button>
          </div>
          ${isDriver && post.isProposal
            ? post.youOffered
              ? `<div class="alert alert-info" style="margin-top:12px;">You have already offered a ride for this proposal.</div>`
              : `<a class="btn btn-primary btn-block" style="margin-top:12px;" href="offer-ride.html?post=${post.id}">Offer this ride</a>`
            : ""}
        </div>`;

      this.renderOffers(post);

      document.getElementById("interest-btn").addEventListener("click", () => this.toggleInterest());

      const commentsBox = document.getElementById("comments-list");
      commentsBox.innerHTML = post.comments.length
        ? post.comments
            .map(
              (c) => `
              <div class="comment-item">
                <strong>${escapeHtml(c.author_name)}</strong>
                <span class="text-muted" style="font-size:0.75rem;"> · ${timeAgo(c.created_at)}</span>
                <p style="margin:4px 0 0;">${escapeHtml(c.content)}</p>
              </div>`
            )
            .join("")
        : `<p class="text-muted">No comments yet — start the conversation.</p>`;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
    }
  },

  /** Rides drivers have offered for this proposal (riders can open and request them). */
  renderOffers(post) {
    const box = document.getElementById("offers-card");
    if (!box) return;
    if (!post.isProposal) {
      box.style.display = "none";
      return;
    }
    box.style.display = "block";
    const list = document.getElementById("offers-list");
    list.innerHTML = post.offers.length
      ? post.offers
          .map(
            (r) => `
            <div class="comment-item">
              <strong>${escapeHtml(r.driver_name)}</strong>
              <span class="text-muted" style="font-size:0.78rem;"> · ${escapeHtml(r.vehicle_type)} · ${formatDate(r.ride_date)} ${formatTime(r.ride_time)} · ${r.available_seats} seat${r.available_seats === 1 ? "" : "s"} · ৳${r.fare_per_person}</span>
              <div style="margin-top:6px;"><a class="btn btn-secondary btn-sm" href="ride-details.html?id=${r.id}">View ride</a></div>
            </div>`
          )
          .join("")
      : `<p class="text-muted">No driver has offered a ride for this proposal yet.</p>`;
  },

  async toggleInterest() {
    try {
      await Api.post(`/community_interest.php?id=${this.postId}`, {});
      this.load();
    } catch (err) {
      showToast(err.message, "error");
    }
  },

  async addComment() {
    const input = document.getElementById("comment-content");
    const content = input.value.trim();
    if (!content) return;
    try {
      await Api.post(`/community_comment.php?id=${this.postId}`, { content });
      input.value = "";
      this.load();
    } catch (err) {
      showToast(err.message, "error");
    }
  },
};
