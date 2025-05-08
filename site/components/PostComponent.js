import React from 'react';
import { M_PLUS_Rounded_1c } from "next/font/google";

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: "400",
  variable: "--font-m-plus-rounded",
  subsets: ["latin"],
});

const BOARD_BAR_HEIGHT = 145;

const PostComponent = ({ isExiting, onClose }) => {
  return (
    <div className={`pop-in ${isExiting ? "hidden" : ""} ${mPlusRounded.variable}`} 
      style={{
        position: "absolute", 
        zIndex: 2, 
        width: "calc(100% - 16px)", 
        height: "calc(100% - 16px)", 
        borderRadius: 25, 
        marginLeft: 8, 
        marginTop: 8, 
        backgroundColor: "#ffe5c7",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(123, 91, 63, 0.1)",
        display: "flex",
        flexDirection: "column"
      }}
    >
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
          margin: "16px",
          ':hover': {
            transform: 'scale(1.1)'
          }
        }} 
      />

      <div
      style={{marginLeft: 16}}>
          Post Component
      </div>
    </div>
  );
};

export default PostComponent; 