const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { saveFile, getFile, markDownloaded, deleteFile } = require('./db');
const { cleanupExpiredFiles } = require('./cleanup');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const token = uuidv4().replace(/-/g, '').slice(0, 12);
    req.fileToken = token;
    cb(null, token);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.use(express.static(path.join(__dirname, 'public')));

// Download page route - serve download.html for /d/:token
app.get('/d/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

// Upload encrypted file
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const token = req.fileToken;
  const filename = req.body.filename || 'download';
  const iv = req.body.iv;

  if (!iv) {
    // Clean up uploaded file if IV is missing
    fs.unlinkSync(path.join(UPLOADS_DIR, token));
    return res.status(400).json({ error: 'Missing IV' });
  }

  const now = new Date();
  const expires = new Date(now.getTime() + 10 * 60 * 1000);

  saveFile.run(token, filename, req.file.size, now.toISOString(), expires.toISOString());

  // Store IV alongside the file metadata (in a sidecar file)
  fs.writeFileSync(path.join(UPLOADS_DIR, token + '.iv'), iv);

  res.json({ token });
});

// Check file status
app.get('/api/status/:token', (req, res) => {
  const file = getFile.get(req.params.token);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (file.downloaded) {
    return res.status(410).json({ error: 'File already downloaded' });
  }

  if (new Date(file.expires_at) < new Date()) {
    return res.status(410).json({ error: 'File expired' });
  }

  res.json({
    filename: file.filename,
    size: file.size,
    expires_at: file.expires_at
  });
});

// Download encrypted file (one-time)
app.get('/api/download/:token', (req, res) => {
  const file = getFile.get(req.params.token);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (file.downloaded) {
    return res.status(410).json({ error: 'File already downloaded' });
  }

  if (new Date(file.expires_at) < new Date()) {
    return res.status(410).json({ error: 'File expired' });
  }

  const filePath = path.join(UPLOADS_DIR, file.id);
  const ivPath = path.join(UPLOADS_DIR, file.id + '.iv');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  // Read IV
  let iv = '';
  if (fs.existsSync(ivPath)) {
    iv = fs.readFileSync(ivPath, 'utf8');
  }

  // Mark as downloaded immediately
  markDownloaded.run(file.id);

  // Read and send encrypted file data
  const encryptedData = fs.readFileSync(filePath);

  res.json({
    filename: file.filename,
    iv: iv,
    data: encryptedData.toString('base64')
  });

  // Delete file from disk after sending
  try {
    fs.unlinkSync(filePath);
    if (fs.existsSync(ivPath)) fs.unlinkSync(ivPath);
  } catch (err) {
    console.error('Failed to delete file after download:', err.message);
  }
});

// Run cleanup every 60 seconds
setInterval(cleanupExpiredFiles, 60 * 1000);

app.listen(PORT, () => {
  console.log(`SafeSend running on http://localhost:${PORT}`);
});
