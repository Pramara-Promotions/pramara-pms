// api/routes/upload.js
const express = require('express');
const multer = require('multer');
const { getPresignedPutUrl } = require('../lib/storage');

const router = express.Router();

// Multer memory storage for direct buffer access
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/projects/:id/upload
router.post('/projects/:id/upload', upload.single('file'), async (req, res) => {
  const projectId = req.params.id;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    // Get presigned PUT URL for MinIO
    const { url, key } = await getPresignedPutUrl({
      projectId,
      filename: file.originalname,
      contentType: file.mimetype,
      sizeBytes: file.size,
    });
    // Upload file buffer to MinIO using fetch
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': file.mimetype },
      body: file.buffer,
    });
    if (!response.ok) {
      throw new Error('MinIO upload failed');
    }
    res.json({ key });
  } catch (e) {
    console.error('File upload failed:', e);
    res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;
