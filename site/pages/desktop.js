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
import NeighborhoodPopup from "@/components/NeighborhoodPopup";
import ChallengesComponent from "@/components/ChallengesComponent";
import { useState, useEffect, useRef } from "react";
import { getToken, removeToken } from "@/utils/storage";
import { updateSlackUserData } from "@/utils/slack";

export default function Home() {
  const [UIPage, setUIPage] = useState("");
  const [hasEnteredNeighborhood, setHasEnteredNeighborhood] = useState(false);
  const [selectedItem, setSelectedItem] = useState("start");
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [userData, setUserData] = useState();
  const [token, setToken] = useState("");
  const [showNeighborhoodPopup, setShowNeighborhoodPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherTexture, setWeatherTexture] = useState("sunny.svg");
  const [currentTime, setCurrentTime] = useState("");
  const [isAM, setIsAM] = useState(false);

  // Update time in Animal Crossing format
  useEffect(() => {
    const updateACTime = () => {
      const now = new Date();
      // Get time in Los Angeles (Animal Crossing-style uses 12-hour format)
      const options = {
        timeZone: "America/Los_Angeles",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };

      const timeString = new Intl.DateTimeFormat("en-US", options).format(now);

      // Split into time and AM/PM
      const [time, period] = timeString.split(" ");

      // Set states
      setCurrentTime(time);
      setIsAM(period === "AM");
    };

    // Update immediately and then every minute
    updateACTime();
    const intervalId = setInterval(updateACTime, 60000);

    return () => clearInterval(intervalId);
  }, []);
  const fetchWeather = async () => {
    const response = await fetch("https://wttr.in/SFO?format=%C&lang=en");
    const data = await response.text();
    console.log(data);
    console.log(classifyWeather(data));
    setWeatherTexture(`./${classifyWeather(data)}.svg`);
  };
  fetchWeather();

  const banjoSound = useRef(null);
  const backgroundMusic = useRef(null);

  function classifyWeather(condition) {
    const c = condition.toLowerCase();

    // Sunny or clear conditions
    if (
      c.includes("sun") ||
      c.includes("clear") ||
      c.includes("blazing") ||
      c.includes("bright")
    ) {
      return "sunny";
    }

    // Rainy or thunderstorm conditions
    if (
      c.includes("rain") ||
      c.includes("showers") ||
      c.includes("thunder") ||
      c.includes("drizzle") ||
      c.includes("sleet") ||
      c.includes("blizzard") ||
      c.includes("torrential")
    ) {
      return "rain";
    }

    // Cloudy or overcast conditions
    if (
      c.includes("cloud") ||
      c.includes("overcast") ||
      c.includes("mist") ||
      c.includes("fog") ||
      c.includes("haze") ||
      c.includes("freezing fog") ||
      c.includes("patchy snow") ||
      c.includes("blowing snow")
    ) {
      return "cloud";
    }

    // Default to "cloud" if not specifically categorized
    return "cloud";
  }

  useEffect(() => {
    const token = getToken();
    console.log(token);
    setIsSignedIn(!!token);

    // If user is signed in, update their Slack data
    if (token) {
      setIsLoading(true);
      updateSlackUserData(token)
        .then((data) => {
          setUserData(data);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Failed to update user data:", error);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    // Initialize audio
    banjoSound.current = new Audio("/banjo.mp3");
    backgroundMusic.current = new Audio('/littlething.mp3');
    backgroundMusic.current.loop = true;
  }, [hasEnteredNeighborhood]);

  useEffect(() => {
    if (isSignedIn && !UIPage && backgroundMusic.current) {
      backgroundMusic.current.play();
    } else if (backgroundMusic.current) {
      backgroundMusic.current.pause();
      backgroundMusic.current.currentTime = 0;
    }
  }, [UIPage, isSignedIn]);

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
    { id: "start", text: "Start Hacking" },
    { id: "challenges", text: "Challenges" },
    { id: "bulletin", text: "Bulletin" },

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
      {isSignedIn ? (
        <>
          <div
            style={{
              position: "absolute",
              top: "40px",
              left: "40px",
              right: "40px",
              bottom: "40px",
              zIndex: 2,
              pointerEvents: UIPage || showNeighborhoodPopup ? "auto" : "none",
            }}
          >
            {showNeighborhoodPopup && (
              <NeighborhoodPopup
                onClose={() => setShowNeighborhoodPopup(false)}
              />
            )}
            {(UIPage == "rewards" || (isExiting && UIPage === "rewards")) && (
              <RewardsComponent
                isExiting={isExiting}
                onClose={handleCloseComponent}
                setUIPage={setUIPage}
              />
            )}
            {(UIPage == "journal" || (isExiting && UIPage === "journal")) && (
              <JournalComponent
                isExiting={isExiting}
                token={token}
                onClose={handleCloseComponent}
              />
            )}
            {(UIPage == "bulletin" || (isExiting && UIPage === "bulletin")) && (
              <BulletinComponent
                isExiting={isExiting}
                onClose={handleCloseComponent}
              />
            )}
            {(UIPage == "challenges" ||
              (isExiting && UIPage === "challenges")) && (
              <ChallengesComponent
                isExiting={isExiting}
                onClose={handleCloseComponent}
              />
            )}
            {(UIPage == "start" || (isExiting && UIPage === "start")) && (
              <HackTimeComponent
                isExiting={isExiting}
                onClose={handleCloseComponent}
                userData={userData}
              />
            )}
          </div>

          <NeighborhoodEnvironment
            hasEnteredNeighborhood={hasEnteredNeighborhood}
            setHasEnteredNeighborhood={setHasEnteredNeighborhood}
          />
          <div>
            <div
              style={{
                height: "100vh",
                width: "100%",
                gap: 32,
                justifyContent: "space-between",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ position: "absolute", right: 16, top: 16 }}>
                {!hasEnteredNeighborhood && (
                  <img
                    style={{ width: 32, height: 32, cursor: "pointer" }}
                    src="logout.svg"
                    onClick={handleLogout}
                  />
                )}
              </div>

              <div style={{ position: "absolute", right: 16, bottom: 32 }}>
                {!hasEnteredNeighborhood && (
                  <button
                    onClick={() => setShowNeighborhoodPopup(true)}
                    style={{
                      padding: "8px 16px",
                      opacity: 0.3,
                      fontFamily: "M PLUS Rounded 1c",
                      fontSize: "24px",
                      border: "1px solid #FFF9E6",
                      background: "none",
                      cursor: "pointer",
                      backgroundColor: "#007C74",
                      backgroundColor: "#007C74",
                      color: "#FFF9E6",
                      fontWeight: "bold",
                      borderRadius: "8px",
                    }}
                  >
                    Explore Neighborhood
                  </button>
                )}
              </div>

              {!hasEnteredNeighborhood && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    paddingLeft: 32,
                    paddingTop: 32,
                    paddingRight: 32,
                    paddingBottom: 32,
                    height: "100%",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <img
                      style={{ width: 250, imageRendering: "pixelated" }}
                      src="./neighborhoodLogo.png"
                    />
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: isLoading ? "wait" : "pointer",
                          opacity: isLoading ? 0.5 : 1,
                        }}
                        onMouseEnter={() =>
                          !isLoading && setSelectedItem(item.id)
                        }
                        onMouseLeave={() => {}}
                        onClick={() =>
                          !isLoading && handleMenuItemClick(item.id)
                        }
                      >
                        <span
                          style={{
                            fontFamily: "M PLUS Rounded 1c",
                            fontSize: "24px",
                            color: "#FFF9E6",
                            visibility:
                              selectedItem === item.id ? "visible" : "hidden",
                            animation:
                              selectedItem === item.id
                                ? "blink 1s steps(1) infinite"
                                : "none",
                            fontWeight: "bold",
                          }}
                        >
                          {"●"}
                        </span>
                        <p
                          style={{
                            fontFamily: "M PLUS Rounded 1c",
                            fontSize: "32px",
                            color: "#F5F7E1",
                            fontWeight: "bold",
                          }}
                        >
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      padding: "8px 16px",
                      fontFamily: "M PLUS Rounded 1c",
                      fontSize: "24px",
                      background: "none",
                      display: "flex",
                      flexDirection: "row",
                      color: "#FFF9E6",
                      fontWeight: "bold",
                      borderRadius: "8px",
                      width: "fit-content",
                    }}
                  >
                    {/* Time Display */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "M PLUS Rounded 1c",
                          fontSize: "24px",
                          color: "#FFF9E6",
                          fontWeight: "bold",
                          margin: 0,
                          alignSelf: "flex-end",
                          justifySelf: "flex-end",
                        }}
                      >
                        {currentTime}
                      </p>
                      <span
                        style={{
                          fontFamily: "M PLUS Rounded 1c",
                          fontSize: "16px",
                          marginLeft: "4px",
                          fontWeight: "bold",
                          justifySelf: "flex-end",
                          alignSelf: "flex-end",
                          paddingBottom: 4,
                        }}
                      >
                        {isAM ? "am" : "pm"}
                      </span>
                    </div>

                    {/* Weather Icon */}
                    <div
                      className="weathericon"
                      style={{
                        height: "100%",
                      }}
                    >
                      <img
                        style={{
                          height: "100%",
                          paddingLeft: 8,
                        }}
                        src={weatherTexture}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <style jsx global>{`
              @keyframes blink {
                0% {
                  visibility: visible;
                }
                50% {
                  visibility: hidden;
                }
                100% {
                  visibility: visible;
                }
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
          </div>
        </>
      ) : (
        <SignupComponent />
      )}
    </>
  );
}
