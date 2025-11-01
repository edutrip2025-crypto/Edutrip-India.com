document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const hamburger = document.getElementById("hamburger");
  const nav = document.querySelector("nav.main");
  const navLinks = nav.querySelectorAll("a");
  let lastScroll = 0;

  // Header hides on first scroll down, reappears when scrolling up
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 5) header.classList.add("hidden");
    else header.classList.remove("hidden");
    lastScroll = current;
  });

  // Mobile hamburger menu toggle
  hamburger.addEventListener("click", () => {
    const isOpen = nav.style.display === "flex";
    if (isOpen) {
      nav.style.display = "none";
    } else {
      nav.style.display = "flex";
      nav.style.flexDirection = "column";
      nav.style.position = "absolute";
      nav.style.top = "100px";
      nav.style.right = "20px";
      nav.style.background = "#fff";
      nav.style.padding = "12px";
      nav.style.borderRadius = "10px";
      nav.style.boxShadow = "0 5px 15px rgba(0,0,0,0.1)";
      nav.style.zIndex = "999";
    }
  });

  // Auto-close menu when a link is clicked (mobile only)
  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      if (window.innerWidth < 900) {
        nav.style.display = "none";
      }
    });
  });

  // Smooth scroll for internal navigation
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
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

  // Contact form -> mailto
  const form = document.getElementById("contact-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const subject = encodeURIComponent("Edutrip Enquiry");
    const body = encodeURIComponent(
      `Organization: ${data.organization}\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\n\nMessage:\n${data.message}`
    );
    window.location.href = `mailto:founders@edutripindia.com?subject=${subject}&body=${body}`;
  });
});