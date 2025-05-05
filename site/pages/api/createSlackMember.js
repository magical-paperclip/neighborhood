import Airtable from 'airtable';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, email, slackHandle, slackId, profilePicture, fullName } = req.body;

  if (!token || !email || !slackHandle || !slackId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Initialize Airtable with the correct base ID
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base('appnsN4MzbnfMY0ai');

    // First, find the neighbor record ID using the email
    const neighborRecords = await base('neighbors')
      .select({
        filterByFormula: `{Email} = '${email}'`,
        maxRecords: 1
      })
      .all();

    if (neighborRecords.length === 0) {
      return res.status(404).json({ error: 'No neighbor found with this email' });
    }

    const neighborId = neighborRecords[0].id;

    // Find and delete any existing records with the same email
    const existingRecords = await base('#neighborhoodSlackMembers')
      .select({
        filterByFormula: `{Email} = '${email}'`
      })
      .all();

    if (existingRecords.length > 0) {
      // Delete all existing records
      const deletePromises = existingRecords.map(record => 
        base('#neighborhoodSlackMembers').destroy(record.id)
      );
      await Promise.all(deletePromises);
    }

    // Create new record
    const record = await base('#neighborhoodSlackMembers').create([
      {
        fields: {
          'Email': email,
          'Slack Handle': slackHandle,
          'Slack ID': slackId,
          'Pfp': profilePicture ? [{ url: profilePicture }] : [],
          'Full Name': fullName,
          'neighbors': [neighborId]
        }
      }
    ]);

    return res.status(200).json({ 
      success: true, 
      record: record[0],
      deletedCount: existingRecords.length
    });
  } catch (error) {
    console.error('Error managing Slack member record:', error);
    return res.status(500).json({ error: 'Failed to manage Slack member record' });
  }
} 