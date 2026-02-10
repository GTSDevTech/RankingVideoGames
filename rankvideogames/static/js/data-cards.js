document.addEventListener("DOMContentLoaded", () => {



  // =========================
  // CARDS expand/collapse
  // =========================
  const cards = Array.from(document.querySelectorAll(".boss-card"));
  if (cards.length) {
    const expanders = document.querySelectorAll(".js-expander");
    const collapsers = document.querySelectorAll(".js-collapser");

    function collapseAll() {
      cards.forEach(c => {
        c.classList.remove("is-expanded");
        c.classList.add("is-collapsed");
        c.classList.remove("is-inactive");
        c.querySelector(".boss-card__inner")?.setAttribute("aria-expanded", "false");
        c.querySelector(".boss-card__expander")?.setAttribute("aria-hidden", "true");
      });
    }

    function expandCard(card) {
      cards.forEach(c => {
        if (c !== card) {
          c.classList.remove("is-expanded");
          c.classList.add("is-collapsed");
          c.classList.add("is-inactive");
          c.querySelector(".boss-card__inner")?.setAttribute("aria-expanded", "false");
          c.querySelector(".boss-card__expander")?.setAttribute("aria-hidden", "true");
        }
      });

      card.classList.remove("is-collapsed");
      card.classList.add("is-expanded");
      card.classList.remove("is-inactive");
      card.querySelector(".boss-card__inner")?.setAttribute("aria-expanded", "true");
      card.querySelector(".boss-card__expander")?.setAttribute("aria-hidden", "false");
    }

    expanders.forEach(el => {
      const handler = () => {
        const card = el.closest(".boss-card");
        if (!card) return;
        if (card.classList.contains("is-collapsed")) expandCard(card);
        else collapseAll();
      };

      el.addEventListener("click", handler);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handler();
        }
      });
    });

    collapsers.forEach(el => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        collapseAll();
      });
    });
  }

  // =========================
  // FILE PICKER
  // =========================
  const input = document.getElementById("updateFileInput");
  const preview = document.getElementById("fileNamePreview");
  const submitBtnCsv = document.getElementById("btnSubmitCsv");

  if (input && preview && submitBtnCsv) {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) {
        preview.textContent = "Ningún archivo seleccionado";
        submitBtnCsv.disabled = true;
        return;
      }
      preview.textContent = file.name;
      submitBtnCsv.disabled = false;
    });
  }

  // =========================
  // MODAL open/close
  // =========================
  const modal = document.getElementById("collectionsModal");
  const openBtns = document.querySelectorAll(".js-open-collections");

  const categoryForm = document.getElementById("categoryForm");
  const categorySubmitBtn = document.getElementById("categorySubmitBtn");

  const CREATE_ACTION = categoryForm ? categoryForm.getAttribute("action") : "";
  const EDIT_ACTION_TEMPLATE = categoryForm?.dataset.editActionTemplate || "/boss/categories/__CODE__/edit/";
  const GAMES_SEARCH_URL = categoryForm?.dataset.gamesSearchUrl || "/boss/games/search/";

  let isEditMode = false;

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    modal.scrollTop = 0;

    // refrescar render (por si había estado anterior)
    applyBrandFilter(currentBrand);
    applyPlatformSearch(platformSearchInput?.value || "");

    // ✅ A: siempre por API. En apertura, solo si hay filtros.
    requestGamesRefresh(true);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";

    if (isEditMode) resetCategoryModalToCreate();
  }

  // ========= reset completo a CREATE =========
  function resetCategoryModalToCreate() {
    isEditMode = false;

    if (categoryForm) categoryForm.action = CREATE_ACTION;

    if (categorySubmitBtn) {
      categorySubmitBtn.disabled = false;
      categorySubmitBtn.textContent = "Save Category";
    }

    // inputs básicos
    const codeInput = document.getElementById("categoryCode");
    if (codeInput) codeInput.value = "";

    const nameInput = document.querySelector('#categoryForm input[name="name"]');
    const descInput = document.querySelector('#categoryForm textarea[name="description"]');
    if (nameInput) nameInput.value = "";
    if (descInput) descInput.value = "";

    const minVotesInput = document.getElementById("minVotesInput") || document.querySelector('#categoryForm input[name="min_votes"]');
    const poolLimitInput = document.getElementById("poolLimitInput") || document.querySelector('#categoryForm input[name="pool_limit"]');
    const sortByInput = document.getElementById("sortByInput") || document.querySelector('#categoryForm input[name="sort_by"]');

    if (minVotesInput) minVotesInput.value = "0";
    if (poolLimitInput) poolLimitInput.value = "200";
    if (sortByInput) sortByInput.value = "popular";

    if (yearFromSelect) yearFromSelect.value = "";
    if (yearToSelect) yearToSelect.value = "";

    // limpiar sets
    selected.platforms.clear();
    selected.genres.clear();
    selected.decades.clear();
    selectedGames.clear();

    // limpiar visual chips
    document.querySelectorAll(".boss-chip[data-group][data-value]").forEach(chip => {
      setChipVisual(chip, false);
    });

    // limpiar searches
    if (platformSearchInput) platformSearchInput.value = "";
    if (gameSearchInput) gameSearchInput.value = "";

    // sync hidden + refresco
    syncHidden();
    syncGames();
    applyBrandFilter(currentBrand);
    applyPlatformSearch("");

    // ✅ A: grid vacío
    clearGamesGrid();
    ensureLoadMoreBtn(false);
    setGamesEmptyState("Select platforms/genres to load games.");
  }

  // Al abrir "Add Categories", SIEMPRE modo create
  openBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      resetCategoryModalToCreate();
      openModal();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        resetCategoryModalToCreate();
        openModal();
      }
    });
  });

  modal?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
  });

  if (categoryForm) {
    categoryForm.addEventListener("submit", () => {
      if (categorySubmitBtn) {
        categorySubmitBtn.disabled = true;
        categorySubmitBtn.textContent = "Saving...";
      }
    });
  }

  // =========================
  // CHIPS selection (platforms/genres/decades)
  // =========================
  const selected = {
    platforms: new Set(),
    genres: new Set(),
    decades: new Set(),
  };

  const platformsJson = document.getElementById("platformsJson");
  const genresJson = document.getElementById("genresJson");
  const decadesJson = document.getElementById("decadesJson");

  function syncHidden() {
    if (platformsJson) platformsJson.value = JSON.stringify(Array.from(selected.platforms));
    if (genresJson) genresJson.value = JSON.stringify(Array.from(selected.genres));
    if (decadesJson) decadesJson.value = JSON.stringify(Array.from(selected.decades));
  }

  function setChipVisual(btn, isSelected) {
    btn.classList.toggle("is-selected", isSelected);
    const x = btn.querySelector(".boss-chip__x");
    if (x) x.textContent = isSelected ? "×" : "+";
  }

  function toggleNormalChip(btn) {
    const group = btn.dataset.group; // platforms|genres
    const value = (btn.dataset.value || "").trim();
    if (!group || !value || !(group in selected)) return;

    const set = selected[group];
    const nowSelected = !set.has(value);

    if (nowSelected) set.add(value);
    else set.delete(value);

    setChipVisual(btn, nowSelected);
    syncHidden();
  }

  // =========================
  // Years + Decades sync
  // =========================
  const yearFromSelect = document.getElementById("yearFromSelect");
  const yearToSelect = document.getElementById("yearToSelect");
  const currentYear = new Date().getFullYear();
  const currentDecade = Math.floor(currentYear / 10) * 10;

  function capSelectToCurrentYear(sel) {
    if (!sel) return;
    [...sel.options].forEach(opt => {
      const v = parseInt(opt.value, 10);
      if (!Number.isNaN(v) && v > currentYear) opt.disabled = true;
    });
    const cur = parseInt(sel.value, 10);
    if (!Number.isNaN(cur) && cur > currentYear) sel.value = "";
  }

  capSelectToCurrentYear(yearFromSelect);
  capSelectToCurrentYear(yearToSelect);

  function setYears(fromY, toY) {
    if (!yearFromSelect || !yearToSelect) return;
    const toCapped = Math.min(toY, currentYear);
    yearFromSelect.value = String(fromY);
    yearToSelect.value = String(toCapped);
  }

  function clearDecadesSelection() {
    selected.decades.clear();
    document.querySelectorAll('#decadeChips .boss-chip[data-group="decades"][data-value]').forEach(btn => {
      setChipVisual(btn, false);
    });
    syncHidden();
  }

  function selectOnlyDecade(decade) {
    selected.decades.clear();
    selected.decades.add(String(decade));
    document.querySelectorAll('#decadeChips .boss-chip[data-group="decades"][data-value]').forEach(btn => {
      const v = parseInt(btn.dataset.value, 10);
      setChipVisual(btn, v === decade);
    });
    syncHidden();
  }

  function handleDecadeClick(btn) {
    const decade = parseInt(btn.dataset.value, 10);
    if (Number.isNaN(decade)) return;
    if (decade > currentDecade) return;

    const already = selected.decades.has(String(decade));
    if (already) {
      clearDecadesSelection();
      requestGamesRefresh(true);
      return;
    }

    selectOnlyDecade(decade);
    setYears(decade, decade + 9);
    requestGamesRefresh(true);
  }

  function normalizeYearRange() {
    if (!yearFromSelect || !yearToSelect) return;

    capSelectToCurrentYear(yearFromSelect);
    capSelectToCurrentYear(yearToSelect);

    const y1 = parseInt(yearFromSelect.value, 10);
    const y2 = parseInt(yearToSelect.value, 10);

    if (!Number.isNaN(y1) && !Number.isNaN(y2) && y1 > y2) {
      yearFromSelect.value = String(y2);
      yearToSelect.value = String(y1);
    }

    const from = parseInt(yearFromSelect.value, 10);
    const to = parseInt(yearToSelect.value, 10);

    if (!Number.isNaN(from) && !Number.isNaN(to) && (from % 10 === 0) && to === Math.min(from + 9, currentYear)) {
      selectOnlyDecade(from);
    } else {
      clearDecadesSelection();
    }
  }

  yearFromSelect?.addEventListener("change", () => {
    normalizeYearRange();
    requestGamesRefresh(true);
  });
  yearToSelect?.addEventListener("change", () => {
    normalizeYearRange();
    requestGamesRefresh(true);
  });

  // =========================
  // Delegación de chips (modal)
  // =========================
  const modalPanel = document.querySelector("#collectionsModal .boss-modal__panel");
  if (modalPanel) {
    modalPanel.addEventListener("click", (e) => {
      const btn = e.target.closest(".boss-chip[data-group][data-value]");
      if (!btn) return;

      const group = btn.dataset.group;
      e.preventDefault();

      if (group === "decades") {
        handleDecadeClick(btn);
        return;
      }

      toggleNormalChip(btn);

      if (group === "platforms") {
        applyBrandFilter(currentBrand);
        applyPlatformSearch(platformSearchInput?.value || "");
      }

      // ✅ cada cambio => API
      requestGamesRefresh(true);
    });
  }

  // =========================
  // Platform brand filter + search (SIN All)
  // =========================
  const brandWrap = document.getElementById("platformBrandChips");
  const platformWrap = document.getElementById("platformChips");
  const platformSearchInput = document.getElementById("platformSearchInput");
  const platformClearBtn = document.getElementById("platformClearBtn");

  let currentBrand = null; // por defecto VACÍO (no muestra nada salvo seleccionados)

  function platformBrandOf(name) {
    const s = (name || "").toLowerCase();

    if (s.includes("nintendo") || s.includes("switch") || s.includes("wii") || s.includes("game boy") || s.includes("gameboy") ||
        s.includes("nes") || s.includes("snes") || s.includes("super nintendo") || s.includes("n64") || s.includes("gamecube") ||
        s.includes("3ds") || s.includes("ds")) return "nintendo";

    if (s.includes("playstation") || s.includes("ps1") || s.includes("ps2") || s.includes("ps3") || s.includes("ps4") || s.includes("ps5") ||
        s.includes("psp") || s.includes("vita")) return "sony";

    if (s.includes("xbox") || s.includes("microsoft")) return "microsoft";

    if (s.includes("sega") || s.includes("dreamcast") || s.includes("saturn") || s.includes("genesis") || s.includes("mega drive") ||
        s.includes("game gear") || s.includes("master system")) return "sega";

    if (s.includes("pc") || s.includes("windows") || s.includes("steam") || s.includes("linux") || s.includes("mac") || s.includes("dos")) return "pc";

    return "other";
  }

  function applyBrandFilter(brand) {
    if (!platformWrap) return;

    const chips = platformWrap.querySelectorAll('.boss-chip[data-group="platforms"][data-value]');
    chips.forEach(btn => {
      const selectedNow = btn.classList.contains("is-selected");
      if (selectedNow) { btn.style.display = ""; return; }

      if (!brand) { btn.style.display = "none"; return; }

      const val = btn.dataset.value || "";
      btn.style.display = (platformBrandOf(val) === brand) ? "" : "none";
    });
  }

  function applyPlatformSearch(query) {
    if (!platformWrap) return;
    const q = (query || "").trim().toLowerCase();

    const chips = platformWrap.querySelectorAll('.boss-chip[data-group="platforms"][data-value]');
    chips.forEach(btn => {
      if (btn.classList.contains("is-selected")) return;
      if (btn.style.display === "none") return;

      if (!q) return;

      const text = (btn.dataset.value || "").toLowerCase();
      btn.style.display = text.includes(q) ? "" : "none";
    });
  }

  function setBrandSelected(btn) {
    const same = btn.classList.contains("is-selected");

    brandWrap?.querySelectorAll(".boss-chip[data-brand]").forEach(b => {
      b.classList.remove("is-selected");
      const x = b.querySelector(".boss-chip__x");
      if (x) x.textContent = "+";
    });

    if (same) { currentBrand = null; return; }

    btn.classList.add("is-selected");
    const x = btn.querySelector(".boss-chip__x");
    if (x) x.textContent = "×";
    currentBrand = btn.dataset.brand || null;
  }

  if (brandWrap) {
    brandWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".boss-chip[data-brand]");
      if (!btn) return;
      e.preventDefault();

      setBrandSelected(btn);
      applyBrandFilter(currentBrand);
      applyPlatformSearch(platformSearchInput?.value || "");
    });

    applyBrandFilter(currentBrand); // inicial vacío
  }

  platformSearchInput?.addEventListener("input", () => {
    applyBrandFilter(currentBrand);
    applyPlatformSearch(platformSearchInput.value);
  });

  platformClearBtn?.addEventListener("click", () => {
    if (platformSearchInput) platformSearchInput.value = "";
    applyBrandFilter(currentBrand);
    applyPlatformSearch("");
  });

  // =========================
  // GAMES: server search + select (A)
  // =========================
  const gameSearchInput = document.getElementById("gameSearchInput");
  const gameClearBtn = document.getElementById("gameClearBtn");
  const gameGrid = document.getElementById("gamePreviewGrid");
  const gameEmpty = document.getElementById("gamePreviewEmpty");
  const gamesJson = document.getElementById("gamesJson");

  const selectedGames = new Set();

  function syncGames() {
    if (gamesJson) gamesJson.value = JSON.stringify(Array.from(selectedGames));
  }

  function hasAnyFilter() {
    return selected.platforms.size > 0 || selected.genres.size > 0;
  }

  // ---------- Render helpers ----------
  function clearGamesGrid() {
    if (!gameGrid) return;
    gameGrid.innerHTML = "";
  }

  function setGamesEmptyState(text) {
    if (!gameEmpty) return;
    gameEmpty.style.display = "";
    gameEmpty.textContent = text || "No games match your filters.";
  }

  function hideGamesEmptyState() {
    if (!gameEmpty) return;
    gameEmpty.style.display = "none";
  }

  function buildGameButton(item) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "boss-game";
    btn.dataset.id = item.id || "";
    btn.dataset.name = item.name || "";

    if (selectedGames.has(String(item.id))) btn.classList.add("is-selected");

    const coverWrap = document.createElement("div");
    coverWrap.className = "boss-game__cover";

    if (item.coverUrl) {
      const img = document.createElement("img");
      img.src = item.coverUrl;
      img.alt = item.name || "";
      coverWrap.appendChild(img);
    } else {
      const empty = document.createElement("div");
      empty.className = "boss-game__cover--empty";
      empty.textContent = "No image";
      coverWrap.appendChild(empty);
    }

    const info = document.createElement("div");
    info.className = "boss-game__info";
    const name = document.createElement("span");
    name.className = "boss-game__name";
    name.textContent = item.name || "";
    info.appendChild(name);

    btn.appendChild(coverWrap);
    btn.appendChild(info);
    return btn;
  }

  // ---------- Pagination UI ----------
  let currentPage = 1;
  let pageSize = 60;
  let hasMore = false;

  function ensureLoadMoreBtn(show) {
    if (!gameGrid) return;

    let wrap = document.getElementById("bossLoadMoreWrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "bossLoadMoreWrap";
      wrap.style.display = "none";
      wrap.style.marginTop = "10px";
      wrap.style.textAlign = "center";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "bossLoadMoreBtn";
      btn.className = "boss-btn boss-btn--ghost";
      btn.textContent = "Load more";
      btn.addEventListener("click", () => {
        if (hasMore) fetchGames({ resetPage: false });
      });

      wrap.appendChild(btn);

      // Insertar después del grid
      gameGrid.parentElement?.appendChild(wrap);
    }

    wrap.style.display = show ? "" : "none";
  }

  function setLoadMoreLoading(isLoading) {
    const btn = document.getElementById("bossLoadMoreBtn");
    if (!btn) return;
    btn.disabled = !!isLoading;
    btn.textContent = isLoading ? "Loading..." : "Load more";
  }

  // ---------- Debounce + Abort ----------
  let fetchTimer = null;
  let activeController = null;

  function requestGamesRefresh(resetPage) {
    if (!modal?.classList.contains("is-open")) return;

    window.clearTimeout(fetchTimer);
    fetchTimer = window.setTimeout(() => {
      fetchGames({ resetPage });
    }, 200);
  }

  function getQueryParamsForGames(page, size) {
    const params = new URLSearchParams();

    const q = (gameSearchInput?.value || "").trim();
    if (q) params.set("q", q);

    params.set("platforms_any_json", JSON.stringify(Array.from(selected.platforms)));
    params.set("genres_any_json", JSON.stringify(Array.from(selected.genres)));

    const yFrom = (yearFromSelect?.value || "").trim();
    const yTo = (yearToSelect?.value || "").trim();
    if (yFrom) params.set("year_from", yFrom);
    if (yTo) params.set("year_to", yTo);

    params.set("page", String(page));
    params.set("page_size", String(size));

    return params;
  }

  async function fetchGames({ resetPage }) {
    if (!gameGrid) return;

    // ✅ A: sin filtros => grid vacío
    if (!hasAnyFilter()) {
      clearGamesGrid();
      ensureLoadMoreBtn(false);

      if (selectedGames.size === 0) {
        setGamesEmptyState("Select platforms/genres to load games.");
      } else {
        setGamesEmptyState("Selected games are kept. Choose platforms/genres to search more games.");
      }
      return;
    }

    if (resetPage) {
      currentPage = 1;
      clearGamesGrid();
      ensureLoadMoreBtn(false);
    }

    if (activeController) activeController.abort();
    activeController = new AbortController();

    const params = getQueryParamsForGames(currentPage, pageSize);
    const url = `${GAMES_SEARCH_URL}?${params.toString()}`;

    if (resetPage) {
      setGamesEmptyState("Loading games...");
    } else {
      setLoadMoreLoading(true);
    }

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: activeController.signal,
      });

      if (!res.ok) {
        clearGamesGrid();
        ensureLoadMoreBtn(false);
        setGamesEmptyState("Error loading games.");
        return;
      }

      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      hasMore = !!data.has_more;

      // Orden: seleccionados primero (si aparecen en la página)
      const seen = new Set();
      const selectedFirst = [];
      const rest = [];

      for (const it of items) {
        const id = String(it.id || "");
        if (!id || seen.has(id)) continue;
        seen.add(id);

        if (selectedGames.has(id)) selectedFirst.push(it);
        else rest.push(it);
      }

      const finalList = selectedFirst.concat(rest);

      if (finalList.length === 0) {
        clearGamesGrid();
        ensureLoadMoreBtn(false);
        setGamesEmptyState("No games match your filters.");
        return;
      }

      hideGamesEmptyState();

      const frag = document.createDocumentFragment();
      finalList.forEach(it => frag.appendChild(buildGameButton(it)));
      gameGrid.appendChild(frag);

      ensureLoadMoreBtn(hasMore);
      setLoadMoreLoading(false);

      // avanzar página
      if (resetPage) currentPage = 2;
      else currentPage += 1;

    } catch (err) {
      if (err?.name === "AbortError") return;
      clearGamesGrid();
      ensureLoadMoreBtn(false);
      setGamesEmptyState("Error loading games.");
    }
  }

  // click to select game id
  gameGrid?.addEventListener("click", (e) => {
    const btn = e.target.closest(".boss-game");
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    const willSelect = !selectedGames.has(String(id));
    btn.classList.toggle("is-selected", willSelect);

    if (willSelect) selectedGames.add(String(id));
    else selectedGames.delete(String(id));

    syncGames();
  });

  gameSearchInput?.addEventListener("input", () => requestGamesRefresh(true));
  gameClearBtn?.addEventListener("click", () => {
    if (gameSearchInput) gameSearchInput.value = "";
    requestGamesRefresh(true);
  });

  // init A
  syncHidden();
  syncGames();
  applyBrandFilter(currentBrand);
  applyPlatformSearch("");

  clearGamesGrid();
  ensureLoadMoreBtn(false);
  setGamesEmptyState("Select platforms/genres to load games.");

  // =========================
  // EDIT CATEGORY
  // =========================
  document.querySelectorAll(".js-edit-category").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".boss-cat-card");
      if (!card) return;

      const code = card.dataset.code;

      // inputs básicos
      document.getElementById("categoryCode").value = code;
      document.querySelector('#categoryForm input[name="name"]').value = card.dataset.name || "";
      document.querySelector('#categoryForm textarea[name="description"]').value = card.dataset.description || "";

      const poolInput = document.getElementById("poolLimitInput") || document.querySelector('#categoryForm input[name="pool_limit"]');
      const sortInput = document.getElementById("sortByInput") || document.querySelector('#categoryForm input[name="sort_by"]');
      if (poolInput) poolInput.value = card.dataset.pool || 200;
      if (sortInput) sortInput.value = card.dataset.sort || "popular";

      // reset selecciones
      selected.platforms.clear();
      selected.genres.clear();
      selected.decades.clear();
      selectedGames.clear();

      try {
        const gamesArr = JSON.parse(card.dataset.games || "[]");
        gamesArr.forEach(id => selectedGames.add(String(id)));
      } catch (e) {
        console.warn("Invalid data-games", e, card.dataset.games);
      }

      if (yearFromSelect) yearFromSelect.value = "";
      if (yearToSelect) yearToSelect.value = "";

      syncHidden();
      syncGames();

      document.querySelectorAll(".boss-chip[data-group][data-value]").forEach(chip => {
        setChipVisual(chip, false);
      });

      // ✅ A: en edit también grid vacío hasta que filtres
      clearGamesGrid();
      ensureLoadMoreBtn(false);
      if (selectedGames.size > 0) {
        setGamesEmptyState("Selected games are kept. Choose platforms/genres to search more games.");
      } else {
        setGamesEmptyState("Select platforms/genres to load games.");
      }

      if (categoryForm) {
        const tpl = EDIT_ACTION_TEMPLATE || "/boss/categories/__CODE__/edit/";
        categoryForm.action = tpl.replace("__CODE__", String(code));
      }
      if (categorySubmitBtn) categorySubmitBtn.textContent = "Update Category";

      isEditMode = true;
      openModal();
    });
  });

  // =========================
  // DELETE
  // =========================
  document.querySelectorAll(".js-delete-category").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".boss-cat-card");
      if (!card) return;

      const code = card.dataset.code;
      const name = card.dataset.name;

      if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;

      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/boss/categories/${code}/delete/`;

      const csrf = document.querySelector("[name=csrfmiddlewaretoken]")?.cloneNode();
      if (csrf) form.appendChild(csrf);

      document.body.appendChild(form);
      form.submit();
    });
  });

});

