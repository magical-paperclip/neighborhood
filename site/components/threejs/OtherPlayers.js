import { useRef, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import createToonGradient from '../../utils/createToonGradient';
import { loadPlayerModel, getPlayerModelClone, getCachedAnimations } from "../../utils/playerCloning";

export default function OtherPlayers({ players }) {
  const modelsRef = useRef(new Map());
  const mixersRef = useRef(new Map());
  const toonGradient = useMemo(() => createToonGradient(), []);
  const debug = true;

  const log = (...args) => {
    if (debug) {
      console.log('[OtherPlayers]', ...args);
    }
  };

  // Animation update loop
  useEffect(() => {
    let lastTime = 0;
    const animate = (time) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Update all animation mixers
      mixersRef.current.forEach((mixer) => {
        if (mixer) {
          mixer.update(delta);
        }
      });

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, []);

  // Update players when the players prop changes
  useEffect(() => {
    if (!players) return;

    // Update existing players and create new ones
    players.forEach((player, playerId) => {
      let model = modelsRef.current.get(playerId);
      let mixer = mixersRef.current.get(playerId);
      
      if (!model) {
        console.log('[OtherPlayers] Creating new model for player:', playerId);
        const { scene, animations } = loadPlayerModel();
        
        if (!scene || !animations) {
          console.log('[OtherPlayers] Failed to load player model or animations');
          return;
        }
        
        // Debug: Log all available animations
        console.log('[OtherPlayers] Available animations:', 
          animations.map(a => a.name).join(', ')
        );
        
        model = getPlayerModelClone(scene, toonGradient);
        model.scale.set(0.027, 0.027, 0.027);
        model.rotation.order = 'YXZ';
        modelsRef.current.set(playerId, model);

        // Initialize position tracking
        model.userData.lastPosition = new THREE.Vector3();
        if (player.position) {
          model.userData.lastPosition.set(
            player.position.x,
            player.position.y,
            player.position.z
          );
        }

        // Set up animation mixer
        mixer = new THREE.AnimationMixer(model);
        mixersRef.current.set(playerId, mixer);

        // Store animations and state
        model.userData.animations = animations;
        model.userData.currentAnimation = null;
        model.userData.animationActions = {};
        
        // Find animations by closest match
        const findAnimation = (keywords) => {
          for (const keyword of keywords) {
            const anim = animations.find(a => 
              a.name.toLowerCase().includes(keyword)
            );
            if (anim) return anim;
          }
          return null;
        };
        
        // Cache animations by type
        const idleAnim = findAnimation(['idle', 'stand']);
        const walkAnim = findAnimation(['walk', 'run', 'move']);
        
        if (idleAnim) {
          console.log('[OtherPlayers] Found idle animation:', idleAnim.name);
          const action = mixer.clipAction(idleAnim);
          model.userData.animationActions.idle = action;
          action.play();
          model.userData.currentAnimation = 'idle';
        } else {
          console.log('[OtherPlayers] No idle animation found!');
        }
        
        if (walkAnim) {
          console.log('[OtherPlayers] Found walking animation:', walkAnim.name);
          const action = mixer.clipAction(walkAnim);
          model.userData.animationActions.walk = action;
        } else {
          console.log('[OtherPlayers] No walking animation found!');
        }
      }

      // Check if position has changed significantly
      if (player.position) {
        const currentPos = new THREE.Vector3(
          player.position.x,
          player.position.y,
          player.position.z
        );
        
        const lastPos = model.userData.lastPosition;
        
        // Use distance threshold for movement detection (0.01 units)
        const distance = currentPos.distanceTo(lastPos);
        const hasMoved = distance > 0.01;
        
        // Debug movement
        if (hasMoved) {
          console.log(`[OtherPlayers] Player ${playerId} moved: ${distance.toFixed(4)} units`);
        }
        
        // Update model position
        model.position.set(
          currentPos.x,
          currentPos.y - 0.6, // Adjust for character height
          currentPos.z
        );
        
        // Update last position
        lastPos.copy(currentPos);

        // Update animations based on movement
        if (mixer) {
          const actions = model.userData.animationActions;
          if (!actions) return;
          
          const idleAction = actions.idle;
          const walkAction = actions.walk;
          
          if (!idleAction || !walkAction) {
            console.log('[OtherPlayers] Missing required animations for player:', playerId, {
              hasIdle: !!idleAction,
              hasWalk: !!walkAction
            });
            return;
          }

          const currentAnim = model.userData.currentAnimation;
          const targetAnim = hasMoved ? 'walk' : 'idle';

          if (currentAnim !== targetAnim) {
            console.log(`[OtherPlayers] Changing animation for player ${playerId}: ${currentAnim} -> ${targetAnim}`);
            
            // Configure animation blending
            const crossFadeDuration = 0.3;
            
            if (currentAnim === 'idle') {
              // Configure walk animation settings for better eye visibility
              walkAction.enabled = true;
              walkAction.setEffectiveTimeScale(1);
              walkAction.setEffectiveWeight(1);
              walkAction.reset();
              walkAction.play();
              
              // Fade out idle animation
              idleAction.crossFadeTo(walkAction, crossFadeDuration, true);
            } else {
              // Configure idle animation settings for better eye visibility
              idleAction.enabled = true;
              idleAction.setEffectiveTimeScale(1);
              idleAction.setEffectiveWeight(1); 
              idleAction.reset();
              idleAction.play();
              
              // Fade out walk animation
              walkAction.crossFadeTo(idleAction, crossFadeDuration, true);
            }
            
            model.userData.currentAnimation = targetAnim;
          }
        }
      }

      if (player.quaternion) {
        model.quaternion.set(
          player.quaternion.x,
          player.quaternion.y,
          player.quaternion.z,
          player.quaternion.w
        );
      }
    });

    // Remove players that are no longer in the list
    modelsRef.current.forEach((model, playerId) => {
      if (!players.has(playerId)) {
        model.removeFromParent();
        modelsRef.current.delete(playerId);
        mixersRef.current.delete(playerId);
      }
    });
  }, [players, toonGradient]);

  return (
    <>
      {Array.from(modelsRef.current.values()).map((model, index) => (
        <primitive key={index} object={model} />
      ))}
    </>
  );
} 