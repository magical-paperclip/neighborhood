const SessionSubmissionModal = ({ isOpen, onClose, onSubmit, projectName }) => {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const simulateUpload = () => {
    setIsUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        onSubmit({
          message,
          videoUrl: videoFile ? URL.createObjectURL(videoFile) : null,
        });
      }
    }, 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!message.trim()) {
      alert("Please enter a commit message");
      return;
    }

    if (videoFile) {
      simulateUpload();
    } else {
      onSubmit({ message, videoUrl: null });
    }
  };

  if (!isOpen) return null;

  return (
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
          width: "500px",
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
          <span style={{ fontSize: "20px" }}>⏱️</span>
          Submit Session for {projectName}
        </h3>
        <p
          style={{
            margin: "0 0 16px 0",
            color: "#666",
            fontSize: "14px",
          }}
        >
          Please describe what you worked on during this session
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Commit Message (required)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what you accomplished during this session"
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
                minHeight: "80px",
              }}
              required
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
              }}
            >
              Video Evidence (optional)
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                style={{
                  padding: "8px 16px",
                  backgroundColor: videoFile ? "#e0f7fa" : "#f0f0f0",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                }}
              >
                <span style={{ fontSize: "16px" }}>📹</span>
                {videoFile ? "Change Video" : "Upload Video"}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleVideoSelect}
                style={{ display: "none" }}
                accept="video/*"
              />
              {videoFile && (
                <span style={{ fontSize: "14px", color: "#666" }}>
                  {videoFile.name}
                </span>
              )}
            </div>
            {isUploading && (
              <div style={{ marginTop: "8px" }}>
                <div
                  style={{
                    height: "6px",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "3px",
                    overflow: "hidden",
                    marginBottom: "4px",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${uploadProgress}%`,
                      backgroundColor: "#ef758a",
                    }}
                  />
                </div>
                <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "24px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                backgroundColor: "pink",
                cursor: "pointer",
                fontSize: "14px",
              }}
              disabled={isUploading}
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
                cursor: isUploading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                opacity: isUploading ? 0.7 : 1,
              }}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Submit Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
