// app.js — Edutrip India

// Hide header on scroll
let lastScroll = 0;
const header = document.getElementById("site-header");

window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;
  if (currentScroll > lastScroll && currentScroll > 100) {
    header.classList.add("hidden");
  } else {
    header.classList.remove("hidden");
  }
  lastScroll = currentScroll;
});

// Mobile burger menu toggle
const burger = document.querySelector(".burger");
const navbar = document.querySelector(".navbar");
burger.addEventListener("click", () => {
  burger.classList.toggle("open");
  navbar.classList.toggle("active");
});

// Close menu on link click (mobile)
document.querySelectorAll(".navbar a").forEach(link => {
  link.addEventListener("click", () => {
    burger.classList.remove("open");
    navbar.classList.remove("active");
  });
});

// Reveal animations
const reveals = document.querySelectorAll(".reveal");
window.addEventListener("scroll", () => {
  const windowHeight = window.innerHeight;
  reveals.forEach(el => {
    const elementTop = el.getBoundingClientRect().top;
    if (elementTop < windowHeight - 100) el.classList.add("visible");
  });
});
