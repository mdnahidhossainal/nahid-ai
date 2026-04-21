import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { useGLTF, useAnimations, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Scanline } from '@react-three/postprocessing';
import * as THREE from 'three';

/**
 * HolographicHorse - A 3D animated wireframe horse with bloom effects.
 * Model sourced from Three.js examples.
 */
function HorseModel({ isSpeaking }: { isSpeaking: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Horse.glb');
  const { actions, names } = useAnimations(animations, group);

  // Apply Advanced Holographic Material
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Main Holographic Shell
        mesh.material = new THREE.MeshPhysicalMaterial({
          color: '#00ffff',
          emissive: '#0099ff',
          emissiveIntensity: isSpeaking ? 15 : 4,
          transparent: true,
          opacity: 0.4,
          wireframe: true,
          wireframeLinewidth: 1,
          metalness: 0.5,
          roughness: 0,
          side: THREE.DoubleSide
        });

        // Add a pulsing effect via material if we could, 
        // but since we are iterating, let's keep it clean
      }
    });

    if (actions && names.length > 0) {
      actions[names[0]]?.play();
    }
  }, [scene, actions, names, isSpeaking]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      // Gentle floating
      group.current.position.y = Math.sin(t * 0.8) * 0.2 - 2;
    }
  });

  return (
    <group ref={group} scale={[0.12, 0.12, 0.12]} position={[0, -2, 0]} rotation={[0, -Math.PI / 4, 0]}>
      <primitive object={scene} />
      {/* Intense Internal Glow */}
      <pointLight position={[0, 2, 0]} intensity={isSpeaking ? 15 : 5} color="#00ffff" distance={15} />
      <pointLight position={[0, -2, 0]} intensity={isSpeaking ? 10 : 3} color="#0066ff" distance={15} />
    </group>
  );
}

export function HolographicHorse({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <>
      <color attach="background" args={['#000000']} />
      {/* Camera positioned further back to see the whole horse */}
      <PerspectiveCamera makeDefault position={[25, 10, 35]} fov={45} />
      
      {/* Orbital Controls with full interaction */}
      <OrbitControls 
        autoRotate 
        autoRotateSpeed={0.5} 
        enablePan={true} 
        enableZoom={true}
        minDistance={10}
        maxDistance={80}
        makeDefault
      />

      <ambientLight intensity={0.4} />
      <spotLight position={[20, 20, 20]} angle={0.3} penumbra={1} intensity={5} color="#00ffff" castShadow />
      
      <HorseModel isSpeaking={isSpeaking} />

      {/* Cinematic Post-processing */}
      <EffectComposer multisampling={4}>
        <Bloom 
          intensity={1.2} 
          luminanceThreshold={0.05} 
          luminanceSmoothing={1} 
          mipmapBlur 
        />
        <Vignette eskil={false} offset={0.05} darkness={1.2} />
      </EffectComposer>
    </>
  );
}
