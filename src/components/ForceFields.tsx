/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

function Attractor({ position, color }: { position: THREE.Vector3; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const mountedAt = useRef(Date.now());

  useFrame((state) => {
    if (meshRef.current) {
      const age = (Date.now() - mountedAt.current) / 1000;
      let lifeScale = 1;
      if (age < 0.5) {
        lifeScale = age / 0.5;
      } else if (age > 9.5) {
        lifeScale = Math.max(0, (10 - age) / 0.5);
      }

      const scale = (1 + Math.sin(state.clock.elapsedTime * 5) * 0.1) * lifeScale;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh position={position} ref={meshRef}>
      <sphereGeometry args={[1.2, 32, 32]} />
      <meshPhysicalMaterial 
        transmission={1} 
        ior={1.5} 
        thickness={2} 
        roughness={0} 
        color={color || "#ffffff"}
      />
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color={color || "#ffffff"} />
      </mesh>
    </mesh>
  );
}

function Repulsor({ position, color }: { position: THREE.Vector3; color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const mountedAt = useRef(Date.now());

  useFrame((state) => {
    if (groupRef.current) {
      const age = (Date.now() - mountedAt.current) / 1000;
      let lifeScale = 1;
      if (age < 0.5) {
        lifeScale = age / 0.5;
      } else if (age > 9.5) {
        lifeScale = Math.max(0, (10 - age) / 0.5);
      }

      const time = state.clock.elapsedTime * 0.8; // slower, softer
      groupRef.current.children.forEach((child, i) => {
        if (i === 3) {
          // Inner core
          child.scale.set(lifeScale, lifeScale, lifeScale);
          return;
        }
        const mesh = child as THREE.Mesh;
        // Offset each ring's phase
        const phase = (time + i * 0.33) % 1;
        // Scale smoothly from 0.2 to 3.5
        const scale = (0.2 + phase * 3.3) * lifeScale;
        mesh.scale.set(scale, scale, scale);
        // Opacity fades in and out smoothly using sine wave
        const opacity = Math.sin(phase * Math.PI) * 0.4 * lifeScale;
        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      });
    }
  });

  return (
    <group position={position} ref={groupRef}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial color={color || "#ff3333"} side={THREE.DoubleSide} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color={color || "#ff3333"} />
      </mesh>
    </group>
  );
}

export function ForceFields() {
  const forceFields = useGameStore((state) => state.forceFields);

  return (
    <>
      {Object.values(forceFields).map((force) => {
        const pos = new THREE.Vector3(force.position.x, force.position.y, force.position.z);
        return force.type === 'attractor' ? (
          <Attractor key={force.id} position={pos} color={force.color} />
        ) : (
          <Repulsor key={force.id} position={pos} color={force.color} />
        );
      })}
    </>
  );
}
