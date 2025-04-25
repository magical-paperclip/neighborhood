import React from 'react';

const JournalComponent = ({ isExiting, onClose }) => {
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
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        padding: 8,
        borderBottom: "1px solid #00000010",
        backgroundColor: "#ffffff"
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
        <p style={{fontSize: 18, color: "#000", margin: 0}}>Journal</p>
        <div style={{width: 14, height: 14}} />
      </div>

      <div style={{
        padding: "20px",
        color: "#000"
      }}>
        <p>Hello World</p>
      </div>
    </div>
  );
};

export default JournalComponent; 