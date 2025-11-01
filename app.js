// small helper
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// Floating ribbon: on small screens make dropdowns click -> toggle; hide on scroll down
const ribbon = document.getElementById('floatingRibbon');
let lastScroll = window.scrollY;
window.addEventListener('scroll', () => {
  const cur = window.scrollY;
  if (cur > lastScroll && window.innerWidth < 900) {
    ribbon.style.opacity = '0'; ribbon.style.pointerEvents = 'none';
  } else {
    ribbon.style.opacity = '1'; ribbon.style.pointerEvents = 'auto';
  }
  lastScroll = cur;
});

// Dropdowns click behavior for mobile
document.querySelectorAll('.ribbon-dropdown').forEach(dd => {
  const btn = dd.querySelector('.ribbon-item');
  const menu = dd.querySelector('.ribbon-menu');
  btn.addEventListener('click', (e) => {
    if (window.innerWidth < 900) {
      e.preventDefault();
      if (menu.style.display === 'block') menu.style.display = 'none';
      else menu.style.display = 'block';
    }
  });

  // close on outside click
  document.addEventListener('click', (ev) => {
    if (window.innerWidth < 900 && !dd.contains(ev.target)) {
      menu.style.display = 'none';
    }
  });
});

// Programs tile: keep title visible; description reveals on hover; enable keyboard toggles
$$('.program-tile').forEach(tile => {
  tile.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') tile.classList.toggle('active');
  });
  tile.addEventListener('click', () => {
    if (window.innerWidth < 900) tile.classList.toggle('active');
  });
});

// IntersectionObserver for big banners (Add -> Send -> Learn) to reveal in sequence
const bigItems = $$('.big-banner');
const ioBig = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, {threshold: 0.35});
bigItems.forEach(b => ioBig.observe(b));

// Reveal items helper for workshops and other sections: staggered reveal
const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // if card has reveal-step, add incremental delay
      if (entry.target.classList.contains('reveal-step')) {
        const siblings = Array.from(entry.target.parentElement.children);
        const idx = siblings.indexOf(entry.target);
        entry.target.style.transitionDelay = `${idx * 140}ms`;
      }
      obs.unobserve(entry.target);
    }
  });
}, {threshold: 0.25});

// Observe workshop cards and any reveal-item
$$('.reveal-step').forEach(el => revealObserver.observe(el));
$$('.workshop-card').forEach(el => revealObserver.observe(el));
$$('.reveal-item').forEach(el => revealObserver.observe(el));

// Contact form demo submit
const form = $('#enquiryForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thank you — demo submission received. Wire the form to your backend as needed.');
    form.reset();
  });
}

// Accessibility: close all ribbon menus on escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.ribbon-menu').forEach(m => m.style.display = 'none');
  }
});
