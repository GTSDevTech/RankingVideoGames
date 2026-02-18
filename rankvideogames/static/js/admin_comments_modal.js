document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("commentsModal");
  if (!modal) return;

  const list = document.getElementById("cmodalList");
  const sub = document.getElementById("cmodalSub");
  const avgEl = document.getElementById("cmodalAvg");
  const countEl = document.getElementById("cmodalCount");
  const btnMore = document.getElementById("cmodalMore");
  
  const URL_COMMENTS = modal.getAttribute("data-endpoint");

  let currentGameId = null;
  let offset = 0;
  const limit = 20;
  let hasMore = true;

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function initials(name) {
    const s = String(name || "").trim();
    if (!s) return "??";
    const parts = s.split(/\s+/).slice(0, 2);
    return parts.map(p => (p[0] || "").toUpperCase()).join("") || "??";
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString();
  }

  function rowHtml(it) {
    const user = (it.user || "user").trim();
    const comment = (it.comments || "").trim();
    const rating = (it.rating ?? null);

    return `
      <div class="comment-row">
        <div class="comment-avatar">${escapeHtml(initials(user))}</div>
        <div class="comment-text" style="min-width:0;">
          <strong>@${escapeHtml(user)}</strong>
          <div class="comment-snippet" style="opacity:.75; margin-top:2px;">
            ⭐ ${escapeHtml(String(rating ?? "—"))} · ${escapeHtml(formatDate(it.reviewDate))}
          </div>
          <div class="comment-snippet" style="margin-top:6px;">
            “${escapeHtml(comment || "—")}”
          </div>
        </div>
      </div>
    `;
  }

  function openModal(gameId, gameName) {
    currentGameId = gameId;
    offset = 0;
    hasMore = true;

    list.innerHTML = "";
    sub.textContent = gameName ? `@ ${gameName}` : "—";
    avgEl.innerHTML = `<i class="fa-solid fa-star"></i> Avg: —`;
    countEl.innerHTML = `<i class="fa-solid fa-comment"></i> — reviews`;
    btnMore.style.display = "none";

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";

    loadMore();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    currentGameId = null;
  }

  async function loadMore() {
    if (!currentGameId || !hasMore) return;

    btnMore.disabled = true;
    btnMore.textContent = "Loading…";

    try {
      const url = `${URL_COMMENTS}?game=${encodeURIComponent(currentGameId)}&offset=${offset}&limit=${limit}`;
      const res = await fetch(url, { headers: { Accept: "application/json" }, credentials: "same-origin" });
      if (!res.ok) throw new Error("bad response");

      const data = await res.json();

      // meta
      if (typeof data.avg_rating !== "undefined") {
        avgEl.innerHTML = `<i class="fa-solid fa-star"></i> Avg: ${escapeHtml(String(data.avg_rating))}`;
      }
      if (typeof data.count !== "undefined") {
        countEl.innerHTML = `<i class="fa-solid fa-comment"></i> ${escapeHtml(String(data.count))} reviews`;
      }

      const items = Array.isArray(data.items) ? data.items : [];
      items.forEach(it => (list.insertAdjacentHTML("beforeend", rowHtml(it))));

      offset += items.length;
      hasMore = !!data.has_more;

      btnMore.style.display = hasMore ? "" : "none";
    } catch {
      // fallo: muestra algo mínimo
      list.insertAdjacentHTML("beforeend", `<div class="comment-snippet">Error loading comments.</div>`);
      hasMore = false;
      btnMore.style.display = "none";
    } finally {
      btnMore.disabled = false;
      btnMore.textContent = "Load more";
    }
  }

  // abrir desde botones
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-open-comments");
    if (!btn) return;
    e.preventDefault();

    const gameId = btn.getAttribute("data-game-id");
    const gameName = btn.getAttribute("data-game-name") || "Game";
    if (!gameId) return;

    openModal(gameId, gameName);
  });

  // cerrar por backdrop / botón
  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  // esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  // load more
  btnMore?.addEventListener("click", (e) => {
    e.preventDefault();
    loadMore();
  });
});
