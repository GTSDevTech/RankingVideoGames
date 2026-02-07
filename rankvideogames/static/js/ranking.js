const state = {
  category: null,
  poolAll: [],
  search: "",
  top5: [null, null, null, null, null],
};

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

const apiBase = categorySelect?.dataset?.apiBase || "/api/ranking/pool/";

// ============== CSRF (Django) ==============
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}
const csrftoken = getCookie("csrftoken");

// ============== Drag image centered ==============
function setCenteredDragImage(ev, el) {
  const clone = el.cloneNode(true);
  clone.style.position = "absolute";
  clone.style.top = "-1000px";
  clone.style.left = "-1000px";
  clone.style.width = `${el.offsetWidth}px`;
  clone.style.height = `${el.offsetHeight}px`;
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);

  // Centro exacto
  ev.dataTransfer.setDragImage(clone, el.offsetWidth / 2, el.offsetHeight / 2);

  requestAnimationFrame(() => clone.remove());
}

// ============== Listeners ==============
if (categorySelect) {
  categorySelect.addEventListener("change", (e) => loadCategory(e.target.value));
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    state.top5 = [null, null, null, null, null];
    if (saveMsg) saveMsg.textContent = "";
    renderAll();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    renderPool();
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    state.search = "";
    if (searchInput) searchInput.value = "";
    renderPool();
  });
}

// Drop back to pool to remove from top
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

// init
if (categorySelect && categorySelect.value) {
  loadCategory(categorySelect.value);
}

// ============== Load category ==============
async function loadCategory(code) {
  state.category = code;
  state.search = "";
  if (searchInput) searchInput.value = "";
  state.top5 = [null, null, null, null, null];
  if (saveMsg) saveMsg.textContent = "";

  if (poolGrid) poolGrid.innerHTML = `<div class="text-white-50">Cargando…</div>`;
  if (poolCount) poolCount.textContent = "0";
  if (filledCount) filledCount.textContent = "0";

  try {
    const url = `${apiBase}?category=${encodeURIComponent(code)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Bad response: ${res.status}`);
    const data = await res.json();

    state.poolAll = (data.items || []).map((x) => ({
      id: String(x.id),
      name: x.name || "",
      coverUrl: x.coverUrl || x.cover_url || "",
      platforms: x.platforms || "",
    }));

    renderAll();
  } catch (err) {
    console.error("loadCategory error:", err);
    if (poolGrid) poolGrid.innerHTML = `<div class="text-white-50">Error cargando listado.</div>`;
  }
}

function rankIconClass(i) {
  // 1º,2º,3º medallas / 4º,5º badge + crown
  if (i === 0) return "bxs-trophy";
  if (i === 1) return "bxs-medal";
  if (i === 2) return "bx-medal";
  if (i === 3) return "bx-award";
  return "bx-award";
}

// ============== Render ==============
function renderAll() {
  renderTop5();
  renderPool();
  renderSelected();
  renderCounts();
}

function renderCounts() {
  if (poolCount) poolCount.textContent = String(state.poolAll.length);
  if (filledCount) filledCount.textContent = String(state.top5.filter(Boolean).length);
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
      <div class="rk-rank rk-rank--${i+1}">
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

    slot.addEventListener("dragenter", onSlotEnter);
    slot.addEventListener("dragover", onSlotOver);
    slot.addEventListener("dragleave", onSlotLeave);
    slot.addEventListener("drop", onSlotDrop);

    top5List.appendChild(slot);
  }

  top5List.querySelectorAll(".rk-item[draggable='true']").forEach((el) => {
    el.addEventListener("dragstart", onDragStartFromTop);
  });
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
    .map(({ x, idx }) => {
      return `
        <div class="rk-selected-row">
          <div class="d-flex align-items-center gap-2">
            <span class="rk-pill">#${idx + 1}</span>
            <strong>${escapeHtml(x.name)}</strong>
          </div>
          <small>${escapeHtml(x.id)}</small>
        </div>
      `;
    })
    .join("");
}

// ============== Drag handlers ==============
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

function onSlotEnter(e) {
  e.currentTarget.classList.add("hover");
}
function onSlotOver(e) {
  e.preventDefault();
}
function onSlotLeave(e) {
  e.currentTarget.classList.remove("hover");
}

function onSlotDrop(e) {
  e.preventDefault();
  const slotEl = e.currentTarget;
  slotEl.classList.remove("hover");

  const toIndex = Number(slotEl.getAttribute("data-slot-index"));
  const payload = safeParse(e.dataTransfer.getData("application/json"));
  if (!payload || !payload.item) return;

  const existsIndex = state.top5.findIndex((x) => x && x.id === payload.item.id);

  // pool -> top
  if (payload.source === "pool") {
    if (existsIndex !== -1) return;
    state.top5[toIndex] = payload.item;
    renderAll();
    return;
  }

  // top -> reorder (swap)
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

// ============== HTML builder ==============
function itemHTML(item, { used, draggable, source, topIndex }) {
  const attrs = [];
  attrs.push(`data-id="${escapeHtml(item.id)}"`);

  const safeTopIndex = Number.isFinite(topIndex) ? topIndex : 0;
  if (source === "top") attrs.push(`data-top-index="${String(safeTopIndex)}"`);

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

// ============== Utils ==============
function escapeHtml(str) {
  return String(str)
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

// ============== Save ranking (matches your save_ranking) ==============
saveRankingBtn?.addEventListener("click", async () => {
  if (saveMsg) saveMsg.textContent = "";

  // Convertimos a Number porque tu save_ranking espera ints
  const top5 = state.top5.map((x) => (x ? Number(x.id) : null));

  if (top5.some((v) => v === null || Number.isNaN(v))) {
    if (saveMsg) saveMsg.textContent = "Completa el Top 5 antes de guardar.";
    return;
  }

  try {
    const res = await fetch("/api/ranking/save/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
        "Accept": "application/json",
      },
      body: JSON.stringify({
        categoryCode: Number(state.category),
        top5,
      }),
    });

    if (!res.ok) {
      let msg = `Error guardando (${res.status})`;
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {}
      if (saveMsg) saveMsg.textContent = msg;
      return;
    }

    if (saveMsg) saveMsg.textContent = "Ranking guardado correctamente";
  } catch (err) {
    console.error(err);
    if (saveMsg) saveMsg.textContent = "Error guardando Ranking";
  }
});
