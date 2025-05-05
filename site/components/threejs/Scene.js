import { useRef } from "react";
import * as THREE from "three";
import Clouds from "./Clouds";
import Ground from "./Ground";
import MapModel from "./MapModel";
import PlayerModel from "./PlayerModel";
import Effects from "./Effects";
import { useThree, useFrame } from "@react-three/fiber";
import { useState, useEffect } from "react";

export default function Scene({ hasEnteredNeighborhood, setHasEnteredNeighborhood, isLoading, setIsLoading }) {
    const { scene, camera } = useThree();
    const containerRef = useRef(new THREE.Object3D());
    const fadeTimeRef = useRef(null);
    
    // Movement state - use state instead of ref to trigger re-renders
    const [moveState, setMoveState] = useState({
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false,
      escape: false
    });
    
    // Jump state
    const jumpState = useRef({
      isJumping: false,
      jumpVelocity: 0,
      groundY: 0
    });
    
    // Movement settings
    const movementSettings = {
      moveSpeed: 0.05,
      sprintSpeed: 0.1,
      rotationSpeed: 0.02,
      jumpHeight: 0.5,
      gravity: 0.015,
    };
    
    // Camera settings
    const cameraSettings = {
      start: {
        position: new THREE.Vector3(2, 3, 1),
        lookAt: new THREE.Vector3(-0.5, 2.4, 0),
        fov: 45,
      },
      end: {
        position: new THREE.Vector3(0, 3, 6),
        offset: new THREE.Vector3(0, 3, 6),
        fov: 75,
      },
    };
    
    // Game startup
    const gameplayLookAtOffset = new THREE.Vector3(0, 2, 0);
    const startTimeRef = useRef(null);
    
    // Setup scene
    useEffect(() => {
      // Set background color - start with a visible color (light blue) instead of black
      scene.background = new THREE.Color(0x88d7ee);
      
      // Add fog with lighter color
      const fogColor = new THREE.Color(0xfff0e0);
      scene.fog = new THREE.FogExp2(fogColor, 0.008); // Reduced density
      
      // Add container to scene
      scene.add(containerRef.current);
      containerRef.current.position.y = 0;
      
      // Keyboard event handlers
      const handleKeyDown = (event) => {
        if (!hasEnteredNeighborhood || isLoading) return;
        
        switch (event.key.toLowerCase()) {
          case "w":
            setMoveState(prev => ({ ...prev, w: true }));
            break;
          case "a":
            setMoveState(prev => ({ ...prev, a: true }));
            break;
          case "s":
            setMoveState(prev => ({ ...prev, s: true }));
            break;
          case "d":
            setMoveState(prev => ({ ...prev, d: true }));
            break;
          case "shift":
            setMoveState(prev => ({ ...prev, shift: true }));
            break;
          case " ":
            if (!jumpState.current.isJumping) {
              jumpState.current.isJumping = true;
              jumpState.current.jumpVelocity = movementSettings.jumpHeight;
            }
            setMoveState(prev => ({ ...prev, space: true }));
            break;
          case "escape":
            setMoveState(prev => ({ ...prev, escape: true }));
            setHasEnteredNeighborhood(false);
            break;
        }
      };
      
      const handleKeyUp = (event) => {
        switch (event.key.toLowerCase()) {
          case "w":
            setMoveState(prev => ({ ...prev, w: false }));
            break;
          case "a":
            setMoveState(prev => ({ ...prev, a: false }));
            break;
          case "s":
            setMoveState(prev => ({ ...prev, s: false }));
            break;
          case "d":
            setMoveState(prev => ({ ...prev, d: false }));
            break;
          case "shift":
            setMoveState(prev => ({ ...prev, shift: false }));
            break;
          case " ":
            setMoveState(prev => ({ ...prev, space: false }));
            break;
          case "escape":
            setMoveState(prev => ({ ...prev, escape: false }));
            break;
        }
      };
      
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        scene.remove(containerRef.current);
      };
    }, [scene, hasEnteredNeighborhood, isLoading, setIsLoading, setHasEnteredNeighborhood]);
    
    // Handle movement and camera updates
    useFrame((_, delta) => {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
      const progress = Math.min(elapsedTime, 1);
      
      // Smooth easing
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      if (hasEnteredNeighborhood && !isLoading) {
        const { moveSpeed, sprintSpeed, rotationSpeed, gravity } = movementSettings;
        
        // Interpolate FOV
        camera.fov = THREE.MathUtils.lerp(
          cameraSettings.start.fov,
          cameraSettings.end.fov,
          eased
        );
        camera.updateProjectionMatrix();
        
        // Handle rotation
        if (moveState.a) {
          containerRef.current.rotation.y += rotationSpeed;
        }
        if (moveState.d) {
          containerRef.current.rotation.y -= rotationSpeed;
        }
        
        // Calculate forward direction
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(containerRef.current.quaternion);
        
        // Handle movement
        const currentSpeed = moveState.shift ? sprintSpeed : moveSpeed;
        if (moveState.w) {
          containerRef.current.position.add(forward.clone().multiplyScalar(currentSpeed));
        }
        if (moveState.s) {
          containerRef.current.position.add(forward.clone().multiplyScalar(-currentSpeed));
        }
        
        // Handle jumping
        if (jumpState.current.isJumping) {
          containerRef.current.position.y += jumpState.current.jumpVelocity;
          jumpState.current.jumpVelocity -= gravity;
          
          if (containerRef.current.position.y <= jumpState.current.groundY) {
            containerRef.current.position.y = jumpState.current.groundY;
            jumpState.current.isJumping = false;
            jumpState.current.jumpVelocity = 0;
          }
        }
        
        // Update camera position
        if (progress === 1) {
          const cameraAngle = containerRef.current.rotation.y;
          const distance = 6;
          const height = 3;
          
          camera.position.set(
            containerRef.current.position.x - Math.sin(cameraAngle) * distance,
            containerRef.current.position.y + height,
            containerRef.current.position.z - Math.cos(cameraAngle) * distance
          );
          
          const lookAtTarget = new THREE.Vector3(
            containerRef.current.position.x + Math.sin(cameraAngle) * gameplayLookAtOffset.z,
            containerRef.current.position.y + gameplayLookAtOffset.y,
            containerRef.current.position.z + Math.cos(cameraAngle) * gameplayLookAtOffset.z
          );
          camera.lookAt(lookAtTarget);
        } else {
          // During transition
          const currentPosition = new THREE.Vector3();
          currentPosition.lerpVectors(
            cameraSettings.start.position,
            new THREE.Vector3(
              containerRef.current.position.x - Math.sin(containerRef.current.rotation.y) * 4,
              containerRef.current.position.y + 4,
              containerRef.current.position.z - Math.cos(containerRef.current.rotation.y) * 4
            ),
            eased
          );
          camera.position.copy(currentPosition);
          
          const startLookAt = cameraSettings.start.lookAt;
          const endLookAt = new THREE.Vector3(
            containerRef.current.position.x,
            containerRef.current.position.y + 0.5,
            containerRef.current.position.z
          );
          const currentLookAt = new THREE.Vector3();
          currentLookAt.lerpVectors(startLookAt, endLookAt, eased);
          camera.lookAt(currentLookAt);
        }
      } else {
        // Reset positions when exiting
        if (containerRef.current) {
          containerRef.current.position.set(0, 1.0, 0);
          containerRef.current.rotation.set(0, 0, 0);
        }
        
        // Transition camera back
        const currentPosition = new THREE.Vector3();
        currentPosition.lerpVectors(
          new THREE.Vector3(
            -Math.sin(containerRef.current.rotation.y) * 4,
            4,
            -Math.cos(containerRef.current.rotation.y) * 4
          ),
          cameraSettings.start.position,
          eased
        );
        camera.position.copy(currentPosition);
        
        const currentLookAt = new THREE.Vector3();
        currentLookAt.lerpVectors(
          new THREE.Vector3(0, 0.5, 0),
          cameraSettings.start.lookAt,
          eased
        );
        camera.lookAt(currentLookAt);
      }
    });
    
    // Asset loading state tracking
    const [assetsLoaded, setAssetsLoaded] = useState({ texture: false, map: false, player: false });
    
    useEffect(() => {
      if (assetsLoaded.texture && assetsLoaded.map && assetsLoaded.player && isLoading) {
        setIsLoading(false);
        fadeTimeRef.current = Date.now();
      }
    }, [assetsLoaded, isLoading, setIsLoading]);
    
    // Debug - log movement state changes
    useEffect(() => {
      console.log("Movement state updated:", moveState);
    }, [moveState]);
    
    return (
      <>
        {/* Scene lights - balanced intensity */}
        <ambientLight color={0xf4ccff} intensity={1.2} /> {/* increased from 1.0 */}
        <directionalLight position={[5, 5, 5]} intensity={1.1} /> {/* increased from 1.0 */}
        <pointLight position={[-5, 5, -5]} intensity={0.5} /> {/* added back but with lower intensity */}
        
        {/* Clouds */}
        <Clouds />
        
        {/* Ground */}
        <Ground onLoad={() => setAssetsLoaded(prev => ({ ...prev, texture: true }))} />
        
        {/* Map */}
        <MapModel onLoad={() => setAssetsLoaded(prev => ({ ...prev, map: true }))} />
        
        {/* Player model */}
        <PlayerModel 
          containerRef={containerRef} 
          moveState={moveState}
          onLoad={() => setAssetsLoaded(prev => ({ ...prev, player: true }))}
        />
        
        {/* Post-processing effects */}
        <Effects isLoading={isLoading} fadeTimeRef={fadeTimeRef} />
      </>
    );
  }