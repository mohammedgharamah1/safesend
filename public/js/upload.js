const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const progressSection = document.getElementById('progress-section');
const resultSection = document.getElementById('result-section');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const shareLink = document.getElementById('share-link');
const copyBtn = document.getElementById('copy-btn');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    handleFile(fileInput.files[0]);
  }
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function handleFile(file) {
  if (file.size > 50 * 1024 * 1024) {
    alert('File too large. Maximum size is 50 MB.');
    return;
  }

  uploadSection.style.display = 'none';
  progressSection.style.display = 'block';

  try {
    // Step 1: Generate encryption key
    progressText.textContent = 'Generating encryption key...';
    progressBar.style.width = '10%';
    const key = await generateKey();
    const keyStr = await exportKey(key);

    // Step 2: Encrypt file
    progressText.textContent = 'Encrypting file...';
    progressBar.style.width = '40%';
    const { encrypted, iv } = await encryptFile(file, key);

    // Step 3: Upload encrypted file
    progressText.textContent = 'Uploading encrypted file...';
    progressBar.style.width = '70%';

    const formData = new FormData();
    formData.append('file', new Blob([encrypted]));
    formData.append('filename', file.name);
    formData.append('iv', iv);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }

    const { token } = await res.json();

    // Step 4: Show result
    progressBar.style.width = '100%';
    progressText.textContent = 'Done!';

    const link = `${window.location.origin}/d/${token}#${keyStr}`;

    setTimeout(() => {
      progressSection.style.display = 'none';
      resultSection.style.display = 'block';
      fileName.textContent = file.name;
      fileSize.textContent = formatSize(file.size);
      shareLink.value = link;
    }, 500);

  } catch (err) {
    progressSection.style.display = 'none';
    uploadSection.style.display = 'block';
    alert('Error: ' + err.message);
  }
}

copyBtn.addEventListener('click', () => {
  shareLink.select();
  navigator.clipboard.writeText(shareLink.value).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
  });
});

document.getElementById('upload-another').addEventListener('click', () => {
  resultSection.style.display = 'none';
  uploadSection.style.display = 'block';
  progressBar.style.width = '0%';
  fileInput.value = '';
});
