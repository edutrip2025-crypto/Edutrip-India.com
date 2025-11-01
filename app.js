let lastScroll = 0;
const header = document.getElementById("site-header");
const burger = document.querySelector(".burger");
const navbar = document.querySelector(".navbar");

// Header Hide on Scroll
window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;
  if (currentScroll > lastScroll && currentScroll > 100) header.classList.add("hidden");
  else header.classList.remove("hidden");
  lastScroll = currentScroll;
  navbar.classList.remove("active");
});

// Burger Toggle
burger.addEventListener("click", () => {
  navbar.classList.toggle("active");
});
document.querySelectorAll(".navbar a").forEach(link =>
  link.addEventListener("click", () => navbar.classList.remove("active"))
);
