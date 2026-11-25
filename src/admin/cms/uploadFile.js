/* The raw upload to POST /api/cms/upload-file (management only, MP4 or PDF up to 40 MB, stored unchanged on Sanity's
   CDN): used by Site settings › Large site files and an event's hero video (Event pages). */
import { ADMIN_API, PASSWORD_REQUIRED, getToken } from "../api";

/** POST the raw file with upload progress → { assetId, url }. */
export function uploadRaw(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${ADMIN_API}/cms/upload-file?filename=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader("Content-Type", file.type);
    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status === 401) window.dispatchEvent(new CustomEvent("ttfc:admin-unauthorized"));
      if (data.code === PASSWORD_REQUIRED) window.dispatchEvent(new CustomEvent("ttfc:admin-password-required"));
      if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data);
      else reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Can't reach the server. Check your connection and try again."));
    xhr.send(file);
  });
}

