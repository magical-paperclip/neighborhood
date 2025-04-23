import Head from "next/head";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import NeighborhoodEnvironment from "@/components/NeighborhoodEnvironment";
import { useState } from "react";

export default function Home() {
  const [hasEnteredNeighborhood, setHasEnteredNeighborhood] = useState(false);
  const [selectedItem, setSelectedItem] = useState('start');

  const menuItems = [
    { id: 'start', text: 'Start Hacking' },
    { id: 'bulletin', text: 'Bulletin' },
    { id: 'journal', text: 'Journal' },
    { id: 'rewards', text: 'Rewards' }
  ];

  return (
    <>
      <Head>
        <title>Neighborhood</title>
        <meta name="description" content="a place we gather" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <NeighborhoodEnvironment 
        hasEnteredNeighborhood={hasEnteredNeighborhood} 
        setHasEnteredNeighborhood={setHasEnteredNeighborhood}
      />
      <div>
        <div style={{height: "100vh", width: "100%", gap: 32, justifyContent: "space-between", paddingTop: 16, paddingBottom: 16, display: "flex", flexDirection: "column", paddingLeft: 32}}>
        
        <div style={{position: "absolute", right: 16, bottom: 16}}>
          {!hasEnteredNeighborhood &&
          <button 
            style={{
              padding: "8px 16px",
              fontFamily: "M PLUS Rounded 1c",
              fontSize: "24px",
              border: "1px solid #FFF9E6",
              background: "none",
              cursor: "pointer",
              backgroundColor: "#007C74",
              color: "#FFF9E6",
              fontWeight: "bold",
              borderRadius: "8px"
            }}
            onClick={() => setHasEnteredNeighborhood(true)}
          >
            Enter Neighborhood
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
      `}</style>
    </>
  );
}
