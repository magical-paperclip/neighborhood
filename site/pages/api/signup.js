import Airtable from 'airtable';
import crypto from 'crypto';

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// Generate a random token
const generateToken = () => {
  return crypto.randomBytes(40).toString('base64url');
};

// Generate a 4 digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Check if user already exists
    const records = await base(process.env.AIRTABLE_TABLE_ID)
      .select({
        filterByFormula: `{email} = '${email}'`,
        maxRecords: 1
      })
      .firstPage();

    // Generate OTP for this attempt
    const otp = generateOTP();
    
    // Create OTP record regardless of whether user exists
    await base('OTP').create([
      {
        fields: {
          Email: email,
          OTP: otp,
          isUsed: false
        }
      }
    ]);

    // If user exists, return success without creating new record
    if (records.length > 0) {
      return res.status(200).json({ 
        message: 'OTP sent successfully',
        isExisting: true
      });
    }

    // For new users, generate token and create record
    const token = generateToken();
    const newRecord = await base(process.env.AIRTABLE_TABLE_ID).create([
      {
        fields: {
          email: email,
          token: token
        }
      }
    ]);

    return res.status(200).json({ 
      message: 'User registered successfully',
      isExisting: false,
      record: newRecord[0]
    });

  } catch (error) {
    console.error('Airtable Error:', error);
    return res.status(500).json({ 
      message: 'Error processing registration',
      error: error.message 
    });
  }
}