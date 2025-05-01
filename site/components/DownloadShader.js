import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const DownloadShader = () => {
  const containerRef = useRef();
  const rendererRef = useRef();
  const sceneRef = useRef();
  const cameraRef = useRef();

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

    // Create shader material
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3() },
        iScale: { value: 1.0 },
        iZoom: { value: 5.5 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        #define PI 3.1415926535897932384626433832795
        #define PI2 6.2831853071795864769252867665590
        #define TIME_SCALE 0.05
        uniform float iTime;
        uniform vec3 iResolution;
        varying vec2 vUv;

        float leaf(vec2 uv, float size, float angle) {
          float s = sin(angle);
          float c = cos(angle);
          uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
          return smoothstep(0.0, 0.1, 1.0 - length(uv) * size);
        }

        void main() {
          vec2 uv = vUv;
          vec2 center = vec2(0.5, 0.5);
          vec2 p = uv - center;
          
          // Base color - soft cream
          vec3 bg = vec3(0.98, 0.95, 0.9);
          
          // Create leaf pattern
          float pattern = 0.0;
          float time = iTime * TIME_SCALE;
          
          // Create multiple leaves in a circle
          for(int i = 0; i < 8; i++) {
            float angle = float(i) * PI2 / 8.0 + time;
            vec2 offset = vec2(cos(angle), sin(angle)) * 0.3;
            pattern += leaf(p - offset, 0.2, angle);
          }
          
          // Soft green color for leaves
          vec3 leafColor = vec3(0.6, 0.8, 0.6);
          
          // Mix the pattern with the background
          vec3 color = mix(bg, leafColor, pattern * 0.3);
          
          // Add some subtle noise
          float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
          color += noise * 0.02;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(mesh);

    // Handle resize
    const handleResize = () => {
      if (container) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        renderer.setSize(width, height);
        
        const scale = Math.max(width, height) / 1000;
        shaderMaterial.uniforms.iScale.value = scale;
        
        shaderMaterial.uniforms.iResolution.value.set(
          width,
          height,
          1
        );
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

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'hidden'
      }}
    />
  );
};

export default DownloadShader; 