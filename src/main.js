import "./styles/base.css";
import "./styles/header.css";
import "./styles/gallery.css";
import "./styles/menu.css";

import Lenis from "lenis";
import { PROJECTS } from "./data.js";
import { initWork } from "./work.js";
import { initMenu } from "./menu.js";
import { initOverlay } from "./overlay.js";
import { createGridBackground } from "./background.js";
import { createBulge } from "./bulge.js";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const lenis = new Lenis({
  lerp: 0.1,
  wheelMultiplier: 1,
  touchMultiplier: 1,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

const setScrollLock = (locked) => {
  if (locked) lenis.stop();
  else lenis.start();
};

const overlay = initOverlay();

const work = initWork({
  projects: PROJECTS,
  onOpen: (project) => overlay.open(project),
});

initMenu({
  onLockChange: setScrollLock,
  onNavigate: (target) => {
    if (target === "list") work.toList();
    else work.toGallery();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
});

const background = createGridBackground(document.querySelector(".menu-bg"));

const bulges = [...document.querySelectorAll(".menu-container .hover-bulge")];
bulges.forEach((container) => {
  createBulge(container, container.dataset.src);
});

if (prefersReducedMotion()) {
  background?.destroy?.();
}

window.addEventListener("pagehide", () => {
  background?.destroy?.();
});
