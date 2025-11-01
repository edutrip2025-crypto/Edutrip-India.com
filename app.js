// app.js
// Handles ribbon dropdowns, GSAP ScrollTrigger animations for programs & workshops,
// mobile dropdown toggles and contact form basic behavior.

document.addEventListener('DOMContentLoaded', function () {
  // Ribbon dropdown show/hide (desktop hover + click fallback)
  document.querySelectorAll('.r-dropdown').forEach(drop => {
    const menu = drop.querySelector('.r-menu');
    drop.addEventListener('mouseenter', ()=> menu.style.display = 'block');
    drop.addEventListener('mouseleave', ()=> menu.style.display = 'none');

    // mobile toggle
    drop.querySelector('.r-label').addEventListener('click', (e)=>{
      e.stopPropagation();
      // close other menus
      document.querySelectorAll('.r-menu').forEach(m => { if(m !== menu) m.style.display = 'none' });
      menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    });
  });

  // close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.r-menu').forEach(m => m.style.display = 'none');
  });

  // ribbon home click scroll to top
  document.querySelector('.r-home').addEventListener('click', (e)=>{
    e.preventDefault();
    window.scrollTo({top:0, behavior:'smooth'});
  });

  // internal ribbon links scroll
  document.querySelectorAll('[data-target]').forEach(a=>{
    a.addEventListener('click', (ev)=>{
      ev.preventDefault();
      const sel = a.getAttribute('data-target');
      document.querySelector(sel).scrollIntoView({behavior:'smooth', block:'start'});
      // hide menus
      document.querySelectorAll('.r-menu').forEach(m => m.style.display = 'none');
    });
  });

  // GSAP - scroll-based animations
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    // Programs: each panel becomes active when it reaches center
    const panels = gsap.utils.toArray('.program-panel');
    panels.forEach((panel, i) => {
      // initial state: only first panel is active, others minimized
      if (i === 0) {
        panel.classList.remove('minimized'); // full
      } else {
        panel.classList.add('minimized');
      }

      ScrollTrigger.create({
        trigger: panel,
        start: "top center",
        end: "bottom center",
        onEnter: () => {
          // make this full and minimize previous ones
          panels.forEach((p,idx)=>{
            if (p === panel) {
              p.classList.remove('minimized');
              p.style.opacity = 1;
              p.style.transform = 'translateY(0px) scale(1)';
            } else if (idx < i) {
              p.classList.add('minimized');
              p.style.opacity = 0.95;
              p.style.transform = 'translateY(0px) scale(0.98)';
            } else {
              // after ones - default card state
              p.classList.add('minimized');
              p.style.opacity = 0.9;
              p.style.transform = 'translateY(0px) scale(0.99)';
            }
          });
        },
        onEnterBack: () => {
          // if scrolling up, restore previous accordingly
          panels.forEach((p,idx)=>{
            if (idx <= i) {
              p.classList.remove('minimized');
              p.style.opacity = 1;
              p.style.transform = 'translateY(0px) scale(1)';
            } else {
              p.classList.add('minimized');
            }
          });
        }
      });
    });

    // Workshops: slide each in when near viewport
    gsap.utils.toArray('.workshop').forEach((w, idx) => {
      const fromX = (idx % 2 === 0) ? -120 : 120;
      gsap.fromTo(w, {x: fromX, opacity: 0, y: 40}, {
        x: 0, opacity: 1, y:0, duration: 0.8, ease: "power3.out",
        scrollTrigger: {
          trigger: w,
          start: "top 80%",
          toggleActions: "play none none reverse"
        }
      });
    });

    // minor hero animation
    gsap.from('.hero-inner h1', {y:20, opacity:0, duration:0.9, ease: "power2.out", delay: 0.05});
    gsap.from('.hero-inner p', {y:20, opacity:0, duration:0.9, ease: "power2.out", delay: 0.18});
    gsap.from('.hero .btn-primary', {scale:0.98, opacity:0, duration:0.6, delay:0.28});
  }

  // Simple contact form submit (demo)
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // user feedback (demo)
      const btn = form.querySelector('button[type="submit"]');
      btn.innerText = 'Sending...';
      setTimeout(()=>{ btn.innerText = 'Sent ✓'; form.reset(); setTimeout(()=>btn.innerText='Send Message', 1400); }, 900);
    });
  }

  // Mobile: ensure dropdowns close on scroll to reduce clutter
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const sc = window.scrollY;
    if (Math.abs(sc - lastScroll) > 20) {
      document.querySelectorAll('.r-menu').forEach(m => m.style.display = 'none');
      lastScroll = sc;
    }
  });
});
