import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export default function NeighborhoodEnvironment({ hasEnteredNeighborhood, setHasEnteredNeighborhood }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const cameraRef = useRef(null);
  const playerRef = useRef(null);
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    escape: false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Camera settings
    const cameraSettings = {
      start: {
        position: new THREE.Vector3(2, 2, 2),
        lookAt: new THREE.Vector3(0, 0, 0)
      },
      end: {
        position: new THREE.Vector3(0, 3, 5), // Position camera behind and above cube
        offset: new THREE.Vector3(0, 2, 4) // Offset from cube for third-person view
      }
    };

    // Setup scene with Animal Crossing sky color
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88d7ee); // Lighter blue like Animal Crossing
    
    // Add fog that matches sky color for smooth distance fading
    const fogColor = new THREE.Color(0x88d7ee);
    scene.fog = new THREE.Fog(fogColor, 20, 50); // Start fading at 20 units, complete fade by 50 units
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.copy(cameraSettings.start.position);

    // Bright ambient lighting for Animal Crossing style
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    // Create a container for the camera and player
    const container = new THREE.Object3D();
    scene.add(container);
    container.add(camera);
    
    // Setup renderer with toon rendering settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Create floor plane with Animal Crossing grass color
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
    
    // Load and configure the texture
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('/animal-crossing.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(500, 500);
    
    // Create custom toon material for the ground
    const groundMaterial = new THREE.MeshToonMaterial({
      map: texture,
      gradientMap: createToonGradient(),
      color: 0x8dc63f, // Brighter, more vibrant grass green
      side: THREE.DoubleSide,
      emissive: 0x1a4d1a, // Slight green glow
      emissiveIntensity: 0.2
    });
    
    const plane = new THREE.Mesh(planeGeometry, groundMaterial);
    plane.rotation.x = Math.PI / 2;
    plane.position.y = 0;
    scene.add(plane);

    // Load player model
    const loader = new GLTFLoader();
    loader.setPath('/models/');
    
    let playerModel = null;
    loader.load(
      'player.glb',
      (gltf) => {
        playerModel = gltf.scene;
        playerModel.scale.set(1, 1, 1);
        container.add(playerModel);
        playerRef.current = playerModel;
      },
      undefined,
      (error) => {
        console.error('An error occurred while loading the model:', error);
      }
    );

    // Position container to start at ground level
    container.position.y = 1; // Half the height of the cube (2/2) to place it on ground

    // Movement settings
    const movementSettings = {
      moveSpeed: 0.05,
      sprintSpeed: 0.1,
      rotationSpeed: 0.02,
      jumpHeight: 0.5,
      gravity: 0.015
    };

    // Jump state
    const jumpState = {
      isJumping: false,
      jumpVelocity: 0,
      groundY: 0 // Changed from -1 to 0 since plane is at y=0
    };

    // Handle keyboard controls
    const handleKeyDown = (event) => {
      if (!hasEnteredNeighborhood) return;
      
      switch (event.key.toLowerCase()) {
        case 'w':
          keysRef.current.w = true;
          break;
        case 'a':
          keysRef.current.a = true;
          break;
        case 's':
          keysRef.current.s = true;
          break;
        case 'd':
          keysRef.current.d = true;
          break;
        case 'shift':
          keysRef.current.shift = true;
          break;
        case ' ':
          if (!jumpState.isJumping) {
            jumpState.isJumping = true;
            jumpState.jumpVelocity = movementSettings.jumpHeight;
          }
          keysRef.current.space = true;
          break;
        case 'escape':
          keysRef.current.escape = true;
          setHasEnteredNeighborhood(false);
          // Reset position and rotation when exiting
          if (container) {
            container.position.set(0, 1, 0);
            container.rotation.set(0, 0, 0);
          }
          break;
      }
    };

    const handleKeyUp = (event) => {
      switch (event.key.toLowerCase()) {
        case 'w':
          keysRef.current.w = false;
          break;
        case 'a':
          keysRef.current.a = false;
          break;
        case 's':
          keysRef.current.s = false;
          break;
        case 'd':
          keysRef.current.d = false;
          break;
        case 'shift':
          keysRef.current.shift = false;
          break;
        case ' ':
          keysRef.current.space = false;
          break;
        case 'escape':
          keysRef.current.escape = false;
          break;
      }
    };

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // Animation
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / 1000, 1);
      
      // Smooth easing
      const eased = progress < .5 ? 
        4 * progress * progress * progress : 
        1 - Math.pow(-2 * progress + 2, 3) / 2;

      if (hasEnteredNeighborhood) {
        // Update container position and rotation based on keys
        if (playerRef.current) {
          const { moveSpeed, sprintSpeed, rotationSpeed, gravity } = movementSettings;
          const cameraOffset = cameraSettings.end.offset;
          
          // Handle rotation with A and D
          if (keysRef.current.a) {
            container.rotation.y += rotationSpeed;
          }
          if (keysRef.current.d) {
            container.rotation.y -= rotationSpeed;
          }

          // Calculate forward direction based on rotation
          const forward = new THREE.Vector3(0, 0, -1);
          forward.applyQuaternion(container.quaternion);

          // Handle forward/backward movement with W and S
          const currentSpeed = keysRef.current.shift ? sprintSpeed : moveSpeed;
          if (keysRef.current.w) {
            container.position.add(forward.multiplyScalar(currentSpeed));
          }
          if (keysRef.current.s) {
            container.position.add(forward.multiplyScalar(-currentSpeed));
          }

          // Handle jumping
          if (jumpState.isJumping) {
            container.position.y += jumpState.jumpVelocity;
            jumpState.jumpVelocity -= gravity;
            
            // Check if landed (accounting for cube height)
            if (container.position.y <= jumpState.groundY + 1) { // Add 1 (half cube height) to keep feet on ground
              container.position.y = jumpState.groundY + 1;
              jumpState.isJumping = false;
              jumpState.jumpVelocity = 0;
            }
          }

          // Update camera position relative to container
          if (progress === 1) {
            camera.position.set(
              cameraOffset.x,
              cameraOffset.y,
              cameraOffset.z
            );
            camera.lookAt(container.position);
          } else {
            // During transition
            const currentPosition = new THREE.Vector3();
            currentPosition.lerpVectors(
              cameraSettings.start.position,
              new THREE.Vector3(
                cameraOffset.x,
                cameraOffset.y,
                cameraOffset.z
              ),
              eased
            );
            camera.position.copy(currentPosition);
            camera.lookAt(container.position);
          }
        }
      } else {
        // Reset cube and camera positions when exiting

        if (playerRef.current) {
          playerRef.current.position.set(0, 0, 0);
        }
        const currentPosition = new THREE.Vector3();
        currentPosition.lerpVectors(cameraSettings.end.position, cameraSettings.start.position, eased);
        camera.position.copy(currentPosition);
        camera.lookAt(new THREE.Vector3(-1.25, 0.5, 0));
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
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      if (playerModel) {
        playerModel.traverse((child) => {
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