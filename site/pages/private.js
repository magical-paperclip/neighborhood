import Head from "next/head";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';
import styles from "@/styles/Home.module.css";

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    birthday: ""
  });
  const [hasBirthdayFocus, setHasBirthdayFocus] = useState(false);

  const bounceKeyframes = `
    @keyframes gentleBounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-6px);
      }
    }
  `;

  useEffect(() => {
    if (router.isReady) {
      const { name, email, birthday } = router.query;
      setFormData(prev => ({
        ...prev,
        name: name || prev.name,
        email: email || prev.email,
        birthday: birthday || prev.birthday
      }));
    }
  }, [router.isReady, router.query]);

  return (
    <>
      <style>{bounceKeyframes}</style>
      <Head>
        <title>Neighborhood</title>
        <meta name="description" content="somewhere new" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{
        display: 'flex', 
        height: "100vh", 
        flexDirection: "column", 
        justifyContent: "center", 
        alignItems: "center",
        fontFamily: "'M PLUS Rounded 1c', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        backgroundImage: "url('/animal-crossing-island.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100vw"
      }}>
        <img style={{maxWidth: "100%", marginBottom: 16, width: 400, zIndex: 3}} src="./neighborhoodLogo.png"/>
        <div style={{position: "relative", zIndex: 2, marginTop: 0,}}>
          <div style={{position: "relative", zIndex: 1}}>
            <div style={{
              position: "absolute",
              left: "50%",
              top: 16,
              transform: "translateX(-50%)",
              width: 320,
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <p style={{
                fontWeight: 600,
                color: "#786A50",
                textAlign: "left",
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                margin: 0
              }}>howdy! If you spend 100 hours coding your own web/mobile app this May, you're guaranteed a spot in one of our houses and a flight to SF in June!</p>
              <div>
             <input 
                placeholder="email"
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px 8px 0px 0px",
                  display: "flex",
                  width: "100%",
                  border: "2px solid #786A50",
                  backgroundColor: "#FFF9E6",
                  color: "#666666",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "'M PLUS Rounded 1c', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              />
              <div style={{
                display: "flex", 
                border: "2px solid #786A50",
                borderTop: "0px",
                borderRadius: "0 0 8px 8px",
                marginTop: 0, 
                width: "100%", 
                flexDirection: "row",
                overflow: "hidden"
              }}>
              <input 
                placeholder="name"
                style={{
                  padding: "6px 12px",
                  borderRadius: 0,
                  marginTop: 0,
                  display: "flex",
                  width: "100%",
                  border: "0px",
                  borderRight: "2px solid #786A50",
                  backgroundColor: "#FFF9E6",
                  color: "#666666",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "'M PLUS Rounded 1c', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                }}
              />

               <div style={{position: "relative", width: "100%"}}>
                 {!hasBirthdayFocus ? (
                   <div 
                     onClick={() => setHasBirthdayFocus(true)}
                     style={{
                       padding: "6px 12px",
                       display: "flex",
                       marginTop: 0,
                       width: "100%",
                       borderRadius: 0,
                       border: "0px",
                       borderLeft: "0px",
                       backgroundColor: "#FFF9E6",
                       color: "#666666",
                       fontSize: "14px",
                       fontWeight: 500,
                       cursor: "text",
                       fontFamily: "'M PLUS Rounded 1c', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                     }}
                   >
                     birthday
                   </div>
                 ) : (
                   <input 
                     type="date"
                     value={formData.birthday}
                     onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
                     onBlur={(e) => {
                       if (!e.target.value) {
                         setHasBirthdayFocus(false);
                       }
                     }}
                     style={{
                       padding: "6px 12px",
                       display: "flex",
                       marginTop: 0,
                       width: "100%",
                       borderRadius: 0,
                       border: "0px",
                       borderLeft: "0px",
                       backgroundColor: "#FFF9E6",
                       color: "#666666",
                       fontSize: "14px",
                       fontWeight: 500,
                       fontFamily: "'M PLUS Rounded 1c', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                     }}
                   />
                 )}
               </div>
               </div>
               <button 
                 style={{
                   marginTop: "12px",
                   padding: "12px 24px",
                   backgroundColor: "#F7D359",
                   color: "#786A50",
                   border: "2px solid #786A50",
                   borderRadius: 100,
                   fontSize: "14px",
                   fontWeight: 600,
                   fontFamily: "'M PLUS Rounded 1c', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                   cursor: "pointer",
                   width: "100%"
                 }}
               >
                Join Us in San Francisco
               </button>
              </div>

            </div>
            <img src="textBubble.svg"/>
          </div>

        </div>
        
        <br/>
        <div style={{
                display: "flex", 
                marginTop: 24,
                flexDirection: "row", 
                gap: 12, 
                alignItems: "center",
                width: "calc(100%)",
                justifyContent: "center"
              }}>
                <button style={{
                  backgroundColor: "#FFF9E6", 
                  display: "flex", 
                  flexDirection: "row", 
                  alignItems: "center", 
                  gap: 8, 
                  border: "1px solid #786A50", 
                  color: "#786A50", 
                  fontWeight: 800, 
                  borderRadius: 96, 
                  padding: "4px 16px 4px 4px",
                }}>
                  <div style={{height: 24, borderRadius: 16, width: 24, backgroundColor: "#786A50", display: "flex", alignItems: "center", justifyContent: "center"}}>
                    <img src="/mail.svg" style={{height: 16, width: 16}} />
                  </div>
                  Letter to You
                </button>
                <button style={{
                  backgroundColor: "#18A69A", 
                  display: "flex", 
                  flexDirection: "row", 
                  alignItems: "center", 
                  gap: 8, 
                  border: "1px solid #7CC9C3", 
                  color: "#FFFBE7", 
                  fontWeight: 800, 
                  borderRadius: 96, 
                  padding: "4px 16px 4px 4px",
                }}>
                  <div style={{height: 24, borderRadius: 16, width: 24, backgroundColor: "#FFFBE7", display: "flex", alignItems: "center", justifyContent: "center"}}>
                    <img src="/song.svg" style={{height: 16, width: 16}} />
                  </div>
                  Neighborhood Song
                </button>
              </div>
      </div>
    </>
  );
}
