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
      const currentTime = formatTime(elapsedTime);
      const shouldStop = window.confirm(`Are you ready to end the time at ${currentTime}?`);
      
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

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const PlayIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/>
    </svg>
  );

  const StopIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
    </svg>
  );

  const timeCategories = [
    {
      name: "PENDING TIME",
      value: "0.00 hr"
    },
    {
      name: "SHIPPED TIME",
      value: "0.00 hr"
    },
    {
      name: "APPROVED TIME",
      value: "0.00 hr"
    }
  ];

  return (
    <div>
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0px',
      alignItems: "center",
      padding: 20,
      borderBottom: "1px solid #000",
    }}>
      <div style={{display: "flex", flexDirection: "column"}}>
        <div 
          onClick={handleClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '170px',
            height: '170px',
            borderRadius: '50%',
            border: '3px dotted #ef758a',
            background: 'transparent',
            marginBottom: '12px',
            gap: '12px',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <span style={{
            fontSize: '24px',
            color: '#000',
            fontWeight: 500,
            pointerEvents: 'none',
          }}>{formatTime(time)}</span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: '25px',
              height: '25px',
              borderRadius: '50%',
              border: '2px solid #ef758a',
              backgroundColor: 'transparent',
              color: '#ef758a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0',
              transition: 'all 0.2s ease',
            }}>
              {isRunning ? <StopIcon /> : <PlayIcon />}
            </div>
          </div>
        </div>
      </div>

      {/* Time stats area as hstack, equal width, no question marks */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '24px',
        padding: '12px',
        alignItems: 'flex-start',
        width: '510px', // 3x170px for equal width
        justifyContent: 'space-between',
      }}>
        {timeCategories.map((category, index) => (
          <div key={index} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            width: 150,
            gap: '0px',
          }}>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              letterSpacing: '-0.5px',
              color: '#ef758a',
              textAlign: 'left',
              textTransform: 'uppercase',
            }}>{category.name}</span>
            <span style={{ 
              fontSize: '18px', 
              color: '#000', 
              fontWeight: 600,
              textAlign: 'left',
            }}>{category.value}</span>
          </div>
        ))}
      </div>
      {/* Table Section */}

    </div>
    <div style={{ width: '100%', marginTop: 0, padding: '0 0 32px 0' }}>
        <table style={{ width: 'calc(100% - 32px)', marginLeft: 16, marginRight: 16, marginTop: 16, borderCollapse: 'collapse', background: 'transparent' }}>
          <colgroup>
            <col style={{ width: '45%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', color: '#ef758a', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #ef758a', textAlign: 'left', textTransform: 'uppercase', background: 'transparent', letterSpacing: '0.5px' }}>Commit Message</th>
              <th style={{ padding: '6px 8px', color: '#ef758a', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #ef758a', textAlign: 'left', textTransform: 'uppercase', background: 'transparent', letterSpacing: '0.5px' }}>Start Time</th>
              <th style={{ padding: '6px 8px', color: '#ef758a', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #ef758a', textAlign: 'left', textTransform: 'uppercase', background: 'transparent', letterSpacing: '0.5px' }}>Stop Time</th>
              <th style={{ padding: '6px 8px', color: '#ef758a', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #ef758a', textAlign: 'left', textTransform: 'uppercase', background: 'transparent', letterSpacing: '0.5px' }}>Duration</th>
              <th style={{ padding: '6px 8px', color: '#ef758a', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #ef758a', textAlign: 'left', textTransform: 'uppercase', background: 'transparent', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '6px 8px', color: '#ef758a', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #ef758a', textAlign: 'left', textTransform: 'uppercase', background: 'transparent', letterSpacing: '0.5px' }}>Video</th>
            </tr>
          </thead>
          <tbody>
            {/* Placeholder row */}
            <tr>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>Initial commit</td>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>10:00 AM</td>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>10:30 AM</td>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>00:30</td>
              <td style={{ padding: '6px 8px', color: '#ef758a', fontWeight: 700, fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent', textAlign: 'center' }}>P</td>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>-</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>Add stopwatch</td>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>11:00 AM</td>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>11:45 AM</td>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>00:45</td>
              <td style={{ padding: '6px 8px', color: '#ef758a', fontWeight: 700, fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent', textAlign: 'center' }}>A</td>
              <td style={{ padding: '6px 8px', color: '#000', fontSize: 13, borderBottom: '1px solid #ef758a', background: 'transparent' }}>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StopwatchComponent; 