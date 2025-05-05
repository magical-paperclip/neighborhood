import { useGLTF } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import * as THREE from "three";
import createToonGradient from "../../utils/createToonGradient";
import { RigidBody } from "@react-three/rapier";

export default function MapModel({ onLoad }) {
    const { scene: mapModel } = useGLTF("/models/sf_map_3.glb");
    const toonGradient = useMemo(() => createToonGradient(), []);
    
    useEffect(() => {
      if (mapModel) {
        
        // Add toon shading to materials
        mapModel.traverse((child) => {
          if (child.isMesh) {
            const originalMaterial = child.material;
            child.material = new THREE.MeshToonMaterial({
              map: originalMaterial.map,
              normalMap: originalMaterial.normalMap,
              gradientMap: toonGradient,
              side: THREE.DoubleSide,
              color: originalMaterial.color,
              transparent: originalMaterial.transparent,
              opacity: originalMaterial.opacity,
            });
          }
        });
        
        onLoad?.();
      }
    }, [mapModel, toonGradient, onLoad]);
    
    return (
    <RigidBody type="fixed" colliders="trimesh"
      friction={0.5} restitution={0.1} sensor={false}>
      <primitive object={mapModel} scale={[2,2,2]} position={[0,-0.01,0]}/>
    </RigidBody>
    );
  }