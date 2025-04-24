import React, { useState } from 'react';

export default function SignupComponent() {
  const [email, setEmail] = useState('');
  const [otpPassword, setOtpPassword] = useState('');
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e) => {
    if (e.key === 'Enter' && email.trim()) {
      try {
        const response = await fetch('http://neighborhood.hackclub.dev/api/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: email.trim() }),
        });

        const data = await response.json();
        
        if (response.ok) {
          setError('');
          setStage(1);
        } else {
          setError(data.message || 'An error occurred');
        }
      } catch (err) {
        setError('Failed to connect to the server');
        console.error('Error:', err);
      }
    }
  };

  return (
    <div>
      Login to Neighborhood
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {stage === 0 && (
        <div>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleEmailSubmit}
          />
          <button onClick={(e) => email.trim() && handleEmailSubmit({ key: 'Enter' })}>
            Send OTP
          </button>
        </div>
      )}
      {stage === 1 && (
        <div>
          <input
            placeholder="Enter OTP"
            value={otpPassword}
            onChange={(e) => setOtpPassword(e.target.value)}
          />
          <button onClick={() => console.log('OTP submitted')}>Submit OTP</button>
        </div>
      )}
    </div>
  );
}