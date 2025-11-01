/* app.js — UI interactions: mobile drawer, modal, carousel, marquee, forms, service-worker registration */
(function(){
  // Helpful selectors
  const hamburger = document.getElementById('hamburger');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerClose = document.getElementById('drawerClose');
  const header = document.getElementById('site-header');
  const marqueeTrack = document.getElementById('marquee-track');
  const pauseBtn = document.getElementById('pause-marquee');
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modal-content');
  const modalClose = document.getElementById('modal-close');
  const openModalButtons = document.querySelectorAll('.open-modal');
  const bookTop = document.getElementById('bookTop');
  const quoteBtn = document.getElementById('quoteBtn');
  const getProposal = document.getElementById('getProposal');

  // Sample data for modal content
  const trips = {
    'mumbai-marine': {
      title: 'Mumbai Marine Biology Expedition',
      details: '<p class="muted-sm">Field sampling, tide pool surveys, lab-based identification and teacher-led assessment activities mapped to standards.</p><ul class="muted-sm"><li>Grade: 7–9</li><li>Duration: 3 days</li><li>Includes: Teacher guide, assessment pack, StuCom reports</li></ul>'
    },
    'ajanta-heritage': {
      title: 'Ajanta Heritage & History Trail',
      details: '<ul class="muted-sm"><li>Grade: 8–10</li><li>Duration: 2 days</li><li>Includes: Source worksheets & project prompts</li></ul>'
    },
    'kala-sanskriti': {
      title: 'Kala: Arts & Culture Residency',
      details: '<ul class="muted-sm"><li>Grades: 6–12</li><li>Duration: 1–2 days</li></ul>'
    },
    'ghats-geography': {
      title: 'Western Ghats: Geography Immersion',
      details: '<ul class="muted-sm"><li>Grades: 9–11</li><li>Duration: 4 days</li></ul>'
    },
    'robotics': {
      title: 'Robotics Bootcamp',
      details: '<ul class="muted-sm"><li>Grades: 9–11</li><li>Duration: 2 days</li></ul>'
    }
  };

  // header hide on scroll (clean)
  let lastY = window.scrollY;
  let ticking = false;
  window.addEventListener('scroll', ()=> {
    if (!ticking) {
      window.requestAnimationFrame(()=> {
        const y = window.scrollY;
        if (y > lastY && y > 100) header.classList.add('hidden');
        else header.classList.remove('hidden');
        lastY = y;
        ticking = false;
      });
      ticking = true;
    }
  });

  // Mobile drawer toggle
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!expanded));
      mobileDrawer.classList.toggle('open');
      mobileDrawer.setAttribute('aria-hidden', String(expanded));
    });
  }
  if (drawerClose) drawerClose.addEventListener('click', () => {
    mobileDrawer.classList.remove('open'); mobileDrawer.setAttribute('aria-hidden','true'); hamburger.setAttribute('aria-expanded','false');
  });

  // Smooth scrolling for anchors
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const el = document.querySelector(href);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({behavior:'smooth', block:'start'});
        if (mobileDrawer && mobileDrawer.classList.contains('open')) {
          mobileDrawer.classList.remove('open');
          mobileDrawer.setAttribute('aria-hidden','true');
          hamburger.setAttribute('aria-expanded','false');
        }
      }
    });
  });

  // Marquee duplication for seamless scroll
  if (marqueeTrack) {
    const children = Array.from(marqueeTrack.children);
    children.forEach(ch => marqueeTrack.appendChild(ch.cloneNode(true)));
    // pause/resume
    let paused = false;
    if (pauseBtn) {
      pauseBtn.addEventListener('click', (e)=> {
        e.preventDefault();
        paused = !paused;
        marqueeTrack.style.animationPlayState = paused ? 'paused' : 'running';
        pauseBtn.textContent = paused ? 'Resume Scrolling' : 'Pause Scrolling';
      });
    }
    // pause on hover
    const marqueeWrap = document.getElementById('marquee-wrap');
    if (marqueeWrap) {
      marqueeWrap.addEventListener('mouseenter', ()=> marqueeTrack.style.animationPlayState = 'paused');
      marqueeWrap.addEventListener('mouseleave', ()=> { if (!paused) marqueeTrack.style.animationPlayState = 'running'; });
    }
    // adaptive speed
    function adjustMarquee(){
      const total = Array.from(marqueeTrack.children).reduce((s,ch)=> s + ch.getBoundingClientRect().width + 16, 0);
      const sec = Math.max(18, Math.min(60, Math.round(total / 40)));
      marqueeTrack.style.animation = `scroll-left ${sec}s linear infinite`;
    }
    window.addEventListener('load', adjustMarquee);
    window.addEventListener('resize', ()=> setTimeout(adjustMarquee, 200));
  }

  // Modal open/close logic
  function openModal(title, html){
    modalContent.innerHTML = `<h2 style="margin-top:0">${title}</h2>${html}`;
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    // focus first focusable
    setTimeout(()=> {
      const f = modal.querySelector('a,button,input,select,textarea');
      if (f) f.focus();
    }, 120);
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    modalContent.innerHTML = '';
  }
  if (modalClose) modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=> { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e)=> { if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal(); });

  // Open modal when clicking .open-modal (delegation)
  document.body.addEventListener('click', (e)=> {
    const btn = e.target.closest('.open-modal');
    if (!btn) return;
    const id = btn.dataset.id;
    if (id && id.startsWith('plan-')) {
      const plan = id.split('-')[1];
      let title = plan.charAt(0).toUpperCase()+plan.slice(1) + ' Plan';
      let html = '';
      if (plan === 'gold') html = `<p class="muted-sm">Gold Plan - ₹3,799 per student</p><ul class="muted-sm"><li>3 educational trips</li><li>3 SimpLearn sessions</li><li>2 Workshops</li></ul>`;
      else if (plan === 'platinum') html = `<p class="muted-sm">Platinum - Everything in Gold + extras</p><ul class="muted-sm"><li>+1 educational trip</li><li>StuCom APP premium access</li></ul>`;
      else if (plan === 'diamond') html = `<p class="muted-sm">Diamond - Premium</p><ul class="muted-sm"><li>Everything in Platinum + mentorship</li></ul>`;
      else html = `<p class="muted-sm">Plan details available on request.</p>`;
      openModal(title, html + `<div style="margin-top:12px"><a class="btn btn-primary" href="#contact">Request This Plan</a></div>`);
      return;
    }
    if (!id) return;
    const data = trips[id];
    if (data) openModal(data.title, data.details + `<div style="margin-top:12px"><a class="btn btn-primary" href="#contact">Request Proposal</a> <a class="btn btn-outline" href="mailto:founders@edutripindia.com?subject=${encodeURIComponent(data.title)}">Email Us</a></div>`);
  });

  // Book / quote buttons open modal (example)
  const quoteOpeners = [bookTop, quoteBtn, getProposal];
  quoteOpeners.forEach(b => { if (b) b.addEventListener('click', ()=> openModal('Request a Proposal', '<p class="muted-sm">Fill the contact form to request a custom proposal.</p><div style="margin-top:12px"><a class="btn btn-primary" href="#contact">Go to Contact</a></div>'))});

  // Testimonials carousel
  const testimonials = Array.from(document.querySelectorAll('.testimonial'));
  let currentTest = 0;
  const prevBtn = document.getElementById('prevTest');
  const nextBtn = document.getElementById('nextTest');
  function showTest(i){
    testimonials.forEach(t=>t.classList.remove('active'));
    testimonials[i].classList.add('active');
    currentTest = i;
  }
  if (prevBtn) prevBtn.addEventListener('click', ()=> showTest((currentTest-1+testimonials.length)%testimonials.length));
  if (nextBtn) nextBtn.addEventListener('click', ()=> showTest((currentTest+1)%testimonials.length));
  let auto = setInterval(()=> showTest((currentTest+1)%testimonials.length), 6000);
  const testWrap = document.getElementById('testWrap');
  if (testWrap) { testWrap.addEventListener('mouseenter', ()=> clearInterval(auto)); testWrap.addEventListener('mouseleave', ()=> { auto = setInterval(()=> showTest((currentTest+1)%testimonials.length), 6000); }); }

  // Contact form: AJAX POST to /api/enquiries (if exists), otherwise mailto fallback
  const contactForm = document.getElementById('contact-form');
  const contactStatus = document.getElementById('contactStatus');
  contactForm && contactForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    contactStatus.textContent = ''; contactStatus.style.color = '';
    const fd = new FormData(contactForm);
    const data = Object.fromEntries(fd.entries());
    if (!data.organization || !data.name || !data.email) {
      contactStatus.style.color = 'tomato'; contactStatus.textContent = 'Please fill Organization, Contact Person and Email.';
      return;
    }
    // Basic email check
    if (!/\S+@\S+\.\S+/.test(data.email)) { contactStatus.style.color = 'tomato'; contactStatus.textContent = 'Invalid email.'; return; }
    contactStatus.style.color = '#566173'; contactStatus.textContent = 'Sending...';

    // Try POST to /api/enquiries (if you add a backend), otherwise fallback to mailto
    const endpoint = '/api/enquiries';
    try {
      const resp = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
      if (resp.ok) {
        contactStatus.style.color = '#2a9d6f'; contactStatus.textContent = 'Enquiry sent — we will contact you shortly.';
        contactForm.reset();
        return;
      } else {
        // fallback to mailto
        throw new Error('server');
      }
    } catch (err) {
      // fallback to mailto
      const subject = encodeURIComponent('Edutrip Enquiry: ' + (data.organization || 'School'));
      const body = encodeURIComponent(Object.entries(data).map(([k,v])=> `${k}: ${v}`).join('\n'));
      window.location.href = `mailto:founders@edutripindia.com?subject=${subject}&body=${body}`;
    }
  });

  // mailto fallback button
  const mailtoBtn = document.getElementById('mailto-fallback');
  mailtoBtn && mailtoBtn.addEventListener('click', ()=> window.location.href = 'mailto:founders@edutripindia.com');

  // make tiles keyboard accessible
  document.querySelectorAll('.tile').forEach(t => t.setAttribute('tabindex','0'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('tile')) {
    const btn = document.activeElement.querySelector('.open-modal'); if (btn) btn.click();
  }});

  // register service worker (if present & secure)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(()=>{/*sw fail silently*/});
    });
  }

  // respect reduced motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReduced.matches) {
    document.querySelectorAll('.bg-icon, .marquee-track').forEach(n=> n.style.animation = 'none');
  }
})();