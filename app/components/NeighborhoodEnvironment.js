import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as RAPIER from '@dimforge/rapier3d-compat';

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
  const worldRef = useRef(null);
  const playerRigidBodyRef = useRef(null);
  const playerDebugMeshRef = useRef(null);
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
    escape: false
  });

  // Add mouse control state
  const mouseRef = useRef({
    sensitivity: 0.005,
    pitch: 0,
    yaw: 0,
    distance: 25,
    targetHeight: 4,
    isLocked: false,
    minDistance: 8
  });

  const handleMouseMove = (event) => {
    if (!hasEnteredNeighborhood) return;

    const { sensitivity } = mouseRef.current;
    
    // Update yaw and pitch based on mouse movement (inverted Y)
    mouseRef.current.yaw -= event.movementX * sensitivity;
    mouseRef.current.pitch -= event.movementY * sensitivity; // Inverted Y-axis
    
    // Allow full 360-degree rotation
    if (mouseRef.current.yaw > Math.PI) mouseRef.current.yaw -= Math.PI * 2;
    if (mouseRef.current.yaw < -Math.PI) mouseRef.current.yaw += Math.PI * 2;

    console.log('Mouse movement:', {
      movementX: event.movementX,
      movementY: event.movementY,
      yaw: mouseRef.current.yaw,
      pitch: mouseRef.current.pitch
    });
  };

  const handlePointerLockChange = () => {
    mouseRef.current.isLocked = document.pointerLockElement === containerRef.current;
    console.log('Pointer lock changed:', mouseRef.current.isLocked);
  };

  const handleClick = () => {
    console.log('Click detected, attempting to request pointer lock');
    if (hasEnteredNeighborhood) {
      containerRef.current?.requestPointerLock();
    }
  };

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
      world.createCollider(groundColliderDesc);

      // Create player rigid body with improved collision properties
      const playerRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0.0, 2.0, 0.0)
        .setLinearDamping(0.1)
        .setAngularDamping(0.5)
        .lockRotations()
        .setCcdEnabled(true)
        .setGravityScale(1.0);
      const playerRigidBody = world.createRigidBody(playerRigidBodyDesc);
      const playerColliderDesc = RAPIER.ColliderDesc.capsule(0.25, 0.5)
        .setFriction(0.0)
        .setRestitution(0.0)
        .setDensity(1.0)
        .setCollisionGroups(0x00010001)
        .setSolverGroups(0x00010001)
        .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.DEFAULT)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      world.createCollider(playerColliderDesc, playerRigidBody);
      playerRigidBodyRef.current = playerRigidBody;

      // Create debug visualization for player collider
      const playerDebugGeometry = new THREE.CapsuleGeometry(0.25, 1.0, 4, 8);
      const playerDebugMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000, 
        wireframe: true,
        transparent: true,
        opacity: 0.8 // Increased opacity for better visibility
      });
      const playerDebugMesh = new THREE.Mesh(playerDebugGeometry, playerDebugMaterial);
      playerDebugMesh.position.y = 2.0; // Match initial player position
      scene.add(playerDebugMesh);
      playerDebugMeshRef.current = playerDebugMesh;
    };

    initPhysics();

    // Camera settings
    const cameraSettings = {
      start: {
        position: new THREE.Vector3(2, 2, 1), // Positioned to the right (+x) while staying close
        lookAt: new THREE.Vector3(-0.5, 1.5, 0),  // Looking slightly left to keep character in frame
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
    scene.fog = new THREE.Fog(fogColor, 20, 50); // Start fading at 20 units, complete fade by 50 units
    
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

    // Modify the map loading to create a trimesh collider
    maploader.load('sf_map_3.glb', function (gltf) {
      mapModel = gltf.scene;
      mapModel.scale.set(2.0, 2.0, 2.0);
      scene.add(gltf.scene);

      // Collect all vertices and indices for the trimesh
      const vertices = [];
      const indices = [];
      let indexOffset = 0;

      mapModel.traverse((child) => {
        if (child.isMesh) {
          const geometry = child.geometry;
          
          // Apply the mesh's world matrix to get correct position
          child.updateWorldMatrix(true, true);
          const worldMatrix = child.matrixWorld;
          
          // Get position attribute
          const positionAttribute = geometry.getAttribute('position');
          
          // Add vertices
          for (let i = 0; i < positionAttribute.count; i++) {
            const vertex = new THREE.Vector3();
            vertex.fromBufferAttribute(positionAttribute, i);
            vertex.applyMatrix4(worldMatrix);
            vertices.push(vertex.x, vertex.y, vertex.z);
          }
          
          // Add indices
          if (geometry.index) {
            const indexArray = geometry.index.array;
            for (let i = 0; i < indexArray.length; i++) {
              indices.push(indexArray[i] + indexOffset);
            }
          } else {
            // If no indices, create them
            for (let i = 0; i < positionAttribute.count; i++) {
              indices.push(i + indexOffset);
            }
          }
          
          indexOffset += positionAttribute.count;
        }
      });

      // Create trimesh collider
      if (vertices.length > 0 && indices.length > 0) {
        const trimeshDesc = RAPIER.ColliderDesc.trimesh(
          new Float32Array(vertices),
          new Uint32Array(indices)
        );
        
        // Create static rigid body for the collider
        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
        const rigidBody = worldRef.current.createRigidBody(rigidBodyDesc);
        worldRef.current.createCollider(trimeshDesc, rigidBody);

        // Debug: Log trimesh creation
        console.log('Created trimesh collider with', vertices.length / 3, 'vertices and', indices.length / 3, 'triangles');
      }
    }, undefined, function (error) {
      console.error(error);
    });

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
      moveSpeed: 0.1,
      sprintSpeed: 0.2,
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
      
      if (!playerRigidBodyRef.current) return;

      // Add escape key handling for pointer lock
      if (event.key.toLowerCase() === 'escape') {
        document.exitPointerLock();
        keysRef.current.escape = true;
        setHasEnteredNeighborhood(false);
        return;
      }

      const moveSpeed = keysRef.current.shift ? movementSettings.sprintSpeed : movementSettings.moveSpeed;
      const currentVelocity = playerRigidBodyRef.current.linvel();
      let newVelocity = new RAPIER.Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);

      // Get the forward direction based on camera rotation
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera.quaternion);
      forward.y = 0;
      forward.normalize();

      // Get the right direction
      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(camera.quaternion);
      right.y = 0;
      right.normalize();

      // Update container rotation to match camera direction
      const targetRotation = Math.atan2(forward.x, forward.z);
      container.rotation.y = targetRotation;

      switch (event.key.toLowerCase()) {
        case 'w':
          keysRef.current.w = true;
          newVelocity.x = forward.x * moveSpeed * 50;
          newVelocity.z = forward.z * moveSpeed * 50;
          break;
        case 'a':
          keysRef.current.a = true;
          newVelocity.x = -right.x * moveSpeed * 50;
          newVelocity.z = -right.z * moveSpeed * 50;
          break;
        case 's':
          keysRef.current.s = true;
          newVelocity.x = -forward.x * moveSpeed * 50;
          newVelocity.z = -forward.z * moveSpeed * 50;
          break;
        case 'd':
          keysRef.current.d = true;
          newVelocity.x = right.x * moveSpeed * 50;
          newVelocity.z = right.z * moveSpeed * 50;
          break;
        case 'shift':
          keysRef.current.shift = true;
          break;
        case ' ':
          if (!jumpState.isJumping) {
            // Apply upward velocity for jump
            newVelocity.y = movementSettings.jumpHeight * 20;
            jumpState.isJumping = true;
          }
          keysRef.current.space = true;
          break;
        case 'escape':
          keysRef.current.escape = true;
          setHasEnteredNeighborhood(false);
          break;
      }

      // Apply the new velocity
      playerRigidBodyRef.current.setLinvel(newVelocity, true);
    };

    const handleKeyUp = (event) => {
      if (!playerRigidBodyRef.current) return;

      const currentVelocity = playerRigidBodyRef.current.linvel();
      let newVelocity = new RAPIER.Vector3(currentVelocity.x, currentVelocity.y, currentVelocity.z);

      switch (event.key.toLowerCase()) {
        case 'w':
          keysRef.current.w = false;
          if (!keysRef.current.s) newVelocity.z = 0;
          break;
        case 'a':
          keysRef.current.a = false;
          if (!keysRef.current.d) newVelocity.x = 0;
          break;
        case 's':
          keysRef.current.s = false;
          if (!keysRef.current.w) newVelocity.z = 0;
          break;
        case 'd':
          keysRef.current.d = false;
          if (!keysRef.current.a) newVelocity.x = 0;
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

      // Apply the new velocity
      playerRigidBodyRef.current.setLinvel(newVelocity, true);
    };

    // Add event listeners for mouse controls
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', (error) => {
      console.error('Pointer lock error:', error);
    });
    
    // Add click handler to the container
    if (containerRef.current) {
      containerRef.current.style.cursor = 'pointer';
      containerRef.current.addEventListener('click', handleClick);
    }

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // Create raycaster for camera collision detection
    const raycaster = new THREE.Raycaster();

    // Animation
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / 1000, 1);
      
      // Update physics world
      if (worldRef.current) {
        // Step physics
        worldRef.current.step();
        
        // Update player position based on physics
        if (playerRigidBodyRef.current && playerRef.current) {
          const position = playerRigidBodyRef.current.translation();
          const velocity = playerRigidBodyRef.current.linvel();
          
          // Update container position (including player mesh)
          container.position.set(position.x, position.y, position.z);
          
          // Update debug mesh position
          if (playerDebugMeshRef.current) {
            playerDebugMeshRef.current.position.set(position.x, position.y + 0.5, position.z);
          }

          // Update third-person camera position
          const { distance, targetHeight, pitch, yaw, minDistance } = mouseRef.current;
          
          // Calculate desired camera position
          const cameraOffset = new THREE.Vector3(
            -Math.sin(yaw) * Math.cos(pitch) * distance,
            targetHeight + Math.sin(pitch) * distance,
            -Math.cos(yaw) * Math.cos(pitch) * distance
          );

          // Player position with height offset for camera target
          const playerPos = new THREE.Vector3(
            position.x,
            position.y + targetHeight * 0.5,
            position.z
          );

          // Calculate desired camera position
          const desiredCameraPos = new THREE.Vector3(
            playerPos.x + cameraOffset.x,
            playerPos.y + cameraOffset.y,
            playerPos.z + cameraOffset.z
          );

          // Cast ray from player to desired camera position
          const rayDirection = desiredCameraPos.clone().sub(playerPos).normalize();
          const rayLength = desiredCameraPos.distanceTo(playerPos);
          raycaster.set(playerPos, rayDirection);

          // Check for intersections with all objects in the scene
          const intersects = raycaster.intersectObjects(scene.children, true);

          // Find the closest valid intersection
          let closestIntersection = null;
          for (const intersection of intersects) {
            // Skip player model and debug mesh
            if (intersection.object === playerRef.current || 
                intersection.object === playerDebugMeshRef.current ||
                intersection.object === plane) {
              continue;
            }
            closestIntersection = intersection;
            break;
          }

          // Adjust camera position if there's a collision
          if (closestIntersection && closestIntersection.distance < rayLength) {
            // Place camera slightly in front of the collision point
            const adjustedDistance = Math.max(minDistance, closestIntersection.distance - 0.5);
            const adjustedOffset = rayDirection.multiplyScalar(adjustedDistance);
            camera.position.copy(playerPos).add(adjustedOffset);
          } else {
            // No collision, use desired position
            camera.position.copy(desiredCameraPos);
          }
          
          // Look at player
          camera.lookAt(playerPos);
        }
      }
      
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
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', () => {});
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleClick);
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
        zIndex: -1,
        cursor: 'pointer'
      }}
      onClick={handleClick}
    />
  );
} 