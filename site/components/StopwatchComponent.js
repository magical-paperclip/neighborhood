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
  const [commits, setCommits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [commitVideo, setCommitVideo] = useState(null);

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
    // Calculate times based on real data from sessions
    let pending = 0;
    let shipped = 0;
    let approved = 0;

    commits.forEach((commit) => {
      // Get the total duration from all sessions in this commit
      const sessionsData = commit.sessionDetails || [];

      sessionsData.forEach((session) => {
        if (
          !session.fields.duration &&
          session.fields.startTime &&
          session.fields.endTime
        ) {
          // Calculate duration if not available but start and end times are
          const start = new Date(session.fields.startTime);
          const end = new Date(session.fields.endTime);
          const durationInMinutes = (end - start) / (1000 * 60);

          // Add to appropriate category based on type
          const type = commit.fields.approved || session.fields.approved;
          switch (type) {
            case "P":
              pending += durationInMinutes / 60; // Convert to hours
              break;
            case "S":
              shipped += durationInMinutes / 60;
              break;
            case "A":
              approved += durationInMinutes / 60;
              break;
          }
        } else if (session.fields.duration) {
          // If duration is directly available
          let durationInHours;
          if (typeof session.fields.duration === "number") {
            durationInHours = session.fields.duration / 60; // Assuming duration is in minutes
          } else {
            // Try to parse if it's a string like "1:30" (1 hour 30 minutes)
            const durationParts = String(session.fields.duration)
              .split(":")
              .map(Number);
            if (durationParts.length === 2) {
              durationInHours = durationParts[0] + durationParts[1] / 60;
            } else {
              durationInHours = parseFloat(session.fields.duration) || 0;
            }
          }

          const type = commit.fields.approved || session.fields.approved;
          switch (type) {
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
        }
      });
    });

    setPendingTime(pending);
    setShippedTime(shipped);
    setApprovedTime(approved);
  }, [commits]);

  // Fetch Hackatime projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.error("No token found");
          return;
        }

        // Call the getProjects API with the token
        const response = await fetch(`/api/getProjects?token=${token}`);

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const projects = await response.json();

        // Format the projects data
        const projectNames = projects.map((project) => ({
          id: project.id,
          name: project.fields.name || "Unnamed Project",
        }));

        console.log("Project Names:", projectNames);
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

  // Fetch commits
  useEffect(() => {
    const fetchCommits = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.error("No token found");
          return;
        }

        // Call the getCommits API with the token
        const response = await fetch(`/api/getCommits?token=${token}`);

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const commitsData = await response.json();
        console.log("Commits data with sessions:", commitsData);
        setCommits(commitsData);
      } catch (error) {
        console.error("Error fetching commits:", error);
      }
    };

    fetchCommits();
  }, [userData]);

  const calculateTotalDuration = (commit) => {
    const sessionsData = commit.sessionDetails || [];
    let totalMinutes = 0;

    sessionsData.forEach((session) => {
      if (session.fields.duration) {
        if (typeof session.fields.duration === "number") {
          totalMinutes += session.fields.duration;
        } else {
          // Try to parse if it's a string like "1:30" (1 hour 30 minutes)
          const durationParts = String(session.fields.duration)
            .split(":")
            .map(Number);
          if (durationParts.length === 2) {
            totalMinutes += durationParts[0] * 60 + durationParts[1];
          } else {
            totalMinutes += parseFloat(session.fields.duration) * 60 || 0;
          }
        }
      } else if (session.fields.startTime && session.fields.endTime) {
        // Calculate if duration not available
        const start = new Date(session.fields.startTime);
        const end = new Date(session.fields.endTime);
        totalMinutes += (end - start) / (1000 * 60);
      }
    });

    // Format as hours:minutes
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

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
        setIsRunning(false);
        setShowModal(true);
      }
    }
  };

  const handleFinishStretch = async () => {
    if (!commitMessage.trim() && !commitVideo) {
      alert("Please enter a commit message before submitting");
      return;
    }

    try {
      // Handle video upload if a file is selected
      let videoUrl = null;
      if (commitVideo) {
        const formData = new FormData();
        formData.append("video", commitVideo);
        formData.append("sessionId", userData?.slackId || "anonymous");

        console.log("Uploading video:", commitVideo.name);

        try {
          const response = await fetch("/api/uploadVideo", {
            method: "POST",
            body: formData,
          });

          console.log("Upload response status:", response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Upload error:", errorText);
            throw new Error(`Video upload failed: ${errorText}`);
          }

          const result = await response.json();
          videoUrl = result.videoUrl;
          console.log("Upload successful, URL:", videoUrl);
        } catch (error) {
          console.error("Upload exception:", error);
          throw error;
        }
      }

      await fetch("/api/createSession", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: getToken(),
          startTime: new Date(Date.now() - elapsedTime).toISOString(),
          endTime: new Date().toISOString(),
          videoUrl: videoUrl,
          projectName: projectName,
        }),
      }).then(async (response) => {
        const data = await response.json();
        console.log(data);

        return fetch("/api/createCommit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: getToken(),
            commitMessage: commitMessage,
            videoUrl: videoUrl,
            projectName: projectName,
            session: data[0].id,
          }),
        });
      });

      // After successful submission, refresh the commits list
      const token = getToken();
      const commitsResponse = await fetch(`/api/getCommits?token=${token}`);
      const commitsData = await commitsResponse.json();
      setCommits(commitsData);

      // Reset the stopwatch
      setTime(0);
      setElapsedTime(0);
      setCommitMessage("");
      setCommitVideo(null);
      setShowModal(false);
    } catch (error) {
      console.error("Error saving stretch:", error);
      alert("There was an error saving your work. Please try again.");
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

  const formatDatetime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString();
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
            paddingBottom: "12px",
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
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
          <p
            style={{
              alignSelf: "center",
              paddingLeft: "12px",
              fontStyle: "italic",
              color: "#ef758a",
            }}
          >
            If your project isn't there, make sure to give it a github link in
            the wakatime tab.
          </p>
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
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "15%" }} />
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
                Commit Time
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
                Project
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
                Type
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
            {commits.map((commit, index) => (
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
                  {commit.fields.message || "No message"}
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
                  {formatDatetime(commit.fields.commitTime)}
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
                  {commit.fields.hackatimeProject || "-"}
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
                  {calculateTotalDuration(commit)}
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
                    title={getStatusTooltip(commit.fields.Type)}
                    style={{ cursor: "help" }}
                  >
                    {commit.fields.Type || "-"}
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
                  {commit.fields.videoLink ? (
                    <button
                      onClick={() => {
                        const width = 1280;
                        const height = 720;
                        const left = (window.screen.width - width) / 2;
                        const top = (window.screen.height - height) / 2;
                        window.open(
                          commit.fields.videoLink,
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

      {/* Commit Message Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              width: "400px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <h3
              style={{
                margin: "0 0 8px 0",
                color: "#ef758a",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "20px" }}>✅</span>
              Finish Stretch
            </h3>
            <p
              style={{
                margin: "0 0 16px 0",
                color: "#666",
                fontSize: "14px",
              }}
            >
              You completed {formatTime(elapsedTime)} of work on {projectName}
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#333",
                  fontWeight: "500",
                  fontSize: "14px",
                }}
              >
                What did you accomplish?
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="I implemented the login functionality..."
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                  minHeight: "80px",
                  resize: "vertical",
                }}
              />
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#333",
                  fontWeight: "500",
                  fontSize: "14px",
                }}
              >
                Upload a video here:
              </label>
              <input
                type="file"
                onChange={(e) => setCommitVideo(e.target.files[0])}
                accept="video/*"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  // Reset everything back to initial state
                  setTime(0);
                  setElapsedTime(0);
                }}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  backgroundColor: "pink",
                  color: "black",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                CANCEL FOREVER
              </button>
              <button
                onClick={handleFinishStretch}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: "#ef758a",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                Save Stretch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StopwatchComponent;
