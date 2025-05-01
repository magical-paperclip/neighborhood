import React from 'react';
import Head from 'next/head';
import DownloadShader from '@/components/DownloadShader';

const DownloadPage = () => {
  const downloads = [
    {
      os: 'Windows',
      icon: '🪟',
      url: 'https://kodan-videos.s3.us-east-2.amazonaws.com/Neighborhood-win32-x64.zip',
      extension: '.zip',
      description: 'Download for Windows',
      color: '#FF6B6B', // Darker pink
      borderColor: '#FFD1DC' // Lighter pink
    },
    {
      os: 'macOS',
      icon: '🍎',
      url: 'https://kodan-videos.s3.us-east-2.amazonaws.com/Neighborhood+1.0.0.dmg',
      extension: '.dmg',
      description: 'Download for macOS',
      color: '#4CAF50', // Darker green
      borderColor: '#C1FFC1' // Lighter green
    },
    {
      os: 'Linux',
      icon: '🐧',
      url: 'https://kodan-videos.s3.us-east-2.amazonaws.com/Neighborhood-linux-x64.tar.gz',
      extension: '.tar.gz',
      description: 'Download for Linux x64',
      color: '#2196F3', // Darker blue
      borderColor: '#C1E1FF' // Lighter blue
    }
  ];

  return (
    <>
      <Head>
        <title>Download Neighborhood</title>
        <meta name="description" content="Download Neighborhood for Windows, macOS, and Linux" />
      </Head>
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: '#F8F8F8'
      }}>
        <DownloadShader />
        <div style={{
          position: 'relative',
          zIndex: 2,
          padding: '40px 20px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '60px'
          }}>
            <h1 style={{
              fontSize: '48px',
              fontWeight: '900',
              color: '#fff',
              marginBottom: '20px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              fontFamily: 'inherit'
            }}>Download Neighborhood</h1>
            <p style={{
              fontSize: '24px',
              color: '#fff',
              fontStyle: 'italic',
              fontFamily: 'inherit'
            }}>adventure awaits...</p>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            padding: '20px'
          }}>
            {downloads.map((download) => (
              <div 
                key={download.os}
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '30px',
                  textAlign: 'center',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: `4px solid ${download.borderColor}`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.15)';
                  e.currentTarget.style.borderColor = download.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = download.borderColor;
                }}
              >
                <div style={{
                  fontSize: '64px',
                  marginBottom: '20px',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                  transform: 'rotate(-5deg)',
                  display: 'inline-block',
                  color: download.color
                }}>{download.icon}</div>
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  marginBottom: '15px',
                  color: '#4B0082',
                  fontFamily: 'inherit'
                }}>{download.os}</h2>
                <p style={{
                  fontSize: '18px',
                  color: '#666',
                  marginBottom: '25px',
                  fontStyle: 'italic',
                  fontFamily: 'inherit'
                }}>{download.description}</p>
                <a
                  href={download.url}
                  style={{
                    display: 'block',
                    background: 'white',
                    color: download.color,
                    padding: '12px 24px',
                    borderRadius: '15px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                    border: `2px solid ${download.color}`,
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.background = download.color;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = download.color;
                  }}
                  download
                >
                  Download {download.extension}
                </a>
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '53px',
                  height: '53px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  transform: 'rotate(45deg)',
                  border: `2px solid ${download.borderColor}`
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  transform: 'rotate(30deg)',
                  border: `2px solid ${download.borderColor}`
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default DownloadPage; 