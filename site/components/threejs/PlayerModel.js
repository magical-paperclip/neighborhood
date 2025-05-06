"use client";
import { useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import createToonGradient from "../../utils/createToonGradient";
import { RigidBody, CapsuleCollider, useRapier } from "@react-three/rapier";
import { socketManager } from "../../utils/socketManager";
import { loadPlayerModel, getPlayerModelClone, getCachedAnimations, setCachedModel } from "../../utils/playerCloning";

export default function PlayerModel({ onLoad, moveState, containerRef, hasEnteredNeighborhood }) {
  const toonGradient = useMemo(() => createToonGradient(), []);
  const onLoadCalledRef = useRef(false);
  
  // Load the model using useGLTF hook
  const { scene: rawModel, animations } = useGLTF('/models/player.glb');
  
  // Set the cached model on first load
  useEffect(() => {
    if (rawModel && animations) {
      setCachedModel(rawModel, animations);
    }
  }, [rawModel, animations]);
  
  // Memoize the player model to prevent recreation on every frame
  const playerModel = useMemo(() => {
    if (!rawModel) return null;
    return getPlayerModelClone(rawModel, toonGradient);
  }, [rawModel, toonGradient]);

  const { actions, mixer } = useAnimations(animations, playerModel);
  const currentAnimRef = useRef(null);
  const primitiveRef = useRef();
  const rigidBodyRef = useRef();
  const runningRef = useRef(false);
  const { rapier, world } = useRapier();
  const isGroundedRef = useRef(false);
  const jumpCooldownRef = useRef(0);
  const { camera, gl } = useThree();
  const debug = true;
  
  // Mouse control
  const rotationRef = useRef(0); // Yaw rotation only
  const pitchRef = useRef(0);    // Pitch rotation (up/down)
  const canvasRef = useRef(null);
  
  // Performance optimization for physics
  const lastPhysicsUpdate = useRef(0);
  const lastNetworkUpdate = useRef(0);
  const PHYSICS_UPDATE_INTERVAL = 1000 / 60; // Target 60 fps for physics
  const NETWORK_UPDATE_INTERVAL = 1000 / 20; // Target 20 fps for network updates
  
  // Cache vectors to prevent garbage collection
  const moveDir = useMemo(() => new THREE.Vector3(), []);
  const targetVelocity = useMemo(() => new THREE.Vector3(), []);
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const rayDir = useMemo(() => new THREE.Vector3(0, -1, 0), []);
  const sideDir = useMemo(() => new THREE.Vector3(), []);
  const cameraPos = useMemo(() => new THREE.Vector3(), []);
  const lookAtPos = useMemo(() => new THREE.Vector3(), []);
  
  // Movement constants
  const MOVE_SPEED = 12;
  const JUMP_FORCE = 12;
  const CHARACTER_HEIGHT = 0.6;
  const DAMPING = 0.85;
  const LERP_FACTOR = 0.2;
  const GROUND_CHECK_DISTANCE = 1.5;
  const JUMP_COOLDOWN = 800;
  const GROUND_THRESHOLD = 0.7;
  
  // Camera settings
  const CAMERA_DISTANCE = 12;  // Increased distance (was 7)
  const CAMERA_HEIGHT = 4;    // Moderate height
  const MOUSE_SENSITIVITY = 0.002;
  const PITCH_LIMIT = Math.PI/3; // Limit vertical rotation to 60 degrees
  
  const log = (...args) => {
    if (debug) {
      console.log('[PlayerModel]', ...args);
    }
  };
  
  // Basic mouse movement handling without pointer lock dependencies
  useEffect(() => {
    canvasRef.current = gl.domElement;
    
    // Direct mouse movement handler
    const handleMouseMove = (e) => {
      // Only process mouse movement if hasEnteredNeighborhood is true
      if (hasEnteredNeighborhood && document.pointerLockElement === canvasRef.current) {
        // Pointer is locked - use movementX/Y directly
        const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
        
        // Apply horizontal rotation (yaw)
        rotationRef.current -= movementX * MOUSE_SENSITIVITY;
        
        // Apply vertical rotation (pitch) with limits
        pitchRef.current += movementY * MOUSE_SENSITIVITY;
        
        // Apply limits to prevent over-rotation
        pitchRef.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitchRef.current));
      }
    };
    
    // Capture click to make control more responsive
    const handleClick = () => {
      if (canvasRef.current && hasEnteredNeighborhood) {
        try {
          canvasRef.current.requestPointerLock();
        } catch (error) {
          // Ignore errors
        }
      }
    };
    
    // Set up event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    
    // Initial request
    setTimeout(() => {
      if (canvasRef.current && hasEnteredNeighborhood) {
        canvasRef.current.requestPointerLock();
      }
    }, 500);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
    };
  }, [gl, hasEnteredNeighborhood]);
  
  // Configure animations on first load
  useEffect(() => {
    if (!playerModel || !mixer || !actions || Object.keys(actions).length === 0) {
      log('Waiting for model/animations to be ready');
      return;
    }
    
    const idleAnimName = Object.keys(actions).find(name => 
      name.toLowerCase().includes('idle')
    );
    
    const runAnimName = Object.keys(actions).find(name => 
      name.toLowerCase().includes('run')
    );
    
    if (!idleAnimName || !runAnimName) {
      log('Could not find required animations');
      return;
    }
    
    // Only configure animations once
    if (!onLoadCalledRef.current) {
      log('Configuring animations');
      [idleAnimName, runAnimName].forEach(name => {
        const action = actions[name];
        action.loop = THREE.LoopRepeat;
        action.clampWhenFinished = false;
      });
      
      actions[idleAnimName].play();
      currentAnimRef.current = 'idle';
      
      log('Calling onLoad callback');
      onLoad?.();
      onLoadCalledRef.current = true;
    }
  }, [playerModel, actions, mixer, onLoad]);
  
  // Memoized animation name lookups for performance
  const animationNames = useMemo(() => {
    if (!actions) return { idle: null, run: null };
    
    const idleAnimName = Object.keys(actions).find(name => 
      name.toLowerCase().includes('idle')
    );
    
    const runAnimName = Object.keys(actions).find(name => 
      name.toLowerCase().includes('run')
    );
    
    return { idle: idleAnimName, run: runAnimName };
  }, [actions]);
  
  // Calculate perpendicular strafing direction
  const getStrafeDirection = (forward, side) => {
    const strafeDir = new THREE.Vector3(-forward.z, 0, forward.x);
    strafeDir.multiplyScalar(side);
    return strafeDir;
  };
  
  useFrame((_, delta) => {
    if (!rigidBodyRef.current || !containerRef.current) return;

    const now = performance.now();
    
    // Update jump cooldown
    if (jumpCooldownRef.current > 0) {
      jumpCooldownRef.current = Math.max(0, jumpCooldownRef.current - (now - lastPhysicsUpdate.current));
    }
    
    const shouldUpdatePhysics = now - lastPhysicsUpdate.current >= PHYSICS_UPDATE_INTERVAL;
    const shouldUpdateNetwork = now - lastNetworkUpdate.current >= NETWORK_UPDATE_INTERVAL;
    
    if (shouldUpdatePhysics) {
      lastPhysicsUpdate.current = now;
      
      const rigidBody = rigidBodyRef.current;
      const currentVel = rigidBody.linvel();
      const pos = rigidBody.translation();

      // Apply player rotation based on neighborhood state
      if (hasEnteredNeighborhood) {
        // Apply player rotation from mouse movement
        containerRef.current.rotation.y = rotationRef.current;
        
        if (primitiveRef.current) {
          primitiveRef.current.rotation.y = rotationRef.current - Math.PI/2;
        }
        
        // Camera positioning for gameplay
        const direction = new THREE.Vector3(
          -Math.sin(rotationRef.current),
          Math.sin(pitchRef.current),
          -Math.cos(rotationRef.current)
        );
        direction.normalize();
        
        cameraPos.set(
          pos.x + direction.x * CAMERA_DISTANCE * Math.cos(pitchRef.current),
          pos.y + CAMERA_HEIGHT + direction.y * CAMERA_DISTANCE,
          pos.z + direction.z * CAMERA_DISTANCE * Math.cos(pitchRef.current)
        );
        
        camera.position.copy(cameraPos);
        
        lookAtPos.set(
          pos.x,
          pos.y + 1 + Math.sin(pitchRef.current) * 2,
          pos.z
        );
        
        camera.lookAt(lookAtPos);
      } else {
        // Make player face the camera when not in neighborhood
        // Calculate angle from player to camera
        const cameraPosition = camera.position;
        const directionToCamera = new THREE.Vector3(
          cameraPosition.x - pos.x,
          0, // Ignore Y component for horizontal rotation
          cameraPosition.z - pos.z
        ).normalize();
        
        // Calculate rotation angle
        const angleToCamera = Math.atan2(directionToCamera.x, directionToCamera.z);
        
        // Apply rotation to face camera with a slight offset to the right (negative angle)
        const rightwardOffset = -0.3; // Adjust this value to control how much right the character looks
        containerRef.current.rotation.y = angleToCamera + rightwardOffset;
        
        if (primitiveRef.current) {
          primitiveRef.current.rotation.y = angleToCamera - Math.PI/2 + rightwardOffset;
        }
        
        // Store this rotation so it's available when entering neighborhood
        rotationRef.current = angleToCamera + rightwardOffset;
      }
      
      // Calculate movement direction
      moveDir.set(0, 0, 0);
      
      if (moveState.w || moveState.s) {
        const angle = rotationRef.current;
        const moveZ = moveState.w ? 1 : -1;
        moveDir.x = Math.sin(angle) * moveZ;
        moveDir.z = Math.cos(angle) * moveZ;
      }
      
      if (moveState.a || moveState.d) {
        const angle = rotationRef.current;
        // D is right, A is left
        const moveSide = moveState.d ? -1 : 1;
        
        sideDir.set(
          Math.sin(angle + Math.PI/2) * moveSide,
          0,
          Math.cos(angle + Math.PI/2) * moveSide
        );
        
        moveDir.add(sideDir);
      }
      
      // Initialize new velocity with current values
      const newVelocity = { x: currentVel.x, y: currentVel.y, z: currentVel.z };
      
      // Apply horizontal movement or damping
      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        const moveSpeed = MOVE_SPEED * (moveState.shift ? 1.5 : 1);
        targetVelocity.copy(moveDir).multiplyScalar(moveSpeed);
        
        newVelocity.x = currentVel.x + (targetVelocity.x - currentVel.x) * LERP_FACTOR;
        newVelocity.z = currentVel.z + (targetVelocity.z - currentVel.z) * LERP_FACTOR;
      } else {
        // Apply damping when not moving
        newVelocity.x = currentVel.x * DAMPING;
        newVelocity.z = currentVel.z * DAMPING;
      }

      // Ground detection
      rayOrigin.set(pos.x, pos.y, pos.z);
      const rayHit = world.castRay(
        new rapier.Ray(
          { x: pos.x, y: pos.y, z: pos.z },
          { x: 0, y: -1, z: 0 }
        ),
        GROUND_CHECK_DISTANCE,
        true
      );
      
      const rayDistance = rayHit ? rayHit.toi : GROUND_CHECK_DISTANCE;
      
      // Ground detection logic
      isGroundedRef.current = rayHit && rayHit.toi <= GROUND_THRESHOLD;
      
      // Also consider grounded if very close to zero velocity
      if (Math.abs(currentVel.y) < 0.1) {
        isGroundedRef.current = true;
      }
      
      // But never consider grounded when clearly moving upward
      if (currentVel.y > 1.0) {
        isGroundedRef.current = false;
      }
      
      // Jump handling
      if (moveState.space && jumpCooldownRef.current <= 0) {
        if (isGroundedRef.current) {
          // Apply jump force
          newVelocity.y = JUMP_FORCE;
          
          // Set cooldown
          jumpCooldownRef.current = JUMP_COOLDOWN;
          
          // Force not grounded immediately
          isGroundedRef.current = false;
        }
      }
      
      // Apply physics
      rigidBody.setLinvel(newVelocity, true);
      
      // Sync positions
      if (primitiveRef.current) {
        primitiveRef.current.position.set(pos.x, pos.y - CHARACTER_HEIGHT, pos.z);
      }
      
      if (containerRef.current) {
        containerRef.current.position.set(pos.x, pos.y, pos.z);
      }

      // Send position and rotation updates to server
      if (shouldUpdateNetwork && hasEnteredNeighborhood) {
        lastNetworkUpdate.current = now;
        
        const quaternion = new THREE.Quaternion();
        if (primitiveRef.current) {
          quaternion.setFromEuler(primitiveRef.current.rotation);
        }
        
        const position = { x: pos.x, y: pos.y, z: pos.z };
        const isMoving = moveState.w || moveState.s || moveState.a || moveState.d;
        
        // Only send updates if socket is connected
        if (socketManager.connected) {
          log('Sending position update:', {
            position,
            quaternion: {
              x: quaternion.x,
              y: quaternion.y,
              z: quaternion.z,
              w: quaternion.w
            },
            isMoving
          });
          
          socketManager.updateTransform(
            position,
            { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
            isMoving
          );
        }
      }
    }

    // Update animations
    if (!mixer || !actions) return;
    mixer.update(delta);
    
    const { idle: idleAnimName, run: runAnimName } = animationNames;
    if (!idleAnimName || !runAnimName) return;
    
    const isMoving = moveState.w || moveState.s || moveState.a || moveState.d;
    
    if (isMoving !== runningRef.current) {
      const runAction = actions[runAnimName];
      const idleAction = actions[idleAnimName];
      
      if (isMoving) {
        runAction.timeScale = moveState.shift ? 1.5 : 1.0;
        idleAction.fadeOut(0.2);
        runAction.reset().fadeIn(0.2).play();
        currentAnimRef.current = 'run';
      } else {
        runAction.fadeOut(0.2);
        idleAction.reset().fadeIn(0.2).play();
        currentAnimRef.current = 'idle';
      }
      
      runningRef.current = isMoving;
    } else if (isMoving) {
      actions[runAnimName].timeScale = moveState.shift ? 1.5 : 1.0;
    }
  });
  
  // Debug mount/unmount
  useEffect(() => {
    log('PlayerModel mounted');
    return () => {
      log('PlayerModel unmounted');
    };
  }, []);

  // Debug neighborhood state changes
  useEffect(() => {
    log('Neighborhood state changed:', hasEnteredNeighborhood);
  }, [hasEnteredNeighborhood]);
  
  return (
    <>
      <RigidBody 
        ref={rigidBodyRef}
        type="dynamic" 
        mass={1}
        lockRotations={true}
        enabledRotations={[false, false, false]}
        friction={0.2}
        restitution={0.0}
        linearDamping={0.1}
        angularDamping={0.2}
        position={[0, 5, 0]}
        gravityScale={1.0}
        ccd={true}
      >
        <CapsuleCollider args={[0.7, 0.5]} position={[0, CHARACTER_HEIGHT, 0]} />
      </RigidBody>
      
      <primitive 
        ref={primitiveRef} 
        object={playerModel} 
        scale={[0.027, 0.027, 0.027]}
        rotation={[0, -Math.PI/2, 0]}
      />
    </>
  );
}