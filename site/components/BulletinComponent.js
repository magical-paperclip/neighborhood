import React from 'react';

const BOARD_BAR_HEIGHT = 50;

const BulletinComponent = ({ isExiting, onClose }) => {
  return (
    <div className={`pop-in ${isExiting ? "hidden" : ""}`} 
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
        }}>Bulletin</p>
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
          overflow: "hidden",
          display: "flex",
          backgroundColor: "#ffffff"
        }}
      >
        <p style={{ color: "#000", fontSize: "16px" }}>hello world</p>
      </div>
    </div>
  );
};

export default BulletinComponent; 