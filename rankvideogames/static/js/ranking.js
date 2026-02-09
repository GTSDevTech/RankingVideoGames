const state = {
  category: null,
  categoryName: "",
  poolAll: [],
  search: "",
  top5: [null, null, null, null, null],
};

document.addEventListener("DOMContentLoaded", () => {
  const wrap = document.getElementById("rankingBuilderWrap");

  const rankingNameInput = document.getElementById("rankingNameInput");

  const categorySelect = document.getElementById("categorySelect");
  const resetBtn = document.getElementById("resetBtn");
  const poolGrid = document.getElementById("poolGrid");
  const top5List = document.getElementById("top5List");
  const selectedList = document.getElementById("selectedList");

  const poolCount = document.getElementById("poolCount");
  const filledCount = document.getElementById("filledCount");

  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");

  const saveRankingBtn = document.getElementById("saveRankingBtn");
  const saveMsg = document.getElementById("saveMsg");

  const apiBase = categorySelect?.dataset?.apiBase || "/ranking/pool/";
  const myRankingUrl = window.RK?.myRankingUrl || "/ranking/my/";
  const saveUrl = window.RK?.saveUrl || "/ranking/save/";

  let saving = false;

  function openBuilderModal() {
    if (!wrap) return;
    wrap.classList.add("is-open");
    wrap.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
  }

  function closeBuilderModal() {
    if (!wrap) return;
    wrap.classList.remove("is-open");
    wrap.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  }

  wrap?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeBuilderModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrap?.classList.contains("is-open")) closeBuilderModal();
  });

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }
  const csrftoken = getCookie("csrftoken");

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeParse(s) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  function setCenteredDragImage(ev, el) {
    const clone = el.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.top = "-1000px";
    clone.style.left = "-1000px";
    clone.style.width = `${el.offsetWidth}px`;
    clone.style.height = `${el.offsetHeight}px`;
    clone.style.pointerEvents = "none";
    document.body.appendChild(clone);
    ev.dataTransfer.setDragImage(clone, el.offsetWidth / 2, el.offsetHeight / 2);
    requestAnimationFrame(() => clone.remove());
  }

  function rankIconClass(i) {
    if (i === 0) return "bxs-trophy";
    if (i === 1) return "bxs-medal";
    if (i === 2) return "bx-medal";
    if (i === 3) return "bx-award";
    return "bx-award";
  }

  function renderCounts() {
    if (poolCount) poolCount.textContent = String(state.poolAll.length);
    if (filledCount) filledCount.textContent = String(state.top5.filter(Boolean).length);
  }

  function renderSelected() {
    if (!selectedList) return;

    const rows = state.top5
      .map((x, idx) => ({ x, idx }))
      .filter((r) => r.x);

    if (!rows.length) {
      selectedList.innerHTML = `<div class="text-white-50">Aún no hay elementos en tu Top 5.</div>`;
      return;
    }

    selectedList.innerHTML = rows
      .map(
        ({ x, idx }) => `
          <div class="rk-selected-row">
            <div class="d-flex align-items-center gap-2">
              <span class="rk-pill">#${idx + 1}</span>
              <strong>${escapeHtml(x.name)}</strong>
            </div>
            <small>${escapeHtml(x.id)}</small>
          </div>
        `
      )
      .join("");
  }

  function itemHTML(item, { used, draggable, source, topIndex }) {
    const attrs = [];
    attrs.push(`data-id="${escapeHtml(item.id)}"`);
    if (source === "top") attrs.push(`data-top-index="${String(topIndex)}"`);

    const usedClass = used ? " rk-used" : "";
    const cover = item.coverUrl
      ? `<img src="${escapeHtml(item.coverUrl)}" alt="">`
      : `<div class="rk-cover-fallback">No cover</div>`;

    return `
      <div class="rk-item${usedClass}" draggable="${draggable ? "true" : "false"}" ${attrs.join(" ")}>
        <div class="rk-cover">${cover}</div>
        <div class="rk-info">
          <p class="rk-name">${escapeHtml(item.name)}</p>
          <p class="rk-meta">${escapeHtml(item.platforms || "")}</p>
        </div>
      </div>
    `;
  }

  function renderPool() {
    if (!poolGrid) return;

    const usedIds = new Set(state.top5.filter(Boolean).map((x) => x.id));
    const filtered = state.poolAll.filter((item) => {
      if (!state.search) return true;
      return (
        (item.name || "").toLowerCase().includes(state.search) ||
        (item.id || "").toLowerCase().includes(state.search)
      );
    });

    poolGrid.innerHTML = filtered
      .map((item) => {
        const used = usedIds.has(item.id);
        return itemHTML(item, { used, draggable: !used, source: "pool" });
      })
      .join("");

    poolGrid.querySelectorAll(".rk-item[draggable='true']").forEach((el) => {
      el.addEventListener("dragstart", onDragStartFromPool);
    });
  }

  function renderTop5() {
    if (!top5List) return;

    top5List.innerHTML = "";

    for (let i = 0; i < 5; i++) {
      const slotItem = state.top5[i];

      const slot = document.createElement("div");
      slot.className = "rk-slot" + (slotItem ? " filled" : "");
      slot.setAttribute("data-slot-index", String(i));

      slot.innerHTML = `
        <div class="rk-rank rk-rank--${i + 1}">
          <i class="bx ${rankIconClass(i)}"></i>
        </div>
        <div class="rk-slot-body">
          ${
            slotItem
              ? itemHTML(slotItem, { used: false, draggable: true, source: "top", topIndex: i })
              : `<div>Suelta aquí</div>`
          }
        </div>
      `;

      slot.addEventListener("dragenter", (e) => e.currentTarget.classList.add("hover"));
      slot.addEventListener("dragover", (e) => e.preventDefault());
      slot.addEventListener("dragleave", (e) => e.currentTarget.classList.remove("hover"));
      slot.addEventListener("drop", onSlotDrop);

      top5List.appendChild(slot);
    }

    top5List.querySelectorAll(".rk-item[draggable='true']").forEach((el) => {
      el.addEventListener("dragstart", onDragStartFromTop);
    });
  }

  function renderAll() {
    renderTop5();
    renderPool();
    renderSelected();
    renderCounts();
  }

  function onDragStartFromPool(e) {
    const id = e.currentTarget.getAttribute("data-id");
    const item = state.poolAll.find((x) => x.id === id);
    if (!item) return;

    setCenteredDragImage(e, e.currentTarget);
    e.dataTransfer.setData("application/json", JSON.stringify({ source: "pool", item }));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragStartFromTop(e) {
    const fromIndex = Number(e.currentTarget.getAttribute("data-top-index"));
    const item = state.top5[fromIndex];
    if (!item) return;

    setCenteredDragImage(e, e.currentTarget);
    e.dataTransfer.setData("application/json", JSON.stringify({ source: "top", item, fromIndex }));
    e.dataTransfer.effectAllowed = "move";
  }

  function onSlotDrop(e) {
    e.preventDefault();
    const slotEl = e.currentTarget;
    slotEl.classList.remove("hover");

    const toIndex = Number(slotEl.getAttribute("data-slot-index"));
    const payload = safeParse(e.dataTransfer.getData("application/json"));
    if (!payload || !payload.item) return;

    const existsIndex = state.top5.findIndex((x) => x && x.id === payload.item.id);

    if (payload.source === "pool") {
      if (existsIndex !== -1) return;
      state.top5[toIndex] = payload.item;
      renderAll();
      return;
    }

    if (payload.source === "top") {
      const fromIndex = payload.fromIndex;
      if (Number.isNaN(fromIndex)) return;
      if (fromIndex === toIndex) return;

      const tmp = state.top5[toIndex];
      state.top5[toIndex] = state.top5[fromIndex];
      state.top5[fromIndex] = tmp;

      renderAll();
    }
  }

  async function loadCategory(code) {
    state.category = String(code || "").trim();
    state.search = "";
    if (searchInput) searchInput.value = "";
    state.top5 = [null, null, null, null, null];
    if (saveMsg) saveMsg.textContent = "";

    if (poolGrid) poolGrid.innerHTML = `<div class="text-white-50">Cargando…</div>`;
    if (poolCount) poolCount.textContent = "0";
    if (filledCount) filledCount.textContent = "0";

    const url = `${apiBase}?category=${encodeURIComponent(state.category)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("loadCategory failed");

    const data = await res.json();
    state.poolAll = (data.items || []).map((x) => ({
      id: String(x.id),
      name: x.name || "",
      coverUrl: x.coverUrl || x.cover_url || "",
      platforms: x.platforms || "",
    }));

    renderAll();
  }

  async function loadMyRanking(code) {
    const res = await fetch(`${myRankingUrl}?category=${encodeURIComponent(code)}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });

    if (res.status === 404) return;
    if (!res.ok) return;

    const data = await res.json().catch(() => ({}));
    const ids = Array.isArray(data.top5) ? data.top5 : [];
    if (ids.length !== 5) return;

    const map = new Map(state.poolAll.map((x) => [String(x.id), x]));
    state.top5 = ids.map((id) => map.get(String(id)) || null);

    renderAll();
  }

  async function saveRanking() {
    if (saving) return;

    if (saveMsg) saveMsg.textContent = "";

    const top5 = state.top5.map((x) => (x ? Number(x.id) : null));
    if (top5.some((v) => v === null || Number.isNaN(v))) {
      if (saveMsg) saveMsg.textContent = "Completa el Top 5 antes de guardar.";
      return;
    }

    saving = true;
    if (saveRankingBtn) saveRankingBtn.disabled = true;

    try {
      const res = await fetch(saveUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          categoryCode: Number(state.category),
          top5,
          name: (rankingNameInput?.value || "").trim() || `Top 5 ${state.categoryName || ""}`.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (saveMsg) saveMsg.textContent = data?.error || `Error guardando (${res.status})`;
        saving = false;
        if (saveRankingBtn) saveRankingBtn.disabled = false;
        return;
      }

      if (saveMsg) saveMsg.textContent = data.updated ? "Ranking actualizado" : "Ranking guardado";
      closeBuilderModal();

      saving = false;
      if (saveRankingBtn) saveRankingBtn.disabled = false;
    } catch {
      if (saveMsg) saveMsg.textContent = "Error guardando Ranking";
      saving = false;
      if (saveRankingBtn) saveRankingBtn.disabled = false;
    }
  }

  function applyCategoryFromCard(cardEl) {
    const code = cardEl?.dataset?.code || "";
    const name = cardEl?.dataset?.name || "";

    state.categoryName = String(name || "").trim();

    if (rankingNameInput) {
      rankingNameInput.value = `Top 5 ${state.categoryName}`.trim();
    }

    if (categorySelect && code) {
      categorySelect.value = String(code);
    }

    if (saveMsg) saveMsg.textContent = "";

    openBuilderModal();

    loadCategory(code)
      .then(() => loadMyRanking(code))
      .catch(() => {
        if (poolGrid) poolGrid.innerHTML = `<div class="text-white-50">Error cargando listado.</div>`;
      });
  }

  document.querySelectorAll(".boss-cat-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".js-edit-category, .js-delete-category")) return;
      applyCategoryFromCard(card);
    });
  });

  categorySelect?.addEventListener("change", (e) => {
    const code = e.target.value;
    const opt = e.target.selectedOptions?.[0];
    state.categoryName = (opt?.textContent || "").trim();
    if (rankingNameInput) {
      rankingNameInput.value = `Top 5 ${state.categoryName}`.trim();
    }
    loadCategory(code).then(() => loadMyRanking(code)).catch(() => {});
  });

  resetBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    state.top5 = [null, null, null, null, null];
    if (saveMsg) saveMsg.textContent = "";
    renderAll();
  });

  searchInput?.addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    renderPool();
  });

  clearSearchBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    state.search = "";
    if (searchInput) searchInput.value = "";
    renderPool();
  });

  if (poolGrid) {
    poolGrid.addEventListener("dragover", (e) => e.preventDefault());
    poolGrid.addEventListener("drop", (e) => {
      e.preventDefault();
      const payload = safeParse(e.dataTransfer.getData("application/json"));
      if (!payload) return;

      if (payload.source === "top" && typeof payload.fromIndex === "number") {
        state.top5[payload.fromIndex] = null;
        renderAll();
      }
    });
  }

  saveRankingBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    saveRanking();
    window.location.reload();
  });
});
