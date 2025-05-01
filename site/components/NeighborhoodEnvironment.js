import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Function to create a toon gradient texture
function createToonGradient() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  
  // Create gradient
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0.0, '#444444');
  gradient.addColorStop(0.33, '#888888');
  gradient.addColorStop(0.66, '#cccccc');
  gradient.addColorStop(1.0, '#ffffff');
  
  // Fill with gradient
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  const texture = new THREE.CanvasTexture(
    canvas,
    THREE.UVMapping,
    THREE.ClampToEdgeWrapping,
    THREE.ClampToEdgeWrapping,
    THREE.NearestFilter,
    THREE.NearestFilter
  );
  texture.needsUpdate = true;
  
  return texture;
}

export default function NeighborhoodEnvironment({ hasEnteredNeighborhood, setHasEnteredNeighborhood }) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const cameraRef = useRef(null);
  const playerRef = useRef(null);
  const mixerRef = useRef(null);
  const currentActionRef = useRef(null);
  const animationsRef = useRef(null);
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
        position: new THREE.Vector3(2, 3, 1), // Positioned to the right (+x) while staying close
        lookAt: new THREE.Vector3(-0.5, 2.4, 0),  // Looking slightly left to keep character in frame
        fov: 45 // Zoomed in FOV for close-up
      },
      end: {
        position: new THREE.Vector3(0, 3, 6), // Centered position
        offset: new THREE.Vector3(0, 3, 6),   // Matching offset
        fov: 75 // Wider FOV for gameplay
      }
    };

    // Add a lookAt target for gameplay that's ahead of the player
    const gameplayLookAtOffset = new THREE.Vector3(0, 2, 0); // Look further ahead and up

    // Setup scene with Animal Crossing sky color
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x88d7ee); // Lighter blue like Animal Crossing
    
    // Add fog that matches sky color for smooth distance fading
    const fogColor = new THREE.Color(0x88d7ee);
    scene.fog = new THREE.Fog(fogColor, 60, 140); // Start fading at 80 units, complete fade by 140 units
    
    // Create a container for the camera and player
    const container = new THREE.Object3D();
    scene.add(container);

    // Set up camera - scene level, not attached to container
    const camera = new THREE.PerspectiveCamera(cameraSettings.start.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.copy(cameraSettings.start.position);
    scene.add(camera); // Add to scene, not container

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // Add directional light for better shadows and definition
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Add point light for additional illumination
    const pointLight = new THREE.PointLight(0xffffff, 1.0);
    pointLight.position.set(-5, 5, -5);
    scene.add(pointLight);

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


    let mapModel = null;

    const maploader = new GLTFLoader();
    maploader.setPath('/models/');

    //load map
    maploader.load( 'sf_map_3.glb', function ( gltf ) {
      mapModel = gltf.scene
      mapModel.scale.set(3.0, 3.0, 3.0);
      mapModel.position.set(0.0, -0.01, 0.0)
      scene.add( gltf.scene );
      // Add toon shading to existing materials
      //THREE.ColorManagement.legacyMode = false
      mapModel.traverse((child) => {
        if (child.isMesh) {
          const originalMaterial = child.material;
          // Create a new toon material that preserves the original textures
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
        }
      });
    }, undefined, function ( error ) {
    
      console.error( error );
    
    } );



    // Load player model with materials
    const gltfLoader = new GLTFLoader();
    gltfLoader.setPath('/models/');
    
    let playerModel = null;

    
    gltfLoader.load(
      'player.glb',
      (gltf) => {
        playerModel = gltf.scene;
        playerModel.scale.set(0.027, 0.027, 0.027);
        playerModel.rotation.y = (Math.PI / 4) * -1; // Rotate 180 degrees to face backward

        // Add toon shading to existing materials
        playerModel.traverse((child) => {
          if (child.isMesh) {
            const originalMaterial = child.material;
            // Create a new toon material that preserves the original textures
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
          }
        });

        // Set up animations
        if (gltf.animations && gltf.animations.length > 0) {
          mixerRef.current = new THREE.AnimationMixer(playerModel);
          animationsRef.current = gltf.animations; // Store animations
          
          const idleAnimation = animationsRef.current.find(anim => anim.name.toLowerCase().includes('idle'));
          const runAnimation = animationsRef.current.find(anim => anim.name.toLowerCase().includes('run'));
          
          if (idleAnimation) {
            const action = mixerRef.current.clipAction(idleAnimation);
            action.play();
            currentActionRef.current = action;
          }
        }

        container.add(playerModel);
        playerRef.current = playerModel;
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error) => {
        console.error('An error occurred while loading the model:', error);
      }
    );

    // Position container to start at ground level
    container.position.y = 0; // Place directly on ground

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
      
      // Update animation mixer
      if (mixerRef.current && animationsRef.current) {
        const deltaTime = (timestamp - startTimeRef.current) / 1000;
        mixerRef.current.update(deltaTime);
        
        // Check if player is moving (W or S key pressed)
        const isMoving = keysRef.current.w || keysRef.current.s;
        
        // Find appropriate animation
        const idleAnimation = animationsRef.current.find(anim => anim.name.toLowerCase().includes('idle'));
        const runAnimation = animationsRef.current.find(anim => anim.name.toLowerCase().includes('run'));
        
        if (isMoving && runAnimation && currentActionRef.current?.clip !== runAnimation) {
          if (currentActionRef.current) {
            currentActionRef.current.fadeOut(0.2);
          }
          const newAction = mixerRef.current.clipAction(runAnimation);
          newAction.reset().fadeIn(0.2).play();
          currentActionRef.current = newAction;
        } else if (!isMoving && idleAnimation && currentActionRef.current?.clip !== idleAnimation) {
          if (currentActionRef.current) {
            currentActionRef.current.fadeOut(0.2);
          }
          const newAction = mixerRef.current.clipAction(idleAnimation);
          newAction.reset().fadeIn(0.2).play();
          currentActionRef.current = newAction;
        }
      }
      
      // Smooth easing
      const eased = progress < .5 ? 
        4 * progress * progress * progress : 
        1 - Math.pow(-2 * progress + 2, 3) / 2;

      if (hasEnteredNeighborhood) {
        // Update container position and rotation based on keys
        if (playerRef.current) {
          const { moveSpeed, sprintSpeed, rotationSpeed, gravity } = movementSettings;
          const cameraOffset = cameraSettings.end.offset;
          
          // Interpolate FOV
          camera.fov = THREE.MathUtils.lerp(
            cameraSettings.start.fov,
            cameraSettings.end.fov,
            eased
          );
          camera.updateProjectionMatrix(); // Important: must call this after changing FOV

          // Handle rotation with A and D
          if (keysRef.current.a) {
            container.rotation.y += rotationSpeed;
          }
          if (keysRef.current.d) {
            container.rotation.y -= rotationSpeed;
          }

          // Calculate forward direction based on rotation
          const forward = new THREE.Vector3(0, 0, 1);
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
            if (container.position.y <= jumpState.groundY) {
              container.position.y = jumpState.groundY;
              jumpState.isJumping = false;
              jumpState.jumpVelocity = 0;
            }
          }

          // Update camera position relative to container
          if (progress === 1) {
            // Position camera behind player based on container's rotation
            const cameraAngle = container.rotation.y;
            const distance = 6;
            const height = 3;
            
            // Position camera directly behind player
            camera.position.set(
              container.position.x - Math.sin(cameraAngle) * distance,
              container.position.y + height,
              container.position.z - Math.cos(cameraAngle) * distance
            );
            
            // Look ahead of player
            const lookAtTarget = new THREE.Vector3(
              container.position.x + Math.sin(cameraAngle) * gameplayLookAtOffset.z,
              container.position.y + gameplayLookAtOffset.y,
              container.position.z + Math.cos(cameraAngle) * gameplayLookAtOffset.z
            );
            camera.lookAt(lookAtTarget);
          } else {
            // During transition
            const currentPosition = new THREE.Vector3();
            currentPosition.lerpVectors(
              cameraSettings.start.position,
              new THREE.Vector3(
                container.position.x - Math.sin(container.rotation.y) * 4,
                container.position.y + 4, // Match the new height
                container.position.z - Math.cos(container.rotation.y) * 4
              ),
              eased
            );
            camera.position.copy(currentPosition);
            
            // Smoothly transition the look target
            const startLookAt = cameraSettings.start.lookAt;
            const endLookAt = new THREE.Vector3(
              container.position.x,
              container.position.y + 0.5, // Match the new look target
              container.position.z
            );
            const currentLookAt = new THREE.Vector3();
            currentLookAt.lerpVectors(startLookAt, endLookAt, eased);
            camera.lookAt(currentLookAt);
          }
        }
      } else {
        // Reset player and camera positions when exiting
        if (playerRef.current) {
          playerRef.current.position.set(0, 0, 0);
        }
        
        if (container) {
          container.position.set(0, 1.0, 0);
          container.rotation.set(0, 0, 0);
        }
        
        // Transition camera back to starting position
        const currentPosition = new THREE.Vector3();
        currentPosition.lerpVectors(
          new THREE.Vector3(
            - Math.sin(container.rotation.y) * 4,
            4, // Updated height
            - Math.cos(container.rotation.y) * 4
          ), 
          cameraSettings.start.position, 
          eased
        );
        camera.position.copy(currentPosition);
        
        // Transition look target
        const currentLookAt = new THREE.Vector3();
        currentLookAt.lerpVectors(
          new THREE.Vector3(0, 0.5, 0), // Updated target height
          cameraSettings.start.lookAt, 
          eased
        );
        camera.lookAt(currentLookAt);
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