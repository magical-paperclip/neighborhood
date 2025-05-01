import Head from "next/head";
// import { Geist, Geist_Mono, Chewy } from "next/font/google";
import { M_PLUS_Rounded_1c } from "next/font/google";
import styles from "@/styles/Home.module.css";
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });
// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });
// const chewy = Chewy({
//   weight: "400",
//   variable: "--font-chewy",
//   subsets: ["latin"],
// });
const mPlusRounded = M_PLUS_Rounded_1c({
  weight: "400",
  variable: "--font-m-plus-rounded",
  subsets: ["latin"],
});
const BOARD_BAR_HEIGHT = 90;
export default function KaiLing() {
  return (
    <div className={`${mPlusRounded.variable}`}>
      {/* div className={`${geistSans.variable} ${geistMono.variable}`}> */}
      <Head>
        <title>Bulletin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{
        display: 'flex',
        height: "100vh",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f0f0f0"
      }}>
        <div style={{
          position: "relative",
          width: "783px",
          height: "557px",
          borderRadius: 8,
          backgroundColor: "#ffe5c7",
          
    
          backgroundRepeat: "no-repeat",
          overflow: "hidden",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)"
        }}>
          {/* Top bar (solid color) */}
          <div style={{
            display: "flex", 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center",
            padding: "8px 16px",
            borderBottom: "1px solid #00000010",
            backgroundColor: "ffffff",
            backgroundImage: "url('bulletintop.jpg')",
            backgroundSize: "800px 100px",
            zIndex: 2,
            height: BOARD_BAR_HEIGHT,
            minHeight: BOARD_BAR_HEIGHT,
            maxHeight: BOARD_BAR_HEIGHT
          }}>
            <div style={{
              width: 14, 
              cursor: "pointer", 
              height: 14, 
              borderRadius: 16, 
              backgroundColor: "#FF5F56"
            }} />
            <p style={{fontSize: 18, color: "#ffffff", margin: 0}}></p>
            <div style={{width: 14, height: 14}} />
          </div>
          {/* Content area */}
          <div style={{
            position: "absolute",
            top: BOARD_BAR_HEIGHT,
            left: 0,
            width: "100%",
            height: `calc(100% - ${BOARD_BAR_HEIGHT}px)`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start", //align items to top? not sure if needed anymore
            backgroundColor: "#ffead1"
          }}>
            <p style={{ color: "#000", fontSize: "16px" }}>Hii!</p>
            
          </div>
          {/* Content area */}
        <div style={{
          position: "absolute",
          top: BOARD_BAR_HEIGHT,
          left: 0,
          width: "100%",
          height: `calc(100% - ${BOARD_BAR_HEIGHT}px)`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column", 
          alignItems: "center",
          justifyContent: "center", //might change to right maybe
          backgroundColor: "#ffead1"
        }}>
        {/* invisible scrollable big container */}
        <div style={{
            width: "700px",
            maxHeight: "600px", 
            overflowY: "auto", 
            backgroundColor: "#ffead1",
            // border: "1px solid #ccc",
            borderRadius: "8px",
            // boxShadow: "0px 4px 8px hsla(0, 0.00%, 0.00%, 0.10)",
            padding: "16px"
        }}>
          {/* Box 1 */}
          <div className={`${mPlusRounded.variable}`}>
            <div style={{
              width: "100%",
              height: "150px",
              backgroundColor: "#a1d0d6",
              border: "5px dotted #ffffff",
              borderRadius: "8px",
              boxShadow: "0px 4px 8px hsla(0, 0.00%, 0.00%, 0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between", //KEEP THIS or spacing goes bad again
              marginBottom: "16px",
              marginTop: "16px",
            }}>
              <img 
              src="kickoffcalendar.gif" 
              style={{
                width: "120px", 
                height: "120px", 
                marginLeft: "25px",
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
              marginRight: "25px", 
              backgroundColor: "#f2cf64", 
              backgroundImage: "bulletintop.jpg", //CHANGE
              backgroundSize: "cover", 
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              marginLeft: "10px",
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#FF8486"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#FF6868"}
            onClick={() => alert("Sign up successful, see you soon!!")}
            >
              Sign Up
            </button>
          </div>
          
          
          
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
            marginBottom: "16px"
          }}>
            <div style={{
              backgroundColor: "#e1ffe7",
              padding: "8px 16px",
              // borderRadius: "4px",
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
        <div style={{
            width: "100%",
            height: "150px",
            backgroundColor: "#ffc1bc",
            border: "3px solid #fff",
            borderRadius: "8px",
            boxShadow: "0px 4px 8px hsla(0, 0.00%, 0.00%, 0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px"
          }}>
            <p style={{ margin: 0, fontSize: "16px", color: "#333", fontFamily: "var(--font-m-plus-rounded)" }}>future template</p>
          </div>
        {/* Box 4 */}
        <div style={{
            width: "100%",
            height: "150px",
            backgroundColor: "#ffc1fe",
            border: "6px solid #7c67d180",
            borderRadius: "8px",
            boxShadow: "0px 4px 8px hsla(0, 0.00%, 100.00%, 0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px"
          }}>
            <p style={{ margin: 0, fontSize: "16px", color: "#333", fontFamily: "var(--font-m-plus-rounded)" }}>future template</p>
          </div>
  
</div>
</div> 
...
        </div>
      </div>
    </div>
  );
} 