import Airtable from 'airtable';

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token, projectName, githubLink } = req.body;

  if (!token || !projectName || !githubLink) {
    return res.status(400).json({ message: 'Token, App Name, and GitHub link are required' });
  }

  try {
    // First, find the user by token
    const userRecords = await base(process.env.AIRTABLE_TABLE_ID)
      .select({
        filterByFormula: `{token} = '${token}'`,
        maxRecords: 1
      })
      .firstPage();

    if (userRecords.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userEmail = userRecords[0].fields.email;

    // Find the project record by name and email
    const projectRecords = await base('hackatimeProjects')
      .select({
        filterByFormula: `AND({name} = '${projectName}', {email} = '${userEmail}')`,
        maxRecords: 1
      })
      .firstPage();

    if (projectRecords.length === 0) {
      // If project doesn't exist, create it with the GitHub link
      const newProject = await base('hackatimeProjects').create([
        {
          fields: {
            name: projectName,
            githubLink: githubLink,
            email: userEmail,
            neighbor: [userRecords[0].id]
          }
        }
      ]);

      return res.status(200).json({
        message: 'Project created with GitHub link',
        project: newProject[0]
      });
    }

    // Update existing project with GitHub link
    const updatedProject = await base('hackatimeProjects').update([
      {
        id: projectRecords[0].id,
        fields: {
          githubLink: githubLink
        }
      }
    ]);

    return res.status(200).json({
      message: 'GitHub link connected successfully',
      project: updatedProject[0]
    });

  } catch (error) {
    console.error('Airtable Error:', error);
    return res.status(500).json({
      message: 'Error connecting GitHub link',
      error: error.message
    });
  }
} 