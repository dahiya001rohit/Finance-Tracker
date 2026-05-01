const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const config = require("../config");

const storage = multer.diskStorage({
  destination: path.resolve(process.cwd(), "server/uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomHex = crypto.randomBytes(8).toString("hex");
    const userId = req.user?.id || "anon";
    cb(null, `${userId}-${Date.now()}-${randomHex}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  if (config.uploads.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Accepted: image/jpeg, image/png, image/webp, application/pdf`), false);
  }
}

const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxFileSizeBytes },
  fileFilter
});

module.exports = upload;
