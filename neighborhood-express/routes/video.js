import express from "express";
import { uploadVideo } from "../controllers/videoController.js";

const router = express.Router();

router.post("/upload", (req, res, next) => {
  uploadVideo(req, res).catch(next);
});

router.post("/", (req, res, next) => {
  uploadVideo(req, res).catch(next);
});

export default router;
