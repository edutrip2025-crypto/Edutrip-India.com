document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const programCards = document.querySelectorAll(".flip");
  const form = document.getElementById("contact-form");
  let lastScroll = 0;

  // Hide header on scroll down
  window.addEventListener("scroll", () => {
    const current = window.scrollY;
    if (current > lastScroll && current > 50) header.classList.add("hidden");
    else header.classList.remove("hidden");
    lastScroll = current;
  });

  // Flip animation
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

  // Smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", function (e) {
      const t = document.querySelector(this.getAttribute("href"));
      if (t) {
        e.preventDefault();
        window.scrollTo({ top: t.offsetTop - 90, behavior: "smooth" });
      }
    });
  });

  // Contact form redirect to email
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
