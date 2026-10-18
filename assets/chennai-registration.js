(() => {
  'use strict';
  const form = document.querySelector('#registration');
  const config = window.CHENNAI_REGISTRATION || {};
  const status = document.querySelector('#status');
  const button = document.querySelector('#submit-button');
  const uploads = window.CHENNAI_UPLOAD;
  const fileCache = uploads.createFileCache();
  const requestId = crypto.randomUUID();
  function reportFailure(error) {
    // Never include field values, file names, file contents or raw exception messages.
    const diagnostic = {request_id:requestId, code:error.code || 'UPLOAD_UNKNOWN', status:error.status || 0};
    fetch('/api/registration-diagnostics', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(diagnostic), keepalive:true}).catch(() => {});
  }
  function prepareFile(input, label, code) {
    const file = input.files[0];
    fileCache.read(file, label, code).catch(error => {
      if (input.files[0] !== file) return;
      input.setCustomValidity(error.message);
      status.className = 'error'; status.textContent = error.message;
      reportFailure(error);
    });
  }
  const tripDate = '2026-10-27';
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  form.elements.date_of_birth.max = localDate < tripDate ? localDate : tripDate;
  function conditional(id, active) {
    const wrap = document.getElementById(id); wrap.hidden = !active;
    wrap.querySelectorAll('input,textarea').forEach(input => { input.disabled = !active; input.required = active; });
  }
  form.elements.role.addEventListener('change', () => {
    conditional('role-other-wrap', form.elements.role.value === 'Other');
  });
  form.elements.whatsapp_different.addEventListener('change', () => {
    const different = form.elements.whatsapp_different.checked;
    conditional('whatsapp-wrap', different);
    if (!different) form.elements.whatsapp_phone.value = '';
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
    prepareFile(photo, 'your photograph', 'FILE_PHOTO');
  });
  const aadhaar = document.querySelector('#aadhaar-card');
  aadhaar.addEventListener('change', () => {
    aadhaar.setCustomValidity('');
    const file = aadhaar.files[0]; if (!file) return;
    if (!['application/pdf','image/jpeg','image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      aadhaar.setCustomValidity('Choose a PDF, JPG or PNG masked Aadhaar copy up to 5 MB.'); aadhaar.reportValidity(); return;
    }
    prepareFile(aadhaar, 'your masked Aadhaar copy', 'FILE_AADHAAR');
  });
  if (!config.endpoint || !config.publicKey) {
    document.querySelector('#setup-notice').hidden = false;
    button.disabled = true;
    form.querySelectorAll('fieldset').forEach(fieldset => { fieldset.disabled = true; });
  }
  // Retain the same request ID for safe retry after a network interruption; no personal data is persisted locally.
  form.addEventListener('submit', async event => {
    event.preventDefault();
    foods[0].setCustomValidity(foods.some(input => input.checked) ? '' : 'Select food restrictions or None.');
    if (!form.reportValidity()) return;
    button.disabled = true; status.className = ''; status.textContent = 'Submitting your registration…';
    try {
      status.textContent = 'Preparing your files…';
      const selectedPhoto = photo.files[0], selectedAadhaar = aadhaar.files[0];
      const payload = new FormData(form); payload.append('request_id', requestId);
      const [photoCopy, aadhaarCopy] = await Promise.all([
        fileCache.read(selectedPhoto, 'your photograph', 'FILE_PHOTO'),
        fileCache.read(selectedAadhaar, 'your masked Aadhaar copy', 'FILE_AADHAAR')
      ]);
      // Replace browser/provider-backed Files with the stable in-memory copies.
      payload.set('photo', photoCopy, selectedPhoto.name);
      payload.set('aadhaar_card', aadhaarCopy, selectedAadhaar.name);
      status.textContent = 'Uploading your registration. Please keep this page open…';
      const result = await uploads.submit({endpoint:config.endpoint, publicKey:config.publicKey, payload,
        onRetry:() => { status.textContent = 'Connection interrupted. Retrying your registration safely…'; }
      });
      document.querySelector('#reference').textContent = result.reference;
      if (result.itinerary_url) {
        const itineraryLink = document.querySelector('#itinerary-link');
        itineraryLink.href = result.itinerary_url;
        itineraryLink.download = result.itinerary_filename || '';
        document.querySelector('#itinerary-message').textContent = `Your ${form.elements.district.value} itinerary is ready:`;
      } else {
        document.querySelector('#itinerary-message').textContent = 'Your registration is confirmed. Contact Edutrip for your district itinerary.';
        document.querySelector('#itinerary-link').hidden = true;
      }
      form.hidden = true; const success = document.querySelector('#success'); success.hidden = false; success.focus(); success.scrollIntoView({behavior:'smooth'});
      form.reset(); if (previewUrl) URL.revokeObjectURL(previewUrl);
    } catch (error) {
      reportFailure(error);
      status.className = 'error'; status.textContent = `${error.message} Support code: ${error.code || 'UPLOAD_UNKNOWN'} / ${requestId.slice(0,8)}.`;
      status.focus(); button.disabled = false;
    }
  });
})();
