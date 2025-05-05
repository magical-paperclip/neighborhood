import Airtable from 'airtable';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    // Initialize Airtable with the correct base ID
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base('appnsN4MzbnfMY0ai');

    // First, find the neighbor record using the token
    const neighborRecords = await base('neighbors')
      .select({
        filterByFormula: `{token} = '${token}'`,
        maxRecords: 1
      })
      .all();

    if (neighborRecords.length === 0) {
      return res.status(404).json({ error: 'No neighbor found with this token' });
    }

    const userEmail = neighborRecords[0].fields.email;

    // Find and delete the Slack member record
    const slackMemberRecords = await base('#neighborhoodSlackMembers')
      .select({
        filterByFormula: `{Email} = '${userEmail}'`
      })
      .all();

    if (slackMemberRecords.length === 0) {
      return res.status(404).json({ error: 'No Slack member record found for this user' });
    }

    // Delete the record
    await base('#neighborhoodSlackMembers').destroy(slackMemberRecords[0].id);

    return res.status(200).json({ 
      success: true,
      message: 'Slack member record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Slack member record:', error);
    return res.status(500).json({ error: 'Failed to delete Slack member record' });
  }
} 