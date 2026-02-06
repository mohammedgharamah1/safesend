const fs = require('fs');
const path = require('path');
const { getExpired, deleteFile } = require('./db');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

function cleanupExpiredFiles() {
  const now = new Date().toISOString();
  const expired = getExpired.all(now);

  for (const file of expired) {
    const filePath = path.join(UPLOADS_DIR, file.id);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete file ${file.id}:`, err.message);
    }
    deleteFile.run(file.id);
  }

  if (expired.length > 0) {
    console.log(`Cleaned up ${expired.length} expired file(s)`);
  }
}

module.exports = { cleanupExpiredFiles };
