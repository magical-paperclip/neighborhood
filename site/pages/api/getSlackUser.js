import { WebClient } from '@slack/web-api';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slackId } = req.query;

  if (!slackId) {
    return res.status(400).json({ error: 'Slack ID is required' });
  }

  try {
    // Initialize the Slack WebClient with the bot token
    const web = new WebClient(process.env.SLACK_BOT_TOKEN);

    // Get user info from Slack API
    const result = await web.users.info({
      user: slackId
    });

    if (!result.ok) {
      throw new Error('Failed to fetch user info from Slack');
    }

    const user = result.user;

    // Return the relevant user information
    return res.status(200).json({
      slackHandle: user.profile.display_name || user.name,
      fullName: user.real_name,
      pfp: user.profile.image_72,
      slackId: user.id
    });

  } catch (error) {
    console.error('Error fetching Slack user:', error);
    return res.status(500).json({ error: 'Failed to fetch Slack user information' });
  }
} 