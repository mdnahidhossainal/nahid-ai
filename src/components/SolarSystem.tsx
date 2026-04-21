import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Stars, PerspectiveCamera, OrbitControls, Line, Float } from '@react-three/drei';
import * as THREE from 'three';

interface PlanetData {
  name: string;
  color: string;
  size: number;
  distance: number;
  speed: number;
  rotationSpeed: number;
}

const PLANETS: PlanetData[] = [
  { name: 'Mercury', color: '#8c8c8c', size: 0.3, distance: 4, speed: 0.04, rotationSpeed: 0.02 },
  { name: 'Venus', color: '#e3bb76', size: 0.5, distance: 6, speed: 0.015, rotationSpeed: 0.01 },
  { name: 'Earth', color: '#2271b3', size: 0.6, distance: 9, speed: 0.01, rotationSpeed: 0.02 },
  { name: 'Mars', color: '#e27b58', size: 0.4, distance: 12, speed: 0.008, rotationSpeed: 0.018 },
  { name: 'Jupiter', color: '#d39c7e', size: 1.2, distance: 18, speed: 0.002, rotationSpeed: 0.04 },
  { name: 'Saturn', color: '#c5ab6e', size: 1.0, distance: 24, speed: 0.0009, rotationSpeed: 0.038 },
  { name: 'Uranus', color: '#b5e3e3', size: 0.7, distance: 30, speed: 0.0004, rotationSpeed: 0.03 },
  { name: 'Neptune', color: '#4b70dd', size: 0.7, distance: 35, speed: 0.0001, rotationSpeed: 0.032 },
];

function Planet({ data, isSpeaking }: { data: PlanetData, isSpeaking: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Create orbit line points
  const points = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, data.distance, data.distance, 0, 2 * Math.PI, false, 0);
    return curve.getPoints(100).map(p => new THREE.Vector3(p.x, 0, p.y));
  }, [data.distance]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += data.speed;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Orbit Line */}
      <Line points={points} color="white" opacity={0.1} transparent lineWidth={0.5} />
      
      {/* Planet Mesh */}
      <mesh ref={meshRef} position={[data.distance, 0, 0]}>
        <sphereGeometry args={[data.size, 32, 32]} />
        <meshStandardMaterial 
          color={data.color} 
          emissive={data.color}
          emissiveIntensity={0.2}
          roughness={0.8}
          metalness={0.2}
        />
        
        {/* Special treatment for Saturn's Rings */}
        {data.name === 'Saturn' && (
          <mesh rotation={[Math.PI / 2.5, 0, 0]}>
            <ringGeometry args={[data.size * 1.4, data.size * 2.2, 64]} />
            <meshStandardMaterial color={data.color} transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* Earth's Glow Effect when speaking */}
        {data.name === 'Earth' && isSpeaking && (
          <Sphere args={[data.size * 1.2, 32, 32]}>
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.15} />
          </Sphere>
        )}
      </mesh>
    </group>
  );
}

export function SolarSystem({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 20, 50]} fov={60} />
      <OrbitControls 
        enablePan={true}
        enableZoom={true} 
        minDistance={5}
        maxDistance={150}
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />
      
      <Stars radius={300} depth={60} count={10000} factor={7} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={4} color="#ffcc33" distance={100} decay={1} />
      
      {/* The Sun */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          <meshStandardMaterial 
            color="#ffcc33" 
            emissive="#ff8800" 
            emissiveIntensity={1}
            roughness={0}
          />
          {/* Sun Glow */}
          <Sphere args={[3, 64, 64]}>
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.1} />
          </Sphere>
        </mesh>
      </Float>

      {/* Planets */}
      {PLANETS.map((planet) => (
        <Planet key={planet.name} data={planet} isSpeaking={isSpeaking} />
      ))}
    </>
  );
}
