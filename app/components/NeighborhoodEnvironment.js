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

    // Setup scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.copy(cameraSettings.start.position);

    // Create a container for the camera and player
    const container = new THREE.Object3D();
    scene.add(container);
    container.add(camera);
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, 
      alpha: true,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(0.5);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    // Create floor plane
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    
    // Create shader material for grass and flowers
    const grassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vHeight;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          // Create height variation using multiple noise layers
          float height = 0.0;
          height += sin(position.x * 10.0) * 0.1;
          height += sin(position.z * 8.0) * 0.15;
          height += sin(position.x * 5.0 + position.z * 3.0) * 0.2;
          
          vHeight = height;
          
          // Apply height to vertex position
          vec3 newPosition = position;
          newPosition.y += height;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec2 resolution;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying float vHeight;

        // Noise functions
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));

          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          vec2 st = vPosition.xz * 10.0;
          
          // Base grass color with height-based variation
          float grassNoise = noise(st + time * 0.1);
          vec3 grassColor = mix(
            vec3(0.1, 0.4, 0.1),  // Dark green
            vec3(0.2, 0.6, 0.2),  // Light green
            grassNoise + vHeight * 0.5
          );
          
          // Add some yellow flowers occasionally
          float flowerChance = random(st * 2.0);
          if (flowerChance > 0.95) {
            float flowerSize = random(st * 3.0) * 0.2;
            vec2 flowerPos = fract(st * 2.0);
            float dist = length(flowerPos - vec2(0.5));
            if (dist < flowerSize) {
              grassColor = mix(
                vec3(1.0, 1.0, 0.0),  // Yellow
                vec3(1.0, 0.8, 0.0),  // Orange-yellow
                random(st)
              );
            }
          }
          
          // Add some white flowers occasionally
          if (flowerChance > 0.98) {
            float flowerSize = random(st * 4.0) * 0.15;
            vec2 flowerPos = fract(st * 3.0);
            float dist = length(flowerPos - vec2(0.5));
            if (dist < flowerSize) {
              grassColor = vec3(1.0);  // White
            }
          }
          
          gl_FragColor = vec4(grassColor, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });
    
    const plane = new THREE.Mesh(planeGeometry, grassMaterial);
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