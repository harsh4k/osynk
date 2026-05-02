/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Trail } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { ForceFields } from './ForceFields';
import { HitCircles } from './HitCircles';

function LocalCursor({ mousePosRef }: { mousePosRef: React.MutableRefObject<THREE.Vector3 | null> }) {
  const myColor = useGameStore((state) => state.myColor);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && mousePosRef.current) {
      meshRef.current.position.lerp(mousePosRef.current, 0.4);
      const scale = 1 + Math.sin(state.clock.elapsedTime * 12) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  if (!myColor) return null;

  return (
    <Trail
      width={0.6}
      length={25}
      color={new THREE.Color(myColor)}
      attenuation={(t) => t * t}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshBasicMaterial color="white" />
        <mesh scale={2.5}>
          <circleGeometry args={[0.3, 32]} />
          <meshBasicMaterial color={myColor} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>
      </mesh>
    </Trail>
  );
}

function SceneInteraction({ mousePosRef }: { mousePosRef: React.MutableRefObject<THREE.Vector3 | null> }) {
  const addForce = useGameStore((state) => state.addForce);
  const gameActive = useGameStore((state) => state.gameActive);
  const { camera, gl } = useThree();

  useEffect(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const updateMousePos = (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      mousePosRef.current = target;
      return target;
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateMousePos(e.clientX, e.clientY);
    };

    const handlePointerDown = (e: PointerEvent) => {
      const pos = updateMousePos(e.clientX, e.clientY);
      addForce({ x: pos.x, y: pos.y, z: pos.z }, 'attractor');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'Space') && mousePosRef.current) {
        addForce({ x: mousePosRef.current.x, y: mousePosRef.current.y, z: mousePosRef.current.z }, 'attractor');
      }
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [camera, gl, addForce, gameActive, mousePosRef]);

  return null;
}

function RotatingStars() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
      groupRef.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </group>
  );
}

export function CosmicCanvas() {
  const mousePosRef = useRef<THREE.Vector3 | null>(null);

  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
        <color attach="background" args={['#050510']} />
        
        <ambientLight intensity={0.2} />
        
        <RotatingStars />
        
        <ForceFields />
        <HitCircles />
        <LocalCursor mousePosRef={mousePosRef} />
        
        <SceneInteraction mousePosRef={mousePosRef} />
        
        <EffectComposer>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
