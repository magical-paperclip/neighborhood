import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const BOARD_BAR_HEIGHT = 50;

const BulletinComponent = ({ isExiting, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();
  const meshRef = useRef();

  // Update shader uniforms for pan/zoom
  useEffect(() => {
    if (meshRef.current) {
      const uniforms = meshRef.current.material.uniforms;
      uniforms.uPan.value = new THREE.Vector2(position.x, position.y);
      uniforms.uZoom.value = scale;
    }
  }, [position, scale]);

  useEffect(() => {
    // Initialize Three.js
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(
      -1, 1, 1, -1, 0.1, 10
    );
    camera.position.z = 1;
    cameraRef.current = camera;

    // Cork board shader with pan/zoom
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3() },
        uPan: { value: new THREE.Vector2(0, 0) },
        uZoom: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iTime;
        uniform vec3 iResolution;
        uniform vec2 uPan;
        uniform float uZoom;
        varying vec2 vUv;

        vec3 corkBase(vec2 uv) {
          float base = 0.68 + 0.08 * sin(uv.x*2.0 + uv.y*3.0);
          float r = base + 0.04 * sin(uv.x*12.0 + uv.y*7.0);
          float g = base - 0.03 * cos(uv.x*8.0 + uv.y*11.0);
          float b = base - 0.08 * sin(uv.x*5.0 - uv.y*13.0);
          return vec3(r, g, b) * vec3(0.8, 0.6, 0.35);
        }
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
          vec2 fragCoord = vUv * iResolution.xy;
          vec2 boardUV = (fragCoord - uPan) / (iResolution.y * uZoom);
          float grain = noise(boardUV * 120.0 + iTime * 0.01);
          float grain2 = noise(boardUV * 60.0 - iTime * 0.02);
          float holes = smoothstep(0.7, 0.9, noise(boardUV * 18.0 + 100.0));
          float fiber = 0.08 * sin(boardUV.x * 80.0 + boardUV.y * 40.0);
          vec3 color = corkBase(boardUV);
          color += 0.08 * grain + 0.04 * grain2;
          color -= holes * 0.13;
          color += fiber;
          float vignette = smoothstep(1.0, 0.7, length(boardUV - 0.5));
          color *= 0.98 + 0.04 * vignette;
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(mesh);
    meshRef.current = mesh;

    // Handle resize
    const handleResize = () => {
      if (container) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        shaderMaterial.uniforms.iResolution.value.set(width, height, 1);
      }
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      shaderMaterial.uniforms.iTime.value += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    // Initial resize
    handleResize();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      shaderMaterial.dispose();
    };
  }, []);

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      const newScale = Math.min(Math.max(0.1, scale + delta), 4);
      setScale(newScale);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', handleWheel);
      }
    };
  }, [scale]);

  return (
    <div className={`pop-in ${isExiting ? "hidden" : ""}`} 
      style={{
        position: "absolute", 
        zIndex: 2, 
        width: "calc(100% - 16px)", 
        height: "calc(100% - 16px)", 
        borderRadius: 8, 
        marginLeft: 8, 
        marginTop: 8, 
        backgroundColor: "#ffffff",
        overflow: "hidden"
      }}
    >
      {/* Top bar (solid color) */}
      <div style={{
        display: "flex", 
        flexDirection: "row", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "8px 16px",
        borderBottom: "1px solid #00000010",
        backgroundColor: "#ffffff",
        zIndex: 2,
        height: BOARD_BAR_HEIGHT,
        minHeight: BOARD_BAR_HEIGHT,
        maxHeight: BOARD_BAR_HEIGHT
      }}>
        <div 
          onClick={onClose} 
          style={{
            width: 14, 
            cursor: "pointer", 
            height: 14, 
            borderRadius: 16, 
            backgroundColor: "#FF5F56"
          }}
        />
        <p style={{fontSize: 18, color: "#000", margin: 0}}>Bulletin</p>
        <div style={{width: 14, height: 14}} />
      </div>

      {/* Canvas area with shader as background */}
      <div 
        ref={containerRef}
        style={{
          position: "absolute",
          top: BOARD_BAR_HEIGHT,
          left: 0,
          width: "100%",
          height: `calc(100% - ${BOARD_BAR_HEIGHT}px)`,
          overflow: "hidden",
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 2,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: 'none', // let mouse events through to canvas
          zIndex: 1,
        }}>
          {/* The shader is rendered directly into this div by Three.js */}
        </div>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          zIndex: 2,
          pointerEvents: 'auto',
        }}>
          {/* Content will go here */}
          <div style={{ padding: "20px", color: "#000" }}>
            <p>Hello World</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulletinComponent; 