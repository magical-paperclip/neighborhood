export default async function handler(req, res) {
  const { userId, startDate, project } = req.query;

  try {
    const response = await fetch(
      `https://hackatime.hackclub.com/api/v1/users/${userId}/heartbeats/spans?start_date=${startDate}&project=${encodeURIComponent(project)}`,
      {
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Hackatime API responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching Hackatime sessions:', error);
    res.status(500).json({ error: 'Failed to fetch Hackatime sessions' });
  }
} 