import React, { useState, useEffect } from 'react';
import Soundfont from 'soundfont-player';
import { getToken } from '@/utils/storage';

const BOARD_BAR_HEIGHT = 50;

const ChallengeCard = ({ title, description, tasks, isLocked, unlockDate, showInputs, projectName, projectDescription, projectRepo, onProjectNameChange, onGithubPRChange, onProjectRepoChange }) => {
  const [piano, setPiano] = useState(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [originalName, setOriginalName] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [originalRepo, setOriginalRepo] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check submission status on component mount
  useEffect(() => {
    const checkSubmissionStatus = async () => {
      try {
        const token = getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/check-challenge-status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsSubmitted(data.isSubmitted);
          if (data.isSubmitted) {
            onProjectNameChange(data.projectName || '');
            onGithubPRChange(data.projectDescription || '');
            onProjectRepoChange(data.projectRepo || '');
            setOriginalName(data.projectName || '');
            setOriginalDescription(data.projectDescription || '');
            setOriginalRepo(data.projectRepo || '');
          }
        }
      } catch (error) {
        console.error('Error checking submission status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubmissionStatus();
  }, []);

  // Check for changes when inputs are modified
  useEffect(() => {
    if (isSubmitted) {
      setHasChanges(
        projectName !== originalName ||
        projectDescription !== originalDescription || 
        projectRepo !== originalRepo
      );
    }
  }, [projectName, projectDescription, projectRepo, originalName, originalDescription, originalRepo, isSubmitted]);

  // Initialize piano sounds
  useEffect(() => {
    const ac = new AudioContext();
    Soundfont.instrument(ac, 'acoustic_grand_piano').then((piano) => {
      setPiano(piano);
    });
  }, []);

  const playSuccessSequence = () => {
    if (piano) {
      const notes = ['C4', 'E4', 'G4', 'C5'];
      const delays = [0, 100, 200, 300];
      notes.forEach((note, index) => {
        setTimeout(() => piano.play(note), delays[index]);
      });
    }
  };

  const playFailureSequence = () => {
    if (piano) {
      const notes = ['B3', 'Bb3', 'A3'];
      const delays = [0, 150, 300];
      notes.forEach((note, index) => {
        setTimeout(() => piano.play(note), delays[index]);
      });
    }
  };

  const handleSubmit = async () => {
    if (!projectName || !projectDescription || !projectRepo) {
      setIsError(true);
      playFailureSequence();
      setTimeout(() => setIsError(false), 820);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/update-challenge-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectName,
          projectDescription,
          projectRepo
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update challenge links');
      }

      setIsSubmitted(true);
      setOriginalName(projectName);
      setOriginalDescription(projectDescription);
      setOriginalRepo(projectRepo);
      setHasChanges(false);
      playSuccessSequence();
      console.log('Challenge links updated successfully');
    } catch (error) {
      console.error('Error updating challenge links:', error);
      setIsError(true);
      playFailureSequence();
      setTimeout(() => setIsError(false), 820);
    }
  };

  const getButtonText = () => {
    if (isSubmitted && !hasChanges) return 'Submitted ✓';
    if (isSubmitted && hasChanges) return 'Update App Bio';
    return 'Submit Challenge';
  };

  return (
    <div style={{
      border: '3px solid #7B5B3F',
      borderRadius: '25px',
      padding: '25px',
      marginBottom: '45px',
      alignItems: "center",
      backgroundColor: isLocked ? '#E8E1D5' : '#FBF6E7',
      opacity: isLocked ? 0.8 : 1,
      position: 'relative',
      boxShadow: '0 4px 0 #7B5B3F',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: isLocked ? 'default' : 'pointer',
      ':hover': {
        transform: isLocked ? 'none' : 'translateY(-2px)',
        boxShadow: isLocked ? '0 4px 0 #7B5B3F' : '0 6px 0 #7B5B3F'
      }
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h2 style={{ 
          margin: 0,
          fontSize: '24px',
          color: '#7B5B3F',
          fontFamily: 'M PLUS Rounded 1c',
          fontWeight: 'bold'
        }}>{title}</h2>
        {isLocked && (
          <div style={{
            backgroundColor: 'rgba(123, 91, 63, 0.95)',
            color: '#FBF6E7',
            padding: '10px 20px',
            borderRadius: '20px',
            textAlign: 'center',
            fontFamily: 'M PLUS Rounded 1c',
            fontWeight: 'bold',
            fontSize: '16px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
          }}>
            Opens {unlockDate}
          </div>
        )}
      </div>
      <p style={{ 
        margin: '0 0 15px 0',
        color: '#8B7355',
        fontSize: '16px',
        lineHeight: '1.5'
      }}>{description}</p>
      <ul style={{ 
        paddingLeft: '25px', 
        margin: '0 0 15px 0',
        color: '#8B7355',
        listStyleImage: 'url("/leaf-bullet.png")'
      }}>
        {tasks.map((task, index) => (
          <li key={index} style={{ 
            marginBottom: '12px',
            fontSize: '16px',
            lineHeight: '1.4'
          }}>{task}</li>
        ))}
      </ul>
      
      {showInputs && (
        <div style={{ 
          marginTop: '25px', 
          borderTop: '2px dashed #B9A88F', 
          paddingTop: '25px',
          opacity: isLoading ? 0 : 1,
          transform: isLoading ? 'translateY(10px)' : 'translateY(0)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ 
              margin: '0 0 8px 0', 
              fontSize: '16px', 
              color: '#7B5B3F',
              fontFamily: 'M PLUS Rounded 1c',
              fontWeight: 'bold'
            }}>App Name</p>
            <input
              type="text"
              placeholder="Give your project a name..."
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #B9A88F',
                borderRadius: '15px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: '#7B5B3F',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                ':focus': {
                  borderColor: '#7B5B3F',
                  boxShadow: '0 0 0 3px rgba(123, 91, 63, 0.2)'
                }
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ 
              margin: '0 0 8px 0', 
              fontSize: '16px', 
              color: '#7B5B3F',
              fontFamily: 'M PLUS Rounded 1c',
              fontWeight: 'bold'
            }}>App Description</p>
            <textarea
              placeholder="Describe your project idea in a few sentences..."
              value={projectDescription}
              onChange={(e) => onGithubPRChange(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #B9A88F',
                borderRadius: '15px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: '#7B5B3F',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit',
                ':focus': {
                  borderColor: '#7B5B3F',
                  boxShadow: '0 0 0 3px rgba(123, 91, 63, 0.2)'
                }
              }}
            />
          </div>
          <div style={{ marginBottom: '25px' }}>
            <p style={{ 
              margin: '0 0 8px 0', 
              fontSize: '16px', 
              color: '#7B5B3F',
              fontFamily: 'M PLUS Rounded 1c',
              fontWeight: 'bold'
            }}>Project Repo</p>
            <input
              type="text"
              placeholder="Enter your project repository URL"
              value={projectRepo}
              onChange={(e) => onProjectRepoChange(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #B9A88F',
                borderRadius: '15px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
                color: '#7B5B3F',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                ':focus': {
                  borderColor: '#7B5B3F',
                  boxShadow: '0 0 0 3px rgba(123, 91, 63, 0.2)'
                }
              }}
            />
          </div>
          {!isLoading && (
            <div 
              style={{
                position: 'relative',
                width: '100%',
                height: isPressed ? '64px' : '70px',
                marginTop: '10px',
                cursor: (isSubmitted && !hasChanges) ? 'default' : 'pointer',
                transition: 'all 0.1s ease-in-out',
                transform: ((isSubmitted && !hasChanges) || isPressed) ? 'translateY(6px)' : 'translateY(0)',
                animation: isError ? 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both' : 'none',
                opacity: 1,
              }}
              onMouseDown={() => !(isSubmitted && !hasChanges) && setIsPressed(true)}
              onMouseUp={() => {
                if (!(isSubmitted && !hasChanges)) {
                  setIsPressed(false);
                  handleSubmit();
                }
              }}
              onMouseLeave={() => !(isSubmitted && !hasChanges) && setIsPressed(false)}
            >
              <div style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                height: '64px',
                backgroundColor: isError ? '#FF3B30' : (isSubmitted && !hasChanges) ? '#78BA99' : '#2F755E',
                borderRadius: '20px',
                transition: 'background-color 0.3s ease',
              }} />
              <button
                style={{
                  position: 'absolute',
                  top: 0,
                  width: '100%',
                  height: '64px',
                  padding: '15px 25px',
                  backgroundColor: isError ? '#FF6B6B' : (isSubmitted && !hasChanges) ? '#78BA99' : '#78BA99',
                  border: `3px solid ${isError ? '#FF3B30' : (isSubmitted && !hasChanges) ? '#2F755E' : '#2F755E'}`,
                  borderRadius: '20px',
                  color: '#FFFFFF',
                  fontSize: '18px',
                  fontFamily: 'M PLUS Rounded 1c',
                  fontWeight: 'bold',
                  cursor: (isSubmitted && !hasChanges) ? 'default' : 'pointer',
                  transform: ((isSubmitted && !hasChanges) || isPressed) ? 'translateY(6px)' : 'translateY(0)',
                  transition: 'all 0.1s ease-in-out',
                  outline: 'none',
                }}
              >
                {getButtonText()}
              </button>
            </div>
          )}
          <style jsx>{`
            @keyframes shake {
              10%, 90% {
                transform: translate3d(-1px, 0, 0);
              }
              
              20%, 80% {
                transform: translate3d(2px, 0, 0);
              }

              30%, 50%, 70% {
                transform: translate3d(-4px, 0, 0);
              }

              40%, 60% {
                transform: translate3d(4px, 0, 0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

const ChallengesComponent = ({ isExiting, onClose }) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setGithubPR] = useState('');
  const [projectRepo, setProjectRepo] = useState('');

  const challenges = [
    {
      title: 'Challenge 1: Get your feet wet!',
      description: 'Get started with your app development journey',
      tasks: [
        <span key="pr-guide">Share your app name and idea</span>,
        'make a repo for your project and commit the initial project files',
        'start building out the base of your app',
        'attend the kickoff call'
      ],
      isLocked: false,
      showInputs: true
    },
    {
      title: 'Challenge 2 - Prototype',
      description: '',
      tasks: [],
      isLocked: true,
      unlockDate: 'after kickoff call, May 9'
    },
    {
      title: 'Challenge 3 - MVP',
      description: '',
      tasks: [],
      isLocked: true,
      unlockDate: 'after ship day, May 16'
    },
    {
      title: 'Challenge 4 - Finished',
      description: '',
      tasks: [],
      isLocked: true,
      unlockDate: 'after ship day #2, May 23'
    }
  ];

  return (
    <div className={`pop-in ${isExiting ? "hidden" : ""}`} 
      style={{
        position: "absolute", 
        zIndex: 2, 
        width: "calc(100% - 16px)", 
        height: "calc(100% - 16px)", 
        borderRadius: '25px', 
        marginLeft: 8, 
        marginTop: 8, 
        backgroundColor: "#F5F1E8",
        overflow: "hidden",
        boxShadow: '0 8px 32px rgba(123, 91, 63, 0.1)'
      }}
    >
      {/* Top bar (solid color) */}
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "12px 20px",
        borderBottom: "2px solid #B9A88F",
        backgroundColor: "#FFFFFF",
        zIndex: 2,
        height: BOARD_BAR_HEIGHT,
        minHeight: BOARD_BAR_HEIGHT,
        maxHeight: BOARD_BAR_HEIGHT
      }}>
        <div 
          onClick={onClose} 
          style={{
            width: 16, 
            cursor: "pointer", 
            height: 16, 
            borderRadius: '50%', 
            backgroundColor: "#FF5F56",
            border: '2px solid #E64940',
            transition: 'transform 0.2s',
            ':hover': {
              transform: 'scale(1.1)'
            }
          }}
        />
        <p style={{
          fontSize: 22,
          color: "#7B5B3F",
          margin: 0,
          fontFamily: 'M PLUS Rounded 1c',
          fontWeight: 'bold'
        }}>Challenges</p>
        <div style={{width: 16, height: 16}} />
      </div>

      {/* Content area */}
      <div 
        style={{
          position: "absolute",
          top: BOARD_BAR_HEIGHT,
          left: 0,
          width: "100%",
          height: `calc(100% - ${BOARD_BAR_HEIGHT}px)`,
          overflow: "auto",
          backgroundColor: "#F5F1E8",
          padding: "25px",
          backgroundImage: 'url("/subtle-dots.png")'  // You'll need to add this image
        }}
      >
        <div style={{ 
          maxWidth: '800px', 
          margin: '0 auto',
          padding: '0 15px'
        }}>
          {challenges.map((challenge, index) => (
            <ChallengeCard
              key={index}
              {...challenge}
              projectName={projectName}
              projectDescription={projectDescription}
              projectRepo={projectRepo}
              onProjectNameChange={setProjectName}
              onGithubPRChange={setGithubPR}
              onProjectRepoChange={setProjectRepo}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChallengesComponent; 