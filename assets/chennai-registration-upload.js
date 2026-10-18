(function (root) {
  'use strict';
  class UploadError extends Error {
    constructor(message, code, status = 0) { super(message); this.name = 'UploadError'; this.code = code; this.status = status; }
  }
  function requestId(cryptoAPI = root.crypto) {
    if (typeof cryptoAPI.randomUUID === 'function') return cryptoAPI.randomUUID();
    const bytes = cryptoAPI.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2,'0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  function createFileCache({readTimeoutMs = 45000} = {}) {
    const copies = new WeakMap();
    return {
      read(file, label, code) {
        if (!copies.has(file)) {
          // Read at selection time. Mobile file providers can invalidate the original later.
          const copy = (async () => {
            let timeout;
            try {
              const bytes = await Promise.race([file.arrayBuffer(),new Promise((_,reject)=>{
                timeout = setTimeout(()=>reject(new Error('File read timed out')),readTimeoutMs);
              })]);
              if (bytes.byteLength !== file.size) throw new Error('Incomplete file');
              let type = file.type;
              if (!type || type === 'application/octet-stream') {
                const signature = new Uint8Array(bytes);
                if ([137,80,78,71,13,10,26,10].every((value,index)=>signature[index]===value)) type = 'image/png';
                else if (signature[0]===255 && signature[1]===216 && signature[2]===255) type = 'image/jpeg';
                else if (code === 'FILE_AADHAAR' && new TextDecoder().decode(signature.slice(0,5)) === '%PDF-') type = 'application/pdf';
                else throw new UploadError(`Please select ${code === 'FILE_PHOTO' ? 'a JPG or PNG photograph' : 'a PDF, JPG or PNG masked Aadhaar copy'}.` ,code);
              }
              return new Blob([bytes], {type});
            } catch (error) {
              if (error instanceof UploadError) throw error;
              throw new UploadError(`We could not read ${label}. Please select that file again. Your other details remain in this form.`, code);
            } finally { clearTimeout(timeout); }
          })();
          // The selection event may finish before submit starts awaiting this promise.
          copy.catch(() => {});
          copies.set(file, copy);
        }
        return copies.get(file);
      }
    };
  }
  async function submit({endpoint, publicKey, payload, onRetry = () => {}, fetcher = fetch, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), timeoutMs = 90000}) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(),timeoutMs);
      try {
        const response = await fetcher(endpoint, {
          method:'POST', headers:{apikey:publicKey, Authorization:`Bearer ${publicKey}`},
          body:payload, signal:controller.signal
        });
        let result;
        try { result = await response.json(); }
        catch {
          if (controller.signal.aborted) throw new DOMException('Upload timed out','AbortError');
          const error = new UploadError(response.status === 413 ? 'The upload was rejected as too large. Use a photo up to 2 MB and masked Aadhaar up to 5 MB.' : 'We could not read the server response. Your details remain in this form. Please retry.', 'UPLOAD_RESPONSE', response.status);
          error.retryable = response.ok || [408,429,500,502,503,504].includes(response.status);
          throw error;
        }
        if (!response.ok || typeof result?.reference !== 'string' || !result.reference.trim()) {
          const serverCodes = ['BODY_READ','DATABASE_LOOKUP','ITINERARY_LINK','PHOTO_UPLOAD','AADHAAR_UPLOAD','DATABASE_SAVE'];
          const message = typeof result?.error === 'string' ? result.error : 'We could not confirm your submission. Your details remain in this form. Please retry or call 7989054712.';
          const error = new UploadError(message,serverCodes.includes(result?.code) ? result.code : 'UPLOAD_SERVER',response.status);
          error.retryable = response.ok || [408,429,500,502,503,504].includes(response.status);
          const retryAfter = Number(response.headers.get('Retry-After'));
          if (response.status === 429 && retryAfter > 5) error.retryable = false;
          throw error;
        }
        return result;
      } catch (error) {
        if (attempt === 0 && (!(error instanceof UploadError) || error.retryable)) {
          clearTimeout(timeout);
          try { onRetry(); } catch { /* Progress display must not cancel a safe retry. */ }
          await delay(1000); continue;
        }
        if (error instanceof UploadError) throw error;
        const timedOut = controller.signal.aborted || error?.name === 'TimeoutError' || error?.name === 'AbortError';
        throw new UploadError(timedOut
          ? 'The upload took too long. Your details remain in this form. Please retry on a stable connection.'
          : 'The upload connection failed. Your details remain in this form. Please retry; if it continues, call 7989054712.', timedOut ? 'UPLOAD_TIMEOUT' : 'UPLOAD_CONNECTION');
      } finally { clearTimeout(timeout); }
    }
  }
  const api = {createFileCache, submit, requestId};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CHENNAI_UPLOAD = api;
})(typeof window === 'undefined' ? globalThis : window);
