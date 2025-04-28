import { WebClient } from '@slack/web-api';
import Airtable from 'airtable';

// Initialize Airtable
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  console.log('API endpoint hit:', req.url);
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);

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
  console.log('Token received:', token ? 'present' : 'missing');
  
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

    console.log('User records found:', userRecords.length);

    if (userRecords.length === 0) {
      // If no user found, return a special status code to trigger logout
      return res.status(403).json({ 
        message: 'User not found',
        shouldLogout: true 
      });
    }

    const userEmail = userRecords[0].fields.email;
    const userId = userRecords[0].id;

    // Get the user's Slack profile using the bot token
    const web = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // First, find the neighborhood channel
    let channelList;
    try {
      channelList = await web.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true
      });
      
      console.log('Available channels:', channelList.channels.map(channel => ({
        name: channel.name,
        id: channel.id,
        is_private: channel.is_private,
        is_archived: channel.is_archived
      })));

      // Try different possible channel names
      const possibleNames = ['neighborhood', 'neighbourhood', 'neighborhoods', 'neighbourhoods'];
      let foundChannel = null;
      
      for (const name of possibleNames) {
        foundChannel = channelList.channels.find(channel => 
          channel.name.toLowerCase() === name.toLowerCase()
        );
        if (foundChannel) {
          console.log(`Found channel with name: ${name}`);
          break;
        }
      }

      // If channel not found, try to join it
      if (!foundChannel) {
        console.log('Channel not found in list, attempting to join...');
        try {
          const joinResponse = await web.conversations.join({
            channel: 'neighborhood'
          });
          console.log('Join response:', joinResponse);
          
          // Get updated channel list
          channelList = await web.conversations.list({
            types: 'public_channel,private_channel',
            exclude_archived: true
          });
          
          // Try to find the channel again
          foundChannel = channelList.channels.find(channel => 
            channel.name.toLowerCase() === 'neighborhood'
          );
        } catch (joinError) {
          console.error('Error joining channel:', joinError);
          return res.status(404).json({
            message: 'Neighborhood channel not found',
            error: 'Could not find or join the neighborhood channel. Available channels: ' + 
                   channelList.channels.map(c => c.name).join(', ')
          });
        }
      }

      if (!foundChannel) {
        console.log('Could not find channel with any of these names:', possibleNames);
        return res.status(404).json({
          message: 'Neighborhood channel not found',
          error: 'Could not find the neighborhood channel. Available channels: ' + 
                 channelList.channels.map(c => c.name).join(', ')
        });
      }

      const neighborhoodChannel = foundChannel;

      // Now try to find the user by email
      let users;
      try {
        users = await web.users.lookupByEmail({
          email: userEmail
        });
      } catch (error) {
        if (error.data?.error === 'users_not_found') {
          console.log('User not found in workspace, attempting to invite...');
          try {
            // Try to invite the user to the workspace
            const inviteResponse = await web.admin.users.invite({
              email: userEmail,
              channels: neighborhoodChannel.id // Pre-join them to the neighborhood channel
            });
            console.log('Invite response:', inviteResponse);
            
            // Wait a bit for the invitation to process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Try to get the user again
            users = await web.users.lookupByEmail({
              email: userEmail
            });
          } catch (inviteError) {
            console.error('Error inviting user:', inviteError);
            return res.status(500).json({
              message: 'Failed to invite user to workspace',
              error: inviteError.message
            });
          }
        } else {
          throw error;
        }
      }
      
      if (!users.ok || !users.user) {
        throw new Error('Failed to find or invite user by email');
      }

      const { real_name, image_72, display_name } = users.user.profile;
      const { id: slack_id } = users.user;

      // Check if a record already exists for this user
      const existingRecords = await base("#neighborhoodSlackMembers")
        .select({
          filterByFormula: `{neighbors} = '${userId}'`,
          maxRecords: 1
        })
        .firstPage();

      let record;
      if (existingRecords.length > 0) {
        // Update existing record
        record = await base("#neighborhoodSlackMembers").update([
          {
            id: existingRecords[0].id,
            fields: {
              'Slack ID': slack_id,
              'Slack Handle': display_name,
              'Full Name': real_name,
              'Pfp': [{ url: image_72 }], // Convert URL to attachment object
              'neighbors': [userId]
            }
          }
        ]);
      } else {
        // Create new record
        record = await base("#neighborhoodSlackMembers").create([
          {
            fields: {
              'Slack ID': slack_id,
              'Slack Handle': display_name,
              'Full Name': real_name,
              'Pfp': [{ url: image_72 }], // Convert URL to attachment object
              'neighbors': [userId]
            }
          }
        ]);
      }

      // Get the #neighborhood channel ID
      let channels;
      try {
        // First, get the bot's own info
        const botInfo = await web.auth.test();
        console.log('Bot info:', botInfo);

        // Try to get channels using users.conversations
        const userChannels = await web.users.conversations({
          user: botInfo.user_id,
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 1000
        });
        
        console.log('Channels from users.conversations:');
        userChannels.channels.forEach(channel => {
          console.log(`- ${channel.name} (${channel.id}) [${channel.is_private ? 'private' : 'public'}]`);
        });

        // Also try the regular conversations.list
        const allChannels = await web.conversations.list({
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: 1000
        });
        
        console.log('\nChannels from conversations.list:');
        allChannels.channels.forEach(channel => {
          console.log(`- ${channel.name} (${channel.id}) [${channel.is_private ? 'private' : 'public'}]`);
        });

        // Combine both lists
        channels = {
          channels: [...new Set([...userChannels.channels, ...allChannels.channels])]
        };

        // Try to find the channel with different possible names
        const possibleNames = ['neighborhood', 'neighbourhood', 'neighborhoods', 'neighbourhoods'];
        let neighborhoodChannel = null;
        
        for (const name of possibleNames) {
          neighborhoodChannel = channels.channels.find(channel => 
            channel.name.toLowerCase() === name.toLowerCase()
          );
          if (neighborhoodChannel) {
            console.log(`Found channel with name: ${name}`);
            break;
          }
        }

        if (!neighborhoodChannel) {
          console.log('Could not find channel with any of these names:', possibleNames);
          return res.status(404).json({
            message: 'Channel not found',
            error: 'Could not find the neighborhood channel. The bot might need to be reinstalled with different permissions.'
          });
        }

        console.log('Found neighborhood channel:', neighborhoodChannel);
        
        try {
          // First try to join the channel if we're not already a member
          if (!neighborhoodChannel.is_member) {
            console.log('Not a member of channel, attempting to join...');
            const joinResponse = await web.conversations.join({
              channel: neighborhoodChannel.id
            });
            console.log('Join response:', joinResponse);
          }

          // Try to invite the user to the channel
          try {
            const inviteResponse = await web.conversations.invite({
              channel: neighborhoodChannel.id,
              users: slack_id
            });
            console.log('Channel invite response:', inviteResponse);
          } catch (inviteError) {
            if (inviteError.data?.error === 'user_is_restricted') {
              console.log('User is restricted, sending DM with channel link...');
              // Get the channel link
              const channelInfo = await web.conversations.info({
                channel: neighborhoodChannel.id
              });
              
              // Send DM to user
              await web.chat.postMessage({
                channel: slack_id, // This will open a DM with the user
                text: `Welcome to the neighborhood! You can join our main channel here: ${channelInfo.channel.url}`
              });
            } else if (inviteError.data?.error === 'already_in_channel') {
              console.log('User is already in the channel, continuing...');
            } else {
              throw inviteError;
            }
          }
        } catch (error) {
          console.error('Error with channel operations:', error);
          if (error.data) {
            console.error('Error details:', error.data);
          }
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
        console.error('Error in initial setup:', error);
        if (error.data) {
          console.error('Error details:', error.data);
        }
        if (error.code === 'slack_webapi_platform_error' && error.data?.error === 'missing_scope') {
          return res.status(403).json({
            message: 'Missing required Slack scopes',
            error: 'The Slack app needs the following scopes: users:read.email, users:read, channels:read, channels:join, channels:manage, groups:read',
            shouldLogout: false
          });
        }
        throw error;
      }

      return res.status(200).json({
        name: real_name,
        profilePicture: image_72,
        slackId: slack_id,
        slackHandle: display_name
      });

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ 
        message: 'Error fetching user data',
        error: error.message 
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      message: 'Error fetching user data',
      error: error.message 
    });
  }
}
