document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const hamburger = document.getElementById("hamburger");
  const nav = document.getElementById("main-nav");
  const navLinks = nav.querySelectorAll("a[href^='#']");
  let lastScroll = 0;
  let menuOpen = false;

  // Header hides on scroll down, shows on scroll up
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 5) {
      header.classList.add("hidden");
    } else {
      header.classList.remove("hidden");
    }
    lastScroll = current;
    // Close mobile menu on scroll
    if (menuOpen && window.innerWidth < 900) closeMobileMenu();
  });

  // Hamburger toggle
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menuOpen) closeMobileMenu();
    else openMobileMenu();
  });

  function openMobileMenu() {
    nav.style.display = "flex";
    nav.style.flexDirection = "column";
    nav.style.position = "fixed";
    nav.style.top = "74px";
    nav.style.right = "14px";
    nav.style.background = "#fff";
    nav.style.padding = "14px";
    nav.style.borderRadius = "12px";
    nav.style.boxShadow = "0 18px 40px rgba(6,22,50,0.08)";
    nav.style.zIndex = "115";
    nav.style.minWidth = "200px";
    hamburger.classList.add("open");
    menuOpen = true;
    document.addEventListener("click", outsideClickHandler);
  }

  function closeMobileMenu() {
    nav.removeAttribute("style");
    hamburger.classList.remove("open");
    menuOpen = false;
    document.removeEventListener("click", outsideClickHandler);
  }

  function outsideClickHandler(e) {
    if (!nav.contains(e.target) && !hamburger.contains(e.target)) closeMobileMenu();
  }

  // Auto-close menu when link clicked
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 900) closeMobileMenu();
    });
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 90,
          behavior: "smooth",
        });
      }
    });
  });

  // Close menu on resize to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 900 && menuOpen) closeMobileMenu();
  });

  // Contact form → mailto
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const subject = encodeURIComponent("Edutrip Enquiry");
      const body = encodeURIComponent(
        `Organization: ${data.organization}\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\n\nMessage:\n${data.message}`
      );
      window.location.href = `mailto:founders@edutripindia.com?subject=${subject}&body=${body}`;
    });
  }
});