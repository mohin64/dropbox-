const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;

const dataRoot = process.env.DATA_DIR || path.join(__dirname, "data");
const uploadDir = path.join(dataRoot, "uploads");
const dataFile = path.join(dataRoot, "files.json");

fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, "[]");

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const id = uuidv4();
    const safeName = path.basename(file.originalname).replace(/[^\w.\-() ]/g, "_");
    cb(null, `${id}__${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 * 1024 } // 1 GB // 100 MB
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readFiles() {
  return JSON.parse(fs.readFileSync(dataFile, "utf8"));
}

function writeFiles(files) {
  fs.writeFileSync(dataFile, JSON.stringify(files, null, 2));
}

app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please select a file." });

    const id = path.basename(req.file.filename).split("__")[0];
    const files = readFiles();

    const record = {
      id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    files.push(record);
    writeFiles(files);

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({
      success: true,
      name: record.originalName,
      size: record.size,
      link: `${baseUrl}/share/${id}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed." });
  }
});

app.get("/share/:id", (req, res) => {
  const file = readFiles().find(f => f.id === req.params.id);
  if (!file) return res.status(404).send("File not found.");

  res.sendFile(path.join(__dirname, "public", "share.html"));
});

app.get("/api/share/:id", (req, res) => {
  const file = readFiles().find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: "File not found." });

  res.json({
    id: file.id,
    name: file.originalName,
    size: file.size,
    uploadedAt: file.uploadedAt,
    downloadUrl: `/download/${file.id}`
  });
});

app.get("/download/:id", (req, res) => {
  const file = readFiles().find(f => f.id === req.params.id);
  if (!file) return res.status(404).send("File not found.");

  const fullPath = path.join(uploadDir, file.storedName);
  if (!fs.existsSync(fullPath)) return res.status(404).send("File is missing.");

  res.download(fullPath, file.originalName);
});

app.delete("/api/share/:id", (req, res) => {
  const files = readFiles();
  const index = files.findIndex(f => f.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "File not found." });

  const [file] = files.splice(index, 1);
  const fullPath = path.join(uploadDir, file.storedName);

  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  writeFiles(files);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Simple File Share running at http://localhost:${PORT}`);
});