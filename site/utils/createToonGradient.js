import * as THREE from "three";

// Create a toon gradient texture
export default function createToonGradient() {
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