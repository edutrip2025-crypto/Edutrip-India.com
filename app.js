document.addEventListener("DOMContentLoaded", () => {
  const burger = document.getElementById("burger");
  const navbar = document.getElementById("navbar");
  const header = document.getElementById("site-header");
  const revealEls = document.querySelectorAll(".reveal");
  let lastScroll = 0;

  // Burger menu (mobile only)
  burger.addEventListener("click", () => {
    navbar.classList.toggle("active");
    burger.classList.toggle("open");
  });

  document.querySelectorAll(".navbar a").forEach(link => {
    link.addEventListener("click", () => {
      navbar.classList.remove("active");
      burger.classList.remove("open");
    });
  });

  // Hide header on scroll down
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 60) header.classList.add("hidden");
    else header.classList.remove("hidden");
    lastScroll = current;
  });

  // Fade-in & reveal animation on scroll
  const revealOnScroll = () => {
    revealEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 100) el.classList.add("visible");
    });
  };
  revealOnScroll();
  window.addEventListener("scroll", revealOnScroll);

  // Contact form mailto
  const form = document.getElementById("contact-form");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const subject = encodeURIComponent("Edutrip Enquiry");
    const body = encodeURIComponent(
      `Organization: ${data.organization}\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\n\nMessage:\n${data.message}`
    );
    window.location.href = `mailto:founders@edutripindia.com?subject=${subject}&body=${body}`;
  });
});
