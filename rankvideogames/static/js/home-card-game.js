let activeCard = null;

document.addEventListener("DOMContentLoaded", () => {
  const URL_SIDEBAR_LAST_REVIEW = "/reviews/sidebar/last-review/";
  const URL_SIDEBAR_LAST_COMMENTS = "/reviews/sidebar/last-comments/";
  const URL_GAME_STATS = "/reviews/game-stats/";
  const URL_MY_REVIEW = "/reviews/my/";
  const URL_SAVE_REVIEW = "/reviews/save/";
  const URL_LAST_COMMENTS = "/reviews/last/";

  const cards = document.querySelectorAll(".game-card.js-tilt");
  if (!cards.length) return;

  const sidebarLastReviewEl = document.getElementById("sidebarLastReview");
  const sidebarLastReviewLoading = document.getElementById("sidebarLastReviewLoading");
  const sidebarLastReviewEmpty = document.getElementById("sidebarLastReviewEmpty");

  const sidebarLastCommentsEl = document.getElementById("sidebarLastComments");
  const sidebarLastCommentsLoading = document.getElementById("sidebarLastCommentsLoading");
  const sidebarLastCommentsEmpty = document.getElementById("sidebarLastCommentsEmpty");

  const lastCommentsList = document.getElementById("lastCommentsList");
  const lastCommentsCount = document.getElementById("lastCommentsCount");

  const modal = document.getElementById("gameModal");
  const panel = modal?.querySelector(".game-modal__panel");
  if (!modal || !panel) return;

  const modalTitle = document.getElementById("modalTitle");
  const modalCover = document.getElementById("modalCover");
  const modalCoverFallback = document.getElementById("modalCoverFallback");

  const modalPlatforms = document.getElementById("modalPlatforms");
  const modalGenres = document.getElementById("modalGenres");

  const modalIgdbId = document.getElementById("modalIgdbId");
  const modalRelease = document.getElementById("modalRelease");
  const modalRating = document.getElementById("modalRating");
  const modalRatingCount = document.getElementById("modalRatingCount");
  const modalDevelopers = document.getElementById("modalDevelopers");
  const modalPublishers = document.getElementById("modalPublishers");

  const reviewGameId = document.getElementById("reviewGameId");
  const reviewComment = document.getElementById("reviewComment");
  const btnSaveReview = document.getElementById("btnSaveReview");
  const btnClearReview = document.getElementById("btnClearReview");
  const reviewMsg = document.getElementById("reviewMsg");
  const ratingStars = document.getElementById("ratingStars");

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function splitPipes(s) {
    return (s || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function safeText(v, fallback = "—") {
    if (v === undefined || v === null) return fallback;
    const s = String(v).trim();
    if (!s || s.toLowerCase() === "nan") return fallback;
    return s;
  }

  function makePills(container, items, emptyText, extraClass = "") {
    container.innerHTML = "";
    if (!items.length) {
      const span = document.createElement("span");
      span.className = `meta-pill ${extraClass}`.trim();
      span.textContent = emptyText;
      container.appendChild(span);
      return;
    }
    items.forEach((txt) => {
      const span = document.createElement("span");
      span.className = `meta-pill ${extraClass}`.trim();
      span.textContent = txt;
      container.appendChild(span);
    });
  }

  function getField(card, key) {
    const el = card.querySelector(`.game-hidden [data-field="${key}"]`);
    return el ? el.textContent.trim() : "";
  }

  function showEl(el, show) {
    if (!el) return;
    el.style.display = show ? "" : "none";
  }

  function formatAgo(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  }

  function initials(name) {
    const s = String(name || "").trim();
    if (!s) return "??";
    const parts = s.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "??";
  }

  function starRow(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return `<span class="stars stars--empty">—</span>`;
    const clamped = Math.max(0, Math.min(5, Math.round(n)));
    const on = "★".repeat(clamped);
    const off = "★".repeat(5 - clamped);
    return `<span class="stars" aria-label="${clamped} out of 5">${on}<span class="stars-off">${off}</span></span>`;
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[2]) : "";
  }

  function csrfToken() {
    return getCookie("csrftoken");
  }

  function showReviewMsg(text, ok = true) {
    if (!reviewMsg) return;
    reviewMsg.style.display = "block";
    reviewMsg.textContent = text;
    reviewMsg.classList.toggle("is-ok", ok);
    reviewMsg.classList.toggle("is-err", !ok);
  }

  function hideReviewMsg() {
    if (!reviewMsg) return;
    reviewMsg.style.display = "none";
    reviewMsg.textContent = "";
    reviewMsg.classList.remove("is-ok", "is-err");
  }

  function getSelectedRating() {
    const checked = ratingStars?.querySelector('input[name="user_rating"]:checked');
    return checked ? parseInt(checked.value, 10) : null;
  }

  function setSelectedRating(val) {
    const input = ratingStars?.querySelector(`input[name="user_rating"][value="${String(val)}"]`);
    if (input) input.checked = true;
  }

  function resetReviewUI() {
    hideReviewMsg();
    ratingStars?.querySelectorAll('input[name="user_rating"]').forEach((i) => (i.checked = false));
    if (reviewComment) reviewComment.value = "";
    if (btnSaveReview) {
      btnSaveReview.disabled = false;
      btnSaveReview.textContent = "Save review";
    }
  }

  function renderSidebarLastReview(item) {
    if (!sidebarLastReviewEl) return;

    sidebarLastReviewEl.innerHTML = "";

    if (!item) {
      showEl(sidebarLastReviewEmpty, true);
      return;
    }

    showEl(sidebarLastReviewEmpty, false);

    const gameName = (item.gameName || "").trim();
    const coverUrl = (item.coverUrl || "").trim();
    const user = (item.user || "").trim();
    const rating = item.rating;
    const comment = (item.comment || "").trim();
    const date = item.date || "";

    const wrap = document.createElement("div");
    wrap.className = "side-card";

    wrap.innerHTML = `
      <div class="side-cover">
        ${
          coverUrl
            ? `<img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(gameName || "Game")}">`
            : `<div class="cover-fallback">No cover</div>`
        }
      </div>

      <div class="side-info">
        <div class="side-title" title="${escapeHtml(gameName || "Game")}">${escapeHtml(gameName || "Game")}</div>

        <div class="side-sub">
          <strong>@${escapeHtml(user || "user")}</strong>
          <span class="side-dot">•</span>
          ${starRow(rating)}
          <span class="side-dot">•</span>
          <strong>${escapeHtml(formatAgo(date))}</strong>
        </div>

        ${
          comment
            ? `<div class="side-sub" style="margin-top:6px; opacity:.95;">“${escapeHtml(comment)}”</div>`
            : `<div class="side-sub" style="margin-top:6px; opacity:.7;">Sin comentario</div>`
        }

        <div class="side-mini">
          <span class="chip">Última</span>
          <span class="chip chip-alt">LIVE</span>
        </div>
      </div>
    `;

    sidebarLastReviewEl.appendChild(wrap);
  }

  function renderSidebarLastComments(items) {
    if (!sidebarLastCommentsEl) return;

    sidebarLastCommentsEl.innerHTML = "";

    if (!items || !items.length) {
      showEl(sidebarLastCommentsEmpty, true);
      return;
    }

    showEl(sidebarLastCommentsEmpty, false);

    items.forEach((it) => {
      const user = (it.user || "user").trim();
      const comment = (it.comment || "").trim();
      const date = it.date || "";

      const row = document.createElement("div");
      row.className = "comment-row";

      row.innerHTML = `
        <div class="comment-avatar">${escapeHtml(initials(user))}</div>
        <div class="comment-text">
          <strong>@${escapeHtml(user)}</strong>
          <div class="comment-snippet">“${escapeHtml(comment || "—")}”</div>
          <div class="comment-snippet" style="opacity:.65; margin-top:4px;">${escapeHtml(formatAgo(date))}</div>
        </div>
      `;

      sidebarLastCommentsEl.appendChild(row);
    });
  }

  async function loadSidebarLastReview() {
    if (!sidebarLastReviewEl) return;

    showEl(sidebarLastReviewLoading, true);
    showEl(sidebarLastReviewEmpty, false);

    try {
      const res = await fetch(URL_SIDEBAR_LAST_REVIEW, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => ({}));
      renderSidebarLastReview(data?.item || null);
    } catch {
      renderSidebarLastReview(null);
    } finally {
      showEl(sidebarLastReviewLoading, false);
    }
  }

  async function loadSidebarLastComments() {
    if (!sidebarLastCommentsEl) return;

    showEl(sidebarLastCommentsLoading, true);
    showEl(sidebarLastCommentsEmpty, false);

    try {
      const res = await fetch(URL_SIDEBAR_LAST_COMMENTS, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => ({}));
      renderSidebarLastComments(Array.isArray(data?.items) ? data.items : []);
    } catch {
      renderSidebarLastComments([]);
    } finally {
      showEl(sidebarLastCommentsLoading, false);
    }
  }

  function renderLastComments(items) {
    if (!lastCommentsList) return;

    lastCommentsList.innerHTML = "";
    if (lastCommentsCount) lastCommentsCount.textContent = String(items?.length || 0);

    if (!items || !items.length) {
      const empty = document.createElement("div");
      empty.className = "last-comments__empty";
      empty.textContent = "No comments yet.";
      lastCommentsList.appendChild(empty);
      return;
    }

    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "last-comment";
      row.setAttribute("role", "listitem");

      const user = (it.user || "user").trim();
      const date = it.date || "";
      const comment = (it.comment || "").trim();

      row.innerHTML = `
        <div class="last-comment__avatar">${escapeHtml(initials(user))}</div>
        <div class="last-comment__body">
          <div class="last-comment__top">
            <strong class="last-comment__user">@${escapeHtml(user || "user")}</strong>
            <span class="last-comment__time">${escapeHtml(formatAgo(date))}</span>
          </div>
          <div class="last-comment__text">“${escapeHtml(comment || "—")}”</div>
        </div>
      `;

      lastCommentsList.appendChild(row);
    });
  }

  async function loadLastComments(gameId) {
    if (!lastCommentsList || !gameId) return;

    try {
      const res = await fetch(`${URL_LAST_COMMENTS}?game=${encodeURIComponent(gameId)}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      if (!res.ok) {
        renderLastComments([]);
        return;
      }

      const data = await res.json().catch(() => ({}));
      renderLastComments(Array.isArray(data.items) ? data.items : []);
    } catch {
      renderLastComments([]);
    }
  }

  async function loadGameStats(gameId) {
    if (!gameId) return;

    if (modalRating) modalRating.textContent = "—";
    if (modalRatingCount) modalRatingCount.textContent = "—";

    try {
      const res = await fetch(`${URL_GAME_STATS}?game=${encodeURIComponent(gameId)}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      if (!res.ok) return;

      const data = await res.json().catch(() => ({}));

      if (modalRatingCount && typeof data.count !== "undefined") {
        modalRatingCount.textContent = String(data.count);
      }

      if (modalRating && data.avg !== null && typeof data.avg !== "undefined") {
        modalRating.textContent = Number(data.avg).toFixed(1);
      } else if (modalRating) {
        modalRating.textContent = "—";
      }
    } catch {}
  }

  async function loadMyReview(gameId) {
    if (!gameId) return;

    try {
      const res = await fetch(`${URL_MY_REVIEW}?game=${encodeURIComponent(gameId)}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      if (res.status === 404) return;
      if (!res.ok) return;

      const data = await res.json().catch(() => ({}));

      if (typeof data.rating !== "undefined") {
        setSelectedRating(data.rating);
        if (reviewComment) reviewComment.value = data.comments || "";
        if (btnSaveReview) btnSaveReview.textContent = "Update review";
      }
    } catch {}
  }

  async function saveMyReview() {
    const gameId = reviewGameId?.value;
    if (!gameId) return;

    const rating = getSelectedRating();
    const comments = (reviewComment?.value || "").trim();

    if (rating === null) {
      showReviewMsg("Select a rating first.", false);
      return;
    }

    if (btnSaveReview) btnSaveReview.disabled = true;

    try {
      const res = await fetch(URL_SAVE_REVIEW, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken(),
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          gameId: parseInt(gameId, 10),
          rating: parseInt(rating, 10),
          comments,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showReviewMsg(data.error || "Could not save review.", false);
        return;
      }

      showReviewMsg(data.updated ? "Review updated." : "Review saved.", true);
      if (btnSaveReview) btnSaveReview.textContent = "Update review";

      loadGameStats(gameId);
      loadLastComments(gameId);
      loadSidebarLastReview();
      loadSidebarLastComments();
    } catch {
      showReviewMsg("Network error saving review.", false);
    } finally {
      if (btnSaveReview) btnSaveReview.disabled = false;
    }
  }

  function openModalFromCard(card) {
    activeCard = card;
    activeCard.classList.add("is-modal-open");
    activeCard.classList.remove("is-tilting");
    activeCard.style.transform = "";

    const name = getField(card, "name") || "Game";
    const cover = getField(card, "cover");

    const platforms = splitPipes(getField(card, "platforms"));
    const genres = splitPipes(getField(card, "genres"));

    modalTitle.textContent = name;

    const gameId = getField(card, "id");
    modalIgdbId.textContent = safeText(gameId);

    const rel = getField(card, "release");
    modalRelease.textContent = rel === "1970-01-01" ? "—" : safeText(rel);

    modalDevelopers.textContent = safeText(getField(card, "developers"));
    modalPublishers.textContent = safeText(getField(card, "publishers"));

    if (modalRating) modalRating.textContent = "—";
    if (modalRatingCount) modalRatingCount.textContent = "—";

    if (cover) {
      modalCover.style.display = "block";
      modalCover.src = cover;
      modalCover.alt = name;
      modalCoverFallback.style.display = "none";
    } else {
      modalCover.removeAttribute("src");
      modalCover.style.display = "none";
      modalCoverFallback.style.display = "flex";
      modalCoverFallback.style.alignItems = "center";
      modalCoverFallback.style.justifyContent = "center";
      modalCoverFallback.style.height = "100%";
    }

    makePills(modalPlatforms, platforms, "Unknown platform");
    makePills(modalGenres, genres, "Unknown genre", "meta-genre");

    const r = card.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    panel.style.setProperty("--clip-x", `${cx}px`);
    panel.style.setProperty("--clip-y", `${cy}px`);
    panel.style.setProperty("--clip-r", `0px`);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    panel.getBoundingClientRect();
    panel.style.setProperty("--clip-r", `140vmax`);

    document.documentElement.style.overflow = "hidden";

    if (reviewGameId) reviewGameId.value = gameId || "";
    resetReviewUI();

    loadGameStats(gameId);
    loadLastComments(gameId);
    loadMyReview(gameId);
  }

  function closeModal() {
    if (!modal.classList.contains("is-open")) return;

    panel.style.setProperty("--clip-r", `0px`);
    modal.setAttribute("aria-hidden", "true");

    const onEnd = (e) => {
      if (e.propertyName !== "clip-path") return;
      modal.classList.remove("is-open");
      document.documentElement.style.overflow = "";
      if (activeCard) {
        activeCard.classList.remove("is-modal-open");
        activeCard = null;
      }
      panel.removeEventListener("transitionend", onEnd);
    };

    panel.addEventListener("transitionend", onEnd);
  }

  function initTilt() {
    cards.forEach((card) => {
      const container = card;

      const coverImg = card.querySelector(".js-tilt-cover img");
      const title = card.querySelector(".js-tilt-title");
      const meta = card.querySelector(".js-tilt-meta");
      const actions = card.querySelector(".js-tilt-actions");

      const popEls = [coverImg, title, meta, actions].filter(Boolean);

      function onMove(e) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const midX = rect.width / 2;
        const midY = rect.height / 2;

        const rotateY = clamp((midX - x) / 20, -12, 12);
        const rotateX = clamp((y - midY) / 20, -12, 12);

        card.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
      }

      function onEnter() {
        card.classList.add("is-tilting");
        card.style.transition = "none";
        popEls.forEach((el) => (el.style.transition = "transform .25s ease"));
      }

      function onLeave() {
        card.classList.remove("is-tilting");
        card.style.transition = "transform .35s ease";
        card.style.transform = "rotateY(0deg) rotateX(0deg)";
        popEls.forEach((el) => (el.style.transform = "translateZ(0)"));
      }

      container.addEventListener("mousemove", onMove);
      container.addEventListener("mouseenter", onEnter);
      container.addEventListener("mouseleave", onLeave);
    });
  }

  function initModalEvents() {
    let downX = 0;
    let downY = 0;
    let pointerDownCard = null;

    document.addEventListener("pointerdown", (e) => {
      const card = e.target.closest(".game-card.js-game-open");
      if (!card) return;
      pointerDownCard = card;
      downX = e.clientX;
      downY = e.clientY;
    });

    document.addEventListener("pointerup", (e) => {
      if (!pointerDownCard) return;

      const dx = Math.abs(e.clientX - downX);
      const dy = Math.abs(e.clientY - downY);

      const card = pointerDownCard;
      pointerDownCard = null;

      if (dx > 8 || dy > 8) return;
      openModalFromCard(card);
    });

    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  function initReviewEvents() {
    btnSaveReview?.addEventListener("click", (e) => {
      e.preventDefault();
      saveMyReview();
    });

    btnClearReview?.addEventListener("click", (e) => {
      e.preventDefault();
      resetReviewUI();
    });
  }

  initTilt();
  initModalEvents();
  initReviewEvents();
  loadSidebarLastReview();
  loadSidebarLastComments();
});
