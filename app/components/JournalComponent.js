import React, { useState } from 'react';

const JournalComponent = ({ isExiting, onClose }) => {
  const [pageNumber, setPageNumber] = useState(0);
  
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
        backgroundColor: "#FFF9E6",
        overflow: "hidden"
      }}
    >
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "8px 16px",
        borderBottom: "1px solid #00000010",
        backgroundColor: "#FFF9E6"
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
        width: "100%",
        height: "calc(100% - 45px)", 
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
        {pageNumber == 0 && 
        <div 
        onClick={() => setPageNumber(1)}

        style={{
          width: "45%",
          maxHeight: "calc(100% - 16px)",
          borderRadius: "4px 16px 16px 4px",
          aspectRatio: "0.7071428571", // A5 portrait aspect ratio (148mm/210mm)
          margin: "0 auto",
          backgroundColor: "#4C2D11",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 16
        }}>
          <div style={{width: "100%", height: "100%", display: "flex", border: "1px dashed #8B4513", borderRadius: "2px 8px 8px 2px", alignItems: "center", justifyContent: "center", backgroundColor: "#4C2D11"}}>
          <img style={{width: "50%" }}src="./Neighborhood2Color.png"/>

          </div>
        </div>}

        {pageNumber == 1 &&
        <div style={{
          width: "90%",
          maxHeight: "calc(100% - 16px)",
          aspectRatio: 1.4095238095,
          backgroundColor: "#4C2D11",
          borderRadius: "8px", 
          padding: 3, gap: 0.5,
          display: "flex",
          flexDirection: "row"
        }}>
          <div style={{width: "100%", height: "100%", borderRadius: "4px 2px 2px 4px", backgroundColor: "#fff", position: "relative"}}>
            <canvas style={{width: "100%", height: "100%"}} />
            <div style={{position: "absolute", bottom: 8, left: 8, fontSize: 12, color: "#666"}}>1</div>
          </div>
          <div style={{width: "100%", height: "100%", borderRadius: "2px 4px 4px 2px", backgroundColor: "#fff", position: "relative"}}>
            <canvas style={{width: "100%", height: "100%"}} />
            <div style={{position: "absolute", bottom: 8, right: 8, fontSize: 12, color: "#666"}}>2</div>
          </div>
        </div>
        }
      </div>
    </div>
  );
};

export default JournalComponent; 