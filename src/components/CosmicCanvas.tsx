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
  const hitAt = useGameStore((state) => state.hitAt);
  const setPlayfield = useGameStore((state) => state.setPlayfield);
  const { camera, gl } = useThree();
  const viewportWidth = useThree((state) => state.viewport.width);
  const viewportHeight = useThree((state) => state.viewport.height);

  // Keep spawns inside what this screen can actually show.
  useEffect(() => {
    setPlayfield({ halfWidth: viewportWidth / 2, halfHeight: viewportHeight / 2 });
  }, [viewportWidth, viewportHeight, setPlayfield]);

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

    // Judge at the event's own timestamp so main-thread delay doesn't count against the player.
    const tap = (pos: THREE.Vector3, timeStamp: number) => {
      const point = { x: pos.x, y: pos.y, z: pos.z };
      hitAt(point, timeStamp);
      addForce(point, 'attractor');
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateMousePos(e.clientX, e.clientY);
    };

    // Listen on the canvas so clicks on HUD buttons never count as taps.
    const handlePointerDown = (e: PointerEvent) => {
      tap(updateMousePos(e.clientX, e.clientY), e.timeStamp);
    };

    // During live play Space is a tap key, so stop it from also clicking whatever button has focus.
    // Paused and on the fail screen, Space activates buttons as usual.
    const blockSpaceDefault = (e: KeyboardEvent) => {
      const s = useGameStore.getState();
      if (e.code === 'Space' && s.gameActive && !s.isPaused && !s.showFailScreen) e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      blockSpaceDefault(e);
      if (e.repeat || !mousePosRef.current) return;
      if (e.code === 'KeyZ' || e.code === 'KeyX' || e.code === 'Space') tap(mousePosRef.current, e.timeStamp);
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    const canvas = gl.domElement;
    window.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', blockSpaceDefault);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', blockSpaceDefault);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [camera, gl, addForce, hitAt, mousePosRef]);

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
