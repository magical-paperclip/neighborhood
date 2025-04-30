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
        borderRadius: 8, 
        marginLeft: 8, 
        marginTop: 8, 
        backgroundColor: "#ffffff",
        overflow: "hidden"
      }}
    >
      {/* Top bar (solid color) */}
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "8px 16px",
        borderBottom: "1px solid #00000010",
        backgroundColor: "#ffffff",
        zIndex: 2,
        height: BOARD_BAR_HEIGHT,
        minHeight: BOARD_BAR_HEIGHT,
        maxHeight: BOARD_BAR_HEIGHT
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
        <p style={{fontSize: 18, color: "#000", margin: 0}}>Bulletin</p>
        <div style={{width: 14, height: 14}} />
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