import Airtable from 'airtable';

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    // Get the most recent OTP record for this email that hasn't been used
    const otpRecords = await base('OTP')
      .select({
        filterByFormula: `AND({Email} = '${email}', {isUsed} = 0)`,
        sort: [{ field: 'createdAt', direction: 'desc' }],
        maxRecords: 1
      })
      .firstPage();

    if (otpRecords.length === 0) {
      return res.status(400).json({ message: 'No valid OTP found' });
    }

    const latestOTP = otpRecords[0];
    
    // Check if OTP matches
    if (latestOTP.fields.OTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Mark OTP as used
    await base('OTP').update([
      {
        id: latestOTP.id,
        fields: {
          isUsed: true
        }
      }
    ]);

    // Get user's token from the main table
    const userRecords = await base(process.env.AIRTABLE_TABLE_ID)
      .select({
        filterByFormula: `{email} = '${email}'`,
        maxRecords: 1
      })
      .firstPage();

    if (userRecords.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'OTP verified successfully',
      token: userRecords[0].fields.token
    });

  } catch (error) {
    console.error('Airtable Error:', error);
    return res.status(500).json({
      message: 'Error verifying OTP',
      error: error.message
    });
  }
}