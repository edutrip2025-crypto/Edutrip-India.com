document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const hamburger = document.getElementById("hamburger");
  const nav = document.getElementById("main-nav");
  const navLinks = Array.from(nav.querySelectorAll("a[href^='#']"));
  let lastScroll = 0;
  let menuOpen = false;

  // Header hide on first scroll down, show when scrolling up
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 5) {
      header.classList.add("hidden");
    } else {
      header.classList.remove("hidden");
    }
    lastScroll = current;
    // If user scrolls while mobile menu is open, close it
    if (menuOpen && window.innerWidth < 900) {
      closeMobileMenu();
    }
  });

  // Hamburger click toggles mobile menu
  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menuOpen) closeMobileMenu();
    else openMobileMenu();
  });

  function openMobileMenu() {
    // show nav as mobile dropdown (inline styles used so CSS doesn't conflict)
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
    hamburger.setAttribute("aria-expanded", "true");
    menuOpen = true;
    // trap focus loosely (optional)
    nav.querySelectorAll("a,button").forEach(el=> el.setAttribute("tabindex", "0"));
    // click outside to close
    setTimeout(() => { document.addEventListener("click", outsideClickHandler); }, 50);
  }

  function closeMobileMenu() {
    nav.style.display = "";
    nav.style.flexDirection = "";
    nav.style.position = "";
    nav.style.top = "";
    nav.style.right = "";
    nav.style.background = "";
    nav.style.padding = "";
    nav.style.borderRadius = "";
    nav.style.boxShadow = "";
    nav.style.zIndex = "";
    nav.style.minWidth = "";
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    menuOpen = false;
    document.removeEventListener("click", outsideClickHandler);
  }

  function outsideClickHandler(e) {
    if (!nav.contains(e.target) && !hamburger.contains(e.target)) closeMobileMenu();
  }

  // Auto-close when a navigation link is tapped (mobile)
  navLinks.forEach(link => {
    link.addEventListener("click", (ev) => {
      // smooth scroll handled below; close menu if on mobile
      if (window.innerWidth < 900) closeMobileMenu();
    });
  });

  // Smooth scroll for internal links (offset header)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        // compute target top considering header height (approx 90)
        const headerOffset = 90;
        const topPos = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: topPos, behavior: "smooth" });
      }
    });
  });

  // Close mobile menu on resize if moving to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 900 && menuOpen) closeMobileMenu();
  });

  // Contact form mailto fallback
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