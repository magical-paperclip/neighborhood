import { useRef } from "react";
import * as THREE from "three";
import Clouds from "./Clouds";
import Ground from "./Ground";
import MapModel from "./MapModel";
import PlayerModel from "./PlayerModel";
import OtherPlayers from "./OtherPlayers";
import Effects from "./Effects";
import { useThree, useFrame } from "@react-three/fiber";
import { useState, useEffect, useMemo } from "react";
import { socketManager } from "../../utils/socketManager";
import { Html } from "@react-three/drei";

function CameraController() {
  const { camera } = useThree();
  camera.rotation.order = 'YXZ';
  return null;
}

// Particle system component
function MagicParticles({ position, isMoving }) {
  const particlesRef = useRef();
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 50; i++) {
      const particle = {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          Math.random() * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        size: Math.random() * 0.1 + 0.05,
        color: new THREE.Color(
          Math.random() * 0.5 + 0.5,
          Math.random() * 0.5 + 0.5,
          1
        ),
        life: 1.0
      };
      temp.push(particle);
    }
    return temp;
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current || !isMoving) return;

    particles.forEach((particle, i) => {
      if (particle.life <= 0) {
        // Reset particle
        particle.position.copy(position);
        particle.velocity.set(
          (Math.random() - 0.5) * 0.02,
          Math.random() * 0.02,
          (Math.random() - 0.5) * 0.02
        );
        particle.life = 1.0;
      } else {
        // Update particle
        particle.position.add(particle.velocity);
        particle.life -= delta * 2;
      }
    });

    // Update geometry
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);

    particles.forEach((particle, i) => {
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      colors[i * 3] = particle.color.r;
      colors[i * 3 + 1] = particle.color.g;
      colors[i * 3 + 2] = particle.color.b;

      sizes[i] = particle.size * particle.life;
    });

    particlesRef.current.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particlesRef.current.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );
    particlesRef.current.geometry.setAttribute(
      "size",
      new THREE.BufferAttribute(sizes, 1)
    );
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length}
          array={new Float32Array(particles.length * 3)}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.length}
          array={new Float32Array(particles.length * 3)}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particles.length}
          array={new Float32Array(particles.length)}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function Scene({ 
  hasEnteredNeighborhood, 
  setHasEnteredNeighborhood, 
  isLoading, 
  setIsLoading,
  connectionStatus,
  otherPlayers,
  simonSaysState
}) {
    const { scene, camera, gl } = useThree();
    const containerRef = useRef(new THREE.Object3D());
    const fadeTimeRef = useRef(null);
    const assetsLoadedRef = useRef({ texture: false, map: false, player: false });
    const [pointerLocked, setPointerLocked] = useState(false);
    const debug = false; // Debug flag
    
    // Debug logging helper
    const log = (...args) => {
      if (debug) {
        console.log('[Scene]', ...args);
      }
    };
    
    // Camera control refs
    const rotationRef = useRef(0);  // Yaw rotation
    const pitchRef = useRef(0);     // Pitch rotation
    
    // Camera control constants
    const MOUSE_SENSITIVITY = 0.002;
    const PITCH_LIMIT = Math.PI/3; // Limit vertical rotation to 60 degrees
    
    // Movement state - track key states but let PlayerModel handle the actual movement
    const [moveState, setMoveState] = useState({
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false,
      escape: false
    });
    
    // Memoize moveState to prevent unnecessary re-renders
    const memoizedMoveState = useMemo(() => moveState, [
      moveState.w,
      moveState.a,
      moveState.s,
      moveState.d,
      moveState.shift,
      moveState.space,
      moveState.escape
    ]);
    
    // Camera settings
    const cameraSettings = useMemo(() => ({
      start: {
        position: new THREE.Vector3(2, 2.4, 1),
        lookAt: new THREE.Vector3(-0.5, 2.5, 0),
        fov: 45,
      },
      end: {
        position: new THREE.Vector3(0, 3, 6),
        offset: new THREE.Vector3(0, 3, 6),
        fov: 75,
      },
    }), []);
    
    // Cached vectors for camera calculations to avoid object creation
    const cameraPos = useMemo(() => new THREE.Vector3(), []);
    const lookAtTarget = useMemo(() => new THREE.Vector3(), []);
    const currentPosition = useMemo(() => new THREE.Vector3(), []);
    const currentLookAt = useMemo(() => new THREE.Vector3(), []);
    
    // Game startup
    const gameplayLookAtOffset = useMemo(() => new THREE.Vector3(0, 2, 0), []);
    const startTimeRef = useRef(null);
    
    // Basic mouse movement handling without pointer lock dependencies
    useEffect(() => {
      const canvas = gl.domElement;
      
      // Direct mouse movement handler
      const handleMouseMove = (e) => {
        if (hasEnteredNeighborhood && document.pointerLockElement === canvas) {
          const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
          const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
          
          rotationRef.current -= movementX * MOUSE_SENSITIVITY;
          pitchRef.current += movementY * MOUSE_SENSITIVITY;
          pitchRef.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitchRef.current));
        }
      };
      
      // Capture click to make control more responsive
      const handleClick = (e) => {
        // Check if we clicked on a UI element
        const isUIElement = e.target.closest('[data-ui-element="true"]');
        if (isUIElement) {
          // If we're clicking UI, exit pointer lock
          document.exitPointerLock();
          return;
        }

        // Only lock pointer if we're in the neighborhood and not clicking UI
        if (canvas && hasEnteredNeighborhood && document.pointerLockElement !== canvas) {
          try {
            canvas.requestPointerLock();
          } catch (error) {
            console.log('Failed to request pointer lock:', error);
          }
        }
      };
      
      // Handle pointer lock change
      const handlePointerLockChange = () => {
        setPointerLocked(document.pointerLockElement === canvas);
      };

      // Handle pointer lock error
      const handlePointerLockError = (error) => {
        console.log('Pointer lock error:', error);
      };
      
      // Set up event listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('click', handleClick);
      document.addEventListener('pointerlockchange', handlePointerLockChange);
      document.addEventListener('pointerlockerror', handlePointerLockError);
      
      // Initial request
      setTimeout(() => {
        if (canvas && hasEnteredNeighborhood && !document.pointerLockElement) {
          canvas.requestPointerLock();
        }
      }, 500);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('click', handleClick);
        document.removeEventListener('pointerlockchange', handlePointerLockChange);
        document.removeEventListener('pointerlockerror', handlePointerLockError);
      };
    }, [gl, hasEnteredNeighborhood]);
    
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
            setMoveState(prev => ({ ...prev, space: true }));
            break;
          case "escape":
            // Do nothing when ESC is pressed
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
            // Do nothing when ESC is released
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
    
    // Performance throttling for camera updates
    const lastCameraUpdate = useRef(0);
    const CAMERA_UPDATE_INTERVAL = 1000 / 60; // 60fps target for camera
    
    // Handle camera updates
    useFrame((_, delta) => {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
      const progress = Math.min(elapsedTime, 1);
      
      // Smooth easing
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      // Throttle camera updates for better performance
      const now = performance.now();
      const shouldUpdateCamera = now - lastCameraUpdate.current >= CAMERA_UPDATE_INTERVAL;
      
      // Never change camera based on pointer lock state - PlayerModel handles the camera
      // This ensures ESC doesn't affect the camera
      if (hasEnteredNeighborhood && !isLoading) {
        return; // Let PlayerModel handle all camera controls when in game
      }
      
      if (shouldUpdateCamera) {
        lastCameraUpdate.current = now;
        
        if (hasEnteredNeighborhood && !isLoading) {
          // Interpolate FOV
          camera.fov = THREE.MathUtils.lerp(
            cameraSettings.start.fov,
            cameraSettings.end.fov,
            eased
          );
          camera.updateProjectionMatrix();
          
          // Update camera position
          if (progress === 1) {
            const cameraAngle = containerRef.current.rotation.y;
            const distance = 6;
            const height = 3;
            
            cameraPos.set(
              containerRef.current.position.x - Math.sin(cameraAngle) * distance,
              containerRef.current.position.y + height,
              containerRef.current.position.z - Math.cos(cameraAngle) * distance
            );
            camera.position.copy(cameraPos);
            
            lookAtTarget.set(
              containerRef.current.position.x + Math.sin(cameraAngle) * gameplayLookAtOffset.z,
              containerRef.current.position.y + gameplayLookAtOffset.y,
              containerRef.current.position.z + Math.cos(cameraAngle) * gameplayLookAtOffset.z
            );
            camera.lookAt(lookAtTarget);
          } else {
            // During transition
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
          currentPosition.lerpVectors(
            new THREE.Vector3(
              -Math.sin(containerRef.current.rotation.y) * 4,
              3.4, // Lowered from 3.7 to 3.4
              -Math.cos(containerRef.current.rotation.y) * 4
            ),
            cameraSettings.start.position,
            eased
          );
          camera.position.copy(currentPosition);
          
          currentLookAt.lerpVectors(
            new THREE.Vector3(0, 2.0, 0), // Raised from 1.5 to 2.0 to make camera look less downward
            cameraSettings.start.lookAt,
            eased
          );
          camera.lookAt(currentLookAt);
        }
      }
    });
    
    // Handle asset loading completion
    const handleAssetLoaded = (assetType) => {
      assetsLoadedRef.current[assetType] = true;
      
      // Check if all assets are loaded
      const allLoaded = Object.values(assetsLoadedRef.current).every(Boolean);
      if (allLoaded && isLoading) {
        log('All assets loaded, completing loading state');
        setIsLoading(false);
        fadeTimeRef.current = Date.now();
      }
    };
    
    // Debug asset loading
    useEffect(() => {
      if (debug) {
        const allLoaded = Object.values(assetsLoadedRef.current).every(Boolean);
        if (allLoaded) {
          log('Loading state:', {
            isLoading,
            hasEnteredNeighborhood
          });
        }
      }
    }, [isLoading, hasEnteredNeighborhood]);

    return (
      <>
        <CameraController />
        <ambientLight color={0xf4ccff} intensity={1.2} />
        <directionalLight position={[5, 5, 5]} intensity={1.1} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} />
        
        <Clouds />
        <Ground onLoad={() => handleAssetLoaded('texture')} />
        <MapModel onLoad={() => handleAssetLoaded('map')} />
        
        <PlayerModel 
          moveState={memoizedMoveState}
          containerRef={containerRef}
          onLoad={() => handleAssetLoaded('player')}
          hasEnteredNeighborhood={hasEnteredNeighborhood}
          rotationRef={rotationRef}
          pitchRef={pitchRef}
        />

        {hasEnteredNeighborhood && !isLoading && (
          <>
            <OtherPlayers 
              players={otherPlayers} 
              key={otherPlayers.size}
            />
            <MagicParticles 
              position={containerRef.current?.position || new THREE.Vector3()}
              isMoving={memoizedMoveState.w || memoizedMoveState.a || memoizedMoveState.s || memoizedMoveState.d}
            />
          </>
        )}
        
        <Effects isLoading={isLoading} fadeTimeRef={fadeTimeRef} />
      </>
    );
  }