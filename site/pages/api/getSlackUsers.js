// import Airtable from 'airtable';

// // Initialize Airtable
// const base = new Airtable({
//   apiKey: process.env.AIRTABLE_API_KEY
// }).base(process.env.AIRTABLE_BASE_ID);

// export default async function handler(req, res) {
//   // Set CORS headers
//   res.setHeader('Access-Control-Allow-Credentials', true);
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Authorization');

//   // Handle OPTIONS request for CORS preflight
//   if (req.method === 'OPTIONS') {
//     res.status(200).end();
//     return;
//   }

//   if (req.method !== 'GET') {
//     return res.status(405).json({ message: 'Method not allowed' });
//   }

//   try {
//     let allRecords = [];
//     await base('#neighborhoodSlackMembers')
//       .select({
//         fields: ['Slack ID', 'Slack Handle', 'Full Name', 'Pfp'],
//         pageSize: 100
//       })
//       .eachPage((records, fetchNextPage) => {
//         allRecords = allRecords.concat(records);
//         fetchNextPage();
//       });

//     const users = allRecords.map(record => ({
//       slackId: record.fields['Slack ID'] || '',
//       slackHandle: record.fields['Slack Handle'] || '',
//       fullName: record.fields['Full Name'] || '',
//       pfp: record.fields['Pfp']?.[0]?.url || ''
//     }));

//     return res.status(200).json({ users });
//   } catch (error) {
//     return res.status(500).json({
//       message: 'Error fetching Slack users',
//       error: error.message
//     });
//   }
// } 