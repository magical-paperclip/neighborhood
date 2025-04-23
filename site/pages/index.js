import Head from "next/head";
import Image from "next/image";
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

export default function Home() {
  return (
    <>
      <Head>
        <title>Neighborhood</title>
        <meta name="description" content="howdy, this is the neighborhood" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div style={{display: 'flex', height: "100vh", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
        <video controls style={{width: 300}} src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/90566630dd0e9f5b3cfb53d48cc32a1ad8daefb5_img_3248.mp4"/>
        <br/>
        <i>"somewhere new"</i>
      </div>
    </>
  );
}
