const statusSection = document.getElementById('status-section');
const downloadSection = document.getElementById('download-section');
const errorSection = document.getElementById('error-section');
const statusText = document.getElementById('status-text');
const dlFileName = document.getElementById('dl-filename');
const dlFileSize = document.getElementById('dl-filesize');
const downloadBtn = document.getElementById('download-btn');
const errorMessage = document.getElementById('error-message');

const pathParts = window.location.pathname.split('/');
const token = pathParts[pathParts.length - 1];
const encryptionKey = window.location.hash.slice(1);

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function showError(msg) {
  statusSection.style.display = 'none';
  downloadSection.style.display = 'none';
  errorSection.style.display = 'block';
  errorMessage.textContent = msg;
}

async function checkStatus() {
  if (!token || !encryptionKey) {
    showError('Invalid link. Missing token or encryption key.');
    return;
  }

  try {
    const res = await fetch(`/api/status/${token}`);

    if (res.status === 404) {
      showError('File not found. It may have been deleted.');
      return;
    }
    if (res.status === 410) {
      const data = await res.json();
      showError(data.error === 'File expired'
        ? 'This file has expired and was automatically deleted.'
        : 'This file has already been downloaded and deleted.');
      return;
    }
    if (!res.ok) {
      showError('Something went wrong.');
      return;
    }

    const file = await res.json();
    statusSection.style.display = 'none';
    downloadSection.style.display = 'block';
    dlFileName.textContent = file.filename;
    dlFileSize.textContent = formatSize(file.size);

  } catch (err) {
    showError('Could not connect to server.');
  }
}

downloadBtn.addEventListener('click', async () => {
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Downloading & Decrypting...';

  try {
    const res = await fetch(`/api/download/${token}`);

    if (!res.ok) {
      const data = await res.json();
      showError(data.error || 'Download failed');
      return;
    }

    const { filename, iv, data } = await res.json();

    // Decode base64 encrypted data
    const encryptedBytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));

    // Import the key and decrypt
    const key = await importKey(encryptionKey);
    const decrypted = await decryptFile(encryptedBytes, key, iv);

    // Trigger download
    const blob = new Blob([decrypted]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success state
    downloadSection.innerHTML = `
      <div class="success-icon">&#10003;</div>
      <h2>Download Complete</h2>
      <p class="subtitle">The file has been decrypted and downloaded.<br>The server copy has been permanently deleted.</p>
    `;

  } catch (err) {
    showError('Decryption failed. The link may be corrupted.');
  }
});

checkStatus();
