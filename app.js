document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const hamburger = document.getElementById("hamburger");
  const nav = document.querySelector("nav.main");
  let lastScroll = 0;

  // Header hide immediately on first scroll
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > 50 && current > lastScroll) header.classList.add("hidden");
    else header.classList.remove("hidden");
    lastScroll = current;
  });

  // Mobile menu toggle
  hamburger.addEventListener("click", () => {
    if (nav.style.display === "flex") nav.style.display = "none";
    else {
      nav.style.display = "flex";
      nav.style.flexDirection = "column";
      nav.style.position = "absolute";
      nav.style.top = "100px";
      nav.style.right = "20px";
      nav.style.background = "#fff";
      nav.style.padding = "12px";
      nav.style.borderRadius = "10px";
      nav.style.boxShadow = "0 5px 15px rgba(0,0,0,0.1)";
    }
  });

  // Contact form -> mailto
  const form = document.getElementById("contact-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const subject = encodeURIComponent("Edutrip Enquiry");
    const body = encodeURIComponent(