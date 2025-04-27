import React, { useState, useEffect } from 'react';

const StopwatchComponent = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

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

  const startStopwatch = () => {
    if (!isRunning) {
      setStartTime(Date.now());
      setIsRunning(true);
    }
  };

  const stopStopwatch = () => {
    if (isRunning) {
      setIsRunning(false);
    }
  };

  const resetStopwatch = () => {
    setTime(0);
    setElapsedTime(0);
    setIsRunning(false);
  };

  const formatTime = (ms) => {
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: '16px',
      padding: '24px'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '340px',
        height: '340px',
        borderRadius: '50%',
        border: '3px dotted #ef758a',
        background: 'transparent',
        marginBottom: '24px',
        gap: '24px',
      }}>
        <span style={{
          fontSize: '48px',
          color: '#000',
          fontWeight: 500,
        }}>{formatTime(time)}</span>
        <div style={{
          display: 'flex',
          gap: '16px',
        }}>
          <button
            onClick={isRunning ? stopStopwatch : startStopwatch}
            style={{
              padding: '8px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isRunning ? '#FF5F56' : '#4CAF50',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isRunning ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={resetStopwatch}
            style={{
              padding: '8px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2196F3',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default StopwatchComponent; 