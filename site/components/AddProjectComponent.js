import { useState } from "react";
import { getToken } from "@/utils/storage"; // Add this import

const AddProjectComponent = ({
  onClose,
  isExiting,
  onProjectAdded,
  userData,
}) => {
  const [projectName, setProjectName] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate project name
    if (!projectName.trim()) {
      alert("Please enter a project name");
      return;
    }

    // Validate GitHub link if provided
    if (githubLink.trim()) {
      const pattern =
        /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
      if (!pattern.test(githubLink)) {
        alert("Please enter a valid GitHub link");
        return;
      }
    }

    // Get token using the same approach as StopwatchComponent
    const token = getToken();
    if (!token) {
      alert("You need to be logged in to create a project");
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
          token: token, // Use the token from storage
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
        // Show error message
        alert(`Error: ${data.message || "Failed to create project"}`);
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`pop-in ${isExiting ? "hidden" : ""}`}>
      <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
        <h3 style={{ color: "#ef758a", marginTop: 0 }}>Create a new project</h3>
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
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
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
              disabled={isSubmitting}
              style={{
                padding: "10px 16px",
                backgroundColor: "#ef758a",
                color: "#FFF",
                border: "none",
                borderRadius: 4,
                cursor: isSubmitting ? "default" : "pointer",
                fontWeight: "bold",
                opacity: isSubmitting ? 0.7 : 1,
                transition: "all 0.2s ease",
              }}
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectComponent;
