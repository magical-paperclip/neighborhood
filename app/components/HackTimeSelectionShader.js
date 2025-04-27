import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const HackTimeSelectionShader = () => {
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
        iZoom: { value: 5.5 } // Zoom factor
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
        #define CIRCLE_COLUMNS 16.0
        #define TIME_SCALE 0.08
        uniform float iTime;
        uniform vec3 iResolution;
        varying vec2 vUv;
        void main() {
            vec2 uv = vUv;
            float circle_rows = (CIRCLE_COLUMNS * iResolution.y) / iResolution.x;
            float scaledTime = iTime * TIME_SCALE;
            float circle = -cos((uv.x - scaledTime) * PI2 * CIRCLE_COLUMNS)
                * cos((uv.y + scaledTime) * PI2 * circle_rows);
            float stepCircle = step(circle, -sin(iTime + uv.x - uv.y));
            vec3 bg = vec3(1.0, 0.74, 0.76); // #febdc3
            vec3 circleCol = vec3(0.94, 0.46, 0.54); // #ef758a
            vec3 color = mix(bg, circleCol, stepCircle * 0.7); // soft blend
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
        
        // Calculate scale based on window size
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

export default HackTimeSelectionShader; 