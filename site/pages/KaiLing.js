import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BOARD_BAR_HEIGHT = 50;

export default function KaiLing() {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable}`}>
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
          backgroundColor: "#ffffff",
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
            backgroundColor: "#ffffff",
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
            <p style={{fontSize: 18, color: "#000", margin: 0}}>Bulletin</p>
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
            backgroundColor: "#ffffff"
          }}>
            <p style={{ color: "#000", fontSize: "16px" }}>Hello World</p>
          </div>
        </div>
      </div>
    </div>
  );
} 