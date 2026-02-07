document.addEventListener("DOMContentLoaded", () => {

  // ===== Cards (solo si existen) =====
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

  // ===== FILE PICKER =====
  const input = document.getElementById("updateFileInput");
  const preview = document.getElementById("fileNamePreview");
  const submitBtn = document.getElementById("btnSubmitCsv");

  if (input && preview && submitBtn) {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) {
        preview.textContent = "Ningún archivo seleccionado";
        submitBtn.disabled = true;
        return;
      }
      preview.textContent = file.name;
      submitBtn.disabled = false;
    });
  }

  // ===== MODAL =====
  const modal = document.getElementById("collectionsModal");
  const openBtns = document.querySelectorAll(".js-open-collections");

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    modal.scrollTop = 0;
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  }

  openBtns.forEach(btn => {
    btn.addEventListener("click", (e) => { e.preventDefault(); openModal(); });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(); }
    });
  });

  modal?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
  });

  // ===== CHIPS (Platforms / Genres / Decades) =====
  const selected = {
    platforms: new Set(),
    genres: new Set(),
    decades: new Set(),
  };

  const platformsJson = document.getElementById("platformsJson");
  const genresJson = document.getElementById("genresJson");
  const decadesJson = document.getElementById("decadesJson");

  function syncHidden() {
    if (platformsJson) platformsJson.value = JSON.stringify([...selected.platforms]);
    if (genresJson) genresJson.value = JSON.stringify([...selected.genres]);
    if (decadesJson) decadesJson.value = JSON.stringify([...selected.decades]);
  }

  function setChipVisual(btn, isSelected) {
    btn.classList.toggle("is-selected", isSelected);
    const x = btn.querySelector(".boss-chip__x");
    if (x) x.textContent = isSelected ? "×" : "+";
  }

  function toggleNormalChip(btn) {
    const group = btn.dataset.group; // "platforms" | "genres"
    const value = (btn.dataset.value || "").trim();
    if (!group || !value || !(group in selected)) return;

    const set = selected[group];
    const nowSelected = !set.has(value);

    if (nowSelected) set.add(value);
    else set.delete(value);

    setChipVisual(btn, nowSelected);
    syncHidden();
  }

  // ===== Years + Decades sync =====
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

  yearFromSelect?.addEventListener("change", normalizeYearRange);
  yearToSelect?.addEventListener("change", normalizeYearRange);

  document.querySelectorAll('#decadeChips .boss-chip[data-group="decades"][data-value]').forEach(btn => {
    const d = parseInt(btn.dataset.value, 10);
    if (!Number.isNaN(d) && d > currentDecade) {
      btn.disabled = true;
      btn.style.display = "none";
    }
  });

  // Delegación: listener único para chips del modal
  const modalPanel = document.querySelector("#collectionsModal .boss-modal__panel");
  if (modalPanel) {
    modalPanel.addEventListener("click", (e) => {
      const btn = e.target.closest(".boss-chip[data-group][data-value]");
      if (!btn) return;

      const group = btn.dataset.group;
      e.preventDefault();

      if (group === "decades") handleDecadeClick(btn);
      else toggleNormalChip(btn);
    });
  }

  // ===== Platform brand filter (mostrar/ocultar) =====
  const brandWrap = document.getElementById("platformBrandChips");
  const platformWrap = document.getElementById("platformChips");

  function platformBrandOf(name) {
    const s = (name || "").toLowerCase();

    if (
      s.includes("nintendo") || s.includes("switch") || s.includes("wii") || s.includes("game boy") || s.includes("gameboy") ||
      s.includes("nes") || s.includes("snes") || s.includes("super nintendo") || s.includes("n64") || s.includes("gamecube") ||
      s.includes("3ds") || s.includes("ds")
    ) return "nintendo";

    if (
      s.includes("playstation") || s.includes("ps1") || s.includes("ps2") || s.includes("ps3") || s.includes("ps4") || s.includes("ps5") ||
      s.includes("psp") || s.includes("vita")
    ) return "sony";

    if (s.includes("xbox") || s.includes("microsoft")) return "microsoft";

    if (
      s.includes("sega") || s.includes("dreamcast") || s.includes("saturn") || s.includes("genesis") || s.includes("mega drive") ||
      s.includes("game gear") || s.includes("master system")
    ) return "sega";

    if (s.includes("pc") || s.includes("windows") || s.includes("steam") || s.includes("linux") || s.includes("mac") || s.includes("dos"))
      return "pc";

    return "other";
  }

  function applyBrandFilter(brand) {
    if (!platformWrap) return;
    const chips = platformWrap.querySelectorAll('.boss-chip[data-group="platforms"][data-value]');
    chips.forEach(btn => {
      const val = btn.dataset.value || "";
      const b = platformBrandOf(val);
      btn.style.display = (brand === "all" || b === brand) ? "" : "none";
    });
  }

  function setBrandSelected(btn) {
    brandWrap?.querySelectorAll(".boss-chip[data-brand]").forEach(b => {
      b.classList.remove("is-selected");
      const x = b.querySelector(".boss-chip__x");
      if (x) x.textContent = "+";
    });
    btn.classList.add("is-selected");
    const x = btn.querySelector(".boss-chip__x");
    if (x) x.textContent = "×";
  }

  if (brandWrap) {
    brandWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".boss-chip[data-brand]");
      if (!btn) return;
      e.preventDefault();
      const brand = btn.dataset.brand || "all";
      setBrandSelected(btn);
      applyBrandFilter(brand);
    });

    applyBrandFilter("all");
  }

  syncHidden();
});
