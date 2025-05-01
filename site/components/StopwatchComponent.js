import React, { useState, useEffect } from "react";

import { getToken } from "@/utils/storage";

const StopwatchComponent = ({ onClose, onAddProject, isExiting, userData }) => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pendingTime, setPendingTime] = useState(0);
  const [shippedTime, setShippedTime] = useState(0);
  const [approvedTime, setApprovedTime] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projects, setProjects] = useState([]);

  // Sample data
  const sampleData = [
    {
      commitMessage: "Add initial project structure",
      startTime: "09:00 AM",
      stopTime: "10:30 AM",
      duration: "01:30",
      status: "A",
      projectName: "Website Redesign",
      video:
        "https://hc-cdn.hel1.your-objectstorage.com/s/v3/986c1b1330a7f44984447ce85c170019febf5438_2025-04-23_18-35-01.mp4",
    },
    {
      commitMessage: "Implement user authentication",
      startTime: "11:00 AM",
      stopTime: "12:45 PM",
      duration: "01:45",
      status: "S",
      projectName: "Website Redesign",
      video: null,
    },
    {
      commitMessage: "Fix navigation bugs",
      startTime: "02:00 PM",
      stopTime: "03:30 PM",
      duration: "01:30",
      status: "P",
      projectName: "Mobile App",
      video: null,
    },
    {
      commitMessage: "Add responsive design",
      startTime: "04:00 PM",
      stopTime: "05:45 PM",
      duration: "01:45",
      status: "A",
      projectName: "Website Redesign",
      video: null,
    },
    {
      commitMessage: "Implement search functionality",
      startTime: "06:00 PM",
      stopTime: "07:30 PM",
      duration: "01:30",
      status: "S",
      projectName: "Mobile App",
      video: null,
    },
    {
      commitMessage: "Add dark mode support",
      startTime: "08:00 PM",
      stopTime: "09:15 PM",
      duration: "01:15",
      status: "P",
      projectName: "Dashboard",
      video: null,
    },
    {
      commitMessage: "Optimize performance",
      startTime: "09:30 PM",
      stopTime: "10:45 PM",
      duration: "01:15",
      status: "A",
      projectName: "Mobile App",
      video: null,
    },
    {
      commitMessage: "Add unit tests",
      startTime: "11:00 PM",
      stopTime: "12:15 AM",
      duration: "01:15",
      status: "S",
      projectName: "Dashboard",
      video: null,
    },
  ];

  useEffect(() => {
    let intervalId;
    if (isRunning) {
      intervalId = setInterval(() => {
        const now = Date.now();
        const newElapsedTime = elapsedTime + (now - startTime);
        setElapsedTime(newElapsedTime);
        setStartTime(now);
        setTime(newElapsedTime);
      }, 10);
    }
    return () => clearInterval(intervalId);
  }, [isRunning, startTime, elapsedTime]);

  useEffect(() => {
    // Calculate times based on sample data
    let pending = 0;
    let shipped = 0;
    let approved = 0;

    sampleData.forEach((entry) => {
      const [hours, minutes] = entry.duration.split(":").map(Number);
      const durationInHours = hours + minutes / 60;

      switch (entry.status) {
        case "P":
          pending += durationInHours;
          break;
        case "S":
          shipped += durationInHours;
          break;
        case "A":
          approved += durationInHours;
          break;
      }
    });

    setPendingTime(pending);
    setShippedTime(shipped);
    setApprovedTime(approved);
  }, []);

  // Fetch Hackatime projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.error("No token found");
          return;
        }

        // Make sure userData is passed as a prop to the component
        if (!userData?.slackId) {
          console.error("No Slack ID available");
          return;
        }

        const response = await fetch(
          `/api/hackatime?userId=${userData.slackId}&token=${token}`,
        );

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Extract just the App Names
        const projectNames = data.data.projects.map((project) => ({
          id: project.name, // Using name as ID since that's what we need
          name: project.name,
        }));

        console.log("App Names:", projectNames);
        setProjects(projectNames);
        if (projectNames.length > 0 && !projectName) {
          setProjectName(projectNames[0].name);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    fetchProjects();
  }, [userData]);

  const startStopwatch = () => {
    if (!isRunning && projectName != "") {
      setStartTime(Date.now());
      setIsRunning(true);
    } else {
      window.alert("Please select a project before starting the stopwatch");
    }
  };

  const stopStopwatch = () => {
    if (isRunning) {
      const currentTime = formatTime(elapsedTime);
      const shouldStop = window.confirm(
        `Are you ready to end the time at ${currentTime}?`,
      );

      if (shouldStop) {
        console.log(`Time elapsed: ${currentTime}`);
        setTime(0);
        setElapsedTime(0);
        setIsRunning(false);
      }
    }
  };

  const handleClick = () => {
    if (isRunning) {
      stopStopwatch();
    } else {
      startStopwatch();
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const PlayIcon = () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor" />
    </svg>
  );

  const StopIcon = () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="6" width="12" height="12" fill="currentColor" />
    </svg>
  );

  const timeCategories = [
    {
      name: "PENDING TIME",
      value: `${pendingTime.toFixed(2)} hr`,
    },
    {
      name: "SHIPPED TIME",
      value: `${shippedTime.toFixed(2)} hr`,
    },
    {
      name: "APPROVED TIME",
      value: `${approvedTime.toFixed(2)} hr`,
    },
  ];

  const getStatusTooltip = (status) => {
    switch (status) {
      case "P":
        return "Pending";
      case "S":
        return "Shipped";
      case "A":
        return "Approved";
      default:
        return "";
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0px",
          alignItems: "center",
          padding: 20,
          borderBottom: "1px solid #000",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "start",
            width: "100%",
            flexDirection: "row",
          }}
        >
          <select
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "2px solid #ef758a",
              fontSize: "14px",
              fontWeight: 500,
              color: "#000",
              backgroundColor: "#fff",
              outline: "none",
              appearance: "none",
              textAlign: "center",
              height: "40px",
            }}
          >
            <option value="" disabled>
              Select a project
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.name}>
                {project.name}
              </option>
            ))}
          </select>
          <div
            style={{
              // Align the plus icon in the center
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              // Button style
              borderRadius: "50%",
              border: "2px solid #ef758a",
              backgroundColor: "transparent",
              color: "#ef758a",
              cursor: "pointer",
              marginLeft: "12px",
            }}
            onClick={async () => {
              onClose();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              viewBox="0 -960 960 960"
              width="24px"
              fill="#ffffff"
            >
              <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
            </svg>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            onClick={handleClick}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "170px",
              height: "170px",
              borderRadius: "50%",
              border: "3px dotted #ef758a",
              background: "transparent",
              marginBottom: "12px",
              gap: "12px",
              cursor: "pointer",
              position: "relative",
            }}
          >
            <span
              style={{
                fontSize: "24px",
                color: "#000",
                fontWeight: 500,
                pointerEvents: "none",
              }}
            >
              {formatTime(time)}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: "25px",
                  height: "25px",
                  borderRadius: "50%",
                  border: "2px solid #ef758a",
                  backgroundColor: "transparent",
                  color: "#ef758a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0",
                  transition: "all 0.2s ease",
                }}
              >
                {isRunning ? <StopIcon /> : <PlayIcon />}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "24px",
            padding: "12px",
            alignItems: "flex-start",
            width: "510px",
            justifyContent: "space-between",
          }}
        >
          {timeCategories.map((category, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                width: 150,
                gap: "0px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "-0.5px",
                  color: "#ef758a",
                  textAlign: "left",
                  textTransform: "uppercase",
                }}
              >
                {category.name}
              </span>
              <span
                style={{
                  fontSize: "18px",
                  color: "#000",
                  fontWeight: 600,
                  textAlign: "left",
                }}
              >
                {category.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          width: "100%",
          marginTop: 0,
          padding: "0 0 32px 0",
          maxHeight: "calc(100vh - 300px)",
          overflowY: "auto",
        }}
      >
        <table
          style={{
            width: "calc(100% - 32px)",
            marginLeft: 16,
            marginRight: 16,
            marginTop: 16,
            borderCollapse: "collapse",
            background: "transparent",
          }}
        >
          <colgroup>
            <col style={{ width: "35%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr>
              <th
                style={{
                  padding: "6px 8px",
                  color: "#ef758a",
                  fontWeight: 700,
                  fontSize: 11,
                  borderBottom: "1px solid #ef758a",
                  textAlign: "left",
                  textTransform: "uppercase",
                  background: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                Commit Message
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  color: "#ef758a",
                  fontWeight: 700,
                  fontSize: 11,
                  borderBottom: "1px solid #ef758a",
                  textAlign: "left",
                  textTransform: "uppercase",
                  background: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                Start Time
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  color: "#ef758a",
                  fontWeight: 700,
                  fontSize: 11,
                  borderBottom: "1px solid #ef758a",
                  textAlign: "left",
                  textTransform: "uppercase",
                  background: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                Stop Time
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  color: "#ef758a",
                  fontWeight: 700,
                  fontSize: 11,
                  borderBottom: "1px solid #ef758a",
                  textAlign: "left",
                  textTransform: "uppercase",
                  background: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                Duration
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  color: "#ef758a",
                  fontWeight: 700,
                  fontSize: 11,
                  borderBottom: "1px solid #ef758a",
                  textAlign: "left",
                  textTransform: "uppercase",
                  background: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  color: "#ef758a",
                  fontWeight: 700,
                  fontSize: 11,
                  borderBottom: "1px solid #ef758a",
                  textAlign: "left",
                  textTransform: "uppercase",
                  background: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                Project Name
              </th>
              <th
                style={{
                  padding: "6px 8px",
                  color: "#ef758a",
                  fontWeight: 700,
                  fontSize: 11,
                  borderBottom: "1px solid #ef758a",
                  textAlign: "left",
                  textTransform: "uppercase",
                  background: "transparent",
                  letterSpacing: "0.5px",
                }}
              >
                Video
              </th>
            </tr>
          </thead>
          <tbody>
            {sampleData.map((entry, index) => (
              <tr key={index}>
                <td
                  style={{
                    padding: "6px 8px",
                    color: "#000",
                    fontSize: 13,
                    borderBottom: "1px solid #ef758a",
                    background: "transparent",
                  }}
                >
                  {entry.commitMessage}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    color: "#000",
                    fontSize: 13,
                    borderBottom: "1px solid #ef758a",
                    background: "transparent",
                  }}
                >
                  {entry.startTime}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    color: "#000",
                    fontSize: 13,
                    borderBottom: "1px solid #ef758a",
                    background: "transparent",
                  }}
                >
                  {entry.stopTime}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    color: "#000",
                    fontSize: 13,
                    borderBottom: "1px solid #ef758a",
                    background: "transparent",
                  }}
                >
                  {entry.duration}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    color: "#ef758a",
                    fontWeight: 700,
                    fontSize: 13,
                    borderBottom: "1px solid #ef758a",
                    background: "transparent",
                    textAlign: "center",
                  }}
                >
                  <span
                    title={getStatusTooltip(entry.status)}
                    style={{ cursor: "help" }}
                  >
                    {entry.status}
                  </span>
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    color: "#000",
                    fontSize: 13,
                    borderBottom: "1px solid #ef758a",
                    background: "transparent",
                  }}
                >
                  {entry.projectName}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    color: "#000",
                    fontSize: 13,
                    borderBottom: "1px solid #ef758a",
                    background: "transparent",
                  }}
                >
                  {entry.video ? (
                    <button
                      onClick={() => {
                        const width = 1280;
                        const height = 720; // 16:9 aspect ratio
                        const left = (window.screen.width - width) / 2;
                        const top = (window.screen.height - height) / 2;
                        window.open(
                          entry.video,
                          "videoPlayer",
                          `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no,resizable=yes`,
                        );
                      }}
                      style={{
                        padding: "4px 8px",
                        background: "#ef758a",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        transition: "background 0.2s ease",
                      }}
                      onMouseOver={(e) =>
                        (e.target.style.background = "#ff8a9e")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.background = "#ef758a")
                      }
                    >
                      Watch
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StopwatchComponent;
