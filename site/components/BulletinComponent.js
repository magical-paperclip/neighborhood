import React from 'react';
import { M_PLUS_Rounded_1c } from "next/font/google";

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: "400",
  variable: "--font-m-plus-rounded",
  subsets: ["latin"],
});

const BOARD_BAR_HEIGHT = 145;

const BulletinComponent = ({ isExiting, onClose }) => {
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
      {/* Top bar */}
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "12px 20px",
        borderBottom: "2px solid #B9A88F",
        backgroundImage: "url('bulletintop.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
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
        <div style={{width: 16, height: 16}} />
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        backgroundColor: "#ffead1",
        padding: "25px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        {/* Scrollable container */}
        <div style={{
          width: "100%",
          maxWidth: "800px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          {/* Box 1 */}
          <div style={{
            width: "100%",
            height: "150px",
            backgroundColor: "#a1d0d6",
            border: "5px dotted #ffffff",
            borderRadius: "8px",
            boxShadow: "0px 4px 8px hsla(0, 0.00%, 0.00%, 0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px"
          }}>
            <img 
              src="kickoffcalendar.gif" 
              style={{
                width: "120px", 
                height: "120px", 
                objectFit: "contain"
              }}
            />
            <div style={{
              backgroundColor: "#e2eff6", 
              padding: "8px 16px", 
              borderRadius: "4px", 
              border: "8px dotted #ffffff",
            }}>
              <p style={{
                fontSize: "20px", 
                color: "#17647b", 
                fontFamily: "var(--font-m-plus-rounded)",
                margin: 0
              }}>
                Kick Off Call - May 9th, 7:30 PM EST
              </p>
              <p style={{
                fontSize: "14px", 
                color: "#4494ac", 
                fontFamily: "var(--font-m-plus-rounded)",
                marginTop: "4px", 
              }}>
                Join to receive an exclusive slack pfp icon :)
              </p>
            </div>
            
            <button style={{
              padding: "8px 16px",
              backgroundColor: "#f2cf64", 
              backgroundImage: "bulletintop.jpg",
              backgroundSize: "cover", 
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#FF8486"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#FF6868"}
            onClick={() => alert("Sign up successful, see you soon!!")}
            >
              Sign Up
            </button>
          </div>

          {/* Box 2 */}
          <div 
            onClick={() => alert("Not so fast! Join us at the Kick Off Call to find them :)")}
            style={{
              width: "100%",
              height: "150px",
              backgroundColor: "#c1ffc1",
              backgroundImage: "url('./bulletinbox1background.png')",
              backgroundSize: "cover",
              border: "5px dashed #cdc1ff",
              borderRadius: "8px",
              boxShadow: "0px 4px 8px hsla(0, 0.00%, 0.00%, 0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}>
            <div style={{
              backgroundColor: "#e1ffe7",
              padding: "8px 16px",
              boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)", 
              border: "5px solid rgba(169, 164, 249, 0.56)",
            }}>
              <p style={{
                fontSize: "35px", 
                color: "#503da099", 
                fontFamily: "var(--font-m-plus-rounded)",
                margin: 0, 
              }}>
                Meet your neighbors!
              </p>
            </div>
          </div>

          {/* Box 3 */}
          {/* <div style={{
            width: "100%",
            height: "150px",
            backgroundColor: "#ffc1bc",
            border: "3px solid #fff",
            borderRadius: "8px",
            boxShadow: "0px 4px 8px hsla(0, 0.00%, 0.00%, 0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}>
            <p style={{ margin: 0, fontSize: "16px", color: "#333", fontFamily: "var(--font-m-plus-rounded)" }}>future template</p>
          </div> */}

          {/* Box 4 */}
          {/* <div style={{
            width: "100%",
            height: "150px",
            backgroundColor: "#ffc1fe",
            border: "6px solid #7c67d180",
            borderRadius: "8px",
            boxShadow: "0px 4px 8px hsla(0, 0.00%, 100.00%, 0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}>
            <p style={{ margin: 0, fontSize: "16px", color: "#333", fontFamily: "var(--font-m-plus-rounded)" }}>future template</p>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default BulletinComponent; 