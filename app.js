/* ===================================================
   Edutrip India — Frontend JS
   =================================================== */
document.addEventListener("DOMContentLoaded", () => {

  /* ---------------------------
     Mobile Menu Toggle
  --------------------------- */
  const hamburger = document.getElementById("hamburger");
  const nav = document.querySelector("nav.main");

  if (hamburger && nav) {
    hamburger.addEventListener("click", () => {
      const expanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!expanded));
      if (!expanded) {
        nav.style.display = "flex";
        nav.style.flexDirection = "column";
        nav.style.background = "white";
        nav.style.padding = "10px";
        nav.style.borderRadius = "8px";
        nav.style.position = "absolute";
        nav.style.top = "70px";
        nav.style.right = "20px";
        nav.style.boxShadow = "0 10px 25px rgba(0,0,0,0.1)";
      } else {
        nav.style.display = "";
      }
    });

    // Auto-reset nav on resize
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 900) {
        nav.style.display = "flex";
        nav.style.flexDirection = "row";
      } else {
        nav.style.display = "";
      }
    });
  }

  /* ---------------------------
     Contact Form Handler
  --------------------------- */
  const form = document.getElementById("contact-form");
  const statusEl = document.getElementById("contactStatus");

  function isEmail(e) {
    return /\S+@\S+\.\S+/.test(e);
  }

  if (form) {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      statusEl.textContent = "";
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());

      if (!data.organization || !data.name || !data.email) {
        statusEl.style.color = "tomato";
        statusEl.textContent = "Please fill Organization, Contact Person, and Email.";
        return;
      }
      if (!isEmail(data.email)) {
        statusEl.style.color = "tomato";
        statusEl.textContent = "Please provide a valid email address.";
        return;
      }

      statusEl.style.color = "inherit";
      statusEl.textContent = "Sending…";

      try {
        // Try sending to a backend endpoint if available
        const resp = await fetch("/api/enquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (resp.ok) {
          statusEl.style.color = "#2a9d6f";
          statusEl.textContent = "Enquiry sent successfully. We’ll reach out shortly!";
          form.reset();
          return;
        }
        throw new Error("Server error");
      } catch (err) {
        // Fallback: open mail app with prefilled content
        const subject = encodeURIComponent("Edutrip Enquiry: " + (data.organization || "School"));
        const body = encodeURIComponent(
          `Organization: ${data.organization}\nContact: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || ""}\n\nMessage:\n${data.message || ""}`
        );
        window.location.href = `mailto:founders@edutripindia.com?subject=${subject}&body=${body}`;
      }
    });
  }

  /* ---------------------------
     Respect Reduced Motion
  --------------------------- */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".bg-icon").forEach((icon) => {
      icon.style.animation = "none";
    });
  }

  /* ---------------------------
     Smooth Scroll for Navigation
  --------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", function (e) {
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        e.preventDefault();
        window.scrollTo({
          top: target.offsetTop - 70,
          behavior: "smooth",
        });
      }
    });
  });

  /* ---------------------------
     Scroll Fade-in Animation
  --------------------------- */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.2 }
  );

  document.querySelectorAll(".program-card, .price-card").forEach((el) => {
    el.classList.add("fade-section");
    observer.observe(el);
  });
});

/* ---------------------------
   Fade-In Animation Styles
--------------------------- */
const style = document.createElement("style");
style.innerHTML = `
.fade-section { opacity: 0; transform: translateY(30px); transition: all 0.8s ease; }
.fade-section.visible { opacity: 1; transform: translateY(0); }
`;
document.head.appendChild(style);