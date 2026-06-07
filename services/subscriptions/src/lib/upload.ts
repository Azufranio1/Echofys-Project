import multer from "multer";

export const upload = multer({
  dest: "/tmp/comprobantes/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    cb(null, allowed.includes(file.mimetype));
  },
});