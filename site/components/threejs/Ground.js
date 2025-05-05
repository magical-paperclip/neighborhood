import { useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import createToonGradient from "../../utils/createToonGradient";

export default function Ground({ onLoad }) {
    const [texture, setTexture] = useState(null);
    const toonGradient = useMemo(() => createToonGradient(), []);
    
    useEffect(() => {
      const loader = new THREE.TextureLoader();
      loader.load(
        '/animal-crossing.png', 
        (loadedTexture) => {
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          loadedTexture.repeat.set(300, 300); // increased from 250, less than original 500
          setTexture(loadedTexture);
          if (onLoad) onLoad();
        },
        undefined,
        (error) => {
          console.error('Error loading ground texture:', error);
          if (onLoad) onLoad();
        }
      );
    }, [onLoad]);
    
    return (
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshToonMaterial
          map={texture}
          gradientMap={toonGradient}
          color={0x8dc63f}
          side={THREE.DoubleSide}
          emissive={0x1a4d1a}
          emissiveIntensity={0.15} // increased from 0.1
        />
      </mesh>
    );
  }