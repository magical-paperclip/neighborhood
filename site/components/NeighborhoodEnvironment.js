import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import Scene from "./threejs/Scene";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";

function CameraController() {
  const { camera } = useThree();
  camera.rotation.order = 'YXZ'; // This helps prevent gimbal lock
  return null;
}

export default function NeighborhoodEnvironment({
  hasEnteredNeighborhood,
  setHasEnteredNeighborhood,
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHasEnteredNeighborhood(false);
  }, []);

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
          position: [2, 2.4, 1]
        }}
        gl={{
          antialias: true,
          alpha: false,
          stencil: false,
          depth: true,
          powerPreference: "high-performance",
          physicallyCorrectLights: false,
        }}
        dpr={1} // Set to 1 for better performance
        frameloop="demand"
        performance={{ min: 0.5 }}
        shadows={false}
      >
        <Suspense>
          <Physics
            debug={false}
            gravity={[0, -30, 0]}
            maxStabilizationIterations={4}
            maxVelocityFriction={0.2}
            maxVelocityIterations={4}
          >
            <CameraController />
            <Scene 
              hasEnteredNeighborhood={hasEnteredNeighborhood}
              setHasEnteredNeighborhood={setHasEnteredNeighborhood}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </Physics>
        </Suspense>
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
        >Loading...</div>
      )}
    </div>
  );
}

