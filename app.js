// === Utilities ===
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// Floating ribbon fade in on load + hide on quick scroll
const ribbon = $('#floatingRibbon');
let lastScroll = 0, ribbonHidden = false;
function showRibbon(){ ribbon.classList.remove('hidden'); }
function hideRibbon(){ ribbon.classList.add('hidden'); }

window.addEventListener('load', () => {
  setTimeout(showRibbon, 360); // subtle fade in
});

// Hide ribbon while scrolling fast down, show when idle or scrolling up
window.addEventListener('scroll', () => {
  const cur = window.scrollY;
  if (Math.abs(cur - lastScroll) > 40 && cur > lastScroll) {
    // scrolling down quickly -> hide
    hideRibbon();
    ribbonHidden = true;
  } else {
    // show when scroll up
    showRibbon();
    ribbonHidden = false;
  }
  lastScroll = cur;
});

// === Dropdowns: make click-to-open on small screens ===
const dropdowns = Array.from(document.querySelectorAll('.ribbon-dropdown'));
dropdowns.forEach(dd => {
  const btn = dd.querySelector('.ribbon-item');
  const menu = dd.querySelector('.ribbon-menu');

  // mobile: toggle on click
  btn.addEventListener('click', (e) => {
    if (window.innerWidth <= 900) {
      e.preventDefault();
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
  });

  // close when clicking outside
  document.addEventListener('click', (ev) => {
    if (window.innerWidth <= 900 && !dd.contains(ev.target)) {
      menu.style.display = 'none';
    }
  });
});

// Close ribbon dropdowns when user scrolls on mobile (requested)
window.addEventListener('scroll', () => {
  if (window.innerWidth <= 900) {
    document.querySelectorAll('.ribbon-menu').forEach(m => m.style.display = 'none');
  }
});

// === Programs tiles: on mobile tap reveal (toggle a class that shows description) ===
$$('.program-tile').forEach(tile => {
  tile.addEventListener('click', () => tile.classList.toggle('active'));
});

// small CSS fallback to show tile details when .active (we rely on :hover in CSS)
// Add class styles dynamically if needed:
const style = document.createElement('style');
style.innerHTML = `
.program-tile.active .tile-desc { opacity:1; transform:translateY(0) }
`;
document.head.appendChild(style);

// === Workshops: reveal one-by-one with IntersectionObserver ===
const workshopCards = $$('.workshop-card');
const seqObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    } else {
      entry.target.classList.remove('visible');
    }
  });
}, { threshold: 0.25 });

workshopCards.forEach(card => seqObserver.observe(card));

// === Contact form submit (demo only) ===
const form = $('#enquiryForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // for now just show a lightweight toast
    alert('Thanks — your enquiry is received (demo). Replace this with real backend submission.');
    form.reset();
  });
}

// === Accessibility: keyboard open for ribbon dropdowns ===
document.querySelectorAll('.ribbon-dropdown .ribbon-item').forEach(btn => {
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const menu = btn.parentElement.querySelector('.ribbon-menu');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
  });
});
