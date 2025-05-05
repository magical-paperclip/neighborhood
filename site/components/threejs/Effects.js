import { useRef, useEffect } from "react";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { extend, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

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

export default function Effects({ isLoading, fadeTimeRef }) {
    const { gl, scene, camera, size } = useThree();
    const composerRef = useRef();
    const pastelPassRef = useRef();
    
    // Setup post-processing effects - balanced for performance and visuals
    useEffect(() => {
      const composer = new EffectComposer(gl);
      composerRef.current = composer;
      
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);
      
      // Add bloom effect - balanced values
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        0.2, // balanced value 
        0.15, // balanced value
        0.3  // balanced value
      );
      composer.addPass(bloomPass);
      
      // Add custom pastel shader with balanced processing
      const pastelPass = new ShaderPass(PastelVibrantShader);
      pastelPass.uniforms.saturation.value = 0.9; // increased from 0.7
      pastelPass.uniforms.brightness.value = 0.95; // increased from 0.8
      pastelPass.uniforms.pastelAmount.value = 0.15; // increased from 0.1
      pastelPass.uniforms.warmth.value = 0.03; // increased from 0.02
      pastelPass.uniforms.opacity.value = 1.0;
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
    
    // Use the composer efficiently - update every frame but with simpler effects
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
      
      // Use composer every frame but with optimized settings
      if (composerRef.current && composerRef.current.renderer) {
        composerRef.current.render();
        return 1; // Signal to R3F to skip its own render
      }
    }, 1);
    
    return null;
  }