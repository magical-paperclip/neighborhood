import React, { useState } from "react";
import { getToken } from "@/utils/storage";

const DisconnectedHackatime = ({ 
  setIsSettingEmail, 
  setEmail, 
  setEmailCode, 
  setEmailChangeValid,
  userData,
  setUserData,
  slackUsers,
  setSlackUsers,
  connectingSlack,
  setConnectingSlack,
  searchSlack,
  setSearchSlack,
  setUIPage
}) => {
  const [inputSlackId, setInputSlackId] = useState("");
  const [foundSlackUser, setFoundSlackUser] = useState(null);
  const [hackatimeProjects, setHackatimeProjects] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);

  const handleCheckSlackId = async () => {
    if (!inputSlackId) return;
    
    try {
      const res = await fetch(`/api/getSlackUser?slackId=${inputSlackId}`);
      
      if (res.ok) {
        const data = await res.json();
        setFoundSlackUser(data);
        // Fetch Hackatime projects
        await fetchHackatimeProjects(data.slackId);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to find Slack account with that ID');
        setFoundSlackUser(null);
        setHackatimeProjects("");
      }
    } catch (error) {
      console.error('Error checking Slack ID:', error);
      alert('Error checking Slack ID');
      setFoundSlackUser(null);
      setHackatimeProjects("");
    }
  };

  const fetchHackatimeProjects = async (slackId) => {
    setLoadingProjects(true);
    try {
      const response = await fetch(`/api/getHackatimeProjects?slackId=${slackId}`);
      
      if (response.ok) {
        const data = await response.json();
        setHackatimeProjects(data.projects || '');
      } else {
        console.error('Failed to fetch Hackatime projects');
        setHackatimeProjects('');
      }
    } catch (error) {
      console.error('Error fetching Hackatime projects:', error);
      setHackatimeProjects('');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleUseFoundUser = async () => {
    if (foundSlackUser) {
      try {
        let token = localStorage.getItem('neighborhoodToken');
        if (!token) {
          token = getToken();
        }
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/createSlackMember', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            email: userData?.email || '',
            slackHandle: foundSlackUser.slackHandle,
            slackId: foundSlackUser.slackId,
            profilePicture: foundSlackUser.pfp,
            fullName: foundSlackUser.fullName
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create Slack member record');
        }

        // Update user data after successful creation
        setUserData(prev => ({
          ...prev,
          slackHandle: foundSlackUser.slackHandle,
          profilePicture: foundSlackUser.pfp,
          fullName: foundSlackUser.fullName,
          slackId: foundSlackUser.slackId
        }));

        setFoundSlackUser(null);
        setInputSlackId("");
        setHackatimeProjects("");
        setUIPage("");
      } catch (error) {
        console.error('Error creating Slack member record:', error);
        alert(error.message || 'Failed to create Slack member record');
      }
    }
  };

  return (
    <div>
      <p>Hey, we don't have a hackatime account (hackatime.hackclub.com) with projects that is connected to your account.</p>

      <p>This is the slack account we have on file for your account. Is this the same one attached to Slack?</p>
      <div style={{ 
        display: "flex", 
        border: "1px solid #B5B5B5", 
        borderRadius: 8, 
        alignItems: "center", 
        flexDirection: "row", 
        gap: 8, 
        backgroundColor: "#fff",
        padding: 8, 
        minHeight: 40,
        maxWidth: 400
      }}>
        {userData?.slackHandle ? (
          <>
            <img
              style={{ 
                width: 24, 
                border: "1px solid #B5B5B5", 
                backgroundColor: "#B5B5B5", 
                borderRadius: 8, 
                height: 24 
              }}
              src={userData?.profilePicture}
            />
            <div>
              <p style={{ fontSize: 14 }}>@{userData?.slackHandle}</p>
              <p style={{ fontSize: 8 }}>Slack ID: {userData?.slackId}</p>
            </div>
          </>
        ) : (
          <span style={{ 
            fontSize: 14, 
            color: '#b77', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6 
          }}>
            <span role="img" aria-label="warning">⚠️</span>
            We're not finding a slack profile attached to your account.
          </span>
        )}
      </div>
      <div>
        <p>If this is not the correct slack account, then please paste in your SlackID in the input below:</p>
        <p style={{fontSize: 12}}><i>you can get your slack ID from #what-is-my-slack-id channel on Slack</i></p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input 
            style={{
              width: 200, 
              padding: 8, 
              borderRadius: 8, 
              border: "1px solid #000"
            }} 
            placeholder="slack ID like: U064W38B4S2"
            value={inputSlackId}
            onChange={(e) => setInputSlackId(e.target.value)}
          />
          <button
            onClick={handleCheckSlackId}
            style={{
              padding: '8px 16px',
              backgroundColor: '#000',
              color: '#fff',
              border: '1px solid #000',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Check Slack ID
          </button>
        </div>

        {foundSlackUser && (
          <div style={{ marginTop: 16 }}>
            <p style={{ marginBottom: 8 }}>This is what we found:</p>
            <div style={{ 
              display: "flex", 
              border: "1px solid #B5B5B5", 
              borderRadius: 8, 
              alignItems: "center", 
              flexDirection: "row", 
              gap: 8, 
              backgroundColor: "#fff",
              padding: 8, 
              minHeight: 40,
              maxWidth: 400
            }}>
              <img
                style={{ 
                  width: 24, 
                  border: "1px solid #B5B5B5", 
                  backgroundColor: "#B5B5B5", 
                  borderRadius: 8, 
                  height: 24 
                }}
                src={foundSlackUser.pfp}
              />
              <div>
                <p style={{ fontSize: 14 }}>@{foundSlackUser.slackHandle}</p>
                <p style={{ fontSize: 8 }}>Slack ID: {foundSlackUser.slackId}</p>
              </div>
            </div>

            {loadingProjects ? (
              <p style={{ marginTop: 8 }}>Loading Hackatime projects...</p>
            ) : hackatimeProjects ? (
              <div style={{ marginTop: 16 }}>
                <p style={{ marginBottom: 8 }}>Hackatime Projects:</p>
                <div style={{ 
                  border: "1px solid #B5B5B5", 
                  borderRadius: 8, 
                  backgroundColor: "#fff",
                  padding: 8,
                  maxWidth: 400
                }}>
                  <p style={{ fontSize: 14, margin: 0 }}>{hackatimeProjects}</p>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: 8, color: '#666' }}>No Hackatime projects found for this account.</p>
            )}

            <button
              onClick={handleUseFoundUser}
              style={{
                marginTop: 16,
                padding: '8px 16px',
                backgroundColor: '#000',
                color: '#fff',
                border: '1px solid #000',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Use this account
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisconnectedHackatime;
