import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import createToonGradient from "../../utils/createToonGradient";

export default function Clouds() {
    const cloudGroup = useRef();
    const toonGradient = useMemo(() => createToonGradient(), []);
    const clockRef = useRef(0);
    
    // Generate cloud data - balanced quantity and complexity
    const cloudData = useMemo(() => {
      const clouds = [];
      for (let i = 0; i < 25; i++) { // increased from 20
        const x = Math.random() * 180 - 90;
        const z = Math.random() * 180 - 90;
        const y = Math.random() * 5 + 25;
        
        const segments = 2 + Math.floor(Math.random() * 3);
        const parts = [];
        
        for (let j = 0; j < segments; j++) {
          const scale = 3 + Math.random() * 4;
          parts.push({
            position: [
              (Math.random() - 0.5) * 5,
              (Math.random() - 0.5) * 2,
              (Math.random() - 0.5) * 5
            ],
            scale: [scale, scale * 0.6, scale]
          });
        }
        
        clouds.push({ position: [x, y, z], parts });
      }
      return clouds;
    }, []);
    
    // Animate clouds - constant smooth motion
    useFrame((state) => {
      if (!cloudGroup.current) return;
      
      // Use proper delta time for smooth animation
      const delta = state.clock.getDelta();
      clockRef.current += delta;
      
      cloudGroup.current.children.forEach((cloudCluster, i) => {
        const speed = 0.005; // reduced speed but ensure constant motion
        cloudCluster.position.x += Math.sin(clockRef.current * 0.1 + i * 0.1) * speed;
        cloudCluster.position.z += Math.cos(clockRef.current * 0.1 + i * 0.1) * speed;
      });
    });
    
    return (
      <group ref={cloudGroup}>
        {cloudData.map((cloud, i) => (
          <group key={i} position={cloud.position}>
            {cloud.parts.map((part, j) => (
              <mesh key={j} position={part.position} scale={part.scale}>
                <sphereGeometry args={[1, 8, 8]} /> {/* better balance of geometry complexity */}
                <meshToonMaterial 
                  color={0xffffff}
                  gradientMap={toonGradient}
                  transparent={true}
                  opacity={0.9}
                  emissive={0xffffee}
                  emissiveIntensity={0.08} // increased from 0.05
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    );
  }