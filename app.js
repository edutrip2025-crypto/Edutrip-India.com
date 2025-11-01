// minimal helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Ribbon: hide when scrolling down on small screens
const ribbon = $('#floatingRibbon');
let lastScroll = window.scrollY;
window.addEventListener('scroll', () => {
  const cur = window.scrollY;
  if (cur > lastScroll && window.innerWidth < 900) {
    ribbon.style.opacity = '0';
    ribbon.style.pointerEvents = 'none';
  } else {
    ribbon.style.opacity = '1';
    ribbon.style.pointerEvents = 'auto';
  }
  lastScroll = cur;
});

// Ribbon dropdown show on hover (desktop) - already CSS handles :hover. For mobile, toggle on click
document.querySelectorAll('.ribbon-dropdown').forEach(dd => {
  const btn = dd.querySelector('.ribbon-item');
  const menu = dd.querySelector('.ribbon-menu');
  btn.addEventListener('click', (e) => {
    if (window.innerWidth < 900) {
      e.preventDefault();
      menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    }
  });
  document.addEventListener('click', (ev) => {
    if (window.innerWidth < 900 && !dd.contains(ev.target)) {
      menu.style.display = 'none';
    }
  });
});

// Program tiles: toggle active on mobile click; keyboard accessible
$$('.program-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    if (window.innerWidth < 900) tile.classList.toggle('active');
  });
  tile.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') tile.classList.toggle('active');
  });
});

// Intersection observer: big banners reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('visible');
    }
  });
}, {threshold:0.35});
$$('.big-banner').forEach(el => io.observe(el));

// reveal-step / workshop cards observer (stagger)
const revealObs = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    }
  });
}, {threshold:0.25});

$$('.reveal-step, .workshop-card, .reveal-item').forEach(el => revealObs.observe(el));

// Demo form handling
const form = $('#enquiryForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Demo: message sent (client-side). Configure a real endpoint to receive enquiries.');
    form.reset();
  });
}

// Close ribbon menus on ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.ribbon-menu').forEach(m => m.style.display = 'none');
});
