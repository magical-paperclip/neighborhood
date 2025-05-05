import formidable from "formidable";
import fs from "fs";
import { uploadToS3 } from "../utils/s3.js";
import { checkUser } from "../utils/airtable.js";

export async function uploadVideo(req, res) {
  try {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const token = Array.isArray(fields.token) ? fields.token[0] : fields.token;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Authentication token is required" });
    }

    const user = await checkUser(token);
    if (user == false) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (!files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    const fileBuffer = fs.readFileSync(file.filepath);
    const s3Key = `omg-moments/${Date.now()}-${file.originalFilename}`;
    const s3Upload = await uploadToS3(fileBuffer, s3Key, file.mimetype);

    fs.unlinkSync(file.filepath);

    res.status(200).json({
      url: s3Upload.Location,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Error uploading file" });
  }
}
