import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import Scene from "./threejs/Scene";

export default function NeighborhoodEnvironment({
  hasEnteredNeighborhood,
  setHasEnteredNeighborhood,
}) {
  const [isLoading, setIsLoading] = useState(true);
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
      }}
    >
      <Canvas
        camera={{
          fov: 45,
          near: 0.1,
          far: 1000,
          position: [2, 3, 1]
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          outputEncoding: THREE.sRGBEncoding,
          precision: "mediump" // medium precision for better balance
        }}
        dpr={[0.9, 1.75]} // adjusted for better balance
        shadows={false}
      >
        {/* Camera controls initial look target */}
        <CameraController />
        
        <Scene 
          hasEnteredNeighborhood={hasEnteredNeighborhood}
          setHasEnteredNeighborhood={setHasEnteredNeighborhood}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </Canvas>
      
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "16px",
            textAlign: "center",
          }}
        ></div>
      )}
    </div>
  );
}
// Camera controller component to set initial look target
function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.lookAt(-0.5, 2.4, 0);
  }, [camera]);
  
  return null;
}

