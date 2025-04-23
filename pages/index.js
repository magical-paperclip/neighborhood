import Head from "next/head";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import NeighborhoodEnvironment from "@/components/NeighborhoodEnvironment";
import { useState } from "react";

export default function Home() {
  const [hasEnteredNeighborhood, setHasEnteredNeighborhood] = useState(false);

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
        <div style={{height: "100vh", width: "100%", gap: 32, justifyContent: "space-between", paddingTop: 32, paddingBottom: 32, display: "flex", flexDirection: "column", paddingLeft: 32}}>
        
        <div style={{position: "absolute", right: 16, bottom: 16}}>
          {!hasEnteredNeighborhood &&
          <button 
            style={{padding: "8px"}}
            onClick={() => setHasEnteredNeighborhood(true)}
          >
            Enter Neighborhood
          </button>}
        </div>

        {!hasEnteredNeighborhood &&
        <div style={{display: "flex", flexDirection: "column", gap: 16}}>
          <h1 style={{fontSize: 58, color: "#000"}}>Neighborhood</h1>
          <p style={{fontSize: 42, color: "#000"}}>Start Hacking</p>
          <p style={{fontSize: 42, color: "#000"}}>Bulletin Board</p>
          <p style={{fontSize: 42, color: "#000"}}>Journal</p>
          <p style={{fontSize: 42, color: "#000"}}>Rewards</p>
        </div>}

        {!hasEnteredNeighborhood &&
        <div>
          <p style={{color: "#000"}}>15 active rn</p>
        </div>}
        
        </div>
      </div>
    </>
  );
}
