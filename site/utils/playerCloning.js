import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';
// Singleton cache for the loaded model and animations
let cachedModel = null;
let cachedAnimations = null;

/**
 * Sets the cached model and animations.
 * @param {THREE.Group} model - The loaded GLTF scene.
 * @param {Array<THREE.AnimationClip>} animations - The loaded animations.
 */
export const setCachedModel = (model, animations) => {
  cachedModel = model;
  cachedAnimations = animations;
};

/**
 * Gets the cached player model.
 * @returns {Object} An object containing the scene and animations.
 */
export const loadPlayerModel = () => {
  return { scene: cachedModel, animations: cachedAnimations };
};

/**
 * Clone a GLTF scene and apply a Toon material based on the provided gradient.
 * @param {THREE.Group} scene - The loaded GLTF scene to clone.
 * @param {THREE.Texture} toonGradient - The gradient texture for toon shading.
 * @returns {THREE.Group} - A cloned scene with mesh materials replaced by Toon materials.
 */
export const getPlayerModelClone = (scene, toonGradient) => {
    // First clone the scene to avoid modifying the original
    const clonedScene = SkeletonUtils.clone(scene);
    
    // Map to store original materials by name for special cases
    const originalMaterials = new Map();
    
    // Store original materials before converting
    scene.traverse((child) => {
        if (child.isMesh && child.material) {
            originalMaterials.set(child.name, child.material.clone());
        }
    });
    
    // Apply toon materials to the clone
    clonedScene.traverse((child) => {
        if (child.isMesh) {
            const originalMaterial = child.material;
            
            // Special handling for eyes - don't modify eye materials
            if (child.name.toLowerCase().includes('eye') || 
                originalMaterial.name?.toLowerCase().includes('eye')) {
                console.log('Preserving original material for eye mesh:', child.name);
                return; // Keep original material for eyes
            }
            
            // Create toon material for other meshes
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
    
    return clonedScene;
};

/**
 * Return the animations array from a loaded GLTF.
 * @param {Array<THREE.AnimationClip>} animations - Loaded animations.
 * @returns {Array<THREE.AnimationClip>}
 */
export const getPlayerModelAnimations = (animations) => animations;

export const getCachedAnimations = () => cachedAnimations;

