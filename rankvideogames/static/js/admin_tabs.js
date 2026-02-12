document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-admin-tabs]");
  if (!root) return;

  const inner = root.querySelector(".admin-tabs__inner");
  const indicator = root.querySelector(".admin-tab-indicator");
  const tabs = Array.from(root.querySelectorAll(".admin-tab"));

  if (!inner || !indicator || !tabs.length) return;

  // Helper: mueve el indicador a un tab dado
  function moveToTab(tab) {
    const innerRect = inner.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();

    const left = (tabRect.left - innerRect.left) + 0; // px dentro del inner
    const width = tabRect.width;

    indicator.style.left = `${left}px`;
    indicator.style.width = `${width}px`;
  }

  // Estado inicial: tab marcado por Django (is-active) o el primero
  const initial = root.querySelector(".admin-tab.is-active") || tabs[0];
  moveToTab(initial);

  // Recalcular en resize (muy importante)
  let raf = null;
  window.addEventListener("resize", () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const active = root.querySelector(".admin-tab.is-active") || tabs[0];
      moveToTab(active);
    });
  });

  // Click: animar antes de navegar (para que se vea aunque sea link)
  tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      // Si quieres que NO retrase la navegación, comenta este bloque.
      const href = tab.getAttribute("href");
      if (href) e.preventDefault();

      // Visual: pressing + glow
      inner.classList.add("is-animating");
      tabs.forEach(t => t.classList.remove("is-active"));
      tab.classList.add("is-active", "is-pressing");

      moveToTab(tab);

      // Quitar “pressing”
      window.setTimeout(() => tab.classList.remove("is-pressing"), 120);

      // Quitar glow
      window.setTimeout(() => inner.classList.remove("is-animating"), 260);

      // Navegar tras un pelín (si es <a>)
      if (href) {
        window.setTimeout(() => {
          window.location.href = href;
        }, 160);
      }
    }, { passive: false });
  });

  // Si cambias de página y Django pone is-active,
  // al cargar se recoloca solo (ya lo hace arriba).
});
