import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import formidable from "formidable";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Disable body parsing (required for formidable)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Parse multipart/form-data
const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({ keepExtensions: true, multiples: false });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;

    if (!videoFile) {
      return res.status(400).json({ message: "No video file provided" });
    }

    const sessionId = fields.sessionId || uuidv4();
    const fileType = videoFile.mimetype || videoFile.type;

    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
    ];
    if (!allowedTypes.includes(fileType)) {
      return res
        .status(400)
        .json({ message: "Invalid file type. Please upload a video." });
    }

    const fileBuffer = fs.readFileSync(videoFile.filepath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${timestamp}_${sessionId}_${videoFile.originalFilename || "video.mp4"}`;
    const s3Key = `omg-moments/${filename}`;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: fileType,
    };

    await s3Client.send(new PutObjectCommand(params));
    fs.unlinkSync(videoFile.filepath);

    const videoUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    res.status(200).json({ success: true, videoUrl, sessionId });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
}
