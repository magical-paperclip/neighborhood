import React, { useState, useEffect } from 'react';

const HackTimeComponent = ({ isExiting, onClose }) => {
  const [timeTrackingMethod, setTimeTrackingMethod] = useState(''); // Default to stopwatch
  const [projects, setProjects] = useState([]);
  const [openedProjects, setOpenedProjects] = useState([]);

  const toggleProject = (projectName) => {
    setOpenedProjects(prev => 
      prev.includes(projectName) 
        ? prev.filter(name => name !== projectName)
        : [...prev, projectName]
    );
  };

  useEffect(() => {
    const fetchHackatimeData = async () => {
      try {
        const response = await fetch('https://hackatime.hackclub.com/api/v1/users/U041FQB8VK2/stats?features=projects');
        const data = await response.json();
        console.log('Hackatime Data:', data);
        setProjects(data.data.projects);
      } catch (error) {
        console.error('Error fetching Hackatime data:', error);
      }
    };

    fetchHackatimeData();
  }, []); // Empty dependency array means this runs once when component mounts

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
        overflow: "hidden"
      }}
    >
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "8px 16px",
        borderBottom: "1px solid #00000010",
        backgroundColor: "#ffffff"
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

      {timeTrackingMethod == "" && 
      <div style={{
        padding: "20px",
        color: "#000"
      }}>
        <p onClick={() => setTimeTrackingMethod("stopwatch")}>Stopwatch</p>
        <p onClick={() => setTimeTrackingMethod("hackatime")}>Hackatime</p>
      </div>}
      {timeTrackingMethod == "hackatime" && 
      <div style={{
        padding: "20px",
        color: "#000"
      }}>
        <p>check the projects or sessions you'd like to be attributed to neighborhood.</p>
        <div style={{ height: '1px', backgroundColor: '#00000010', margin: '16px 0' }} />
        {projects.map((project) => 
        <div key={project.name}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px',
            width: '100%'
          }}>
            <div style={{ marginRight: '12px' }}>
              <input type="checkbox" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0 }}>{project.name} ({project.text})</p>
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
              <p style={{ margin: 0, color: '#666' }}>Project sessions will go here</p>
            </div>
          )}
        </div>
        )}
      </div>}
      {timeTrackingMethod == "stopwatch" && 
      <div style={{
        padding: "20px",
        color: "#000"
      }}>
        <p>implement the stopwatch here</p>
      </div>}
    </div>
  );
};

export default HackTimeComponent; 