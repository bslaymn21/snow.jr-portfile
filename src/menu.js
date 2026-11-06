import gsap from "gsap";

/**
 * Fullscreen menu: panel slides down from the top while links and image
 * tiles fade/blur in with a stagger, then reverse on close.
 */
export function initMenu({ onNavigate, onLockChange } = {}) {
  const openBtn = document.querySelector(".menu-btn.open");
  const closeBtn = document.querySelector(".menu-btn.close");
  const panel = document.querySelector(".menu-container");
  const links = document.querySelectorAll(
    ".menu-links a, .menu-container .privacy-btn"
  );
  const images = document.querySelectorAll(".menu-container .hover-bulge");

  if (!openBtn || !closeBtn || !panel) return { close() {} };

  let isOpen = false;

  const open = () => {
    if (isOpen) return;
    isOpen = true;

    openBtn.classList.add("hidden");
    closeBtn.classList.remove("hidden");
    closeBtn.classList.add("visible");

    document.body.classList.add("menu-open");
    onLockChange?.(true);

    gsap.to(images, {
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.75,
      stagger: 0.1,
      delay: 1,
      ease: "power3.inOut",
      overwrite: true,
    });

    gsap.to(links, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.25,
      stagger: 0.08,
      delay: 0.7,
      overwrite: true,
      onComplete: () => {
        if (!isOpen) return;
        links.forEach((link) => {
          link.style.pointerEvents = "auto";
        });
      },
    });

    gsap.to(panel, { y: 0, duration: 1, ease: "power4.inOut", overwrite: true });
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;

    openBtn.classList.remove("hidden");
    closeBtn.classList.add("hidden");
    closeBtn.classList.remove("visible");

    gsap.to(images, {
      opacity: 0,
      duration: 0.25,
      filter: "blur(10px)",
      stagger: { each: 0.08, from: "end" },
      overwrite: true,
    });

    gsap.to(links, {
      opacity: 0,
      y: -50,
      duration: 0.25,
      filter: "blur(10px)",
      stagger: { each: 0.08, from: "end" },
      overwrite: true,
      onComplete: () => {
        links.forEach((link) => {
          link.style.pointerEvents = "none";
        });
        if (!isOpen) {
          document.body.classList.remove("menu-open");
          onLockChange?.(false);
        }
      },
    });

    gsap.to(panel, {
      y: "-100%",
      duration: 1,
      ease: "power4.inOut",
      overwrite: true,
    });
  };

  openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  openBtn.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });

  document.querySelectorAll(".menu-links a").forEach((link) => {
    link.addEventListener("click", (event) => {
      const nav = link.dataset.nav;
      const href = link.getAttribute("href") || "";
      if (href.startsWith("mailto")) return;
      event.preventDefault();
      close();
      setTimeout(() => onNavigate?.(nav), 650);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) close();
  });

  return { open, close };
}
