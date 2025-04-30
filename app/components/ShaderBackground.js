import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

function GridShaderMaterial() {
  const { viewport } = useThree()
  
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color('#FFF9E6') },  // Background color
      uColor2: { value: new THREE.Color('#007C74') },  // Grid line color
      uResolution: { value: new THREE.Vector2() },
      uGridSize: { value: 20.0 }      // Grid size
    }),
    []
  )

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uResolution.value.set(state.size.width, state.size.height);
  })

  return (
    <shaderMaterial
      uniforms={uniforms}
      vertexShader={`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `}
      fragmentShader={`
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uGridSize;
        uniform vec2 uResolution;
        uniform float uTime;
        varying vec2 vUv;

        float grid(vec2 coord, float lineWidth) {
          vec2 grid = fract(coord);
          vec2 edges = smoothstep(0.0, lineWidth, grid) * 
                      (1.0 - smoothstep(1.0 - lineWidth, 1.0, grid));
          return max(edges.x, edges.y);
        }

        void main() {
          vec2 coord = vUv;
          float aspect = uResolution.x / uResolution.y;
          coord.x *= aspect;
          
          // Add movement based on time (slow)
          coord += uTime * 0.01;
          
          // Create grid with outlines
          float lineWidth = 0.05; // Adjust this value to change outline thickness
          float pattern = grid(coord * uGridSize, lineWidth);
          
          // Mix colors - uColor1 for fill, uColor2 for outlines
          vec3 color = mix(uColor1, uColor2, pattern);
          gl_FragColor = vec4(color, 1.0);
        }
      `}
    />
  )
}

export default function ShaderBackground() {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      zIndex: -1,
      overflow: 'hidden',
      backgroundColor: '#007C74'  // Adding background color here
    }}>
      <Canvas
        camera={{ position: [0, 0, 1] }}
        style={{ background: '#007C74' }}
      >
        <mesh>
          <planeGeometry args={[2, 2]} />
          <GridShaderMaterial />
        </mesh>
      </Canvas>
    </div>
  )
}