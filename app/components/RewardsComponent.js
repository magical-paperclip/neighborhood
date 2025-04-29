import React, { useEffect, useState, useRef } from 'react';

// Helper function to calculate connection points
const calculateConnectionPoints = (start, end) => {
  const startX = start.left + 60; // Center of box
  const startY = start.top + 60;
  const endX = end.left + 60;
  const endY = end.top + 60;
  
  // Create a curved path that flows downward
  const midY = (startY + endY) / 2;
  const controlPoint1Y = startY + (endY - startY) * 0.2;
  const controlPoint2Y = endY - (endY - startY) * 0.2;
  
  return `M ${startX} ${startY} C ${startX} ${controlPoint1Y}, ${endX} ${controlPoint2Y}, ${endX} ${endY}`;
};

const RewardBox = ({ top, left, label, isAccessible, index }) => {
  const isSpecialReward = label === "Room Key";
  
  // Get hour requirement based on index
  const getHourRequirement = () => {
    if (index === 0) return "1 hour";
    if (index === 1) return "5 hours";
    if (index === 2) return "15 hours";
    if (index >= 3 && index <= 7) { // Middle ring (Rewards 4-8)
      const hours = [25, 35, 45, 55, 65];
      return `${hours[index - 3]} hours`;
    } else if (index >= 8 && index <= 13) { // Bottom ring (Rewards 9-14)
      const hours = [70, 75, 80, 85, 90, 95];
      return `${hours[index - 8]} hours`;
    } else if (index === 14) { // Last before Room Key
      return "100 hours";
    } else if (index === 15) { // Room Key
      return "100 hours";
    }
    return "";
  };

  // Determine which drum sound to use based on the reward's position and state
  const getDrumSound = () => {
    if (isSpecialReward) return "kick-bass.mp3"; // Special deep sound for final reward
    if (!isAccessible) return "snare.mp3"; // Snare for inaccessible rewards
    if (top < 300) return "tom-1.mp3"; // Top row
    if (top < 600) return "tom-2.mp3"; // Middle row
    return "tom-3.mp3"; // Bottom row
  };

  const handleClick = (e) => {
    // Play the drum sound
    const audio = document.getElementById(`drum-${label}`);
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    }
    
    // Add temporary class for drum hit animation
    const drum = e.currentTarget;
    drum.classList.add('drum-hit');
    setTimeout(() => drum.classList.remove('drum-hit'), 300);
  };
  
  return (
    <div style={{
      position: "absolute",
      top: `${top}px`,
      left: `${left}px`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
      opacity: isAccessible ? 1 : 1.0,
      transition: "opacity 0.3s ease"
    }}>
      <audio id={`drum-${label}`} src={`/drumSounds/${getDrumSound()}`} preload="auto"></audio>
      <div 
        onClick={handleClick}
        className={`reward-box ${isSpecialReward ? 'special-reward' : ''}`} 
        style={{
          width: "120px",
          height: "120px",
          borderRadius: "60px",
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          background: isSpecialReward ? `
            radial-gradient(circle at 40% 40%, 
              #fff8e6 0%,
              #fff2cc 40%,
              #ffe6b3 70%,
              #ffd480 100%
            )
          ` : isAccessible ? `
            radial-gradient(circle at 40% 40%, 
              #fffaf0 0%,
              #fff5e6 40%,
              #ffefcc 70%,
              #ffe6b3 100%
            )
          ` : `
            radial-gradient(circle at 40% 40%, 
              #e0e0e0 0%,
              #d0d0d0 40%,
              #c0c0c0 70%,
              #b0b0b0 100%
            )
          `,
          boxShadow: isSpecialReward ? `
            inset 0 -4px 8px rgba(0,0,0,0.1),
            inset 0 4px 8px rgba(255,255,255,0.4),
            0 0 20px rgba(255,223,128,0.3),
            0 0 40px rgba(255,223,128,0.2),
            0 0 60px rgba(255,223,128,0.1)
          ` : `
            inset 0 -4px 8px rgba(0,0,0,0.1),
            inset 0 4px 8px rgba(255,255,255,0.2),
            0 2px 4px rgba(0,0,0,0.1)
            ${isAccessible ? ', 0 0 15px rgba(139, 0, 0, 0.5)' : ''}
          `,
          position: "relative",
          border: "4px solid",
          borderColor: isSpecialReward ? 
            "#ffd480" : 
            (isAccessible ? "#8B0000" : "#333333"),
          animation: isSpecialReward ? 
            "pulse 3s infinite" : 
            (isAccessible ? "rimColorChange 4s infinite" : "none"),
          transform: "scale(1) translateY(0)",
          transformOrigin: "center center",
          willChange: "transform, box-shadow"
      }}>
      </div>
      <span style={{ 
        opacity: isAccessible ? 1 : 0.6,
        color: isSpecialReward ? "#ffd480" : "#fff",
        fontSize: isSpecialReward ? "16px" : "14px",
        fontWeight: isSpecialReward ? "500" : "normal",
        textShadow: isSpecialReward ? 
          "0 0 10px rgba(255,223,128,0.5), 0 2px 4px rgba(0,0,0,0.3)" : 
          "0 1px 2px rgba(0,0,0,0.3)"
      }}>{label}</span>
      {getHourRequirement() && (
        <span style={{ 
          opacity: isAccessible ? 1 : 0.6,
          color: "#888",
          fontSize: "12px",
          marginTop: "-4px"
        }}>{getHourRequirement()}</span>
      )}

      <style jsx>{`
        .reward-box {
          position: relative;
          z-index: 2;
        }
        .reward-box:hover {
          transform: scale(1.05) translateY(-2px);
        }
        .reward-box.special-reward {
          animation: pulse 3s infinite !important;
          border-width: 6px !important;
        }
        .reward-box.drum-hit {
          animation: drumHit 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          background-position: center 60% !important;
        }
        @keyframes drumHit {
          0% {
            transform: scale(1) translateY(0);
          }
          20% {
            transform: scale(0.95) translateY(4px);
          }
          40% {
            transform: scale(1.02) translateY(-2px);
          }
          60% {
            transform: scale(0.98) translateY(1px) rotate(-1deg);
          }
          80% {
            transform: scale(1.01) translateY(0) rotate(1deg);
          }
          100% {
            transform: scale(1) translateY(0) rotate(0);
          }
        }
        @keyframes rimColorChange {
          0% {
            border-color: #8B0000;
            box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                       inset 0 4px 8px rgba(255,255,255,0.2),
                       0 2px 4px rgba(0,0,0,0.1),
                       0 0 15px rgba(139, 0, 0, 0.5);
          }
          25% {
            border-color: #FF4500;
            box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                       inset 0 4px 8px rgba(255,255,255,0.2),
                       0 2px 4px rgba(0,0,0,0.1),
                       0 0 20px rgba(255, 69, 0, 0.6);
          }
          50% {
            border-color: #FF6347;
            box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                       inset 0 4px 8px rgba(255,255,255,0.2),
                       0 2px 4px rgba(0,0,0,0.1),
                       0 0 25px rgba(255, 99, 71, 0.7);
          }
          75% {
            border-color: #FF4500;
            box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                       inset 0 4px 8px rgba(255,255,255,0.2),
                       0 2px 4px rgba(0,0,0,0.1),
                       0 0 20px rgba(255, 69, 0, 0.6);
          }
          100% {
            border-color: #8B0000;
            box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                       inset 0 4px 8px rgba(255,255,255,0.2),
                       0 2px 4px rgba(0,0,0,0.1),
                       0 0 15px rgba(139, 0, 0, 0.5);
          }
        }
      `}</style>
    </div>
  );
};

const RewardsComponent = ({ isExiting, onClose, setUIPage }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentReward, setCurrentReward] = useState(0); // Current reward level
  const containerRef = useRef(null);

  // Define reward positions
  const rewardPositions = [
    // Top Ring (Rewards 1-3) - Shortest arc
    { top: 200, left: 600, label: "Sticker Sheet" },
    { top: 175, left: 800, label: "Verified Tag" },
    { top: 200, left: 1000, label: "Pet Egg" },

    // Middle Ring (Rewards 4-8) - Medium arc
    { top: 450, left: 300, label: "???" },
    { top: 425, left: 550, label: "???" },
    { top: 400, left: 800, label: "???" },
    { top: 425, left: 1050, label: "???" },
    { top: 450, left: 1300, label: "???" },

    // Bottom Ring (Rewards 9-15 + Room Key) - Longest arc, curving upward
    { top: 800, left: 50, label: "???" },
    { top: 750, left: 300, label: "???" },
    { top: 700, left: 500, label: "???" },
    { top: 675, left: 700, label: "???" },
    { top: 675, left: 900, label: "???" },
    { top: 700, left: 1100, label: "???" },
    { top: 750, left: 1300, label: "???" },
    { top: 800, left: 1550, label: "Room Key" }
  ];

  // Define connections between rewards
  const connections = [
    [0, 1], [1, 2],           // Connect 1-2-3
    [2, 3], [3, 4], [4, 5],   // Connect 3-4-5-6
    [5, 6], [6, 7],           // Connect 6-7-8
    [7, 8], [8, 9], [9, 10],  // Connect 8-9-10-11
    [10, 11], [11, 12],       // Connect 11-12-13
    [12, 13], [13, 14],       // Connect 13-14-15
    [14, 15]                  // Connect 15-16 (indices 14-15 for last connection)
  ];

  // Function to check if a reward is accessible
  const isRewardAccessible = (rewardIndex) => {
    // Only the first reward is visible when currentReward is 0
    return rewardIndex === 0;
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setUIPage("");
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [setUIPage]);

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newScale = Math.min(Math.max(0.1, scale + delta), 4);
      setScale(newScale);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', handleWheel);
      }
    };
  }, [scale]);

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
        backgroundColor: "#0a0a0a",
        overflow: "hidden"
      }}
    >
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "8px 16px",
        borderBottom: "1px solid #ffffff10",
        backgroundColor: "#0a0a0a"
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
        <p style={{fontSize: 18, color: "#fff", margin: 0}}>Rewards</p>
        <div style={{width: 14, height: 14}} />
      </div>

      <div 
        ref={containerRef}
        className="dot-grid"
        style={{
          padding: "20px",
          position: "relative",
          width: "100%",
          height: "calc(100% - 50px)",
          overflow: "hidden",
          cursor: isDragging ? 'grabbing' : 'grab',
          backgroundColor: "#0a0a0a"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{
          position: "relative",
          width: "1400px",
          height: "1400px",
          margin: "0 auto",
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isDragging ? 'none' : 'transform 0.1s ease-out'
        }}>
          {/* Connection lines */}
          <svg style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
            opacity: 0.4
          }}>
            {connections.map(([fromIndex, toIndex], i) => {
              const isActive = fromIndex === 0;
              return (
                <path
                  key={i}
                  d={calculateConnectionPoints(rewardPositions[fromIndex], rewardPositions[toIndex])}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  fill="none"
                  style={{
                    opacity: isActive ? 1 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                />
              );
            })}
          </svg>

          {/* Reward boxes */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            {rewardPositions.map((pos, i) => (
              <RewardBox
                key={i}
                top={pos.top}
                left={pos.left}
                label={pos.label}
                isAccessible={isRewardAccessible(i)}
                index={i}
              />
            ))}
          </div>

          <style jsx>{`
            .reward-box {
              position: relative;
              z-index: 2;
            }
            .reward-box:hover {
              transform: scale(1.05);
            }
            .reward-box.special-reward {
              animation: pulse 3s infinite !important;
              border-width: 6px !important;
            }
            @keyframes rimColorChange {
              0% {
                border-color: #8B0000;
                box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                           inset 0 4px 8px rgba(255,255,255,0.2),
                           0 2px 4px rgba(0,0,0,0.1),
                           0 0 15px rgba(139, 0, 0, 0.5);
              }
              25% {
                border-color: #FF4500;
                box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                           inset 0 4px 8px rgba(255,255,255,0.2),
                           0 2px 4px rgba(0,0,0,0.1),
                           0 0 20px rgba(255, 69, 0, 0.6);
              }
              50% {
                border-color: #FF6347;
                box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                           inset 0 4px 8px rgba(255,255,255,0.2),
                           0 2px 4px rgba(0,0,0,0.1),
                           0 0 25px rgba(255, 99, 71, 0.7);
              }
              75% {
                border-color: #FF4500;
                box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                           inset 0 4px 8px rgba(255,255,255,0.2),
                           0 2px 4px rgba(0,0,0,0.1),
                           0 0 20px rgba(255, 69, 0, 0.6);
              }
              100% {
                border-color: #8B0000;
                box-shadow: inset 0 -4px 8px rgba(0,0,0,0.1),
                           inset 0 4px 8px rgba(255,255,255,0.2),
                           0 2px 4px rgba(0,0,0,0.1),
                           0 0 15px rgba(139, 0, 0, 0.5);
              }
            }
            @keyframes pulse {
              0% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.02);
              }
              100% {
                transform: scale(1);
              }
            }
            .reward-box:before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              border-radius: 60px;
              background: 
                repeating-radial-gradient(
                  circle at center,
                  transparent 0,
                  transparent 3px,
                  rgba(0,0,0,0.03) 4px,
                  transparent 5px
                );
              pointer-events: none;
            }
            .dot-grid {
              background-image: 
                radial-gradient(circle at center, #ffffff08 1px, transparent 1px),
                radial-gradient(circle at center, #ffffff05 1px, transparent 1px);
              background-size: 24px 24px, 12px 12px;
              background-position: 0 0, 6px 6px;
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};

export default RewardsComponent; 