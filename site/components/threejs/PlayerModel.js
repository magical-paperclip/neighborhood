import { useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import createToonGradient from "../../utils/createToonGradient";

export default function PlayerModel({ onLoad, containerRef, moveState }) {
    const { scene: playerModel, animations } = useGLTF("/models/player.glb");
    const { actions, mixer } = useAnimations(animations, playerModel);
    const toonGradient = useMemo(() => createToonGradient(), []);
    const currentAnimRef = useRef('idle');
    const lastAnimChangeTime = useRef(0);
    const animationNamesRef = useRef({ idle: null, run: null });
    
    // Configure animations on first load
    useEffect(() => {
      if (!playerModel || !mixer || !actions || Object.keys(actions).length === 0) return;
      
      // Find animation names once and store them
      const idleAnimName = Object.keys(actions).find(name => 
        name.toLowerCase().includes('idle')
      );
      
      const runAnimName = Object.keys(actions).find(name => 
        name.toLowerCase().includes('run')
      );
      
      // Store animation names for later use
      animationNamesRef.current = {
        idle: idleAnimName,
        run: runAnimName
      };
      
      console.log("Found animations:", {
        idle: idleAnimName,
        run: runAnimName
      });
      
      // Configure all animations for proper looping
      Object.keys(actions).forEach(name => {
        const action = actions[name];
        action.loop = THREE.LoopRepeat;  // Make animation loop continuously
        action.clampWhenFinished = false; // Don't freeze on last frame
        action.zeroSlopeAtEnd = false;    // Don't flatten end transition
        action.zeroSlopeAtStart = false;  // Don't flatten start transition
      });
      
      // Start with idle animation
      if (idleAnimName) {
        actions[idleAnimName].play();
        currentAnimRef.current = 'idle';
      }
      
    }, [playerModel, actions, mixer]);
    
    // Handle model setup
    useEffect(() => {
      if (playerModel) {
        playerModel.scale.set(0.027, 0.027, 0.027);
        playerModel.rotation.y = (Math.PI / 4) * -1;
        
        // Add toon shading
        playerModel.traverse((child) => {
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
        
        // Add to container
        containerRef.current.add(playerModel);
        
        // Log available animations
        console.log("Available animations:", Object.keys(actions));
              
        onLoad?.();
        
        // Cleanup
        return () => {
          containerRef.current.remove(playerModel);
        };
      }
    }, [playerModel, actions, toonGradient, containerRef, onLoad]);
    
    // Handle animation changes with useFrame for smoother transitions
    useFrame((state) => {
      // Skip if no actions available
      if (!actions || Object.keys(actions).length === 0 || !mixer) return;
      
      // Update mixer with proper delta time
      mixer.update(state.clock.getDelta());
      
      // Check if player is moving
      const isMoving = moveState.w || moveState.s;
      
      // Get cached animation names
      const { idle: idleAnimName, run: runAnimName } = animationNamesRef.current;
      if (!idleAnimName || !runAnimName) return;
      
      // Don't switch animations too frequently (debounce)
      if (state.clock.elapsedTime - lastAnimChangeTime.current < 0.5) {
        return;
      }
      
      // Handle animation transitions when movement state changes
      if (isMoving && currentAnimRef.current !== 'run') {
        console.log("Switching to run animation");
        
        // Smoothly crossfade between animations without resetting
        actions[idleAnimName].fadeOut(0.5);
        actions[runAnimName].reset().fadeIn(0.5).play();
        
        currentAnimRef.current = 'run';
        lastAnimChangeTime.current = state.clock.elapsedTime;
        
      } else if (!isMoving && currentAnimRef.current !== 'idle') {
        console.log("Switching to idle animation");
        
        // Smoothly crossfade between animations without resetting
        actions[runAnimName].fadeOut(0.5);
        actions[idleAnimName].reset().fadeIn(0.5).play();
        
        currentAnimRef.current = 'idle';
        lastAnimChangeTime.current = state.clock.elapsedTime;
      }
    });
    
    return null;
  }