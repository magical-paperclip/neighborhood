import React, { useState, useEffect } from 'react';
import HackTimeSelectionShader from './HackTimeSelectionShader';
import StopwatchComponent from './StopwatchComponent';

const HackTimeComponent = ({ isExiting, onClose }) => {
  const [timeTrackingMethod, setTimeTrackingMethod] = useState(''); // Default to stopwatch
  const [projects, setProjects] = useState([]);
  const [openedProjects, setOpenedProjects] = useState([]);
  const [projectSessions, setProjectSessions] = useState({});
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState({});
  const [openedDays, setOpenedDays] = useState({});
  const [selectedDays, setSelectedDays] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null); // 'hackatime' | 'stopwatch' | null
  const [activeCard, setActiveCard] = useState(null);
  const [sessionStatuses, setSessionStatuses] = useState({}); // Track session statuses
  const [githubLinks, setGithubLinks] = useState({}); // Track GitHub links for projects
  const [showGithubInput, setShowGithubInput] = useState(false); // Track if GitHub input is shown
  const [currentProjectForGithub, setCurrentProjectForGithub] = useState(''); // Track which project is being linked
  const [commitData, setCommitData] = useState({}); // Store commit data for each project
  const [sessionCommitMatches, setSessionCommitMatches] = useState({}); // Store matches between sessions and commits
  const [isLoadingCommits, setIsLoadingCommits] = useState({}); // Track loading state per project
  const [commitFetchErrors, setCommitFetchErrors] = useState({}); // Track fetch errors per project

  const fetchProjectSessions = async (projectName) => {
    try {
      // Get sessions starting from January 1st, 2025
      const startDate = new Date(2025, 0, 1); // Month is 0-indexed
      const formattedDate = startDate.toISOString().split('T')[0];
      
      const response = await fetch(
        `https://hackatime.hackclub.com/api/v1/users/U041FQB8VK2/heartbeats/spans?start_date=${formattedDate}&project=${encodeURIComponent(projectName)}`
      );
      const data = await response.json();
      setProjectSessions(prev => ({
        ...prev,
        [projectName]: data.spans
      }));
    } catch (error) {
      console.error('Error fetching project sessions:', error);
    }
  };

  const toggleProject = async (projectName) => {
    const isOpening = !openedProjects.includes(projectName);
    setOpenedProjects(prev => 
      prev.includes(projectName) 
        ? prev.filter(name => name !== projectName)
        : [...prev, projectName]
    );
    
    if (isOpening && !projectSessions[projectName]) {
      await fetchProjectSessions(projectName);
    }
  };

  // Helper to get all session times for a project
  const getAllSessionTimes = (projectName) => (projectSessions[projectName] || []).map(session => session.start_time);

  // Helper to get all session times for a commit group
  const getCommitSessionTimes = (commitGroup) => commitGroup.sessions.map(s => s.start_time);

  // Project-level select/deselect all
  const handleProjectSelect = (projectName) => {
    const allSessionTimes = getAllSessionTimes(projectName);
    const selectedSet = new Set(selectedSessions[projectName] || []);
    const allSelected = allSessionTimes.length > 0 && allSessionTimes.every(time => selectedSet.has(time));

    if (allSelected) {
      // Deselect all
      setSelectedSessions(prev => ({
        ...prev,
        [projectName]: []
      }));
      setSelectedProjects(prev => prev.filter(name => name !== projectName));
      setSelectedDays(prev => ({ ...prev, [projectName]: [] }));
    } else {
      // Select all (replace, do not append)
      setSelectedSessions(prev => ({
        ...prev,
        [projectName]: [...allSessionTimes]
      }));
      setSelectedProjects(prev => [...new Set([...prev, projectName])]);
    }
  };

  const handleDaySelect = (projectName, dayKey) => {
    setSelectedDays(prev => {
      const projectDays = prev[projectName] || [];
      const isSelected = projectDays.includes(dayKey);
      if (isSelected) {
        // Unselect day and all its sessions
        setSelectedSessions(sessionsPrev => {
          const grouped = groupSessionsByCommit(projectSessions[projectName] || [], projectName);
          const sessionTimes = grouped[dayKey]?.sessions.map(s => s.start_time) || [];
          return {
            ...sessionsPrev,
            [projectName]: {
              ...sessionsPrev[projectName],
              sessions: sessionsPrev[projectName].sessions.filter(time => !sessionTimes.includes(time))
            }
          };
        });
        return {
          ...prev,
          [projectName]: projectDays.filter(day => day !== dayKey)
        };
      } else {
        // Select day and all its sessions
        setSelectedSessions(sessionsPrev => {
          const grouped = groupSessionsByCommit(projectSessions[projectName] || [], projectName);
          const sessionTimes = grouped[dayKey]?.sessions.map(s => s.start_time) || [];
          return {
            ...sessionsPrev,
            [projectName]: {
              ...sessionsPrev[projectName],
              sessions: Array.from(new Set([...sessionsPrev[projectName].sessions, ...sessionTimes]))
            }
          };
        });
        return {
          ...prev,
          [projectName]: [...projectDays, dayKey]
        };
      }
    });
  };

  const handleSessionSelect = (projectName, dayKey, sessionStartTime) => {
    setSelectedSessions(prev => {
      const projectSessionsArr = prev[projectName] || [];
      const isSelected = projectSessionsArr.includes(sessionStartTime);
      if (isSelected) {
        return {
          ...prev,
          [projectName]: projectSessionsArr.filter(time => time !== sessionStartTime)
        };
      } else {
        // When selecting a session, set its status to 'P' (Pending)
        setSessionStatuses(prev => ({
          ...prev,
          [`${projectName}-${sessionStartTime}`]: 'P'
        }));
        return {
          ...prev,
          [projectName]: [...projectSessionsArr, sessionStartTime]
        };
      }
    });
  };

  const toggleDayDropdown = (projectName, commitSha) => {
    // If no GitHub repo is linked, show the GitHub input modal
    if (!githubLinks[projectName]) {
      setCurrentProjectForGithub(projectName);
      setShowGithubInput(true);
      return;
    }

    setOpenedDays(prev => {
      const projectOpened = prev[projectName] || [];
      if (projectOpened.includes(commitSha)) {
        return {
          ...prev,
          [projectName]: projectOpened.filter(sha => sha !== commitSha)
        };
      } else {
        return {
          ...prev,
          [projectName]: [...projectOpened, commitSha]
        };
      }
    });
  };

  const handleGithubLink = (projectName) => {
    setCurrentProjectForGithub(projectName);
    setShowGithubInput(true);
  };

  const fetchGithubCommits = async (repoPath) => {
    try {
      console.log(`Fetching commits for ${repoPath}...`);
      let allCommits = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `https://api.github.com/repos/${repoPath}/commits?author=SerenityUX&per_page=100&page=${page}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('GitHub API Error:', errorData);
          throw new Error(`GitHub API returned ${response.status}: ${errorData.message}`);
        }

        const commits = await response.json();
        console.log(`Fetched ${commits.length} commits for ${repoPath} on page ${page}`);
        
        // Filter out merge commits and add to all commits
        const filteredCommits = commits
          .filter(commit => !commit.commit.message.toLowerCase().includes('merge'))
          .map(commit => ({
            sha: commit.sha,
            message: commit.commit.message,
            date: new Date(commit.commit.author.date),
            url: commit.html_url
          }));

        allCommits = [...allCommits, ...filteredCommits];
        
        // Check if we've reached the end
        hasMore = commits.length === 100;
        page++;
      }

      console.log(`Total commits fetched: ${allCommits.length}`);
      return allCommits;
    } catch (error) {
      console.error('Error fetching GitHub commits:', error);
      setCommitFetchErrors(prev => ({
        ...prev,
        [repoPath]: error.message
      }));
      return [];
    }
  };

  const matchSessionsToCommits = (sessions, commits, projectName) => {
    // Sort commits by unix time ascending
    const sortedCommits = [...commits].sort((a, b) => a.date - b.date);

    // For each session, find the earliest commit after the session ends
    const matches = {};
    sessions.forEach(session => {
      const sessionEnd = new Date(session.start_time * 1000 + session.duration * 1000);
      // Find the first commit after sessionEnd
      const commit = sortedCommits.find(c => c.date >= sessionEnd);
      if (commit) {
        matches[session.start_time] = commit;
      } else {
        matches[session.start_time] = null; // Mark as uncommitted
      }
    });

    setSessionCommitMatches(prev => ({
      ...prev,
      [projectName]: matches
    }));
  };

  const handleGithubInputSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.elements.githubLink;
    const githubLink = input.value.trim();
    
    if (githubLink) {
      const match = githubLink.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (match) {
        const repoPath = match[1];
        setGithubLinks(prev => ({
          ...prev,
          [currentProjectForGithub]: repoPath
        }));

        // Set loading state
        setIsLoadingCommits(prev => ({
          ...prev,
          [currentProjectForGithub]: true
        }));

        try {
          // Fetch commits for this repository
          const commits = await fetchGithubCommits(repoPath);
          setCommitData(prev => ({
            ...prev,
            [currentProjectForGithub]: commits
          }));

          // Match sessions with commits if we have sessions for this project
          if (projectSessions[currentProjectForGithub]) {
            matchSessionsToCommits(
              projectSessions[currentProjectForGithub],
              commits,
              currentProjectForGithub
            );
          }
        } finally {
          // Clear loading state
          setIsLoadingCommits(prev => ({
            ...prev,
            [currentProjectForGithub]: false
          }));
        }
      }
    }
    
    setShowGithubInput(false);
    setCurrentProjectForGithub('');
  };

  useEffect(() => {
    const fetchHackatimeData = async () => {
      try {
        const response = await fetch('https://hackatime.hackclub.com/api/v1/users/U041FQB8VK2/stats?features=projects');
        const data = await response.json();
        setProjects(data.data.projects);
        
        // Fetch sessions for all projects
        const startDate = new Date(2025, 0, 1);
        const formattedDate = startDate.toISOString().split('T')[0];
        
        const projectSessionsPromises = data.data.projects.map(async (project) => {
          try {
            const response = await fetch(
              `https://hackatime.hackclub.com/api/v1/users/U041FQB8VK2/heartbeats/spans?start_date=${formattedDate}&project=${encodeURIComponent(project.name)}`
            );
            const data = await response.json();
            return { projectName: project.name, sessions: data.spans };
          } catch (error) {
            console.error(`Error fetching sessions for project ${project.name}:`, error);
            return { projectName: project.name, sessions: [] };
          }
        });

        const projectSessionsResults = await Promise.all(projectSessionsPromises);
        const newProjectSessions = {};
        projectSessionsResults.forEach(result => {
          newProjectSessions[result.projectName] = result.sessions;
        });
        setProjectSessions(newProjectSessions);
      } catch (error) {
        console.error('Error fetching Hackatime data:', error);
      }
    };
    fetchHackatimeData();
  }, []);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const verifyTimeTotals = (sessions, groupedCommits, projectName) => {
    // Calculate total time from all sessions
    const totalSessionTime = sessions.reduce((sum, session) => sum + session.duration, 0);
    
    // Calculate total time from all commit groups
    const totalCommitTime = Object.values(groupedCommits).reduce((sum, group) => {
      return sum + group.sessions.reduce((groupSum, session) => groupSum + session.duration, 0);
    }, 0);

    // Log the totals
    console.log(`\nTime Verification for ${projectName}:`);
    console.log(`Total Session Time: ${formatDuration(totalSessionTime)}`);
    console.log(`Total Commit Time: ${formatDuration(totalCommitTime)}`);
    console.log(`Difference: ${formatDuration(Math.abs(totalSessionTime - totalCommitTime))}`);
    
    // Log individual commit totals
    console.log('\nIndividual Commit Totals:');
    Object.entries(groupedCommits).forEach(([sha, group]) => {
      const commitTime = group.sessions.reduce((sum, session) => sum + session.duration, 0);
      let label;
      if (sha === 'uncommitted') {
        label = 'Uncommitted Time';
      } else if (sha === 'unmatched') {
        label = 'Unmatched Sessions';
      } else {
        label = group.commit.message;
      }
      console.log(`${label}: ${formatDuration(commitTime)}`);
    });
  };

  const groupSessionsByCommit = (sessions, projectName) => {
    const matches = sessionCommitMatches[projectName] || {};
    const grouped = {};
    
    // Find the most recent commit date
    const commitDates = Object.values(matches)
      .filter(commit => commit && commit.date)
      .map(commit => commit.date);
    const mostRecentCommitDate = commitDates.length > 0 ? Math.max(...commitDates) : null;
    
    // Always initialize uncommitted time group
    grouped['uncommitted'] = {
      commit: null,
      sessions: [],
      isUncommitted: true
    };
    
    // Group sessions by their commit SHA
    sessions.forEach(session => {
      const commit = matches[session.start_time];
      const sessionDate = new Date(session.start_time * 1000);
      
      if (commit) {
        if (!grouped[commit.sha]) {
          grouped[commit.sha] = {
            commit,
            sessions: []
          };
        }
        grouped[commit.sha].sessions.push(session);
      } else if (mostRecentCommitDate && sessionDate > mostRecentCommitDate) {
        // Add to uncommitted sessions
        grouped['uncommitted'].sessions.push(session);
      } else {
        // Group unmatched sessions
        if (!grouped['unmatched']) {
          grouped['unmatched'] = {
            commit: null,
            sessions: []
          };
        }
        grouped['unmatched'].sessions.push(session);
      }
    });

    // Convert to array, sort by date, and convert back to object
    const sortedEntries = Object.entries(grouped).sort((a, b) => {
      // Put uncommitted at the top
      if (a[0] === 'uncommitted') return -1;
      if (b[0] === 'uncommitted') return 1;
      
      // Put unmatched at the bottom
      if (a[0] === 'unmatched') return 1;
      if (b[0] === 'unmatched') return -1;
      
      // Sort by commit date, newest first
      return b[1].commit.date - a[1].commit.date;
    });

    // Convert back to object while maintaining order
    const sortedGrouped = Object.fromEntries(sortedEntries);

    // Verify time totals
    verifyTimeTotals(sessions, sortedGrouped, projectName);

    return sortedGrouped;
  };

  // Commit-level select/deselect all
  const handleCommitSelect = (projectName, commitSha, commitGroup) => {
    const commitSessionTimes = getCommitSessionTimes(commitGroup);
    const selectedSet = new Set(selectedSessions[projectName] || []);
    const allSelected = commitSessionTimes.length > 0 && commitSessionTimes.every(time => selectedSet.has(time));

    if (allSelected) {
      // Deselect all sessions in this commit
      const newSelected = [...selectedSet].filter(time => !commitSessionTimes.includes(time));
      setSelectedSessions(prev => ({
        ...prev,
        [projectName]: newSelected
      }));
    } else {
      // Select all sessions in this commit (add, but no duplicates)
      const newSelected = Array.from(new Set([...selectedSet, ...commitSessionTimes]));
      setSelectedSessions(prev => ({
        ...prev,
        [projectName]: newSelected
      }));
    }
  };

  // Checkbox checked logic
  const isProjectChecked = (projectName) => {
    const allSessionTimes = getAllSessionTimes(projectName);
    const selected = selectedSessions[projectName] || [];
    return allSessionTimes.length > 0 && selected.length === allSessionTimes.length;
  };

  const isCommitChecked = (projectName, commitGroup) => {
    const commitSessionTimes = getCommitSessionTimes(commitGroup);
    const selectedSet = new Set(selectedSessions[projectName] || []);
    return commitSessionTimes.length > 0 && commitSessionTimes.every(time => selectedSet.has(time));
  };

  const renderCommitGroup = (projectName, commitGroup) => {
    const { commit, sessions, isUncommitted } = commitGroup;
    const totalDuration = getTotalDuration(sessions);
    const isUnmatched = !commit && !isUncommitted;
    const commitSha = commit?.sha || (isUncommitted ? 'uncommitted' : 'unmatched');
    const isSelected = selectedSessions[projectName]?.some(sessionTime => 
      sessions.some(s => s.start_time === sessionTime)
    );
    
    return (
      <div key={commitSha}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          {!isUncommitted && (
            <div style={{ marginRight: '12px' }}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleCommitSelect(projectName, commitSha, commitGroup)}
              />
            </div>
          )}
          <div style={{ flex: 1 }}>
            {isUncommitted ? (
              <span style={{ 
                fontWeight: 500,
                color: '#ef758a'
              }}>
                Uncommitted Time
              </span>
            ) : isUnmatched ? (
              <span style={{ fontWeight: 500 }}>Unmatched Sessions</span>
            ) : (
              <a 
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: '#ef758a',
                  textDecoration: 'none',
                  fontWeight: 500
                }}
              >
                {commit.message}
              </a>
            )}
            <span style={{ color: '#888', marginLeft: 8 }}>({formatDuration(totalDuration)})</span>
          </div>
          <div>
            <button
              onClick={() => toggleDayDropdown(projectName, commitSha)}
              style={{
                padding: '2px 6px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                transform: openedDays[projectName]?.includes(commitSha) ? 'rotate(180deg)' : 'none'
              }}
            >
              ▼
            </button>
          </div>
        </div>
        {openedDays[projectName]?.includes(commitSha) && (
          <div style={{ paddingLeft: '24px', marginBottom: '4px' }}>
            {sessions
              .slice()
              .sort((a, b) => b.start_time - a.start_time)
              .map((session, index) => renderSessionWithCommit(session, projectName))}
          </div>
        )}
      </div>
    );
  };

  // Get total duration for a group of sessions
  const getTotalDuration = (sessions) => {
    return sessions.reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate total pending time from selected sessions
  const calculatePendingTime = () => {
    let totalSeconds = 0;
    Object.entries(selectedSessions).forEach(([projectName, sessions]) => {
      sessions.forEach(sessionTime => {
        const session = projectSessions[projectName]?.find(s => s.start_time === sessionTime);
        if (session) {
          totalSeconds += session.duration;
        }
      });
    });
    return (totalSeconds / 3600).toFixed(2); // Convert to hours
  };

  // Update the session display to show commit information
  const renderSessionWithCommit = (session, projectName) => {
    const commit = sessionCommitMatches[projectName]?.[session.start_time];
    const isLoading = isLoadingCommits[projectName];
    const error = commitFetchErrors[projectName];

    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{ marginRight: '12px' }}>
          <input 
            type="checkbox" 
            checked={selectedSessions[projectName]?.includes(session.start_time) || false}
            onChange={() => handleSessionSelect(projectName, session.start_time)}
          />
        </div>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#666',
          flex: 1,
          overflow: 'hidden'
        }}>
          <span>{formatDate(session.start_time)} - {formatDuration(session.duration)}</span>
          <span style={{ 
            marginLeft: '8px', 
            color: '#ef758a',
            fontWeight: 'bold',
            fontSize: '12px'
          }}>
            {sessionStatuses[`${projectName}-${session.start_time}`] || '-'}
          </span>
          {isLoading ? (
            <span style={{ color: '#999', fontSize: '12px' }}>(Loading commits...)</span>
          ) : error ? (
            <span style={{ color: '#ff4444', fontSize: '12px' }}>(Error: {error})</span>
          ) : commit ? (
            <span 
              style={{
                color: '#ef758a',
                textDecoration: 'none',
                fontSize: '12px',
                opacity: 0.9,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginLeft: '4px'
              }}
            >
              <a 
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'inherit',
                  textDecoration: 'none'
                }}
              >
                ({commit.message})
              </a>
            </span>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className={`pop-in ${isExiting ? "hidden" : ""}`} 
      style={{
        position: "absolute", 
        zIndex: 2, 
        width: "calc(100% - 16px)", 
        height: "calc(100% - 16px)", 
        borderRadius: 8, 
        marginLeft: 8, 
        marginTop: 8, 
        backgroundColor: "#ffffff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "8px 16px",
        borderBottom: "2px solid #ef758a",
        backgroundColor: "#febdc3",
        flexShrink: 0
      }}>
        <div 
          onClick={onClose} 
          style={{
            width: 14, 
            cursor: "pointer", 
            height: 14, 
            borderRadius: 16, 
            backgroundColor: "#FF5F56"
          }}
        />
        <p style={{fontSize: 18, color: "#000", margin: 0}}>Hack Time</p>
        <div style={{width: 14, height: 14}} />
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        background: "#febdc3" // pastel pink background
      }}>
        {timeTrackingMethod == "" && 
        <div style={{position: "relative", width: "100%", height: "100%"}}>
        <audio
          autoPlay
          src="/ChoiceToMake.mp3"
          style={{ display: 'none' }}
        />
        <div style={{ color: "#000", zIndex: 2, paddingLeft: "4%", paddingRight: "4%", height: "100%", position: "absolute", display: "flex", width: "100%", height: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "4%",}}>
            
            <div
              style={{
                display: "flex", 
                backgroundColor: "#fff9e5", // pastel cream card
                flexDirection: "column", 
                border: "2px solid #ef758a", // pink accent
                aspectRatio: 0.8333333, 
                width: "50%", 
                padding: 32, 
                alignItems: 'center', 
                gap: 12, 
                maxHeight: "500px", 
                maxWidth: "400px",
                borderRadius: '16px',
                boxShadow: hoveredCard === 'hackatime' ? '8px 12px 32px 0px rgba(239,117,138,0.18), 0 2px 8px rgba(0,0,0,0.04)' : '0 10px 20px rgba(239,117,138,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                transition: 'transform 0.15s cubic-bezier(.4,2,.6,1), box-shadow 0.15s cubic-bezier(.4,2,.6,1), outline 0.2s, opacity 0.15s cubic-bezier(.4,2,.6,1)',
                cursor: 'pointer',
                outline: 'none',
                opacity: (hoveredCard === 'stopwatch' || activeCard === 'stopwatch') ? 0.95 : 1,
                transform: activeCard === 'hackatime'
                  ? 'translateY(4px) scale(0.97) rotate(-2deg)'
                  : hoveredCard === 'hackatime'
                    ? 'translate(8px, -8px) scale(1.04) rotate(-2deg)'
                    : (hoveredCard === 'stopwatch' || activeCard === 'stopwatch')
                      ? 'scale(0.96)'
                      : 'none',
              }}
              onMouseEnter={() => setHoveredCard('hackatime')}
              onMouseLeave={() => { setHoveredCard(null); setActiveCard(null); }}
              onMouseDown={() => setActiveCard('hackatime')}
              onMouseUp={() => setActiveCard(null)}
              onClick={() => {
                const audio = new Audio('/hackatimeTapped.wav');
                audio.play();
                setTimeTrackingMethod("hackatime");
              }}
            >
              {hoveredCard === 'hackatime' && (
                <audio src="/Hackatime.mp3" autoPlay style={{ display: 'none' }} />
              )}
              <img 
                src="/tick.png"
                alt="Hackatime icon"
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: 8,
                  border: "1px solid #ef758a",
                  boxShadow: '0 4px 8px rgba(239,117,138,0.10)',
                  background: '#fff',
                  marginBottom: 8,
                  objectFit: 'contain',
                  padding: 8
                }}
              />
              <p style={{
                fontWeight: 'bold',
                fontSize: '1.2em',
                color: '#ef758a',
                textShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}>Hackatime (powerful)</p>
              <p style={{color: '#786951', fontSize: 19}}>Hackatime is a time-logging tool that latches onto into your IDE and automatically feeds on time as you code. <b>Recommended for every serious hacker.</b></p>
            </div>
            <div
              style={{
                display: "flex", 
                backgroundColor: "#fff9e5", // pastel cream card
                flexDirection: "column", 
                border: "2px solid #f7d359", // yellow accent
                aspectRatio: 0.8333333, 
                width: "50%", 
                padding: 32, 
                alignItems: 'center', 
                gap: 12, 
                maxHeight: "500px", 
                maxWidth: "400px",
                borderRadius: '16px',
                boxShadow: hoveredCard === 'stopwatch' ? '8px 12px 32px 0px rgba(247,211,89,0.18), 0 2px 8px rgba(0,0,0,0.04)' : '0 10px 20px rgba(247,211,89,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                transition: 'transform 0.15s cubic-bezier(.4,2,.6,1), box-shadow 0.15s cubic-bezier(.4,2,.6,1), outline 0.2s, opacity 0.15s cubic-bezier(.4,2,.6,1)',
                cursor: 'pointer',
                outline: 'none',
                opacity: (hoveredCard === 'hackatime' || activeCard === 'hackatime') ? 0.95 : 1,
                transform: activeCard === 'stopwatch'
                  ? 'translateY(4px) scale(0.97) rotate(2deg)'
                  : hoveredCard === 'stopwatch'
                    ? 'translate(8px, -8px) scale(1.04) rotate(2deg)'
                    : (hoveredCard === 'hackatime' || activeCard === 'hackatime')
                      ? 'scale(0.96)'
                      : 'none',
              }}
              onMouseEnter={() => setHoveredCard('stopwatch')}
              onMouseLeave={() => { setHoveredCard(null); setActiveCard(null); }}
              onMouseDown={() => setActiveCard('stopwatch')}
              onMouseUp={() => setActiveCard(null)}
              onClick={() => {
                const audio = new Audio('/stopwatchTapped.wav');
                audio.play();
                setTimeTrackingMethod("stopwatch");
              }}
            >
              {hoveredCard === 'stopwatch' && (
                <audio src="/Stopwatch.mp3" autoPlay style={{ display: 'none' }} />
              )}
              <img 
                src="/ladybug.png"
                alt="Stopwatch icon"
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: 8,
                  border: "1px solid #f7d359",
                  background: '#fff',
                  marginBottom: 8,
                  objectFit: 'contain',
                  padding: 8
                }}
              />
              <p style={{
                fontWeight: 'bold',
                fontSize: '1.2em',
                color: '#786A50',
                textShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}>Stopwatch (casual)</p>
              <p style={{color: '#786951',
                                fontSize: 19,
              }}>Simply click start, start doing whatever design or code for your project, and then press stop to end the ticking. <b>Warning 20hr max </b></p>
            </div>       
        </div>
        <div style={{
          position: "absolute", 
          zIndex: 1, 
          width: "100%", 
          height: "100%", 
          top: 0, 
          left: 0,
          overflow: "hidden"
        }}>
          <HackTimeSelectionShader />
        </div>
        {timeTrackingMethod === "" && (
          <audio
            autoPlay
            loop
            src="/portalEntry.mp3"
            style={{ display: 'none' }}
          />
        )}
        </div>
        }
        {timeTrackingMethod == "hackatime" && 
        <div style={{ color: "#000", padding: 16 }}>

<div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '24px',
            padding: '12px',
            alignItems: 'flex-start',
            width: '100%',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}>
            {[
              { name: "PENDING TIME", value: `${calculatePendingTime()} hr` },
              { name: "SHIPPED TIME", value: "0.00 hr" },
              { name: "APPROVED TIME", value: "0.00 hr" }
            ].map((category, index) => (
              <div key={index} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                width: 150,
                gap: '0px',
              }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 600,
                  letterSpacing: '-0.5px',
                  color: '#ef758a',
                  textAlign: 'left',
                  textTransform: 'uppercase',
                }}>{category.name}</span>
                <span style={{ 
                  fontSize: '18px', 
                  color: '#000', 
                  fontWeight: 600,
                  textAlign: 'left',
                }}>{category.value}</span>
              </div>
            ))}
          </div>


          <div style={{ height: '1px', backgroundColor: '#00000010', margin: '16px 0' }} />
          <p style={{marginLeft: 0,}}>check the projects or sessions you'd like to be attributed to neighborhood.</p>


          {projects.map((project) => {
            const projectChecked = isProjectChecked(project.name);
            const grouped = groupSessionsByCommit(projectSessions[project.name] || [], project.name);
            const dayKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // newest first
            // Project total duration
            const projectTotal = getTotalDuration(projectSessions[project.name] || []);
            return (
              <div key={project.name}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                  width: '100%'
                }}>
                  <div style={{ marginRight: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={projectChecked}
                      onChange={() => handleProjectSelect(project.name)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0 }}>
                      {project.name}
                      {projectTotal > 0 ? ` (${formatDuration(projectTotal)})` : ''}
                      {githubLinks[project.name] ? ` (${githubLinks[project.name]})` : (
                        <span 
                          onClick={() => handleGithubLink(project.name)}
                          style={{ 
                            color: '#ef758a', 
                            cursor: 'pointer', 
                            marginLeft: '8px',
                            fontSize: '12px'
                          }}
                        >
                          (Connect GitHub)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <button 
                      onClick={() => toggleProject(project.name)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transform: openedProjects.includes(project.name) ? 'rotate(180deg)' : 'none'
                      }}
                    >
                      ▼
                    </button>
                  </div>
                </div>
                {openedProjects.includes(project.name) && (
                  <div style={{ paddingLeft: '24px', marginBottom: '8px' }}>
                    {Object.entries(grouped)
                      .map(([commitSha, commitGroup]) => renderCommitGroup(project.name, commitGroup))}
                  </div>
                )}
              </div>
            );
          })}
        </div>}
        {timeTrackingMethod == "stopwatch" && 
        <div style={{ color: "#000", height: "100%" }}>
          <StopwatchComponent />
        </div>}
      </div>
      {showGithubInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '400px'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Connect GitHub Repository</h3>
            <form onSubmit={handleGithubInputSubmit}>
              <input
                type="text"
                name="githubLink"
                placeholder="https://github.com/username/repo"
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowGithubInput(false)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#ef758a',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HackTimeComponent; 
