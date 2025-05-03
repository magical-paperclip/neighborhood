import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID);

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send OTP email via Loops
const sendOTPEmail = async (email, otp) => {
  const url = "https://app.loops.so/api/v1/transactional";
  const payload = {
    transactionalId: "cma76zj24015peh6e3ipy52yq",
    email: email,
    dataVariables: {
      otp: otp,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LOOPS_AUTH_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("Loops email response:", result);
    return result;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const otp = generateOTP();

  // Create OTP record regardless of whether user exists
  await base("OTP").create([
    {
      fields: {
        Email: normalizedEmail,
        OTP: otp,
        isUsed: false,
      },
    },
  ]);

  // Send OTP email
  await sendOTPEmail(normalizedEmail, otp);

  // If user exists, return success without creating new record
  return res.status(200).json({ message: "OTP sent successfully" });
}
