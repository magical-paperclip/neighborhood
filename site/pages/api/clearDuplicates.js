import Airtable from 'airtable';

const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Fetch all records from #neighborhoodSlackMembers
    let allRecords = [];
    await base('#neighborhoodSlackMembers')
      .select({
        fields: ['Email', 'Pfp', 'Slack ID', 'Slack Handle', 'Full Name', 'neighbors'],
        pageSize: 100,
      })
      .eachPage((records, fetchNextPage) => {
        allRecords = allRecords.concat(records);
        fetchNextPage();
      });

    // Group records by Email
    const emailMap = new Map();
    for (const record of allRecords) {
      const email = record.fields['Email'] || '';
      if (!email) continue;
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email).push(record);
    }

    // Find duplicates and decide which to keep
    const recordsToDelete = [];
    for (const [email, records] of emailMap.entries()) {
      if (records.length <= 1) continue;
      // Prefer record with Pfp
      let keep = records.find(r => r.fields['Pfp'] && r.fields['Pfp'].length > 0);
      if (!keep) keep = records[0];
      for (const rec of records) {
        if (rec.id !== keep.id) {
          recordsToDelete.push(rec);
        }
      }
    }

    // Delete duplicates in batches of 10 (Airtable API limit)
    for (let i = 0; i < recordsToDelete.length; i += 10) {
      const batch = recordsToDelete.slice(i, i + 10).map(r => r.id);
      await base('#neighborhoodSlackMembers').destroy(batch);
    }

    return res.status(200).json({
      message: `Removed ${recordsToDelete.length} duplicate records`,
      deleted: recordsToDelete.map(r => ({
        id: r.id,
        fields: r.fields
      }))
    });
  } catch (error) {
    console.error('Error clearing duplicates:', error);
    return res.status(500).json({ message: 'Error clearing duplicates', error: error.message });
  }
} 