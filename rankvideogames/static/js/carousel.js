document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".js-multi-carousel").forEach((carousel) => {
    const carouselInner = carousel.querySelector(".multi-carousel-inner");
    const prevBtn = carousel.querySelector('[data-action="prev"]');
    const nextBtn = carousel.querySelector('[data-action="next"]');

    const intervalMs = parseInt(carousel.dataset.interval || "5000", 10);

    let itemsPerSlide = window.innerWidth < 720 ? 1 : parseInt(carousel.dataset.items || "3", 10);
    let slideBy = 1;

    let isAnimating = false;
    let position = itemsPerSlide;
    let autoAdvanceInterval;
    let userActivityTimeout;

    function getOriginalItems() {
      return Array.from(carousel.querySelectorAll(".multi-carousel-item:not(.clone)"));
    }

    function initializeClones() {
      carousel.querySelectorAll(".clone").forEach((c) => c.remove());

      const originalItems = getOriginalItems();
      const total = originalItems.length;

      const lastClones = originalItems.slice(-itemsPerSlide).map((item) => {
        const clone = item.cloneNode(true);
        clone.classList.add("clone");
        return clone;
      }).reverse();
      lastClones.forEach((clone) => carouselInner.prepend(clone));

      const firstClones = originalItems.slice(0, itemsPerSlide).map((item) => {
        const clone = item.cloneNode(true);
        clone.classList.add("clone");
        return clone;
      });
      firstClones.forEach((clone) => carouselInner.append(clone));

      position = itemsPerSlide;
      updateCarouselPosition(false);
    }

    function updateCarouselPosition(animate = true) {
      carouselInner.style.transition = animate ? "transform 0.5s ease" : "none";
      const translateX = (position * -100) / itemsPerSlide;
      carouselInner.style.transform = `translateX(${translateX}%)`;
    }

    function getTotalOriginalItems() {
      return getOriginalItems().length;
    }

    carouselInner.addEventListener("transitionend", () => {
      isAnimating = false;

      const totalItems = getTotalOriginalItems();

      if (position >= totalItems + itemsPerSlide) {
        position = itemsPerSlide + (position - (totalItems + itemsPerSlide));
        updateCarouselPosition(false);
      } else if (position < itemsPerSlide) {
        position = totalItems + position;
        updateCarouselPosition(false);
      }
    });

    function next() {
      if (isAnimating) return;
      isAnimating = true;
      position += slideBy;
      updateCarouselPosition(true);
    }

    function prev() {
      if (isAnimating) return;
      isAnimating = true;
      position -= slideBy;
      updateCarouselPosition(true);
    }

    nextBtn.addEventListener("click", () => { next(); registerUserActivity(); });
    prevBtn.addEventListener("click", () => { prev(); registerUserActivity(); });

    // Drag
    let isDragging = false;
    let startX = 0;
    let startPosition = 0;

    function startDrag(e) {
      if (isAnimating) return;
      isDragging = true;
      startX = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
      startPosition = position;
      carousel.classList.add("dragging");
      carouselInner.style.transition = "none";
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      registerUserActivity();
    }

    function drag(e) {
      if (!isDragging) return;
      const x = e.type.includes("mouse") ? e.clientX : e.touches[0].clientX;
      const walk = ((x - startX) / carousel.offsetWidth) * itemsPerSlide;
      const newPosition = startPosition - walk;
      const translateX = (newPosition * -100) / itemsPerSlide;
      carouselInner.style.transform = `translateX(${translateX}%)`;
    }

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      carousel.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      carouselInner.style.transition = "transform 0.5s ease";

      const x = e.type?.includes("mouse")
        ? e.clientX
        : e.changedTouches
        ? e.changedTouches[0].clientX
        : startX;

      const walk = ((x - startX) / carousel.offsetWidth) * itemsPerSlide;

      if (walk > 0.2) prev();
      else if (walk < -0.2) next();
      else updateCarouselPosition(true);

      registerUserActivity();
    }

    carousel.addEventListener("mousedown", startDrag);
    carousel.addEventListener("touchstart", startDrag, { passive: true });
    carousel.addEventListener("mousemove", drag);
    carousel.addEventListener("touchmove", drag, { passive: true });
    carousel.addEventListener("mouseup", endDrag);
    carousel.addEventListener("touchend", endDrag);
    carousel.addEventListener("mouseleave", endDrag);

    // Auto advance per carousel
    function startAutoAdvance() {
      clearInterval(autoAdvanceInterval);
      autoAdvanceInterval = setInterval(next, intervalMs);
    }

    function resetAutoAdvanceTimer() {
      clearTimeout(userActivityTimeout);
      clearInterval(autoAdvanceInterval);
      userActivityTimeout = setTimeout(startAutoAdvance, 8000);
    }

    function registerUserActivity() {
      resetAutoAdvanceTimer();
    }

    carousel.addEventListener("mouseenter", () => clearInterval(autoAdvanceInterval));
    carousel.addEventListener("mouseleave", () => resetAutoAdvanceTimer());

    // Resize
    function updateConfig() {
     const w = window.innerWidth;

    if (w < 720) itemsPerSlide = 1;
      else if (w < 992) itemsPerSlide = 3;
      else itemsPerSlide = parseInt(carousel.dataset.items || "5", 10);

      slideBy = 1;
      initializeClones();
    }

    window.addEventListener("resize", () => updateConfig());

    // Init
    initializeClones();
    startAutoAdvance();
  });
});



document.addEventListener("DOMContentLoaded", () => {
  const hidden = document.getElementById("search_by");
  document.querySelectorAll(".dropdown-menu .dropdown-item[data-value]").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      hidden.value = item.dataset.value;
      item.closest(".input-group").querySelector(".btn-search-dropdown").textContent = item.textContent.trim();
    });
  });
});
