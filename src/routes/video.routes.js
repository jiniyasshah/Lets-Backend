import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { uploadVideo } from "../controllers/video.controller.js";

const router = Router();
router
  .route("/upload")
  .post(verifyJWT, upload.single("videoFile"), uploadVideo);
export default router;
