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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, fullName, birthday } = req.body;

  if (!email || !fullName || !birthday) {
    return res.status(400).json({ message: 'Email, full name, and birthday are required' });
  }

  // Normalize email by stripping whitespace and converting to lowercase
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if user already exists
    const records = await base(process.env.AIRTABLE_TABLE_ID)
      .select({
        filterByFormula: `{email} = '${normalizedEmail}'`,
        maxRecords: 1
      })
      .firstPage();

    // If user exists, return success
    if (records.length > 0) {
      return res.status(200).json({ 
        message: 'User already exists',
        isExisting: true
      });
    }

    // For new users, generate token and create record
    const token = generateToken();
    const newRecord = await base(process.env.AIRTABLE_TABLE_ID).create([
      {
        fields: {
          email: normalizedEmail,
          token: token,
          'Full Name': fullName,
          'Date of Birth': birthday
        }
      }
    ]);

    return res.status(200).json({ 
      message: 'User registered successfully',
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