document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const hamburger = document.getElementById("hamburger");
  const nav = document.querySelector("nav.main");
  let lastScroll = 0;

  // Header hide on scroll
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 100) header.classList.add("hidden");
    else header.classList.remove("hidden");
    lastScroll = current;
  });

  // Mobile nav toggle
  hamburger.addEventListener("click", () => {
    if (nav.style.display === "flex") nav.style.display = "none";
    else {
      nav.style.display = "flex";
      nav.style.flexDirection = "column";
      nav.style.position = "absolute";
      nav.style.top = "80px";
      nav.style.right = "20px";
      nav.style.background = "#fff";
      nav.style.padding = "10px";
      nav.style.borderRadius = "10px";
      nav.style.boxShadow = "0 5px 15px rgba(0,0,0,0.1)";
    }
  });

  // Contact form fallback to email
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contactStatus");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const subject = encodeURIComponent("Edutrip Enquiry");
    const body = encodeURIComponent(
      `Organization: ${data.organization}\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\n\nMessage:\n${data.message}`
    );
    window.location.href = `mailto:founders@edutripindia.com?subject=${subject}&body=${body}`;
    status.textContent = "Opening mail app…";
  });
});