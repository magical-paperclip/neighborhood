import Head from "next/head";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import NeighborhoodEnvironment from "@/components/NeighborhoodEnvironment";
import SignupComponent from "@/components/SignupComponent";
import RewardsComponent from "@/components/RewardsComponent";
import JournalComponent from "@/components/JournalComponent";
import BulletinComponent from "@/components/BulletinComponent";
import HackTimeComponent from "@/components/HackTimeComponent";
import { useState, useEffect, useRef } from "react";
import { getToken, removeToken } from "@/utils/storage";
import { updateSlackUserData } from "@/utils/slack";

export default function Home() {
  const [UIPage, setUIPage] = useState('');
  const [hasEnteredNeighborhood, setHasEnteredNeighborhood] = useState(false);
  const [selectedItem, setSelectedItem] = useState('start');
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [userData, setUserData] = useState();
  const [token, setToken] = useState("");

  const banjoSound = useRef(null);

  useEffect(() => {
    const token = getToken();
    console.log(token);
    setIsSignedIn(!!token);

    // If user is signed in, update their Slack data
    if (token) {
      updateSlackUserData(token)
        .then(data => {
          setUserData(data);
        })
        .catch(error => {
          console.error('Failed to update user data:', error);
        });
    }

    // Initialize audio
    banjoSound.current = new Audio('/banjo.mp3');
  }, [hasEnteredNeighborhood]);

  const playBanjoSound = () => {
    if (banjoSound.current) {
      banjoSound.current.currentTime = 0;
      banjoSound.current.play();
    }
  };

  const handleLogout = () => {
    removeToken();
    window.location.reload();
  };

  const handleCloseComponent = () => {
    setIsExiting(true);
    setTimeout(() => {
      setUIPage("");
      setIsExiting(false);
    }, 300); // Match animation duration
  };

  const handleMenuItemClick = (itemId) => {
    playBanjoSound();
    setUIPage(itemId);
  };

  const menuItems = [
    { id: 'start', text: 'Start Hacking' },
    { id: 'challenges', text: 'Challenges' },
    { id: 'bulletin', text: 'Bulletin' }

    // { id: 'journal', text: 'Journal' },
    // { id: 'rewards', text: 'Rewards' }
  ];

  return (
    <>
      <Head>
        <title>Neighborhood</title>
        <meta name="description" content="a place we gather" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {isSignedIn ? 
      <>
      {(UIPage == "rewards" || (isExiting && UIPage === "rewards")) && 
        <RewardsComponent 
          isExiting={isExiting}
          onClose={handleCloseComponent}
          setUIPage={setUIPage}
        />
      }
      {(UIPage == "journal" || (isExiting && UIPage === "journal")) && 
        <JournalComponent 
          isExiting={isExiting}
          token={token}
          onClose={handleCloseComponent}
        />
      }
      {(UIPage == "bulletin" || (isExiting && UIPage === "bulletin")) && 
        <BulletinComponent 
          isExiting={isExiting}
          onClose={handleCloseComponent}
        />
      }
      {(UIPage == "start" || (isExiting && UIPage === "start")) && 
        <HackTimeComponent 
          isExiting={isExiting}
          onClose={handleCloseComponent}
        />
      }

      <NeighborhoodEnvironment 
        hasEnteredNeighborhood={hasEnteredNeighborhood} 
        setHasEnteredNeighborhood={setHasEnteredNeighborhood}
      />
      <div>
        <div style={{height: "100vh", width: "100%", gap: 32, justifyContent: "space-between", paddingTop: 16, paddingBottom: 16, display: "flex", flexDirection: "column", paddingLeft: 32}}>

        <div style={{position: "absolute", right: 16, top: 16}}>
          {/* {!hasEnteredNeighborhood &&
          <img
            style={{width: 32, height: 32, cursor: "pointer"}}
            src="logout.svg"
            onClick={handleLogout}
          />} */}
          {!hasEnteredNeighborhood && <div>
            <img
            style={{width: 32, height: 32, cursor: "pointer"}}
            src={userData.profilePicture}
            onClick={handleLogout}
          />
          </div>}
        </div>

        <div style={{position: "absolute", right: 16, bottom: 16}}>
          {!hasEnteredNeighborhood &&
          <button 
          onClick={() => alert("The Neighborhood Server will launch on our kickoff call at 7:30 PM EST on May 9th!")}
            style={{
              padding: "8px 16px",
              fontFamily: "M PLUS Rounded 1c",
              fontSize: "24px",
              border: "1px solid #FFF9E6",
              background: "none",
              cursor: "pointer",
              backgroundColor: "#007C74",
              backgroundColor: "#007C74",
              color: "#FFF9E6",
              fontWeight: "bold",
              borderRadius: "8px"
            }}
          >
            Explore Neighborhood
          </button>}
        </div>

        {!hasEnteredNeighborhood &&
        <div style={{display: "flex", flexDirection: "column", gap: 16}}>
          <img style={{width: 250, imageRendering: "pixelated"}} src="./neighborhoodLogo.png"/>
          {menuItems.map((item) => (
            <div 
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer"
              }}
              onMouseEnter={() => setSelectedItem(item.id)}
              onMouseLeave={() => {}}
              onClick={() => handleMenuItemClick(item.id)}
            >
              <span 
                style={{
                  fontFamily: "M PLUS Rounded 1c",
                  fontSize: "24px",
                  color: "#FFF9E6",
                  visibility: selectedItem === item.id ? "visible" : "hidden",
                  animation: selectedItem === item.id ? "blink 1s steps(1) infinite" : "none",
                  fontWeight: "bold"
                }}
              >
                {"●"}
              </span>
              <p style={{
                fontFamily: "M PLUS Rounded 1c",
                fontSize: "32px",
                color: "#F5F7E1",
                fontWeight: "bold"
              }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>}

        {!hasEnteredNeighborhood &&
        <div style={{display: "flex", justifyContent: "space-between", flexDirection: "column"}}>
          <p style={{color: "#FCEA64", fontFamily: "M PLUS Rounded 1c", fontWeight: "bold"}}>made with {"<3"}</p>
        </div>}
        
        </div>
      </div>
      <style jsx global>{`
        @keyframes blink {
          0% { visibility: visible; }
          50% { visibility: hidden; }
          100% { visibility: visible; }
        }

        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes popOut {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.95);
          }
        }

        .pop-in {
          animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .pop-in.hidden {
          animation: popOut 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          opacity: 0;
          transform: scale(0.95);
        }
      `}</style>
      </> :
      <SignupComponent />
      }
    </>
  );
}
