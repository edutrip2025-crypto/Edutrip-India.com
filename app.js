document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const nav = document.getElementById("main-nav");
  const programCards = document.querySelectorAll(".flip");
  const form = document.getElementById("contact-form");
  let lastScroll = 0;

  // Hide header on scroll down
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 5) header.classList.add("hidden");
    else header.classList.remove("hidden");
    lastScroll = current;
  });

  // Flip card logic (hover for desktop, click for mobile)
  programCards.forEach((card) => {
    card.addEventListener("click", () => {
      card.classList.toggle("flipped");
    });
    card.addEventListener("mouseenter", () => {
      if (window.innerWidth > 900) card.classList.add("flipped");
    });
    card.addEventListener("mouseleave", () => {
      if (window.innerWidth > 900) card.classList.remove("flipped");
    });
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", function (e) {
      const t = document.querySelector(this.getAttribute("href"));
      if (t) {
        e.preventDefault();
        window.scrollTo({ top: t.offsetTop - 90, behavior: "smooth" });
      }
    });
  });

  // Contact form → mailto
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form).entries());
      const subject = encodeURIComponent("Edutrip Enquiry");
      const body = encodeURIComponent(
        `Organization: ${d.organization}\nName: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone}\n\nMessage:\n${d.message}`
      );
      window.location.href = `mailto:founders@edutripindia.com?subject=${subject}&body=${body}`;
    });
  }
});
