/**
 * Minimal project viewer: the gallery and list both open the same overlay
 * instead of navigating away (single-page demo).
 */
export function initOverlay() {
  const overlay = document.querySelector(".project-overlay");
  const panel = overlay?.querySelector(".project-panel");
  const image = overlay?.querySelector(".project-figure img");
  const title = overlay?.querySelector(".project-title");
  const year = overlay?.querySelector(".project-year");
  const tags = overlay?.querySelector(".project-tags");
  const closeBtn = overlay?.querySelector(".project-close");

  if (!overlay || !image) return { open() {} };

  let isOpen = false;

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-open");
  };

  const open = (project) => {
    if (!project) return;
    isOpen = true;
    image.src = project.cover;
    image.alt = project.title;
    if (title) title.textContent = project.title;
    if (year) year.textContent = String(project.year);
    if (tags) tags.textContent = (project.tags || []).join(" · ");
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-open");
  };

  closeBtn?.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (!panel?.contains(event.target)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  return { open, close };
}
