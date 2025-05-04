import Airtable from 'airtable';

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token, slackId, slackHandle, fullName, pfp } = req.body;

  // Debug: log the received payload
  console.log('Received payload:', req.body);

  // Check for missing fields and return which ones are missing
  const missingFields = [];
  if (!token) missingFields.push('token');
  if (!slackId) missingFields.push('slackId');
  if (!slackHandle) missingFields.push('slackHandle');
  if (missingFields.length > 0) {
    console.log('Missing fields:', missingFields, 'Received:', req.body);
    return res.status(400).json({ 
      message: 'Missing required fields', 
      missingFields, 
      received: req.body 
    });
  }

  try {
    // Find the user record by token
    let userRecords;
    try {
      console.log('Looking up user in neighbors with token:', token);
      userRecords = await base('neighbors')
        .select({
          filterByFormula: `{token} = '${token}'`,
          maxRecords: 1
        })
        .firstPage();
      console.log('User records found:', userRecords.length, userRecords.map(r => r.id));
    } catch (err) {
      console.error('Airtable error finding user by token:', err);
      return res.status(500).json({ message: 'Airtable error finding user by token', error: err, stack: err.stack });
    }

    if (userRecords.length === 0) {
      console.log('No user found for token:', token);
      return res.status(404).json({ message: 'User not found for provided token', token });
    }

    const userId = userRecords[0].id;
    const userEmail = userRecords[0].fields.email;

    // Update or create the Slack record in #neighborhoodSlackMembers
    let slackRecords;
    try {
      console.log('Looking up Slack record with Slack ID:', slackId);
      slackRecords = await base('#neighborhoodSlackMembers')
        .select({
          filterByFormula: `{Slack ID} = '${slackId}'`,
          maxRecords: 1
        })
        .firstPage();
      console.log('Slack records found:', slackRecords.length, slackRecords.map(r => r.id));
    } catch (err) {
      console.error('Airtable error finding Slack record:', err);
      return res.status(500).json({ message: 'Airtable error finding Slack record', error: err, stack: err.stack });
    }

    try {
      if (slackRecords.length > 0) {
        console.log('Updating existing Slack record:', slackRecords[0].id, {
          'Slack ID': slackId,
          'Slack Handle': slackHandle,
          'Full Name': fullName,
          'Pfp': pfp ? [{ url: pfp }] : undefined,
          'Email': userEmail,
          'neighbors': [userId]
        });
        await base('#neighborhoodSlackMembers').update([
          {
            id: slackRecords[0].id,
            fields: {
              'Slack ID': slackId,
              'Slack Handle': slackHandle,
              'Full Name': fullName,
              'Pfp': pfp ? [{ url: pfp }] : undefined,
              'Email': userEmail,
              'neighbors': [userId]
            }
          }
        ]);
        console.log('Slack record updated successfully');
      } else {
        console.log('Creating new Slack record with fields:', {
          'Slack ID': slackId,
          'Slack Handle': slackHandle,
          'Full Name': fullName,
          'Pfp': pfp ? [{ url: pfp }] : undefined,
          'Email': userEmail,
          'neighbors': [userId]
        });
        await base('#neighborhoodSlackMembers').create([
          {
            fields: {
              'Slack ID': slackId,
              'Slack Handle': slackHandle,
              'Full Name': fullName,
              'Pfp': pfp ? [{ url: pfp }] : undefined,
              'Email': userEmail,
              'neighbors': [userId]
            }
          }
        ]);
        console.log('Slack record created successfully');
      }
    } catch (err) {
      console.error('Airtable error updating/creating Slack record:', err);
      return res.status(500).json({ message: 'Airtable error updating/creating Slack record', error: err, stack: err.stack });
    }

    return res.status(200).json({ message: 'Slack account linked successfully' });
  } catch (error) {
    console.error('General error in connectSlack:', error);
    return res.status(500).json({ message: 'Error linking Slack account', error, stack: error.stack, received: req.body });
  }
} 