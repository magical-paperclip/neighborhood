// pages/api/getSignedUrl.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

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
    const { contentType, filename } = req.body;

    if (!contentType || !filename) {
      return res
        .status(400)
        .json({ message: "Missing contentType or filename" });
    }

    const sessionId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const s3Key = `omg-moments/${timestamp}_${sessionId}_${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 }); // 10 min

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    res.status(200).json({
      uploadUrl: signedUrl,
      fileUrl,
      key: s3Key,
    });
  } catch (err) {
    console.error("Signed URL error:", err);
    res.status(500).json({ message: "Failed to generate signed URL" });
  }
}
