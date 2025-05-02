import fetch from "node-fetch";
import { URL } from "url";

// Allow different HTTP methods
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ message: "Missing target URL parameter" });
  }

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    return res.status(400).json({ message: "Invalid URL" });
  }

  // Security check - only allow S3 amazonaws URLs
  if (!parsedUrl.hostname.includes("amazonaws.com")) {
    return res.status(403).json({
      message: "Only AWS S3 URLs are allowed for security reasons",
    });
  }

  try {
    // Prepare fetch options
    const options = {
      method: req.method,
      headers: {},
    };

    // Forward necessary headers
    const headersToForward = { ...req.headers };
    // Remove headers that could cause issues
    ["host", "connection", "content-length"].forEach((header) => {
      delete headersToForward[header];
    });

    options.headers = headersToForward;

    // Forward body for PUT/POST requests (needed for S3 upload)
    if (["POST", "PUT"].includes(req.method) && req.body) {
      if (typeof req.body === "string") {
        options.body = req.body;
      } else {
        options.body = JSON.stringify(req.body);
      }
    }

    // Make the request to the target URL
    const response = await fetch(targetUrl, options);

    // Get response data
    const data = await response.text();

    // Forward response headers
    Object.entries(response.headers.raw()).forEach(([key, value]) => {
      // Skip problematic headers
      if (
        !["content-encoding", "content-length", "transfer-encoding"].includes(
          key.toLowerCase(),
        )
      ) {
        res.setHeader(key, value);
      }
    });

    // Send response
    return res.status(response.status).send(data);
  } catch (err) {
    console.error("CORS Proxy Error:", err);
    return res.status(500).json({
      message: "Failed to proxy request",
      error: err.message,
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10000mb", // Adjust based on your upload needs
    },
  },
};
