import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { useGLTF, useAnimations, OrbitControls } from "@react-three/drei";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

// Extend Three.js classes to make them available in JSX
extend({ EffectComposer, RenderPass, UnrealBloomPass, ShaderPass });

// Custom shader for pastel vibrant look
const PastelVibrantShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.4 }, // Increased saturation
    brightness: { value: 10 }, // Slight brightness boost
    pastelAmount: { value: 0.2 }, // Controls how pastel the colors appear
    warmth: { value: 0.05 }, // Slight warm tint
    opacity: { value: 1.0 }, // Added for fade in effect
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float brightness;
    uniform float pastelAmount;
    uniform float warmth;
    uniform float opacity;
    varying vec2 vUv;

    vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Convert to HSV
      vec3 hsv = rgb2hsv(texel.rgb);

      // Adjust saturation while preserving luminance
      hsv.y = clamp(hsv.y * saturation, 0.0, 1.0);

      // Pastel effect: slightly reduce saturation for brighter colors
      // and increase value to create that pastel look
      hsv.y = mix(hsv.y, hsv.y * (1.0 - hsv.z * 0.3), pastelAmount);
      hsv.z = mix(hsv.z, 1.0 - (1.0 - hsv.z) * 0.7, pastelAmount);

      // Convert back to RGB
      vec3 rgb = hsv2rgb(hsv);

      // Adjust brightness
      rgb *= brightness;

      // Add warmth (slight yellow/orange tint)
      rgb.r += warmth;
      rgb.g += warmth * 0.7;

      // Soften contrast slightly
      rgb = mix(vec3(0.5), rgb, 0.9);

      // Apply fade in opacity
      gl_FragColor = vec4(rgb, texel.a * opacity);
    }
  `,
};

// Create a toon gradient texture
function createToonGradient() {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 1;
  const context = canvas.getContext("2d");

  // Create gradient
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0.0, "#444444");
  gradient.addColorStop(0.33, "#888888");
  gradient.addColorStop(0.66, "#cccccc");
  gradient.addColorStop(1.0, "#ffffff");

  // Fill with gradient
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(
    canvas,
    THREE.UVMapping,
    THREE.ClampToEdgeWrapping,
    THREE.ClampToEdgeWrapping,
    THREE.NearestFilter,
    THREE.NearestFilter,
  );
  texture.needsUpdate = true;

  return texture;
}

// PostProcessing effects
function Effects({ isLoading, fadeTimeRef }) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef();
  const pastelPassRef = useRef();
  
  // Setup post-processing effects
  useEffect(() => {
    const composer = new EffectComposer(gl);
    composerRef.current = composer;
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Add bloom effect - use much lower values to start
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.3, // reduced from 0.8
      0.2, // reduced from 0.4
      0.4  // reduced from 0.85
    );
    composer.addPass(bloomPass);
    
    // Add custom pastel shader - reduce initial values
    const pastelPass = new ShaderPass(PastelVibrantShader);
    pastelPass.uniforms.saturation.value = 1.0; // reduced from 1.2
    pastelPass.uniforms.brightness.value = 1.0; // kept at 1.0
    pastelPass.uniforms.pastelAmount.value = 0.2; // reduced from 1.0
    pastelPass.uniforms.warmth.value = 0.05; // reduced from 0.1
    pastelPass.uniforms.opacity.value = 1.0; // changed from 0.0 to 1.0 to make sure we see something
    pastelPassRef.current = pastelPass;
    
    composer.addPass(pastelPass);
    
    // Cleanup
    return () => {
      composer.dispose();
    };
  }, [gl, scene, camera, size]);
  
  // Handle resize
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size]);
  
  // Don't use the composer for initial rendering - let the default renderer work first
  useFrame((state) => {
    // Use the default renderer for the first few frames
    if (state.clock.elapsedTime < 1) {
      return;
    }
    
    // Handle fade in effect
    if (!isLoading && fadeTimeRef.current) {
      const fadeProgress = Math.min(
        (Date.now() - fadeTimeRef.current) / 2000,
        1
      );
      
      if (pastelPassRef.current) {
        pastelPassRef.current.uniforms.opacity.value = fadeProgress;
      }
      
      if (fadeProgress === 1) {
        fadeTimeRef.current = null;
      }
    }
    
    // Skip the composer rendering if it's not ready
    if (composerRef.current && composerRef.current.renderer) {
      composerRef.current.render();
      return 1; // Signal to R3F to skip its own render
    }
  }, 1);
  
  return null;
}

// Cloud component
function Clouds() {
  const cloudGroup = useRef();
  const toonGradient = useMemo(() => createToonGradient(), []);
  
  // Generate cloud data
  const cloudData = useMemo(() => {
    const clouds = [];
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 180 - 90;
      const z = Math.random() * 180 - 90;
      const y = Math.random() * 5 + 25;
      
      const segments = 3 + Math.floor(Math.random() * 5);
      const parts = [];
      
      for (let j = 0; j < segments; j++) {
        const scale = 3 + Math.random() * 4;
        parts.push({
          position: [
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 5
          ],
          scale: [scale, scale * 0.6, scale]
        });
      }
      
      clouds.push({ position: [x, y, z], parts });
    }
    return clouds;
  }, []);
  
  // Animate clouds
  useFrame(() => {
    if (!cloudGroup.current) return;
    
    cloudGroup.current.children.forEach((cloudCluster, i) => {
      cloudCluster.position.x += Math.sin(Date.now() * 0.0001 + i * 0.1) * 0.01;
      cloudCluster.position.z += Math.cos(Date.now() * 0.0001 + i * 0.1) * 0.01;
    });
  });
  
  return (
    <group ref={cloudGroup}>
      {cloudData.map((cloud, i) => (
        <group key={i} position={cloud.position}>
          {cloud.parts.map((part, j) => (
            <mesh key={j} position={part.position} scale={part.scale}>
              <sphereGeometry args={[1, 10, 10]} />
              <meshToonMaterial 
                color={0xffffff}
                gradientMap={toonGradient}
                transparent={true}
                opacity={0.9}
                emissive={0xffffee}
                emissiveIntensity={0.1}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Ground plane component
function Ground({ onLoad }) {
  const [texture, setTexture] = useState(null);
  const toonGradient = useMemo(() => createToonGradient(), []);
  
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      '/animal-crossing.png', 
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.repeat.set(500, 500);
        setTexture(loadedTexture);
        if (onLoad) onLoad();
      },
      undefined,
      (error) => {
        console.error('Error loading ground texture:', error);
        // Call onLoad even if there's an error to prevent blocking
        if (onLoad) onLoad();
      }
    );
  }, [onLoad]);
  
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[1000, 1000]} />
      <meshToonMaterial
        map={texture}
        gradientMap={toonGradient}
        color={0x8dc63f}
        side={THREE.DoubleSide}
        emissive={0x1a4d1a}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

// Map model component
function MapModel({ onLoad }) {
  const { scene: mapModel } = useGLTF("/models/sf_map_3.glb");
  const toonGradient = useMemo(() => createToonGradient(), []);
  
  useEffect(() => {
    if (mapModel) {
      mapModel.scale.set(3.0, 3.0, 3.0);
      mapModel.position.set(0.0, -0.01, 0.0);
      
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
  
  return <primitive object={mapModel} />;
}

// Player model component
function PlayerModel({ onLoad, containerRef, moveState }) {
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

// Scene component
function Scene({ hasEnteredNeighborhood, setHasEnteredNeighborhood, isLoading, setIsLoading }) {
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
      {/* Scene lights - increase intensity */}
      <ambientLight color={0xf4ccff} intensity={1.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[-5, 5, -5]} intensity={1.0} />
      
      {/* Clouds */}
      <Clouds />
      
      {/* Ground */}
      <Ground onLoad={() => setAssetsLoaded(prev => ({ ...prev, texture: true }))} />
      
      {/* Map */}
      <MapModel onLoad={() => setAssetsLoaded(prev => ({ ...prev, map: true }))} />
      
      {/* Player model - pass moveState directly */}
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

export default function NeighborhoodEnvironment({
  hasEnteredNeighborhood,
  setHasEnteredNeighborhood,
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHasEnteredNeighborhood(true);
  }, []);
  
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
      }}
    >
      <Canvas
        camera={{
          fov: 45,
          near: 0.1,
          far: 1000,
          position: [2, 3, 1]
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "low-power",
          outputEncoding: THREE.sRGBEncoding
        }}
        dpr={[1, 2]} // Limit pixel ratio for better performance
        shadows={false} // Turn off shadows until needed
      >
        {/* Camera controls initial look target */}
        <CameraController />
        
        <Scene 
          hasEnteredNeighborhood={hasEnteredNeighborhood}
          setHasEnteredNeighborhood={setHasEnteredNeighborhood}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </Canvas>
      
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            fontSize: "16px",
            textAlign: "center",
          }}
        >Loading...</div>
      )}
    </div>
  );
}
// Camera controller component to set initial look target
function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.lookAt(-0.5, 2.4, 0);
  }, [camera]);
  
  return null;
}

