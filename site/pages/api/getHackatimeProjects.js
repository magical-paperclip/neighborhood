export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slackId } = req.query;

  if (!slackId) {
    return res.status(400).json({ error: 'Slack ID is required' });
  }

  try {
    // Fetch Hackatime data directly from their API
    const hackatimeResponse = await fetch(
      `https://hackatime.hackclub.com/api/v1/users/${slackId}/stats?features=projects`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!hackatimeResponse.ok) {
      throw new Error(`Hackatime API responded with status: ${hackatimeResponse.status}`);
    }

    const hackatimeData = await hackatimeResponse.json();
    const projects = hackatimeData.data.projects || [];
    
    // Convert array of projects to comma-separated string of names
    const projectNames = projects.map(p => p.name).join(', ');

    // Return the comma-separated string
    return res.status(200).json({
      projects: projectNames
    });

  } catch (error) {
    console.error('Error fetching Hackatime projects:', error);
    return res.status(500).json({ error: 'Failed to fetch Hackatime projects' });
  }
} 