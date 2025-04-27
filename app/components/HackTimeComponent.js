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

  const handleProjectSelect = (projectName) => {
    setSelectedProjects(prev => {
      const isSelected = prev.includes(projectName);
      if (isSelected) {
        // Remove project and all its sessions/days
        const newSelectedSessions = { ...selectedSessions };
        const newSelectedDays = { ...selectedDays };
        delete newSelectedSessions[projectName];
        delete newSelectedDays[projectName];
        setSelectedSessions(newSelectedSessions);
        setSelectedDays(newSelectedDays);
        return prev.filter(name => name !== projectName);
      } else {
        // Add project and all its sessions/days
        const newSelectedSessions = { ...selectedSessions };
        const newSelectedDays = { ...selectedDays };
        newSelectedSessions[projectName] = projectSessions[projectName]?.map(session => session.start_time) || [];
        // Select all days
        const grouped = groupSessionsByDay(projectSessions[projectName] || []);
        newSelectedDays[projectName] = Object.keys(grouped);
        setSelectedSessions(newSelectedSessions);
        setSelectedDays(newSelectedDays);
        return [...prev, projectName];
      }
    });
  };

  const handleDaySelect = (projectName, dayKey) => {
    setSelectedDays(prev => {
      const projectDays = prev[projectName] || [];
      const isSelected = projectDays.includes(dayKey);
      if (isSelected) {
        // Unselect day and all its sessions
        setSelectedSessions(sessionsPrev => {
          const grouped = groupSessionsByDay(projectSessions[projectName] || []);
          const sessionTimes = grouped[dayKey]?.map(s => s.start_time) || [];
          return {
            ...sessionsPrev,
            [projectName]: (sessionsPrev[projectName] || []).filter(time => !sessionTimes.includes(time))
          };
        });
        return {
          ...prev,
          [projectName]: projectDays.filter(day => day !== dayKey)
        };
      } else {
        // Select day and all its sessions
        setSelectedSessions(sessionsPrev => {
          const grouped = groupSessionsByDay(projectSessions[projectName] || []);
          const sessionTimes = grouped[dayKey]?.map(s => s.start_time) || [];
          return {
            ...sessionsPrev,
            [projectName]: Array.from(new Set([...(sessionsPrev[projectName] || []), ...sessionTimes]))
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
        return {
          ...prev,
          [projectName]: [...projectSessionsArr, sessionStartTime]
        };
      }
    });
  };

  const toggleDayDropdown = (projectName, dayKey) => {
    setOpenedDays(prev => {
      const projectOpened = prev[projectName] || [];
      if (projectOpened.includes(dayKey)) {
        return {
          ...prev,
          [projectName]: projectOpened.filter(day => day !== dayKey)
        };
      } else {
        return {
          ...prev,
          [projectName]: [...projectOpened, dayKey]
        };
      }
    });
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

  // Group sessions by day (returns { 'YYYY-MM-DD': [session, ...] })
  const groupSessionsByDay = (sessions) => {
    return sessions.reduce((acc, session) => {
      const date = new Date(session.start_time * 1000);
      const key = date.toISOString().split('T')[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    }, {});
  };

  // Get total duration for a group of sessions
  const getTotalDuration = (sessions) => {
    return sessions.reduce((sum, s) => sum + s.duration, 0);
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
              <div style={{width: 86, borderRadius: 8, height: 86, border: "1px solid #ef758a", boxShadow: '0 4px 8px rgba(239,117,138,0.10)', background: '#fff', marginBottom: 8}}></div>
              <p style={{
                fontWeight: 'bold',
                fontSize: '1.2em',
                color: '#ef758a',
                textShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}>Hackatime (powerful)</p>
              <p style={{color: '#786951', fontSize: 19}}>Hackatime is a time-logging tool that latches onto into VS Code and automatically feeds on time as you code. <b>Recommended for serious every hacker.</b></p>
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
              <div style={{width: 86, borderRadius: 8, height: 86, border: "1px solid #f7d359", background: '#fff', marginBottom: 8}}></div>
              <p style={{
                fontWeight: 'bold',
                fontSize: '1.2em',
                color: '#f7d359',
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
        <div style={{ color: "#000" }}>
          <p>check the projects or sessions you'd like to be attributed to neighborhood.</p>
          <div style={{ height: '1px', backgroundColor: '#00000010', margin: '16px 0' }} />
          {projects.map((project) => {
            const isProjectChecked = selectedProjects.includes(project.name);
            const grouped = groupSessionsByDay(projectSessions[project.name] || []);
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
                      checked={isProjectChecked}
                      onChange={() => handleProjectSelect(project.name)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0 }}>{project.name}{projectTotal > 0 ? ` (${formatDuration(projectTotal)})` : ''}</p>
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
                    {dayKeys.map(dayKey => {
                      const isDayChecked = isProjectChecked || (selectedDays[project.name]?.includes(dayKey) || false);
                      const isDayDisabled = isProjectChecked;
                      const isDayOpen = openedDays[project.name]?.includes(dayKey);
                      const dayTotal = getTotalDuration(grouped[dayKey]);
                      return (
                        <div key={dayKey}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ marginRight: '12px' }}>
                              <input
                                type="checkbox"
                                checked={isDayChecked}
                                onChange={() => handleDaySelect(project.name, dayKey)}
                                disabled={isDayDisabled}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 500 }}>{new Date(dayKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span style={{ color: '#888', marginLeft: 8 }}>({formatDuration(dayTotal)})</span>
                            </div>
                            <div>
                              <button
                                onClick={() => toggleDayDropdown(project.name, dayKey)}
                                style={{
                                  padding: '2px 6px',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  backgroundColor: 'white',
                                  cursor: 'pointer',
                                  transform: isDayOpen ? 'rotate(180deg)' : 'none'
                                }}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                          {isDayOpen && (
                            <div style={{ paddingLeft: '24px', marginBottom: '4px' }}>
                              {grouped[dayKey].map((session, index) => (
                                <div key={index} style={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  marginBottom: '8px' 
                                }}>
                                  <div style={{ marginRight: '12px' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={isProjectChecked || isDayChecked || (selectedSessions[project.name]?.includes(session.start_time) || false)}
                                      onChange={() => handleSessionSelect(project.name, dayKey, session.start_time)}
                                      disabled={isProjectChecked || isDayChecked}
                                    />
                                  </div>
                                  <p style={{ margin: 0, color: '#666' }}>
                                    {formatDate(session.start_time)} - {formatDuration(session.duration)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>}
        {timeTrackingMethod == "stopwatch" && 
        <div style={{ color: "#000" }}>
          <StopwatchComponent />
        </div>}
      </div>
    </div>
  );
};

export default HackTimeComponent; 
