let lastScroll = 0;
const header = document.getElementById("site-header");
window.addEventListener("scroll", () => {
  const currentScroll = window.pageYOffset;
  if (currentScroll > lastScroll && currentScroll > 100)
    header.classList.add("hidden");
  else header.classList.remove("hidden");
  lastScroll = currentScroll;
});

const burger = document.querySelector(".burger");
const navbar = document.querySelector(".navbar");
burger.addEventListener("click", () => {
  navbar.classList.toggle("active");
  burger.classList.toggle("open");
});
document.querySelectorAll(".navbar a").forEach(link =>
  link.addEventListener("click", () => {
    navbar.classList.remove("active");
    burger.classList.remove("open");
  })
);
