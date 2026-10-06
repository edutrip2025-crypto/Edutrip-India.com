(() => {
  'use strict';
  const form = document.querySelector('#registration');
  const config = window.CHENNAI_REGISTRATION || {};
  const status = document.querySelector('#status');
  const button = document.querySelector('#submit-button');
  const schools = ['Headmaster / Headmistress', 'Principal', 'School Complex Headmaster'];
  const tripDate = '2026-10-28';
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  form.elements.date_of_birth.max = localDate < tripDate ? localDate : tripDate;
  function conditional(id, active) {
    const wrap = document.getElementById(id); wrap.hidden = !active;
    wrap.querySelectorAll('input,textarea').forEach(input => { input.disabled = !active; input.required = active; });
  }
  form.elements.role.addEventListener('change', () => {
    conditional('role-other-wrap', form.elements.role.value === 'Other');
    form.elements.udise.required = schools.includes(form.elements.role.value);
    document.querySelector('#udise-required').textContent = form.elements.udise.required ? '*' : '(optional)';
  });
  form.elements.medical_declaration.addEventListener('change', () => {
    conditional('medical-wrap', form.elements.medical_declaration.value === 'Yes');
    document.querySelector('#medical-private').hidden = form.elements.medical_declaration.value !== 'Discuss privately';
  });
  const foods = [...form.querySelectorAll('[name=food_restrictions]')];
  foods.forEach(input => input.addEventListener('change', () => {
    if (input.checked) foods.forEach(other => { if (other !== input && (input.value === 'None' || other.value === 'None')) other.checked = false; });
    conditional('food-other-wrap', document.querySelector('#food-other').checked);
    foods[0].setCustomValidity('');
  }));
  let previewUrl;
  const photo = document.querySelector('#photo');
  photo.addEventListener('change', () => {
    photo.setCustomValidity('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const preview = document.querySelector('#photo-preview'); preview.hidden = true;
    const file = photo.files[0]; if (!file) return;
    if (!['image/jpeg','image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      photo.setCustomValidity('Choose a JPG or PNG photograph up to 2 MB.'); photo.reportValidity(); return;
    }
    previewUrl = URL.createObjectURL(file); preview.src = previewUrl; preview.hidden = false;
  });
  if (!config.endpoint || !config.publicKey) {
    document.querySelector('#setup-notice').hidden = false;
    button.disabled = true;
    form.querySelectorAll('fieldset').forEach(fieldset => { fieldset.disabled = true; });
  }
  // Retain the same request ID for safe retry after a network interruption; no personal data is persisted locally.
  const requestId = crypto.randomUUID();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    foods[0].setCustomValidity(foods.some(input => input.checked) ? '' : 'Select food restrictions or None.');
    if (!form.reportValidity()) return;
    button.disabled = true; status.className = ''; status.textContent = 'Submitting your registration…';
    const payload = new FormData(form); payload.append('request_id', requestId);
    try {
      const response = await fetch(config.endpoint, { method: 'POST', headers: { apikey: config.publicKey, Authorization: `Bearer ${config.publicKey}` }, body: payload });
      const result = await response.json();
      if (!response.ok || !result.reference) throw new Error(result.error || 'We could not confirm your submission. Please try again or contact Edutrip.');
      document.querySelector('#reference').textContent = result.reference;
      form.hidden = true; const success = document.querySelector('#success'); success.hidden = false; success.focus(); success.scrollIntoView({behavior:'smooth'});
      form.reset(); if (previewUrl) URL.revokeObjectURL(previewUrl);
    } catch (error) {
      status.className = 'error'; status.textContent = error.message === 'Failed to fetch' ? 'Connection interrupted. Your details remain in this form. Please retry; if the issue continues, call 7989054712.' : error.message;
      status.focus(); button.disabled = false;
    }
  });
})();
