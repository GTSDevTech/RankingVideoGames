const DATASETS = {
  platforms_1980s: [
    { id: "nes", name: "NES", coverText: "NES" },
    { id: "mastersystem", name: "Master System", coverText: "SMS" },
    { id: "atari7800", name: "Atari 7800", coverText: "7800" },
    { id: "c64", name: "Commodore 64", coverText: "C64" },
    { id: "pce", name: "PC Engine / TG-16", coverText: "PCE" },
  ],
  platforms_1990s: [
    { id: "snes", name: "SNES", coverText: "SNES" },
    { id: "genesis", name: "Sega Genesis", coverText: "MD" },
    { id: "ps1", name: "PlayStation (PS1)", coverText: "PS1" },
    { id: "n64", name: "Nintendo 64", coverText: "N64" },
    { id: "saturn", name: "Sega Saturn", coverText: "SAT" },
  ],
  platforms_2000s: [
    { id: "ps2", name: "PlayStation 2", coverText: "PS2" },
    { id: "xbox", name: "Xbox (Original)", coverText: "XBX" },
    { id: "gamecube", name: "Nintendo GameCube", coverText: "GC" },
    { id: "nds", name: "Nintendo DS", coverText: "DS" },
    { id: "psp", name: "PSP", coverText: "PSP" },
  ],
  platforms_2010s: [
    { id: "ps4", name: "PlayStation 4", coverText: "PS4" },
    { id: "xone", name: "Xbox One", coverText: "ONE" },
    { id: "switch", name: "Nintendo Switch", coverText: "SW" },
    { id: "3ds", name: "Nintendo 3DS", coverText: "3DS" },
    { id: "pc_steam", name: "PC (Steam)", coverText: "PC" },
  ],
  platforms_2020s: [
    { id: "ps5", name: "PlayStation 5", coverText: "PS5" },
    { id: "xseries", name: "Xbox Series X|S", coverText: "XS" },
    { id: "steamdeck", name: "Steam Deck", coverText: "SD" },
    { id: "switch_oled", name: "Switch OLED", coverText: "OLED" },
    { id: "cloud", name: "Cloud Gaming", coverText: "☁" },
  ],
};

const state = {
  category: "platforms_1980s",
  poolAll: [],
  search: "",
  top5: [null, null, null, null, null], // 0..4
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

categorySelect.addEventListener("change", (e) => loadCategory(e.target.value));

resetBtn.addEventListener("click", () => {
  state.top5 = [null, null, null, null, null];
  renderAll();
});

searchInput.addEventListener("input", (e) => {
  state.search = e.target.value.trim().toLowerCase();
  renderPool();
});

clearSearchBtn.addEventListener("click", () => {
  state.search = "";
  searchInput.value = "";
  renderPool();
});

// Drop back to pool to remove from top
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

loadCategory(state.category);

function loadCategory(key) {
  state.category = key;
  state.poolAll = (DATASETS[key] || []).map((x) => ({ ...x }));
  state.search = "";
  searchInput.value = "";
  state.top5 = [null, null, null, null, null];
  renderAll();
}

function renderAll() {
  renderTop5();
  renderPool();
  renderSelected();
  renderCounts();
}

function renderCounts() {
  poolCount.textContent = String(state.poolAll.length);
  filledCount.textContent = String(state.top5.filter(Boolean).length);
}

function renderPool() {
  const usedIds = new Set(state.top5.filter(Boolean).map((x) => x.id));
  const filtered = state.poolAll.filter((item) => {
    if (!state.search) return true;
    return item.name.toLowerCase().includes(state.search) || item.id.toLowerCase().includes(state.search);
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
  top5List.innerHTML = "";

  for (let i = 0; i < 5; i++) {
    const slotItem = state.top5[i];

    const slot = document.createElement("div");
    slot.className = "rk-slot" + (slotItem ? " filled" : "");
    slot.setAttribute("data-slot-index", String(i));

    slot.innerHTML = `
      <div class="rk-rank">${i + 1}</div>
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

  // allow dragging from top
  top5List.querySelectorAll(".rk-item[draggable='true']").forEach((el) => {
    el.addEventListener("dragstart", onDragStartFromTop);
  });
}

function renderSelected() {
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

function onDragStartFromPool(e) {
  const id = e.currentTarget.getAttribute("data-id");
  const item = state.poolAll.find((x) => x.id === id);
  if (!item) return;

  e.dataTransfer.setData("application/json", JSON.stringify({ source: "pool", item }));
  e.dataTransfer.effectAllowed = "move";
}

function onDragStartFromTop(e) {
  const fromIndex = Number(e.currentTarget.getAttribute("data-top-index"));
  const item = state.top5[fromIndex];
  if (!item) return;

  e.dataTransfer.setData(
    "application/json",
    JSON.stringify({ source: "top", item, fromIndex })
  );
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
    if (existsIndex !== -1) return; // no duplicados
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

function itemHTML(item, { used, draggable, source, topIndex }) {
  const attrs = [];
  attrs.push(`data-id="${escapeHtml(item.id)}"`);
  if (source === "top") attrs.push(`data-top-index="${String(topIndex)}"`);

  const usedClass = used ? " rk-used" : "";

  // Si en el futuro quieres imagen real:
  const cover = item.coverUrl ? `<img src="${escapeHtml(item.coverUrl)}" alt="">` : escapeHtml(item.coverText || "GAME");
  //const cover = escapeHtml(item.coverText || "GAME");

  return `
  {%for g in pag_object.games %}
    <div class="rk-item${usedClass}" draggable="${draggable ? "true" : "false"}" ${attrs.join(" ")}>
      <div class="rk-cover">${escapeHtml(g.cover_url)}</div>
      <div class="rk-info">
        <p class="rk-name">${escapeHtml(g.name)}</p>
        <p class="rk-meta">${escapeHtml(g.platforms)}</p>
      </div>
    </div>
  {%endfor %}
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
