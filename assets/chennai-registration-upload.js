(function (root) {
  'use strict';
  class UploadError extends Error {
    constructor(message, code, status = 0) { super(message); this.name = 'UploadError'; this.code = code; this.status = status; }
  }
  function createFileCache() {
    const copies = new WeakMap();
    return {
      read(file, label, code) {
        if (!copies.has(file)) {
          // Read at selection time. Mobile file providers can invalidate the original later.
          const copy = (async () => {
            try {
              const bytes = await file.arrayBuffer();
              if (bytes.byteLength !== file.size) throw new Error('Incomplete file');
              return new Blob([bytes], {type:file.type});
            } catch {
              throw new UploadError(`We could not read ${label}. Please select that file again. Your other details remain in this form.`, code);
            }
          })();
          // The selection event may finish before submit starts awaiting this promise.
          copy.catch(() => {});
          copies.set(file, copy);
        }
        return copies.get(file);
      }
    };
  }
  async function submit({endpoint, publicKey, payload, onRetry = () => {}, fetcher = fetch, delay = () => new Promise(resolve => setTimeout(resolve, 1000)), timeoutMs = 90000}) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let response;
      try {
        response = await fetcher(endpoint, {
          method:'POST', headers:{apikey:publicKey, Authorization:`Bearer ${publicKey}`},
          body:payload, signal:AbortSignal.timeout(timeoutMs)
        });
      } catch (error) {
        if (attempt === 0) { onRetry(); await delay(); continue; }
        const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
        throw new UploadError(timedOut
          ? 'The upload took too long. Your details remain in this form. Please retry on a stable connection.'
          : 'The upload connection failed. Your details remain in this form. Please retry; if it continues, call 7989054712.', timedOut ? 'UPLOAD_TIMEOUT' : 'UPLOAD_CONNECTION');
      }
      let result;
      try { result = await response.json(); }
      catch { throw new UploadError(response.status === 413 ? 'The upload was rejected as too large. Use a photo up to 2 MB and masked Aadhaar up to 5 MB.' : 'We could not read the server response. Your details remain in this form. Please retry.', 'UPLOAD_RESPONSE', response.status); }
      if (!response.ok || !result.reference) {
        const serverCodes = ['BODY_READ','DATABASE_LOOKUP','ITINERARY_LINK','PHOTO_UPLOAD','AADHAAR_UPLOAD','DATABASE_SAVE'];
        throw new UploadError(result.error || 'We could not confirm your submission. Please retry or call 7989054712.', serverCodes.includes(result.code) ? result.code : 'UPLOAD_SERVER', response.status);
      }
      return result;
    }
  }
  const api = {createFileCache, submit};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CHENNAI_UPLOAD = api;
})(typeof window === 'undefined' ? globalThis : window);
