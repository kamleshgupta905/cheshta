
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Box, Stars, Environment, Icosahedron } from '@react-three/drei';
import * as THREE from 'three';

// Fix: Defining Three.js intrinsic elements as constants to bypass JSX type errors in strict environments
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const BoxGeometry = 'boxGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const Fog = 'fog' as any;
const AmbientLight = 'ambientLight' as any;
const PointLight = 'pointLight' as any;
const SpotLight = 'spotLight' as any;

// --- DATA NODES (Hero Background) ---
const DataNode = ({ position, color, scale = 1 }: { position: [number, number, number]; color: string; scale?: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      ref.current.rotation.x = t * 0.2;
      ref.current.rotation.y = t * 0.3;
      ref.current.position.y = position[1] + Math.sin(t + position[0]) * 0.1;
    }
  });

  return (
    <Box ref={ref} args={[1, 1, 1]} position={position} scale={scale}>
      {/* Fix: Using constant to bypass intrinsic element error */}
      <MeshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.8}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </Box>
  );
};

const ConnectionLines = () => {
    return (
        /* Fix: Using Group constant */
        <Group>
             {/* Fix: Using Mesh constant */}
             <Mesh position={[0,0,-2]} rotation={[0,0,Math.PI/4]}>
                {/* Fix: Using BoxGeometry constant */}
                <BoxGeometry args={[20, 0.01, 0.01]} />
                {/* Fix: Using MeshBasicMaterial constant */}
                <MeshBasicMaterial color="#2563eb" transparent opacity={0.2} />
             </Mesh>
             {/* Fix: Using Mesh constant */}
             <Mesh position={[0,0,-2]} rotation={[0,0,-Math.PI/4]}>
                {/* Fix: Using BoxGeometry constant */}
                <BoxGeometry args={[20, 0.01, 0.01]} />
                {/* Fix: Using MeshBasicMaterial constant */}
                <MeshBasicMaterial color="#0ea5e9" transparent opacity={0.2} />
             </Mesh>
        </Group>
    )
}

export const NetworkHero: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 40 }}>
        {/* Fix: Using Fog constant */}
        <Fog attach="fog" args={['#020617', 5, 20]} />
        {/* Fix: Using AmbientLight constant */}
        <AmbientLight intensity={1} />
        {/* Fix: Using PointLight constant */}
        <PointLight position={[10, 10, 10]} intensity={2} color="#2563eb" />
        {/* Fix: Using PointLight constant */}
        <PointLight position={[-10, -10, -10]} intensity={2} color="#0ea5e9" />
        
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <DataNode position={[-2, 1, 0]} color="#2563eb" scale={0.7} />
          <DataNode position={[2.5, -0.5, -1]} color="#3b82f6" scale={1} />
          <DataNode position={[0, -2, -2]} color="#0ea5e9" scale={0.5} />
          
          <Icosahedron args={[1, 0]} position={[0, 0.5, -1]} scale={1.5}>
            <MeshDistortMaterial
                color="#2563eb"
                speed={2}
                distort={0.4}
                radius={1}
                wireframe
            />
          </Icosahedron>
        </Float>
        
        <ConnectionLines />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      </Canvas>
    </div>
  );
};

// --- GLOBAL NETWORK ---
export const GlobeVisual: React.FC = () => {
  return (
    <div className="w-full h-full absolute inset-0 bg-slate-950">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        {/* Fix: Using AmbientLight constant */}
        <AmbientLight intensity={1} />
        {/* Fix: Using SpotLight constant */}
        <SpotLight position={[5, 5, 5]} angle={0.5} penumbra={1} intensity={2} color="#3b82f6" />
        
        <Float rotationIntensity={0.3} floatIntensity={0.3} speed={1.5}>
           {/* Fix: Using Group constant */}
           <Group>
                <Sphere args={[1.8, 48, 48]} position={[0, 0, 0]}>
                    {/* Fix: Using MeshStandardMaterial constant */}
                    <MeshStandardMaterial 
                        color="#1e293b" 
                        roughness={0.2} 
                        metalness={0.9}
                        wireframe
                    />
                </Sphere>
                 <Sphere args={[1.75, 48, 48]} position={[0, 0, 0]}>
                    {/* Fix: Using MeshStandardMaterial constant */}
                    <MeshStandardMaterial 
                        color="#0f172a" 
                    />
                </Sphere>

                {/* Satellite Nodes */}
                <Box args={[0.2, 0.2, 0.2]} position={[2.1, 0.5, 0.5]}>
                     {/* Fix: Using MeshStandardMaterial constant */}
                     <MeshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={1} />
                </Box>
                <Box args={[0.15, 0.15, 0.15]} position={[-1.8, 1.2, -0.5]}>
                     {/* Fix: Using MeshStandardMaterial constant */}
                     <MeshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={1} />
                </Box>
                <Box args={[0.1, 0.1, 0.1]} position={[0.5, -2, 1]}>
                     {/* Fix: Using MeshStandardMaterial constant */}
                     <MeshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1} />
                </Box>
           </Group>
        </Float>
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
