async function generateKey() {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function exportKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importKey(base64) {
  const str = base64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str + '='.repeat((4 - str.length % 4) % 4);
  const raw = Uint8Array.from(atob(pad), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'raw', raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

async function encryptFile(file, key) {
  const data = await file.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return {
    encrypted: new Uint8Array(encrypted),
    iv: btoa(String.fromCharCode(...iv))
  };
}

async function decryptFile(encryptedData, key, ivBase64) {
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );
  return new Uint8Array(decrypted);
}
