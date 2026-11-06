import gsap from "gsap";

const STORAGE_KEY = "snowjr-view";
const HOVER_COOLDOWN = 100;
const PARALLAX = 150;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Gallery + list views, reproduced from the reference interaction model:
 * 24 floating tiles on a 3D z-axis, driven by wheel impulse, a mouse
 * parallax field and per-tile depth opacity.
 */
export function initWork({ projects, onOpen }) {
  const galleryEl = document.querySelector(".img-container");
  const listEl = document.querySelector(".list-container");
  const toggles = [...document.querySelectorAll(".toggle-btn")];
  const items = [];
  const rows = [];
  const tiles = projects.flatMap((project) => [project, project, project]);

  let view = sessionStorage.getItem(STORAGE_KEY) === "list" ? "list" : "gallery";
  let switching = false;

  /* ------------------------------------------------------------------ */
  /* gallery                                                            */
  /* ------------------------------------------------------------------ */

  tiles.forEach((project, index) => {
    const el = document.createElement("div");
    el.className = "img-item";
    el.dataset.index = String(index);

    const img = document.createElement("img");
    img.src = project.cover;
    img.alt = project.title;
    img.draggable = false;

    const title = document.createElement("div");
    title.className = "img-title";
    const name = document.createElement("span");
    name.textContent = project.title;
    const action = document.createElement("span");
    action.textContent = "[ View ]";
    title.append(name, action);

    el.append(img, title);
    galleryEl.append(el);
    items.push(el);
  });

  const state = items.map(() => ({ speed: 200, z: 0, factor: 0 }));
  const floatEl = document.createElement("div");
  floatEl.className = "list-float";
  const floatImg = document.createElement("img");
  floatImg.alt = "";
  floatEl.append(floatImg);

  let rafId = 0;
  let lastTime = 0;
  let velocity = 0;
  let targetX = 0;
  let targetY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let hovered = -1;
  let hoverScale = 1;
  let motion = 1;
  let lastMouseMove = 0;
  let floatX = 0;
  let floatY = 0;
  let floatTargetX = 0;
  let floatTargetY = 0;
  let floatRaf = 0;

  const randomPlace = (index, el) => {
    el.style.left = `${-100 + Math.random() * 300}%`;
    el.style.top = `${-100 + Math.random() * 300}%`;
  };

  const randomize = () => {
    items.forEach((el, index) => {
      state[index].speed = 200;
      state[index].z = -(Math.random() * 7000);
      state[index].factor = 2 + Math.random() * 8;
      randomPlace(index, el);
      el.style.opacity = "0";
    });
  };

  const resetPosition = (index, el) => {
    el.style.left = `${-100 + Math.random() * 300}%`;
    el.style.top = `${-100 + Math.random() * 300}%`;
  };

  const frame = (now) => {
    if (!lastTime) {
      lastTime = now;
      rafId = requestAnimationFrame(frame);
      return;
    }

    const delta = (now - lastTime) / 1000;
    lastTime = now;

    velocity *= 0.95;
    smoothX += (targetX - smoothX) * 0.03;
    smoothY += (targetY - smoothY) * 0.03;

    const hoverTarget = hovered !== -1 ? 0.2 : 1;
    hoverScale += (hoverTarget - hoverScale) * 0.08;

    const motionTarget = hovered !== -1 ? 0 : 1;
    motion += (motionTarget - motion) * 0.06;

    items.forEach((el, index) => {
      const tile = state[index];
      tile.z += (tile.speed + velocity * tile.factor) * motion * delta;

      if (tile.z > 1000) {
        el.style.opacity = "0";
        tile.z = -7000 - Math.random() * 1500;
        randomPlace(index, el);
      }

      if (tile.z < -8501) {
        el.style.opacity = "0";
        tile.z = 995;
        randomPlace(index, el);
      }

      let opacity = 1;
      const z = tile.z;

      if (z < -1000) {
        opacity = (z - -7000) / 6000;
      } else if (z > 500) {
        opacity = 1 - (z - 500) / 500;
      }

      opacity = Math.max(0, Math.min(1, opacity));
      if (hovered !== index) opacity *= hoverScale;

      const depth = (z + 7000) / 8000;
      const offsetX = smoothX * PARALLAX * depth;
      const offsetY = smoothY * PARALLAX * depth;

      el.style.opacity = opacity.toString();
      el.style.transform = `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${z}px)`;
      el.style.zIndex = Math.round(z + 7000).toString();
    });

    rafId = requestAnimationFrame(frame);
  };

  const onMouseMove = (event) => {
    targetX = (event.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    targetY = (event.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    lastMouseMove = performance.now();
  };

  const onWheel = (event) => {
    if (view !== "gallery") return;
    velocity += event.deltaY * 2;
  };

  let touchStartY = 0;
  const onTouchStart = (event) => {
    touchStartY = event.touches[0].clientY;
  };
  const onTouchMove = (event) => {
    if (view !== "gallery") return;
    const current = event.touches[0].clientY;
    velocity += (touchStartY - current) * 2;
    touchStartY = current;
  };

  items.forEach((el, index) => {
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      onOpen?.(tiles[index]);
    });

    el.addEventListener("mouseenter", () => {
      if (performance.now() - lastMouseMove < HOVER_COOLDOWN) hovered = index;
    });

    el.addEventListener("mouseleave", () => {
      if (hovered === index) hovered = -1;
    });
  });

  window.addEventListener("mousemove", onMouseMove, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });

  const stillFrame = () => {
    items.forEach((el, index) => {
      const tile = state[index];
      const z = tile.z;
      let opacity = 1;
      if (z < -1000) opacity = (z - -7000) / 6000;
      else if (z > 500) opacity = 1 - (z - 500) / 500;
      el.style.opacity = String(Math.max(0, Math.min(1, opacity)));
      el.style.transform = `translate3d(-50%, -50%, ${z}px)`;
      el.style.zIndex = Math.round(z + 7000).toString();
    });
  };

  const startGallery = () => {
    hovered = -1;
    hoverScale = 1;
    motion = 1;
    velocity = 0;
    lastTime = 0;
    randomize();
    if (prefersReducedMotion()) {
      stillFrame();
      gsap.set(galleryEl, { opacity: 1 });
      return;
    }
    rafId = requestAnimationFrame(frame);
    gsap.to(galleryEl, { opacity: 1, duration: 0.55, ease: "power2.out" });
  };

  const stopGallery = () => {
    cancelAnimationFrame(rafId);
    rafId = 0;
    lastTime = 0;
  };

  /* ------------------------------------------------------------------ */
  /* list                                                               */
  /* ------------------------------------------------------------------ */

  const listHeader = document.createElement("div");
  listHeader.className = "list-header";
  const listFooter = document.createElement("div");
  listFooter.className = "list-footer";

  projects.forEach((project) => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.dataset.slug = project.slug;

    const title = document.createElement("span");
    title.className = "list-title";
    title.textContent = project.title;

    const link = document.createElement("span");
    link.className = "list-link";
    const left = document.createElement("span");
    left.className = "bracket-left";
    left.textContent = "[";
    const right = document.createElement("span");
    right.className = "bracket-right";
    right.textContent = "]";
    link.append(left, " See project ", right);

    row.append(title, link);

    row.addEventListener("mouseenter", () => showFloat(project.cover));
    row.addEventListener("mouseleave", hideFloat);
    row.addEventListener("click", () => onOpen?.(project));

    listEl.append(row);
    rows.push(row);
  });

  listEl.prepend(listHeader);
  listEl.append(listFooter, floatEl);

  function showFloat(src) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    floatImg.src = src;
    gsap.to(floatEl, { opacity: 1, duration: 0.25, ease: "power2.out" });
  }

  function hideFloat() {
    gsap.to(floatEl, { opacity: 0, duration: 0.2, ease: "power2.in" });
  }

  const floatFrame = () => {
    floatX += (floatTargetX - floatX) * 0.08;
    floatY += (floatTargetY - floatY) * 0.08;
    floatEl.style.transform = `translate(calc(${floatX}px - 50%), calc(${floatY}px - 50%))`;
    floatRaf = requestAnimationFrame(floatFrame);
  };

  const onFloatMove = (event) => {
    floatTargetX = event.clientX;
    floatTargetY = event.clientY;
  };

  window.addEventListener("mousemove", onFloatMove, { passive: true });
  floatRaf = requestAnimationFrame(floatFrame);

  /* ------------------------------------------------------------------ */
  /* view switching                                                     */
  /* ------------------------------------------------------------------ */

  const paintToggles = () => {
    toggles.forEach((button) => {
      const target = button.dataset.view;
      const active = target === view;
      button.classList.toggle("is-active", active);
      if (target === "gallery") {
        button.textContent = active ? "[ Gallery view ]" : "Gallery view";
      } else {
        button.textContent = active ? "[ List view ]" : "List view";
      }
    });
  };

  const enterList = () => {
    view = "list";
    sessionStorage.setItem(STORAGE_KEY, view);
    galleryEl.style.display = "none";
    galleryEl.style.opacity = "0";
    galleryEl.style.scale = "";
    listEl.hidden = false;
    paintToggles();
    window.scrollTo(0, 0);

    if (prefersReducedMotion()) {
      gsap.set(rows, { clearProps: "all" });
      return;
    }

    gsap.from(rows, {
      y: 70,
      opacity: 0,
      stagger: 0.055,
      duration: 0.8,
      ease: "expo.out",
      clearProps: "all",
    });
  };

  const enterGallery = () => {
    view = "gallery";
    sessionStorage.setItem(STORAGE_KEY, view);
    listEl.hidden = true;
    gsap.set(rows, { clearProps: "all" });
    galleryEl.style.display = "";
    paintToggles();
    window.scrollTo(0, 0);
    startGallery();
  };

  const toList = () => {
    if (view === "list" || switching) return;
    switching = true;
    stopGallery();

    if (prefersReducedMotion()) {
      enterList();
      switching = false;
      return;
    }

    gsap.to(galleryEl, {
      opacity: 0,
      scale: 1.05,
      duration: 0.5,
      ease: "power3.in",
      onComplete: () => {
        gsap.set(galleryEl, { scale: 1 });
        enterList();
        switching = false;
      },
    });
  };

  const toGallery = () => {
    if (view === "gallery" || switching) return;
    switching = true;

    if (prefersReducedMotion()) {
      enterGallery();
      switching = false;
      return;
    }

    gsap.to(rows, {
      y: -50,
      opacity: 0,
      stagger: { each: 0.04, from: "end" },
      duration: 0.45,
      ease: "power3.in",
      onComplete: () => {
        enterGallery();
        switching = false;
      },
    });
  };

  toggles.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.view === "list") toList();
      else toGallery();
    });
  });

  paintToggles();

  if (view === "list") {
    galleryEl.style.display = "none";
    listEl.hidden = false;
  } else {
    listEl.hidden = true;
    startGallery();
  }

  return {
    toGallery,
    toList,
    get view() {
      return view;
    },
  };
}
