import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Stars, Float, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export function Earth({ isSpeaking }: { isSpeaking: boolean }) {
  const earthRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        autoRotate 
        autoRotateSpeed={0.5} 
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />

      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        {/* Core Earth Sphere */}
        <mesh ref={earthRef}>
          <sphereGeometry args={[1.5, 64, 64]} />
          <meshStandardMaterial 
            color="#1e3a8a" 
            emissive="#1e3a8a" 
            emissiveIntensity={0.2}
            roughness={0.7}
            metalness={0.3}
          />
          {/* Wireframe overlay for a techy earth feel */}
          <mesh>
            <sphereGeometry args={[1.51, 32, 32]} />
            <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.1} />
          </mesh>
        </mesh>

        {/* Atmosphere Glow */}
        <mesh ref={glowRef}>
          <sphereGeometry args={[1.65, 64, 64]} />
          <meshBasicMaterial 
            color={isSpeaking ? "#60a5fa" : "#1e40af"} 
            transparent 
            opacity={isSpeaking ? 0.2 : 0.1} 
            side={THREE.BackSide}
          />
        </mesh>

        {/* Outer Dynamic Glow when Speaking */}
        {isSpeaking && (
          <Sphere args={[1.8, 64, 64]}>
            <MeshDistortMaterial
              color="#60a5fa"
              speed={5}
              distort={0.3}
              transparent
              opacity={0.15}
            />
          </Sphere>
        )}
      </Float>
    </>
  );
}
