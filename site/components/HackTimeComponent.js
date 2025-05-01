import React, { useState, useEffect } from "react";
import HackTimeSelectionShader from "./HackTimeSelectionShader";
import StopwatchComponent from "./StopwatchComponent";
import { getToken } from "@/utils/storage";
import Soundfont from "soundfont-player";
import AddProjectComponent from "./AddProjectComponent";

const BOARD_BAR_HEIGHT = 50;

const HackTimeComponent = ({ isExiting, onClose, userData }) => {
  const [timeTrackingMethod, setTimeTrackingMethod] = useState(""); // Default to stopwatch
  const [projects, setProjects] = useState([]);
  const [checkedProjects, setCheckedProjects] = useState([]); // Array of App Names that are checked
  const [openedProjects, setOpenedProjects] = useState([]);
  const [projectSessions, setProjectSessions] = useState({});
  const [selectedSessions, setSelectedSessions] = useState({});
  const [openedDays, setOpenedDays] = useState({});
  const [selectedDays, setSelectedDays] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null); // 'hackatime' | 'stopwatch' | null
  const [activeCard, setActiveCard] = useState(null);
  const [sessionStatuses, setSessionStatuses] = useState({}); // Track session statuses
  const [githubLinks, setGithubLinks] = useState({}); // Track GitHub links for projects
  const [showGithubInput, setShowGithubInput] = useState(false); // Track if GitHub input is shown
  const [currentProjectForGithub, setCurrentProjectForGithub] = useState(""); // Track which project is being linked
  const [commitData, setCommitData] = useState({}); // Store commit data for each project
  const [sessionCommitMatches, setSessionCommitMatches] = useState({}); // Store matches between sessions and commits
  const [isLoadingCommits, setIsLoadingCommits] = useState({}); // Track loading state per project
  const [commitFetchErrors, setCommitFetchErrors] = useState({}); // Track fetch errors per project
  const [piano, setPiano] = useState(null);
  const [playedMelodies, setPlayedMelodies] = useState(new Set());
  const [stopwatchView, setStopwatchView] = useState("stopwatch"); // Default to "stopwatch"
  const [isStopwatchExiting, setIsStopwatchExiting] = useState(false);

  // Add debounce helper at the top level of the component
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Add a ref to track ongoing requests
  const [isUpdatingCommits, setIsUpdatingCommits] = useState({});

  // Initialize piano sounds
  useEffect(() => {
    const ac = new AudioContext();
    Soundfont.instrument(ac, "acoustic_grand_piano").then((piano) => {
      setPiano(piano);
    });
  }, []);

  // Add sound effect functions
  const playProjectCheckSound = () => {
    if (piano) {
      // Play an upward arpeggio for checking
      const notes = ["C4", "E4", "G4", "C5"];
      const delays = [0, 50, 100, 150];
      notes.forEach((note, index) => {
        setTimeout(() => piano.play(note, 0, { gain: 0.3 }), delays[index]);
      });
    }
  };

  const playProjectUncheckSound = () => {
    if (piano) {
      // Play a downward arpeggio for unchecking
      const notes = ["C5", "G4", "E4", "C4"];
      const delays = [0, 50, 100, 150];
      notes.forEach((note, index) => {
        setTimeout(() => piano.play(note, 0, { gain: 0.3 }), delays[index]);
      });
    }
  };

  const playExpandSound = () => {
    if (piano) {
      // Play a gentle chord for expanding
      const notes = ["E4", "A4", "B4"];
      const delays = [0, 30, 60];
      notes.forEach((note, index) => {
        setTimeout(() => piano.play(note, 0, { gain: 0.2 }), delays[index]);
      });
    }
  };

  const playCollapseSound = () => {
    if (piano) {
      // Play a gentle descending chord for collapsing
      const notes = ["B4", "A4", "E4"];
      const delays = [0, 30, 60];
      notes.forEach((note, index) => {
        setTimeout(() => piano.play(note, 0, { gain: 0.2 }), delays[index]);
      });
    }
  };

  const playGitHubConnectSound = () => {
    if (piano) {
      // Play a magical ascending sequence for GitHub connection
      const notes = ["C4", "E4", "G4", "C5", "E5"];
      const delays = [0, 50, 100, 150, 200];
      notes.forEach((note, index) => {
        setTimeout(() => piano.play(note, 0, { gain: 0.3 }), delays[index]);
      });
    }
  };

  const fetchHackatimeData = async () => {
    try {
      console.log("Starting fetchHackatimeData");
      const token = getToken();
      if (!token) {
        console.error("No token found");
        return;
      }

      if (!userData?.slackId) {
        console.error("No Slack ID found in user data");
        return;
      }

      const response = await fetch(
        `/api/hackatime?userId=${userData.slackId}&token=${token}`,
      );
      if (!response.ok) {
        console.error(`API responded with status: ${response.status}`);
        return;
      }

      const data = await response.json();
      console.log("Hackatime API response:", data.data.projects);

      setProjects(data.data.projects || []);

      // Update checked projects from API response
      const checked = data.data.projects
        .filter((project) => project.isChecked)
        .map((project) => project.name);
      setCheckedProjects(checked);

      // Create a new object to hold all commit data
      const newCommitData = {};

      // Process projects with GitHub links
      for (const project of data.data.projects) {
        console.log(
          "Processing project:",
          project.name,
          "GitHub link:",
          project.githubLink,
        );
        if (project.githubLink) {
          console.log("Found GitHub link for project:", project.name);

          // Update GitHub links state
          setGithubLinks((prev) => ({
            ...prev,
            [project.name]: project.githubLink,
          }));

          // Set loading state
          setIsLoadingCommits((prev) => ({
            ...prev,
            [project.name]: true,
          }));

          try {
            const match = project.githubLink.match(
              /github\.com\/([^\/]+\/[^\/]+)/,
            );
            if (!match) {
              throw new Error("Invalid GitHub URL format");
            }
            const repoPath = match[1];
            console.log(
              "Fetching commits for:",
              project.name,
              "repo path:",
              repoPath,
            );

            const commits = await fetchGithubCommits(repoPath);
            console.log(
              "Fetched commits for:",
              project.name,
              "count:",
              commits.length,
            );

            // Store commits in our new object
            newCommitData[project.name] = commits;
          } catch (error) {
            console.error(`Error fetching commits for ${project.name}:`, error);
            setCommitFetchErrors((prev) => ({
              ...prev,
              [project.name]: error.message,
            }));
          } finally {
            setIsLoadingCommits((prev) => ({
              ...prev,
              [project.name]: false,
            }));
          }
        }
      }

      // Update commit data state once with all commits
      console.log("Setting all commit data:", newCommitData);
      setCommitData(newCommitData);

      // Fetch sessions for all projects
      const startDate = new Date(2025, 3, 30);
      const formattedDate = startDate.toISOString().split("T")[0];

      const projectSessionsPromises = data.data.projects.map(
        async (project) => {
          try {
            const response = await fetch(
              `/api/hackatime/sessions?userId=${userData.slackId}&startDate=${formattedDate}&project=${encodeURIComponent(project.name)}`,
            );
            const sessionData = await response.json();
            return { projectName: project.name, sessions: sessionData.spans };
          } catch (error) {
            console.error(
              `Error fetching sessions for project ${project.name}:`,
              error,
            );
            return { projectName: project.name, sessions: [] };
          }
        },
      );

      const projectSessionsResults = await Promise.all(projectSessionsPromises);
      const newProjectSessions = {};

      // Process each project's sessions
      for (const result of projectSessionsResults) {
        newProjectSessions[result.projectName] = result.sessions;

        // If project has commits, match sessions with commits immediately
        if (newCommitData[result.projectName] && result.sessions.length > 0) {
          console.log(
            `Matching sessions for ${result.projectName} on initial load`,
          );
          matchSessionsToCommits(
            result.sessions,
            newCommitData[result.projectName],
            result.projectName,
          );
        }
      }

      setProjectSessions(newProjectSessions);
    } catch (error) {
      console.error("Error in fetchHackatimeData:", error);
      setProjects([]); // Ensure projects is at least an empty array on error
    }
  };

  const fetchProjectSessions = async (projectName) => {
    try {
      // Get sessions starting from January 1st, 2025
      const startDate = new Date(2025, 0, 1); // Month is 0-indexed
      const formattedDate = startDate.toISOString().split("T")[0];

      if (!userData?.slackId) {
        console.error("No Slack ID found in user data");
        return;
      }

      const response = await fetch(
        `/api/hackatime/sessions?userId=${userData.slackId}&startDate=${formattedDate}&project=${encodeURIComponent(projectName)}`,
      );
      const data = await response.json();

      // Update project sessions
      setProjectSessions((prev) => ({
        ...prev,
        [projectName]: data.spans,
      }));

      // If project has commits, match sessions with commits immediately
      if (commitData[projectName]) {
        matchSessionsToCommits(
          data.spans,
          commitData[projectName],
          projectName,
        );
      }
    } catch (error) {
      console.error("Error fetching project sessions:", error);
    }
  };

  const toggleProject = async (projectName) => {
    const isOpening = !openedProjects.includes(projectName);

    if (isOpening) {
      playExpandSound();
    } else {
      playCollapseSound();
    }

    // Set opened state first
    setOpenedProjects((prev) =>
      prev.includes(projectName)
        ? prev.filter((name) => name !== projectName)
        : [...prev, projectName],
    );

    // Only fetch if opening and we don't have sessions yet
    if (isOpening) {
      if (!projectSessions[projectName]) {
        await fetchProjectSessions(projectName);
      }

      // If we have commits but haven't matched them yet, do the matching
      if (
        commitData[projectName] &&
        !sessionCommitMatches[projectName] &&
        projectSessions[projectName]
      ) {
        matchSessionsToCommits(
          projectSessions[projectName],
          commitData[projectName],
          projectName,
        );
      }
    }
  };

  // Add effect to maintain opened state when commits load
  useEffect(() => {
    // For each opened project
    openedProjects.forEach((projectName) => {
      // If we have new commits that haven't been matched yet
      if (
        commitData[projectName] &&
        !sessionCommitMatches[projectName] &&
        projectSessions[projectName]
      ) {
        matchSessionsToCommits(
          projectSessions[projectName],
          commitData[projectName],
          projectName,
        );
      }
    });
  }, [commitData, projectSessions]);

  // Helper to get all session times for a project
  const getAllSessionTimes = (projectName) =>
    (projectSessions[projectName] || []).map((session) => session.start_time);

  // Helper to get all session times for a commit group
  const getCommitSessionTimes = (commitGroup) =>
    commitGroup.sessions.map((s) => s.start_time);

  const handleCloseStopwatch = () => {
    setIsStopwatchExiting(true);
    setTimeout(() => {
      setStopwatchView("addProject");
      setIsStopwatchExiting(false);
    }, 300);
  };

  const handleCloseAddProject = () => {
    setIsStopwatchExiting(true);
    setTimeout(() => {
      setStopwatchView("stopwatch");
      setIsStopwatchExiting(false);
    }, 300);
  };

  const handleProjectAdded = (newProject) => {
    // Here you would update your projects state
    console.log("New project added:", newProject);
    // You may want to add this project to your projects array
    setProjects((prev) => [...prev, newProject]);
  };

  const handleProjectSelect = async (projectName) => {
    const token = getToken();
    if (!token) {
      console.error("No token found");
      return;
    }

    const isCurrentlyChecked = checkedProjects.includes(projectName);

    // Optimistically update UI
    if (!isCurrentlyChecked) {
      setCheckedProjects((prev) => [...prev, projectName]);
      playProjectCheckSound();
    } else {
      setCheckedProjects((prev) => prev.filter((name) => name !== projectName));
      playProjectUncheckSound();
    }

    try {
      if (!isCurrentlyChecked) {
        // Add project (background)
        const response = await fetch("/api/addProject", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            projectName,
            githubLink: githubLinks[projectName] || "",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to add project");
        }

        // If project has commits, update them in Airtable
        if (commitData[projectName]) {
          await updateCommitsInAirtable(projectName, commitData[projectName]);
        }

        // Update sessions in Airtable
        if (projectSessions[projectName]) {
          await updateSessionsInAirtable(
            projectName,
            projectSessions[projectName],
          );
        }
      } else {
        // Remove project (background)
        const response = await fetch("/api/removeProject", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            projectName,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to remove project");
        }
      }
    } catch (error) {
      // Revert UI change on error
      setCheckedProjects((prev) => {
        if (!isCurrentlyChecked) {
          // Tried to check, so remove
          return prev.filter((name) => name !== projectName);
        } else {
          // Tried to uncheck, so add back
          return [...prev, projectName];
        }
      });
      console.error("Error updating project:", error);
      // Optionally show a toast or alert here
      // Refresh data to ensure correct state
      fetchHackatimeData();
    }
  };

  const handleDaySelect = (projectName, dayKey) => {
    setSelectedDays((prev) => {
      const projectDays = prev[projectName] || [];
      const isSelected = projectDays.includes(dayKey);
      if (isSelected) {
        // Unselect day and all its sessions
        setSelectedSessions((sessionsPrev) => {
          const grouped = groupSessionsByCommit(
            projectSessions[projectName] || [],
            projectName,
          );
          const sessionTimes =
            grouped[dayKey]?.sessions.map((s) => s.start_time) || [];
          return {
            ...sessionsPrev,
            [projectName]: {
              ...sessionsPrev[projectName],
              sessions: sessionsPrev[projectName].sessions.filter(
                (time) => !sessionTimes.includes(time),
              ),
            },
          };
        });
        return {
          ...prev,
          [projectName]: projectDays.filter((day) => day !== dayKey),
        };
      } else {
        // Select day and all its sessions
        setSelectedSessions((sessionsPrev) => {
          const grouped = groupSessionsByCommit(
            projectSessions[projectName] || [],
            projectName,
          );
          const sessionTimes =
            grouped[dayKey]?.sessions.map((s) => s.start_time) || [];
          return {
            ...sessionsPrev,
            [projectName]: {
              ...sessionsPrev[projectName],
              sessions: Array.from(
                new Set([
                  ...sessionsPrev[projectName].sessions,
                  ...sessionTimes,
                ]),
              ),
            },
          };
        });
        return {
          ...prev,
          [projectName]: [...projectDays, dayKey],
        };
      }
    });
  };

  const handleSessionSelect = (projectName, dayKey, sessionStartTime) => {
    setSelectedSessions((prev) => {
      const projectSessionsArr = prev[projectName] || [];
      const isSelected = projectSessionsArr.includes(sessionStartTime);
      if (isSelected) {
        return {
          ...prev,
          [projectName]: projectSessionsArr.filter(
            (time) => time !== sessionStartTime,
          ),
        };
      } else {
        // When selecting a session, set its status to 'P' (Pending)
        setSessionStatuses((prev) => ({
          ...prev,
          [`${projectName}-${sessionStartTime}`]: "P",
        }));
        return {
          ...prev,
          [projectName]: [...projectSessionsArr, sessionStartTime],
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

    setOpenedDays((prev) => {
      const projectOpened = prev[projectName] || [];
      if (projectOpened.includes(commitSha)) {
        return {
          ...prev,
          [projectName]: projectOpened.filter((sha) => sha !== commitSha),
        };
      } else {
        return {
          ...prev,
          [projectName]: [...projectOpened, commitSha],
        };
      }
    });
  };

  const handleGithubLink = (projectName) => {
    setCurrentProjectForGithub(projectName);
    setShowGithubInput(true);
  };

  const matchSessionsToCommits = (sessions, commits, projectName) => {
    console.log("\n=== Starting Session-Commit Matching ===");
    console.log(`Project: ${projectName}`);
    console.log(`Sessions: ${sessions.length}`);
    console.log(`Commits: ${commits.length}`);

    // Sort commits by date ascending
    const sortedCommits = [...commits].sort((a, b) => a.date - b.date);

    // Log first and last commit dates
    if (sortedCommits.length > 0) {
      console.log("\nCommit Range:");
      console.log(
        "First commit:",
        new Date(sortedCommits[0].date).toISOString(),
      );
      console.log(
        "Last commit:",
        new Date(sortedCommits[sortedCommits.length - 1].date).toISOString(),
      );
    }

    // Log first few sessions
    console.log("\nFirst few sessions:");
    sessions.slice(0, 3).forEach((session) => {
      const startTime = new Date(session.start_time * 1000).toISOString();
      const endTime = new Date(
        (session.start_time + session.duration) * 1000,
      ).toISOString();
      console.log(
        `Session: Start=${startTime}, End=${endTime}, Duration=${session.duration}s`,
      );
    });

    // For each session, find the earliest commit after the session ends
    const matches = {};
    let matchCount = 0;
    let unmatchedCount = 0;

    sessions.forEach((session, index) => {
      // Convert session time to milliseconds and add duration
      const sessionEnd = (session.start_time + session.duration) * 1000;

      // Find the first commit after sessionEnd using binary search
      let left = 0;
      let right = sortedCommits.length - 1;
      let matchingCommit = null;

      // Log every 100th session for progress tracking
      if (index % 100 === 0) {
        console.log(`\nProcessing session ${index + 1}/${sessions.length}`);
        console.log(`Session end time: ${new Date(sessionEnd).toISOString()}`);
      }

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const commit = sortedCommits[mid];

        if (index % 100 === 0) {
          console.log(
            `Comparing with commit at ${new Date(commit.date).toISOString()}`,
          );
        }

        if (commit.date >= sessionEnd) {
          matchingCommit = commit;
          right = mid - 1; // Look for an earlier matching commit
        } else {
          left = mid + 1;
        }
      }

      if (matchingCommit) {
        matches[session.start_time] = matchingCommit;
        matchCount++;

        if (index % 100 === 0) {
          console.log(`Match found! Commit: ${matchingCommit.message}`);
          console.log(
            `Commit time: ${new Date(matchingCommit.date).toISOString()}`,
          );
        }
      } else {
        unmatchedCount++;
        if (index % 100 === 0) {
          console.log("No matching commit found");
        }
      }
    });

    console.log("\n=== Matching Summary ===");
    console.log(`Total sessions: ${sessions.length}`);
    console.log(`Matched sessions: ${matchCount}`);
    console.log(`Unmatched sessions: ${unmatchedCount}`);

    setSessionCommitMatches((prev) => ({
      ...prev,
      [projectName]: matches,
    }));
  };

  const fetchGithubCommits = async (repoPath) => {
    try {
      console.log(`Starting to fetch commits for ${repoPath}...`);

      // Clean up the repo path - handle both URL and owner/repo format
      let cleanRepoPath = repoPath;
      if (repoPath.includes("github.com")) {
        // Handle full URLs with optional .git extension
        cleanRepoPath = repoPath
          .replace(/https?:\/\/github\.com\//, "")
          .replace(/\.git$/, "")
          .replace(/\/$/, ""); // Remove trailing slash
      }

      // Remove any extra segments after owner/repo
      cleanRepoPath = cleanRepoPath.split("/").slice(0, 2).join("/");

      console.log(`Cleaned repo path: ${cleanRepoPath}`);

      if (!cleanRepoPath.includes("/")) {
        throw new Error("Invalid repository format. Expected owner/repo");
      }

      let allCommits = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const url = `https://api.github.com/repos/${cleanRepoPath}/commits?per_page=100&page=${page}`;
        console.log(`Fetching page ${page} from: ${url}`);

        const response = await fetch(url, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: "Bearer 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",
          },
        });

        if (response.status === 404) {
          console.log(
            "Repository not found. Please check the URL and ensure the repository is public.",
          );
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error("GitHub API Error:", errorData);
        }

        const commits = await response.json();
        console.log(`Fetched ${commits.length} commits on page ${page}`);

        // Filter out merge commits and add to all commits
        const filteredCommits = commits
          .filter(
            (commit) => !commit.commit.message.toLowerCase().includes("merge"),
          )
          .map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message,
            date: new Date(commit.commit.author.date).getTime(),
            url: commit.html_url,
          }));

        allCommits = [...allCommits, ...filteredCommits];

        // Check if we've reached the end
        hasMore = commits.length === 100;
        page++;
      }

      console.log(`Total commits fetched and filtered: ${allCommits.length}`);
      return allCommits;
    } catch (error) {
      console.error("Error in fetchGithubCommits:", error);
      // Include the error message in the commit fetch errors
      setCommitFetchErrors((prev) => ({
        ...prev,
        [repoPath]: error.message,
      }));
      return [];
    }
  };

  const handleGithubInputSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.elements.githubLink;
    const githubLink = input.value.trim();

    if (githubLink) {
      // Extract repo path from various GitHub URL formats
      const urlMatch = githubLink.match(
        /github\.com[\/:]([^\/]+\/[^\/]+?)(?:\.git|\/?$)/,
      );
      const directMatch = githubLink.match(/^([^\/]+\/[^\/]+?)(?:\.git|\/?$)/);

      const repoPath = urlMatch
        ? urlMatch[1]
        : directMatch
          ? directMatch[1]
          : null;

      if (!repoPath) {
        setCommitFetchErrors((prev) => ({
          ...prev,
          [currentProjectForGithub]:
            "Invalid GitHub URL format. Please use owner/repo or full GitHub URL.",
        }));
        return;
      }

      const normalizedGithubLink = `https://github.com/${repoPath}`;

      // Update local state immediately
      setGithubLinks((prev) => ({
        ...prev,
        [currentProjectForGithub]: normalizedGithubLink,
      }));

      // Set loading state
      setIsLoadingCommits((prev) => ({
        ...prev,
        [currentProjectForGithub]: true,
      }));

      try {
        // Update GitHub link in Airtable
        const token = getToken();
        if (!token) {
          throw new Error("No token found");
        }

        const updateResponse = await fetch("/api/updateProjectGithub", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            projectName: currentProjectForGithub,
            githubLink: normalizedGithubLink,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to update GitHub link");
        }

        // Play success sound
        playGitHubConnectSound();

        // Fetch commits for this repository
        const commits = await fetchGithubCommits(repoPath);
        console.log("Fetched commits:", commits.length);

        // Update commit data in state
        setCommitData((prev) => {
          const newState = {
            ...prev,
            [currentProjectForGithub]: commits,
          };
          console.log("Updated commit data:", newState);
          return newState;
        });

        // Match sessions with commits if we have sessions for this project
        if (projectSessions[currentProjectForGithub]) {
          matchSessionsToCommits(
            projectSessions[currentProjectForGithub],
            commits,
            currentProjectForGithub,
          );
        }
      } catch (error) {
        console.error("Error updating GitHub link:", error);
        setCommitFetchErrors((prev) => ({
          ...prev,
          [currentProjectForGithub]: error.message,
        }));

        // Revert local state on error
        setGithubLinks((prev) => {
          const newState = { ...prev };
          delete newState[currentProjectForGithub];
          return newState;
        });
      } finally {
        // Clear loading state
        setIsLoadingCommits((prev) => ({
          ...prev,
          [currentProjectForGithub]: false,
        }));
      }
    }

    setShowGithubInput(false);
    setCurrentProjectForGithub("");
  };

  useEffect(() => {
    console.log("Component mounted, fetching data...");
    fetchHackatimeData();
  }, []);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const verifyTimeTotals = (sessions, groupedCommits, projectName) => {
    // Calculate total time from all sessions
    const totalSessionTime = sessions.reduce(
      (sum, session) => sum + session.duration,
      0,
    );

    // Calculate total time from all commit groups
    const totalCommitTime = Object.values(groupedCommits).reduce(
      (sum, group) => {
        return (
          sum +
          group.sessions.reduce(
            (groupSum, session) => groupSum + session.duration,
            0,
          )
        );
      },
      0,
    );

    // Log the totals
    console.log(`\nTime Verification for ${projectName}:`);
    console.log(`Total Session Time: ${formatDuration(totalSessionTime)}`);
    console.log(`Total Commit Time: ${formatDuration(totalCommitTime)}`);
    console.log(
      `Difference: ${formatDuration(Math.abs(totalSessionTime - totalCommitTime))}`,
    );

    // Log individual commit totals
    console.log("\nIndividual Commit Totals:");
    Object.entries(groupedCommits).forEach(([sha, group]) => {
      const commitTime = group.sessions.reduce(
        (sum, session) => sum + session.duration,
        0,
      );
      let label;
      if (sha === "uncommitted") {
        label = "Uncommitted Time";
      } else if (sha === "unmatched") {
        label = "Unmatched Sessions";
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
      .filter((commit) => commit && commit.date)
      .map((commit) => commit.date);
    const mostRecentCommitDate =
      commitDates.length > 0 ? Math.max(...commitDates) : null;

    // Initialize groups
    grouped["uncommitted"] = {
      commit: null,
      sessions: [],
      isUncommitted: true,
    };

    // Group sessions by their commit SHA
    sessions.forEach((session) => {
      const commit = matches[session.start_time];
      const sessionDate = session.start_time * 1000;

      if (commit) {
        if (!grouped[commit.sha]) {
          grouped[commit.sha] = {
            commit,
            sessions: [],
          };
        }
        grouped[commit.sha].sessions.push(session);
      } else if (mostRecentCommitDate && sessionDate > mostRecentCommitDate) {
        // Add to uncommitted sessions
        grouped["uncommitted"].sessions.push(session);
      } else {
        // Group unmatched sessions
        if (!grouped["unmatched"]) {
          grouped["unmatched"] = {
            commit: null,
            sessions: [],
          };
        }
        grouped["unmatched"].sessions.push(session);
      }
    });

    // Sort entries by date
    const sortedEntries = Object.entries(grouped).sort((a, b) => {
      // Put uncommitted at the top
      if (a[0] === "uncommitted") return -1;
      if (b[0] === "uncommitted") return 1;

      // Put unmatched at the bottom
      if (a[0] === "unmatched") return 1;
      if (b[0] === "unmatched") return -1;

      // Sort by commit date, newest first
      const dateA = a[1].commit?.date || 0;
      const dateB = b[1].commit?.date || 0;
      return dateB - dateA;
    });

    // Convert back to object while maintaining order
    const sortedGrouped = Object.fromEntries(sortedEntries);

    // Log grouping results
    console.log("Grouping results for", projectName, ":", {
      totalSessions: sessions.length,
      uncommittedCount: sortedGrouped["uncommitted"]?.sessions.length || 0,
      unmatchedCount: sortedGrouped["unmatched"]?.sessions.length || 0,
      commitGroups: Object.keys(sortedGrouped).length - 2, // Subtract uncommitted and unmatched
    });

    return sortedGrouped;
  };

  // Commit-level select/deselect all
  const handleCommitSelect = (projectName, commitSha, commitGroup) => {
    const commitSessionTimes = getCommitSessionTimes(commitGroup);
    const selectedSet = new Set(selectedSessions[projectName] || []);
    const allSelected =
      commitSessionTimes.length > 0 &&
      commitSessionTimes.every((time) => selectedSet.has(time));

    if (allSelected) {
      // Deselect all sessions in this commit
      const newSelected = [...selectedSet].filter(
        (time) => !commitSessionTimes.includes(time),
      );
      setSelectedSessions((prev) => ({
        ...prev,
        [projectName]: newSelected,
      }));
    } else {
      // Select all sessions in this commit (add, but no duplicates)
      const newSelected = Array.from(
        new Set([...selectedSet, ...commitSessionTimes]),
      );
      setSelectedSessions((prev) => ({
        ...prev,
        [projectName]: newSelected,
      }));
    }
  };

  // Checkbox checked logic
  const isProjectChecked = (projectName) => {
    return checkedProjects.includes(projectName);
  };

  const isCommitChecked = (projectName, commitGroup) => {
    const commitSessionTimes = getCommitSessionTimes(commitGroup);
    const selectedSet = new Set(selectedSessions[projectName] || []);
    return (
      commitSessionTimes.length > 0 &&
      commitSessionTimes.every((time) => selectedSet.has(time))
    );
  };

  const playSessionMelody = (sessions, commitSha) => {
    if (!piano || playedMelodies.has(commitSha)) return;

    // Convert session duration to musical notes
    // We'll use a pentatonic scale for a pleasant sound
    const pentatonicScale = ["C4", "D4", "E4", "G4", "A4"];

    // Sort sessions by start time to create a chronological melody
    const sortedSessions = [...sessions].sort(
      (a, b) => a.start_time - b.start_time,
    );

    // Play each session's note with a delay
    sortedSessions.forEach((session, index) => {
      // Use session duration to determine note length
      const duration = Math.min(session.duration, 60); // Cap at 60 seconds
      const noteLength = Math.max(0.2, duration / 60); // Convert to seconds, min 0.2s

      // Select note from pentatonic scale based on session index
      const noteIndex = index % pentatonicScale.length;
      const note = pentatonicScale[noteIndex];

      // Add slight delay between notes
      setTimeout(() => {
        piano.play(note, 0, {
          gain: 0.3,
          duration: noteLength,
        });
      }, index * 300); // 300ms between notes
    });

    // Mark this melody as played
    setPlayedMelodies((prev) => new Set([...prev, commitSha]));
  };

  // Modify the renderCommitGroup function to play melody when sessions are shown
  const renderCommitGroup = (projectName, commitGroup) => {
    const { commit, sessions, isUncommitted } = commitGroup;
    const totalDuration = getTotalDuration(sessions);
    const isUnmatched = !commit && !isUncommitted;
    const commitSha =
      commit?.sha || (isUncommitted ? "uncommitted" : "unmatched");

    return (
      <div key={commitSha}>
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}
        >
          <div style={{ marginRight: "12px" }}>
            <input
              type="checkbox"
              checked={true}
              disabled={true}
              style={{ opacity: 0.7 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            {isUncommitted ? (
              <span
                style={{
                  fontWeight: 500,
                  color: "#ef758a",
                }}
              >
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
                  color: "#ef758a",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {commit.message}
              </a>
            )}
            <span style={{ color: "#888", marginLeft: 8 }}>
              ({formatDuration(totalDuration)})
            </span>
          </div>
          <div>
            <button
              onClick={() => {
                toggleDayDropdown(projectName, commitSha);
                // Play melody when expanding
                if (!openedDays[projectName]?.includes(commitSha)) {
                  playSessionMelody(sessions, commitSha);
                }
              }}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "white",
                cursor: "pointer",
                transform: openedDays[projectName]?.includes(commitSha)
                  ? "rotate(180deg)"
                  : "none",
              }}
            >
              ▼
            </button>
          </div>
        </div>
        {openedDays[projectName]?.includes(commitSha) && (
          <div style={{ paddingLeft: "24px", marginBottom: "4px" }}>
            {sessions
              .slice()
              .sort((a, b) => b.start_time - a.start_time)
              .map((session) => renderSessionWithCommit(session, projectName))}
          </div>
        )}
      </div>
    );
  };

  // Get total duration for a group of sessions
  const getTotalDuration = (sessions) => {
    return sessions.reduce((sum, s) => sum + s.duration, 0);
  };

  // Calculate total pending time from checked projects
  const calculatePendingTime = () => {
    let totalSeconds = 0;

    // Loop through all checked projects
    checkedProjects.forEach((projectName) => {
      // Get all sessions for this project
      const projectSessionsList = projectSessions[projectName] || [];

      // Sum up all session durations for this project
      const projectSeconds = projectSessionsList.reduce((sum, session) => {
        return sum + session.duration;
      }, 0);

      totalSeconds += projectSeconds;
    });

    // Convert to hours with 2 decimal places
    return (totalSeconds / 3600).toFixed(2);
  };

  // Update the session display to show commit information
  const renderSessionWithCommit = (session, projectName) => {
    const commit = sessionCommitMatches[projectName]?.[session.start_time];
    const isLoading = isLoadingCommits[projectName];
    const error = commitFetchErrors[projectName];
    const isProjectChecked = checkedProjects.includes(projectName);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div style={{ marginRight: "12px" }}>
          <input
            type="checkbox"
            checked={true}
            disabled={true}
            style={{ opacity: 0.7 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "#666",
            flex: 1,
            overflow: "hidden",
          }}
        >
          <span>
            {formatDate(session.start_time)} -{" "}
            {formatDuration(session.duration)}
          </span>
          <span
            style={{
              marginLeft: "8px",
              color: "#ef758a",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            {sessionStatuses[`${projectName}-${session.start_time}`] || "-"}
          </span>
          {isLoading ? (
            <span style={{ color: "#999", fontSize: "12px" }}>
              (Loading commits...)
            </span>
          ) : error ? (
            <span style={{ color: "#ff4444", fontSize: "12px" }}>
              (Error: {error})
            </span>
          ) : commit ? (
            <span
              style={{
                color: "#ef758a",
                textDecoration: "none",
                fontSize: "12px",
                opacity: 0.9,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginLeft: "4px",
              }}
            >
              <a
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "inherit",
                  textDecoration: "none",
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

  // Modify the updateCommitsInAirtable function to use debouncing and prevent duplicate requests
  const updateCommitsInAirtable = debounce(async (projectName, commits) => {
    // Check if already updating this project
    if (isUpdatingCommits[projectName]) {
      console.log("Already updating commits for:", projectName);
      return;
    }

    const token = getToken();
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      setIsUpdatingCommits((prev) => ({ ...prev, [projectName]: true }));

      console.log("Updating commits for project:", projectName);
      // const response = await fetch('/api/updateCommits', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     token,
      //     projectName,
      //     commits: commits.map(commit => ({
      //       ...commit,
      //       sha: commit.sha.trim() // Ensure no whitespace in SHA
      //     }))
      //   })
      // });

      // if (!response.ok) {
      //   throw new Error('Failed to update commits');
      // }

      // const result = await response.json();
      console.log("Commits update skipped");
    } catch (error) {
      console.error("Error updating commits:", error);
    } finally {
      setIsUpdatingCommits((prev) => ({ ...prev, [projectName]: false }));
    }
  }, 1000);

  // Add updateSessionsInAirtable function
  const updateSessionsInAirtable = debounce(async (projectName, sessions) => {
    // Check if already updating this project
    if (isUpdatingCommits[projectName]) {
      console.log("Already updating sessions for:", projectName);
      return;
    }

    const token = getToken();
    if (!token) {
      console.error("No token found");
      return;
    }

    try {
      setIsUpdatingCommits((prev) => ({ ...prev, [projectName]: true }));

      console.log("Updating sessions for project:", projectName);
      // const response = await fetch('/api/updateSessions', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     token,
      //     projectName,
      //     sessions,
      //     sessionCommitMatches: sessionCommitMatches[projectName] || {}
      //   })
      // });

      // if (!response.ok) {
      //   throw new Error('Failed to update sessions');
      // }

      // const result = await response.json();
      console.log("Sessions update skipped");
    } catch (error) {
      console.error("Error updating sessions:", error);
    } finally {
      setIsUpdatingCommits((prev) => ({ ...prev, [projectName]: false }));
    }
  }, 1000);

  return (
    <div
      className={`pop-in ${isExiting ? "hidden" : ""}`}
      style={{
        position: "absolute",
        zIndex: 2,
        width: "calc(100% - 16px)",
        height: "calc(100% - 16px)",
        borderRadius: 25,
        marginLeft: 8,
        marginTop: 8,
        backgroundColor: "#ffffff",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgba(239, 117, 138, 0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 20px",
          borderBottom: "2px solid #ef758a",
          backgroundColor: "#febdc3",
          flexShrink: 0,
          height: BOARD_BAR_HEIGHT,
          minHeight: BOARD_BAR_HEIGHT,
          maxHeight: BOARD_BAR_HEIGHT,
        }}
      >
        <div
          onClick={onClose}
          style={{
            width: 16,
            cursor: "pointer",
            height: 16,
            borderRadius: "50%",
            backgroundColor: "#FF5F56",
            border: "2px solid #E64940",
            transition: "transform 0.2s",
            ":hover": {
              transform: "scale(1.1)",
            },
          }}
        />
        <p
          style={{
            fontSize: 22,
            color: "#ef758a",
            margin: 0,
            fontFamily: "M PLUS Rounded 1c",
            fontWeight: "bold",
          }}
        >
          Hack Time
        </p>
        <div style={{ width: 16, height: 16 }} />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#febdc3", // pastel pink background
        }}
      >
        {timeTrackingMethod == "" && (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <audio
              autoPlay
              src="/ChoiceToMake.mp3"
              style={{ display: "none" }}
            />
            <div
              style={{
                color: "#000",
                zIndex: 2,
                paddingLeft: "4%",
                paddingRight: "4%",
                height: "100%",
                position: "absolute",
                display: "flex",
                width: "100%",
                height: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: "4%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  backgroundColor: "#fff9e5", // pastel cream card
                  flexDirection: "column",
                  border: "2px solid #ef758a", // pink accent
                  aspectRatio: 0.8333333,
                  width: "50%",
                  padding: 32,
                  alignItems: "center",
                  gap: 12,
                  maxHeight: "500px",
                  maxWidth: "400px",
                  borderRadius: "16px",
                  boxShadow:
                    hoveredCard === "hackatime"
                      ? "8px 12px 32px 0px rgba(239,117,138,0.18), 0 2px 8px rgba(0,0,0,0.04)"
                      : "0 10px 20px rgba(239,117,138,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                  transition:
                    "transform 0.15s cubic-bezier(.4,2,.6,1), box-shadow 0.15s cubic-bezier(.4,2,.6,1), outline 0.2s, opacity 0.15s cubic-bezier(.4,2,.6,1)",
                  cursor: "pointer",
                  outline: "none",
                  opacity:
                    hoveredCard === "stopwatch" || activeCard === "stopwatch"
                      ? 0.95
                      : 1,
                  transform:
                    activeCard === "hackatime"
                      ? "translateY(4px) scale(0.97) rotate(-2deg)"
                      : hoveredCard === "hackatime"
                        ? "translate(8px, -8px) scale(1.04) rotate(-2deg)"
                        : hoveredCard === "stopwatch" ||
                            activeCard === "stopwatch"
                          ? "scale(0.96)"
                          : "none",
                }}
                onMouseEnter={() => setHoveredCard("hackatime")}
                onMouseLeave={() => {
                  setHoveredCard(null);
                  setActiveCard(null);
                }}
                onMouseDown={() => setActiveCard("hackatime")}
                onMouseUp={() => setActiveCard(null)}
                onClick={() => {
                  const audio = new Audio("/hackatimeTapped.wav");
                  audio.play();
                  setTimeTrackingMethod("hackatime");
                }}
              >
                {hoveredCard === "hackatime" && (
                  <audio
                    src="/Hackatime.mp3"
                    autoPlay
                    style={{ display: "none" }}
                  />
                )}
                <img
                  src="/tick.png"
                  alt="Hackatime icon"
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: 8,
                    border: "1px solid #ef758a",
                    boxShadow: "0 4px 8px rgba(239,117,138,0.10)",
                    background: "#fff",
                    marginBottom: 8,
                    objectFit: "contain",
                    padding: 8,
                  }}
                />
                <p
                  style={{
                    fontWeight: "bold",
                    fontSize: "1.2em",
                    color: "#ef758a",
                    textShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  Hackatime (powerful)
                </p>
                <p style={{ color: "#786951", fontSize: 19 }}>
                  Hackatime is a time-logging tool that latches onto into your
                  IDE and automatically feeds on time as you code.{" "}
                  <b>Recommended for every serious hacker.</b>
                </p>
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
                  alignItems: "center",
                  gap: 12,
                  maxHeight: "500px",
                  maxWidth: "400px",
                  borderRadius: "16px",
                  boxShadow:
                    hoveredCard === "stopwatch"
                      ? "8px 12px 32px 0px rgba(247,211,89,0.18), 0 2px 8px rgba(0,0,0,0.04)"
                      : "0 10px 20px rgba(247,211,89,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                  transition:
                    "transform 0.15s cubic-bezier(.4,2,.6,1), box-shadow 0.15s cubic-bezier(.4,2,.6,1), outline 0.2s, opacity 0.15s cubic-bezier(.4,2,.6,1)",
                  cursor: "pointer",
                  outline: "none",
                  opacity:
                    hoveredCard === "hackatime" || activeCard === "hackatime"
                      ? 0.95
                      : 1,
                  transform:
                    activeCard === "stopwatch"
                      ? "translateY(4px) scale(0.97) rotate(2deg)"
                      : hoveredCard === "stopwatch"
                        ? "translate(8px, -8px) scale(1.04) rotate(2deg)"
                        : hoveredCard === "hackatime" ||
                            activeCard === "hackatime"
                          ? "scale(0.96)"
                          : "none",
                }}
                onMouseEnter={() => setHoveredCard("stopwatch")}
                onMouseLeave={() => {
                  setHoveredCard(null);
                  setActiveCard(null);
                }}
                onMouseDown={() => setActiveCard("stopwatch")}
                onMouseUp={() => setActiveCard(null)}
                onClick={() => {
                  const audio = new Audio("/stopwatchTapped.wav");
                  audio.play();
                  setTimeTrackingMethod("stopwatch");
                }}
              >
                {hoveredCard === "stopwatch" && (
                  <audio
                    src="/Stopwatch.mp3"
                    autoPlay
                    style={{ display: "none" }}
                  />
                )}
                <img
                  src="/ladybug.png"
                  alt="Stopwatch icon"
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: 8,
                    border: "1px solid #f7d359",
                    background: "#fff",
                    marginBottom: 8,
                    objectFit: "contain",
                    padding: 8,
                  }}
                />
                <p
                  style={{
                    fontWeight: "bold",
                    fontSize: "1.2em",
                    color: "#786A50",
                    textShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                >
                  Stopwatch (casual)
                </p>
                <p style={{ color: "#786951", fontSize: 19 }}>
                  Simply click start, start doing whatever design or code for
                  your project, and then press stop to end the ticking.{" "}
                  <b>Warning 20hr max </b>
                </p>
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                zIndex: 1,
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                overflow: "hidden",
              }}
            >
              <HackTimeSelectionShader />
            </div>
            {timeTrackingMethod === "" && (
              <audio
                autoPlay
                loop
                src="/portalEntry.mp3"
                style={{ display: "none" }}
              />
            )}
          </div>
        )}
        {timeTrackingMethod == "hackatime" && (
          <div style={{ color: "#000", padding: 16 }}>
            {projects.length > 0 ? (
              <>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "24px",
                    padding: "12px",
                    alignItems: "flex-start",
                    width: "100%",
                    justifyContent: "space-between",
                    marginBottom: "24px",
                  }}
                >
                  {[
                    {
                      name: "PENDING TIME",
                      value: `${calculatePendingTime()} hr`,
                    },
                    { name: "SHIPPED TIME", value: "0.00 hr" },
                    { name: "APPROVED TIME", value: "0.00 hr" },
                  ].map((category, index) => (
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

                <div
                  style={{
                    height: "1px",
                    backgroundColor: "#00000010",
                    margin: "16px 0",
                  }}
                />
                <p style={{ marginLeft: 0 }}>
                  check the projects or sessions you'd like to be attributed to
                  neighborhood.
                </p>

                {projects
                  .filter((project) =>
                    getTotalDuration(projectSessions[project.name] || []) > 0
                  )
                  .map((project) => {
                    const projectChecked = isProjectChecked(project.name);
                    const hasCommits = commitData[project.name]?.length > 0;
                    const grouped = groupSessionsByCommit(
                      projectSessions[project.name] || [],
                      project.name,
                    );
                    const projectTotal = getTotalDuration(
                      projectSessions[project.name] || [],
                    );

                    return (
                      <div key={project.name}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "8px",
                            width: "100%",
                            position: "relative",
                          }}
                        >
                          <div style={{ marginRight: "12px" }}>
                            <input
                              type="checkbox"
                              checked={projectChecked}
                              onChange={() => handleProjectSelect(project.name)}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                margin: 0,
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span>{project.name}</span>
                              {projectTotal > 0 ? (
                                <span style={{ color: "#666" }}>
                                  ({formatDuration(projectTotal)})
                                </span>
                              ) : null}
                              {githubLinks[project.name] ? (
                                <span
                                  style={{
                                    fontSize: "12px",
                                    color: "#666",
                                    opacity: 0.8,
                                  }}
                                >
                                  (
                                  {githubLinks[project.name].replace(
                                    /https?:\/\/github\.com\//,
                                    "",
                                  )}
                                  )
                                </span>
                              ) : projectChecked ? (
                                <span
                                  onClick={() => handleGithubLink(project.name)}
                                  style={{
                                    color: "#ef758a",
                                    background: "#ffeef0",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    border: "1px solid #ffd1d6",
                                  }}
                                >
                                  <span style={{ fontSize: "14px" }}>⚠️</span>
                                  Connect GitHub Required
                                </span>
                              ) : null}
                            </p>
                            {projectChecked && !githubLinks[project.name] && (
                              <p
                                style={{
                                  margin: "4px 0 0 0",
                                  fontSize: "12px",
                                  color: "#666",
                                  fontStyle: "italic",
                                }}
                              >
                                Connect GitHub to track time against commits
                              </p>
                            )}
                          </div>
                          {hasCommits && (
                            <div>
                              <button
                                onClick={() => toggleProject(project.name)}
                                style={{
                                  padding: "4px 8px",
                                  border: "1px solid #ccc",
                                  borderRadius: "4px",
                                  backgroundColor: "white",
                                  cursor: "pointer",
                                  transform: openedProjects.includes(project.name)
                                    ? "rotate(180deg)"
                                    : "none",
                                }}
                              >
                                ▼
                              </button>
                            </div>
                          )}
                        </div>
                        {openedProjects.includes(project.name) && hasCommits && (
                          <div
                            style={{ paddingLeft: "24px", marginBottom: "8px" }}
                          >
                            {Object.entries(grouped).map(
                              ([commitSha, commitGroup]) =>
                                renderCommitGroup(project.name, commitGroup),
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "32px",
                  gap: "16px",
                }}
              >
                <img
                  src="/tick.png"
                  alt="Hackatime"
                  style={{
                    width: 64,
                    height: 64,
                    marginBottom: 16,
                  }}
                />
                <p
                  style={{
                    fontSize: "20px",
                    color: "#333",
                    maxWidth: "500px",
                    lineHeight: 1.5,
                  }}
                >
                  Hey, there <br />
                  <br />
                  It appears this is your first time using Hackatime and you
                  have no projects set up yet. Head on over to{" "}
                  <a
                    href="http://hackatime.hackclub.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#ef758a",
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                  >
                    hackatime.hackclub.com
                  </a>{" "}
                  and they'll walk you through how to begin logging your time in
                  Hackatime directly in your IDE automagically.
                  <br />
                  <br /> Once you log some time if you come back here you'll see
                  your time in the interface and you can claim it.
                  <br />
                  Make sure to signup with the same email you used for
                  Neighborhood :)
                  <br />
                  <br />
                  If you get confused, pls send me an email thomas@hackclub.com
                  and I'd be happy to help you get it working.
                </p>
              </div>
            )}
          </div>
        )}
        {timeTrackingMethod == "stopwatch" && (
          <div style={{ color: "#000", height: "100%" }}>
            {stopwatchView === "stopwatch" && (
              <StopwatchComponent
                isExiting={isStopwatchExiting}
                onClose={handleCloseStopwatch}
                userData={userData}
              />
            )}
            {stopwatchView === "addProject" && (
              <AddProjectComponent
                isExiting={isStopwatchExiting}
                onClose={handleCloseAddProject}
                onProjectAdded={handleProjectAdded}
                userData
              />
            )}
          </div>
        )}
      </div>
      {showGithubInput && (
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
              <span style={{ fontSize: "20px" }}>🔗</span>
              Connect GitHub Repository
            </h3>
            <p
              style={{
                margin: "0 0 16px 0",
                color: "#666",
                fontSize: "14px",
              }}
            >
              Required to track time against commits
            </p>
            <form onSubmit={handleGithubInputSubmit}>
              <input
                type="text"
                name="githubLink"
                placeholder="https://github.com/username/repo"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  marginBottom: "16px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowGithubInput(false)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    backgroundColor: "pink",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
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
                  Connect Repository
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
