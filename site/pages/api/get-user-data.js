import { WebClient } from '@slack/web-api';
import Airtable from 'airtable';

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // First, get the user's email from Airtable using their token
    const userRecords = await base("neighbors")
      .select({
        filterByFormula: `{token} = '${token}'`,
        maxRecords: 1
      })
      .firstPage();

    if (userRecords.length === 0) {
      // If no user found, return a special status code to trigger logout
      return res.status(403).json({ 
        message: 'User not found',
        shouldLogout: true 
      });
    }

    const userEmail = userRecords[0].fields.email;
    const userId = userRecords[0].id;
    const userName = userRecords[0].fields.name || '';
    const userProfilePicture = userRecords[0].fields.profilePicture || '';
    const githubUsername = userRecords[0].fields.githubUsername || '';

    // Get the user's Slack profile using the bot token
    const web = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // First, find the user by email
    let users;
    let slack_id = null;
    let real_name = userName;
    let image_72 = userProfilePicture;
    let display_name = userName;

    // Check if user already has Slack information in Airtable
    const existingSlackRecords = await base("#neighborhoodSlackMembers")
      .select({
        filterByFormula: `{Email} = '${userEmail}'`,
        maxRecords: 1
      })
      .firstPage();

    const hasExistingSlackInfo = existingSlackRecords.length > 0 && 
      existingSlackRecords[0].fields['Slack ID'] && 
      existingSlackRecords[0].fields['Slack Handle'];

    // Only try to update Slack info if user doesn't have existing Slack information
    if (!hasExistingSlackInfo) {
      try {
        users = await web.users.lookupByEmail({
          email: userEmail
        });
        if (users.ok && users.user) {
          const { profile, id } = users.user;
          slack_id = id;
          real_name = profile.real_name || real_name;
          image_72 = profile.image_72 || image_72;
          display_name = profile.display_name || display_name;
        }
      } catch (error) {
        if (error.data?.error === 'users_not_found') {
          // User not found in workspace, continuing without Slack integration
        } else {
          throw error;
        }
      }
    } else {
      // Use existing Slack information
      slack_id = existingSlackRecords[0].fields['Slack ID'];
      display_name = existingSlackRecords[0].fields['Slack Handle'];
      real_name = existingSlackRecords[0].fields['Full Name'] || real_name;
      image_72 = existingSlackRecords[0].fields['Pfp']?.[0]?.url || image_72;
    }

    // Now find and join the channel
    let channelList;
    try {
      // First, get the bot's own info
      const botInfo = await web.auth.test();

      // Try to get channels using users.conversations
      const userChannels = await web.users.conversations({
        user: botInfo.user_id,
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000
      });

      // Also try the regular conversations.list
      const allChannels = await web.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000
      });

      // Combine both lists
      channelList = {
        channels: [...new Set([...userChannels.channels, ...allChannels.channels])]
      };

      // Try different possible channel names
      const possibleNames = ['neighborhood', 'neighbourhood', 'neighborhoods', 'neighbourhoods'];
      let foundChannel = null;
      
      for (const name of possibleNames) {
        foundChannel = channelList.channels.find(channel => 
          channel.name.toLowerCase() === name.toLowerCase()
        );
        if (foundChannel) {
          break;
        }
      }

      if (foundChannel) {
        // First try to join the channel if we're not already a member
        if (!foundChannel.is_member) {
          await web.conversations.join({
            channel: foundChannel.id
          });
        }

        // Only try to invite the user if we have their slack_id
        if (slack_id) {
          try {
            await web.conversations.invite({
              channel: foundChannel.id,
              users: slack_id
            });
          } catch (inviteError) {
            if (inviteError.data?.error === 'user_is_restricted') {
              // Get the channel link
              const channelInfo = await web.conversations.info({
                channel: foundChannel.id
              });
              
              // Send DM to user
              await web.chat.postMessage({
                channel: slack_id,
                text: `Welcome to the neighborhood! You can join our main channel here: ${channelInfo.channel.url}`
              });
            } else if (inviteError.data?.error === 'already_in_channel') {
              // User is already in the channel, continue
            }
          }
        }
      }

      // Update or create record in #neighborhoodSlackMembers table
      try {
        // Only proceed if we have at least the user ID and some meaningful data
        if (userId && (slack_id || display_name || real_name || image_72)) {
          // Check if a record already exists for this user
          const existingRecords = await base("#neighborhoodSlackMembers")
            .select({
              filterByFormula: `{Email} = '${userEmail}'`,
              maxRecords: 1
            })
            .firstPage();

          let record;
          if (existingRecords.length > 0) {
            // Get current neighbors to preserve them
            const currentNeighbors = existingRecords[0].fields.neighbors || [];
            
            // Update existing record
            record = await base("#neighborhoodSlackMembers").update([
              {
                id: existingRecords[0].id,
                fields: {
                  'Email': userEmail,
                  'Slack ID': slack_id,
                  'Slack Handle': display_name,
                  'Full Name': real_name,
                  'Pfp': image_72 ? [{ url: image_72 }] : undefined,
                  'neighbors': currentNeighbors.includes(userId) ? currentNeighbors : [...currentNeighbors, userId]
                }
              }
            ]);
          } else {
            // Create new record
            record = await base("#neighborhoodSlackMembers").create([
              {
                fields: {
                  'Email': userEmail,
                  'Slack ID': slack_id,
                  'Slack Handle': display_name,
                  'Full Name': real_name,
                  'Pfp': image_72 ? [{ url: image_72 }] : undefined,
                  'neighbors': [userId]
                }
              }
            ]);
          }
        }
      } catch (error) {
        if (error.response) {
          throw error;
        }
      }

      return res.status(200).json({
        name: real_name,
        profilePicture: image_72,
        slackId: slack_id,
        slackHandle: display_name,
        email: userEmail,
        githubUsername: githubUsername
      });

    } catch (error) {
      if (error.code === 'slack_webapi_platform_error' && error.data?.error === 'missing_scope') {
        return res.status(403).json({
          message: 'Missing required Slack scopes',
          error: 'The Slack app needs the following scopes: users:read.email, users:read, channels:read, channels:join, channels:manage, groups:read',
          shouldLogout: false
        });
      }
      throw error;
    }

  } catch (error) {
    return res.status(500).json({ 
      message: 'Error fetching user data',
      error: error.message 
    });
  }
}
