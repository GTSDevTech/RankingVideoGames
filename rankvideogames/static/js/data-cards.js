document.addEventListener("DOMContentLoaded", () => {

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

  // Guardamos el action de CREATE para poder volver a él siempre
  const CREATE_ACTION = categoryForm ? categoryForm.getAttribute("action") : "";
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
    applyGameFilters();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";

    // ✅ FIX: al cerrar, vuelve a modo CREATE para que no "se quede en edit"
    if (isEditMode) resetCategoryModalToCreate();
  }

  // ========= reset completo a CREATE (sin cargarte nada de tu lógica) =========
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

    const minVotesInput = document.querySelector('#categoryForm input[name="min_votes"]');
    const poolLimitInput = document.querySelector('#categoryForm input[name="pool_limit"]');
    const sortByInput = document.querySelector('#categoryForm input[name="sort_by"]');

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

    // limpiar visual juegos
    document.querySelectorAll(".boss-game.is-selected").forEach(b => b.classList.remove("is-selected"));

    // limpiar searches
    if (platformSearchInput) platformSearchInput.value = "";
    if (gameSearchInput) gameSearchInput.value = "";

    // sync hidden + refresco
    syncHidden();
    syncGames();
    applyBrandFilter(currentBrand);
    applyPlatformSearch("");
    applyGameFilters();
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
      return;
    }

    selectOnlyDecade(decade);
    setYears(decade, decade + 9);
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

  yearFromSelect?.addEventListener("change", () => { normalizeYearRange(); applyGameFilters(); });
  yearToSelect?.addEventListener("change", () => { normalizeYearRange(); applyGameFilters(); });

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

      if (group === "decades") handleDecadeClick(btn);
      else toggleNormalChip(btn);

      // refrescos
      if (group === "platforms") {
        applyBrandFilter(currentBrand);
        applyPlatformSearch(platformSearchInput?.value || "");
      }
      applyGameFilters();
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
  // GAMES: filter + select
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

  // Regla: si NO hay plataformas ni géneros seleccionados => NO mostramos lista
  function hasAnyFilter() {
    return selected.platforms.size > 0 || selected.genres.size > 0;
  }

  function matchesFilters(btn) {
    const id = String(btn.dataset.id || "");

    // ✅ los seleccionados siempre visibles (aunque no cumplan filtros)
    if (selectedGames.has(id)) return true;

    if (!hasAnyFilter()) return false;

    const plats = (btn.dataset.platforms || "").toLowerCase();
    const gens = (btn.dataset.genres || "").toLowerCase();

    // platforms OR
    if (selected.platforms.size > 0) {
      let ok = false;
      selected.platforms.forEach(p => { if (plats.includes(String(p).toLowerCase())) ok = true; });
      if (!ok) return false;
    }

    // genres OR
    if (selected.genres.size > 0) {
      let ok = false;
      selected.genres.forEach(g => { if (gens.includes(String(g).toLowerCase())) ok = true; });
      if (!ok) return false;
    }

    // search by name
    const q = (gameSearchInput?.value || "").trim().toLowerCase();
    if (q) {
      const name = (btn.dataset.name || "").toLowerCase();
      if (!name.includes(q)) return false;
    }

    return true;
  }

  function applyGameFilters() {
    if (!gameGrid) return;

    let visibleCount = 0;
    const buttons = gameGrid.querySelectorAll(".boss-game");

    buttons.forEach(btn => {
      const show = matchesFilters(btn);
      btn.style.display = show ? "" : "none";
      if (show) visibleCount++;
    });

    // empty message
    if (gameEmpty) {
      if (!hasAnyFilter() && selectedGames.size === 0) {
        gameEmpty.style.display = "";
        gameEmpty.textContent = "Select platforms/genres to load games.";
      } else if (visibleCount === 0) {
        gameEmpty.style.display = "";
        gameEmpty.textContent = "No games match your filters.";
      } else {
        gameEmpty.style.display = "none";
      }
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
    applyGameFilters(); // para mantener visibles seleccionados
  });

  gameSearchInput?.addEventListener("input", applyGameFilters);
  gameClearBtn?.addEventListener("click", () => {
    if (gameSearchInput) gameSearchInput.value = "";
    applyGameFilters();
  });

  // init
  syncHidden();
  syncGames();
  applyBrandFilter(currentBrand);
  applyPlatformSearch("");
  applyGameFilters();

  /// =========================
// EDIT CATEGORY (modo profe: cargar games[] y marcar seleccionados)
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

    const poolInput = document.querySelector('#categoryForm input[name="pool_limit"]');
    const sortInput = document.querySelector('#categoryForm input[name="sort_by"]');
    if (poolInput) poolInput.value = card.dataset.pool || 200;
    if (sortInput) sortInput.value = card.dataset.sort || "popular";

    // reset selecciones
    selected.platforms.clear();
    selected.genres.clear();
    selected.decades.clear();
    selectedGames.clear();

    // limpiar visual de juegos
    document.querySelectorAll(".boss-game.is-selected").forEach(b => b.classList.remove("is-selected"));


    try {
      const gamesArr = JSON.parse(card.dataset.games || "[]"); // <-- data-games='[...]'
      gamesArr.forEach(id => selectedGames.add(String(id)));
    } catch (e) {
      console.warn("Invalid data-games", e, card.dataset.games);
    }

    // years (si en modo profe no los usas, déjalos vacíos)
    if (yearFromSelect) yearFromSelect.value = "";
    if (yearToSelect) yearToSelect.value = "";

    // sync hidden inputs
    syncHidden(); // (aunque no uses platforms/genres ahora, no molesta)
    syncGames();  // <-- mete selectedGames en #gamesJson

    // chips visualmente a OFF (modo profe)
    document.querySelectorAll(".boss-chip[data-group][data-value]").forEach(chip => {
      setChipVisual(chip, false);
    });

    // marcar juegos visualmente (solo los que existan en DOM)
    document.querySelectorAll(".boss-game").forEach(b => {
      const id = b.dataset.id;
      if (!id) return;
      b.classList.toggle("is-selected", selectedGames.has(String(id)));
    });

    // refrescar preview para que se vean los seleccionados aunque no haya filtros
    applyBrandFilter(currentBrand);
    applyPlatformSearch("");
    applyGameFilters();

    // cambiar acción del form a EDIT
    if (categoryForm) categoryForm.action = `/boss/categories/${code}/edit/`;
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

      const csrf = document.querySelector("[name=csrfmiddlewaretoken]").cloneNode();
      form.appendChild(csrf);

      document.body.appendChild(form);
      form.submit();
    });
  });

});
