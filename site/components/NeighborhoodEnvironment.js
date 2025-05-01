import Head from "next/head";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as RAPIER from "@dimforge/rapier3d-compat";

// Helper function to create toon gradient
const createToonGradient = () => {
  // Create a more detailed gradient optimized for saturated colors
  const data = new Uint8Array([
    20, 20, 20, 255,    // Darker shadow but not pure black
    80, 80, 80, 255,    // Mid shadow
    140, 140, 140, 255, // Mid tone
    200, 200, 200, 255, // Light tone
    240, 240, 240, 255  // Bright but not pure white
  ]);
  const texture = new THREE.DataTexture(data, 5, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
};

export default function NeighborhoodEnvironment({ hasEnteredNeighborhood, setHasEnteredNeighborhood }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const cameraRef = useRef(null);
  const playerRef = useRef(null);
  const mixerRef = useRef(null);
  const currentActionRef = useRef(null);
  const animationsRef = useRef(null);
  const worldRef = useRef(null);
  const playerRigidBodyRef = useRef(null);
  const debugMeshesRef = useRef([]);
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    escape: false
  });
  const idleActionRef = useRef(null);
  const runActionRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Rapier physics
    const initPhysics = async () => {
      await RAPIER.init();
      
      // Create physics world
      const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
      const world = new RAPIER.World(gravity);
      worldRef.current = world;

      // Create ground collider
      const groundColliderDesc = RAPIER.ColliderDesc.cuboid(500.0, 0.1, 500.0);
      const groundCollider = world.createCollider(groundColliderDesc);

      // Create player rigid body
      const playerRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0.0, 2.0, 0.0)
        .setLinearDamping(0.5)
        .setAngularDamping(0.5)
        .lockRotations();
      
      const playerRigidBody = world.createRigidBody(playerRigidBodyDesc);
      
      // Create capsule collider for player
      const playerColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.5)
        .setFriction(0.2)
        .setRestitution(0.0);
      
      world.createCollider(playerColliderDesc, playerRigidBody);
      playerRigidBodyRef.current = playerRigidBody;
    };

    initPhysics();

    // Camera settings
    const cameraSettings = {
      start: {
        position: new THREE.Vector3(4, 4, 3),
        lookAt: new THREE.Vector3(-0.5, 2.4, 0),
        fov: 45
      },
      end: {
        position: new THREE.Vector3(0, 3, 6),
        offset: new THREE.Vector3(0, 3, 6),
        fov: 75
      }
    };

    // Setup scene with vibrant sky color
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6ecfff); // Brighter, more saturated blue
    scene.fog = new THREE.Fog(scene.background, 80, 160); // Increased fog distance for better visibility

    // Create container for player
    const container = new THREE.Object3D();
    scene.add(container);

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      cameraSettings.start.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    camera.position.copy(cameraSettings.start.position);
    scene.add(camera);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Softer ambient for better contrast
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); // Brighter main light
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    // Add secondary directional light for better definition
    const secondaryDirLight = new THREE.DirectionalLight(0xffd500, 0.3); // Warm secondary light
    secondaryDirLight.position.set(-3, 4, -2);
    scene.add(secondaryDirLight);

    // Add hemisphere light for better color blending
    const hemiLight = new THREE.HemisphereLight(0x6ecfff, 0x8dc63f, 0.5); // Sky color to ground color
    scene.add(hemiLight);

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Create ground
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
    const texture = new THREE.TextureLoader().load('/animal-crossing.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(500, 500);
    
    const groundMaterial = new THREE.MeshToonMaterial({
      map: texture,
      gradientMap: createToonGradient(),
      color: 0x95d645, // More saturated grass color
      side: THREE.DoubleSide,
      emissive: 0x2a5d2a, // Deeper green emissive
      emissiveIntensity: 0.3 // Increased intensity
    });
    
    const plane = new THREE.Mesh(planeGeometry, groundMaterial);
    plane.rotation.x = Math.PI / 2;
    plane.position.y = 0;
    scene.add(plane);

    // Load map
    const maploader = new GLTFLoader();
    maploader.setPath('/models/');
    
    maploader.load('sf_map_3.glb', function (gltf) {
      const mapModel = gltf.scene;
      mapModel.scale.set(3.0, 3.0, 3.0);
      mapModel.position.set(0.0, -0.01, 0.0);
      scene.add(mapModel);

      // Add toon materials and create colliders
      mapModel.traverse((child) => {
        if (child.isMesh) {
          const originalMaterial = child.material;
          const toonMaterial = new THREE.MeshToonMaterial({
            map: originalMaterial.map,
            normalMap: originalMaterial.normalMap,
            gradientMap: createToonGradient(),
            side: THREE.DoubleSide,
            color: originalMaterial.color,
            transparent: originalMaterial.transparent,
            opacity: originalMaterial.opacity
          });
          child.material = toonMaterial;

          // Create trimesh collider for map geometry
          const vertices = [];
          const indices = [];
          
          // Get vertices and indices
          const positions = child.geometry.attributes.position.array;
          
          // Create a matrix to transform vertices
          child.updateWorldMatrix(true, false);
          const worldMatrix = child.matrixWorld;
          const tempVector = new THREE.Vector3();
          
          // Transform vertices using world matrix
          for (let i = 0; i < positions.length; i += 3) {
            tempVector.set(
              positions[i],
              positions[i + 1],
              positions[i + 2]
            );
            tempVector.applyMatrix4(worldMatrix);
            vertices.push(tempVector.x, tempVector.y, tempVector.z);
          }
          
          if (child.geometry.index) {
            indices.push(...child.geometry.index.array);
          } else {
            for (let i = 0; i < positions.length / 3; i++) {
              indices.push(i);
            }
          }

          // Create trimesh collider
          if (vertices.length > 0 && indices.length > 0) {
            const trimeshDesc = RAPIER.ColliderDesc.trimesh(
              new Float32Array(vertices),
              new Uint32Array(indices)
            );
            const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
            const rigidBody = worldRef.current.createRigidBody(rigidBodyDesc);
            worldRef.current.createCollider(trimeshDesc, rigidBody);
          }
        }
      });
    });

    // Load player model
    const gltfLoader = new GLTFLoader();
    gltfLoader.setPath('/models/');
    
    gltfLoader.load('player.glb', (gltf) => {
      const playerModel = gltf.scene;
      playerModel.scale.set(0.027, 0.027, 0.027);
      playerModel.rotation.y = Math.PI / 2;
      
      // Position the player model based on neighborhood state
      if (hasEnteredNeighborhood) {
        playerModel.position.y = -0.5;
      } else {
        // Position player in front of starting camera
        playerModel.position.copy(cameraSettings.start.lookAt);
        playerModel.position.y = 1.4; // Lower the player's position
        playerModel.rotation.y = Math.PI * 0.01; // Continue rotating to reach the correct spot
      }

      // Add toon materials
      playerModel.traverse((child) => {
        if (child.isMesh) {
          const originalMaterial = child.material;
          
          // Create color enhancer function
          const enhanceColor = (color) => {
            if (!color) return null;
            const hsl = {};
            color.getHSL(hsl);
            // Increase saturation and lightness
            hsl.s = Math.min(1, hsl.s * 1.5); // Boost saturation by 50%
            hsl.l = Math.max(0.3, Math.min(0.7, hsl.l * 1.2)); // Adjust lightness while keeping it balanced
            const enhancedColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
            return enhancedColor;
          };

          const toonMaterial = new THREE.MeshToonMaterial({
            map: originalMaterial.map,
            normalMap: originalMaterial.normalMap,
            gradientMap: createToonGradient(),
            side: THREE.DoubleSide,
            color: enhanceColor(originalMaterial.color) || new THREE.Color(0xf4d03f), // Enhance color or use warm default
            transparent: originalMaterial.transparent,
            opacity: originalMaterial.opacity,
            emissive: new THREE.Color(0x2a2a2a),
            emissiveIntensity: 0.1 // Subtle emissive for better definition
          });
          child.material = toonMaterial;
        }
      });

      // Setup animations
      if (gltf.animations && gltf.animations.length > 0) {
        // Store animations first
        animationsRef.current = gltf.animations;
        
        // Create mixer
        mixerRef.current = new THREE.AnimationMixer(playerModel);
        
        // Find animations
        const idleAnimation = gltf.animations.find(anim => 
          anim.name.toLowerCase().includes('idle')
        );
        const runAnimation = gltf.animations.find(anim => 
          anim.name.toLowerCase().includes('run')
        );

        // Create and store actions
        if (idleAnimation) {
          const idleAction = mixerRef.current.clipAction(idleAnimation);
          idleAction.timeScale = 1.0;
          idleActionRef.current = idleAction;
          idleAction.play();
          currentActionRef.current = idleAction;
        }
        
        if (runAnimation) {
          const runAction = mixerRef.current.clipAction(runAnimation);
          runAction.timeScale = 1.0;
          runActionRef.current = runAction;
        }
      }

      container.add(playerModel);
      playerRef.current = playerModel;

      // Update camera position
      if (hasEnteredNeighborhood) {
        const cameraOffset = new THREE.Vector3(0, 3, 6);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), container.rotation.y);
        camera.position.copy(container.position).add(cameraOffset);
        camera.lookAt(container.position);
      } else {
        camera.position.copy(cameraSettings.start.position);
        camera.lookAt(cameraSettings.start.lookAt);
      }
    });

    // Movement settings
    const movementSettings = {
      moveSpeed: 5.0,
      sprintSpeed: 8.0,
      rotationSpeed: 0.1,
      jumpForce: 5.0
    };

    // Handle keyboard controls
    const handleKeyDown = (event) => {
      if (!hasEnteredNeighborhood || !playerRigidBodyRef.current) return;
      
      const key = event.key.toLowerCase();
      if (key in keysRef.current) {
        keysRef.current[key] = true;
      }

      // Handle escape
      if (key === 'escape') {
        setHasEnteredNeighborhood(false);
      }

      // Handle jump
      if (key === ' ' && !keysRef.current.space) {
        const velocity = playerRigidBodyRef.current.linvel();
        if (Math.abs(velocity.y) < 0.1) { // Only jump if near ground
          playerRigidBodyRef.current.setLinvel(
            new RAPIER.Vector3(velocity.x, movementSettings.jumpForce, velocity.z),
            true
          );
        }
      }
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key in keysRef.current) {
        keysRef.current[key] = false;
      }
    };

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // Animation loop
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const deltaTime = Math.min((timestamp - startTimeRef.current) / 1000, 0.1);
      startTimeRef.current = timestamp;
      
      // Update physics
      if (worldRef.current && playerRigidBodyRef.current && hasEnteredNeighborhood) {
        worldRef.current.step();
        
        // Get current state
        const velocity = playerRigidBodyRef.current.linvel();
        const position = playerRigidBodyRef.current.translation();
        
        // Update movement based on keys
        const speed = keysRef.current.shift ? 
          movementSettings.sprintSpeed : 
          movementSettings.moveSpeed;
        
        // Calculate movement direction based on container rotation
        const moveDir = new THREE.Vector3();
        
        if (keysRef.current.w) moveDir.z -= 1;
        if (keysRef.current.s) moveDir.z += 1;
        
        // Rotate character with A/D
        if (keysRef.current.a) {
          container.rotation.y += movementSettings.rotationSpeed;
        }
        if (keysRef.current.d) {
          container.rotation.y -= movementSettings.rotationSpeed;
        }
        
        // Apply container's rotation to movement direction
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), container.rotation.y);
        moveDir.normalize();
        
        // Set new velocity
        const newVelocity = new RAPIER.Vector3(
          moveDir.x * speed,
          velocity.y, // Preserve vertical velocity
          moveDir.z * speed
        );
        
        playerRigidBodyRef.current.setLinvel(newVelocity, true);
        
        // Update container position
        container.position.set(position.x, position.y, position.z);
        
        // Update camera position
        const cameraOffset = new THREE.Vector3(0, 3, 6);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), container.rotation.y);
        camera.position.copy(container.position).add(cameraOffset);
        camera.lookAt(container.position);
      }
      
      // Update animations
      if (mixerRef.current && animationsRef.current) {
        mixerRef.current.update(deltaTime);
        
        const isMoving = keysRef.current.w || keysRef.current.s;
        const currentAnim = currentActionRef.current?.getClip().name.toLowerCase() || '';
        
        if (isMoving && !currentAnim.includes('run') && runActionRef.current) {
          if (currentActionRef.current) {
            currentActionRef.current.fadeOut(0.2);
          }
          runActionRef.current.reset().fadeIn(0.2).play();
          currentActionRef.current = runActionRef.current;
        } else if (!isMoving && !currentAnim.includes('idle') && idleActionRef.current) {
          if (currentActionRef.current) {
            currentActionRef.current.fadeOut(0.2);
          }
          idleActionRef.current.reset().fadeIn(0.2).play();
          currentActionRef.current = idleActionRef.current;
        }
      }
      
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Start animation
    startTimeRef.current = null;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      if (playerRef.current) {
        playerRef.current.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
      scene.remove(plane);
      plane.geometry.dispose();
      plane.material.dispose();
      renderer.dispose();
      
      // Cleanup physics
      if (worldRef.current) {
        worldRef.current.free();
      }
    };
  }, [hasEnteredNeighborhood]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: -1
      }}
    />
  );
} 