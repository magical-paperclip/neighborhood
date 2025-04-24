import Airtable from 'airtable';

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

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

    if (records.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new record
    const newRecord = await base(process.env.AIRTABLE_TABLE_ID).create([
      {
        fields: {
          email: email,
          signup_date: new Date().toISOString()
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