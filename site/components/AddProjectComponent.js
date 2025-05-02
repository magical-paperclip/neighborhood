import { useState } from "react";
import { getToken } from "@/utils/storage";

const AddProjectComponent = ({
  onClose,
  isExiting,
  onProjectAdded,
  userData,
}) => {
  const [projectName, setProjectName] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCheckingRepo, setIsCheckingRepo] = useState(false);

  const validateGithubUrl = (url) => {
    // Check if the URL matches a GitHub repository pattern
    const githubPattern = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/;
    return githubPattern.test(url);
  };

  const checkGithubRepo = async (url) => {
    setIsCheckingRepo(true);
    setErrorMessage("");

    try {
      // Extract owner and repo name from GitHub URL
      const urlParts = url.replace(/\/$/, "").split("/");
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1];

      // Call GitHub API to verify the repository exists and is accessible
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          setErrorMessage(
            "GitHub repository not found or is private. Please check the URL.",
          );
          return false;
        } else {
          setErrorMessage(
            "Could not verify GitHub repository. Please check the URL.",
          );
          return false;
        }
      }

      return true;
    } catch (error) {
      setErrorMessage(
        "Failed to validate GitHub repository. Please check your connection.",
      );
      return false;
    } finally {
      setIsCheckingRepo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    // Validate App Name
    if (!projectName.trim()) {
      setErrorMessage("Please enter an App Name");
      return;
    }

    // Validate GitHub link
    if (!githubLink.trim()) {
      setErrorMessage("GitHub link is required");
      return;
    }

    // Validate GitHub URL format
    if (!validateGithubUrl(githubLink)) {
      setErrorMessage(
        "Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)",
      );
      return;
    }

    // Check if the GitHub repository exists
    const isValidRepo = await checkGithubRepo(githubLink);
    if (!isValidRepo) {
      return;
    }

    // Get token
    const token = getToken();
    if (!token) {
      setErrorMessage("You need to be logged in to create a project");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/addProject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          projectName: projectName,
          githubLink: githubLink,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Extract project from the response
        const projectData = data.project.fields;

        // Create a project object with the structure expected by the parent component
        const newProject = {
          id: data.project.id,
          name: projectData.name,
          githubLink: projectData.githubLink || "",
          createdAt: data.project.createdTime,
        };

        onProjectAdded && onProjectAdded(newProject);
        onClose();
      } else {
        setErrorMessage(data.message || "Failed to create project");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setErrorMessage("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`pop-in ${isExiting ? "hidden" : ""}`}>
      <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
        <h3 style={{ color: "#ef758a", marginTop: 0 }}>Create a new project</h3>

        {errorMessage && (
          <div
            style={{
              color: "#e74c3c",
              backgroundColor: "#ffeaea",
              padding: "10px",
              borderRadius: "4px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                color: "#333",
              }}
            >
              App Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter App Name"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 4,
                border: "1px solid #ef758a",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                color: "#333",
              }}
            >
              GitHub Link (required)
            </label>
            <input
              type="text"
              value={githubLink}
              onChange={(e) => setGithubLink(e.target.value)}
              placeholder="https://github.com/username/repo"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 4,
                border: "1px solid #ef758a",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 16px",
                backgroundColor: "#f0f0f0",
                color: "#333",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: "bold",
                transition: "all 0.2s ease",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isCheckingRepo}
              style={{
                padding: "10px 16px",
                backgroundColor: "#ef758a",
                color: "#FFF",
                border: "none",
                borderRadius: 4,
                cursor: isSubmitting || isCheckingRepo ? "default" : "pointer",
                fontWeight: "bold",
                opacity: isSubmitting || isCheckingRepo ? 0.7 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {isCheckingRepo
                ? "Validating Repo..."
                : isSubmitting
                  ? "Creating..."
                  : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectComponent;
