import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// Configure S3 client with server-side credentials
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { fileName, fileType, sessionId = uuidv4() } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate file type
    const validTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
    ];
    if (!validTypes.includes(fileType)) {
      return res
        .status(400)
        .json({ message: "Invalid file type. Please upload a video file." });
    }

    // Create a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const key = `videos/${timestamp}_${sessionId}_${fileName}`;

    // Create presigned URL for PUT request
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      ACL: "public-read",
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    }); // URL expires in 1 hour

    // Return the presigned URL and the final video URL
    return res.status(200).json({
      presignedUrl,
      videoUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      sessionId,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return res
      .status(500)
      .json({
        message: "Error generating presigned URL",
        error: error.message,
      });
  }
}
