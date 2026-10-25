import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, Target, getGameTime } from '../store/useGameStore';
import { CIRCLE_RADIUS } from '../utils/gameplay';

// Hits are resolved in the store from the cursor position (see SceneInteraction),
// so these meshes are purely visual.
export function HitCircles() {
  const targets = useGameStore((state) => state.targets);
  const myColor = useGameStore((state) => state.myColor);

  return (
    <>
      {targets.map((target) => (
        target.type === 'circle' ? (
          <HitCircle key={target.id} target={target} color={myColor} />
        ) : (
          <Slider key={target.id} target={target} color={myColor} />
        )
      ))}
    </>
  );
}

function HitCircle({ target, color }: { target: Target, color: string }) {
  const circleRef = useRef<THREE.Group>(null);
  const approachRef = useRef<THREE.Mesh>(null);
  const mainRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!circleRef.current || target.hit || target.missed) return;

    const age = getGameTime() - target.startTime;
    const progress = age / target.duration;
    
    if (approachRef.current) {
      const approachScale = Math.max(1, 4 - (progress * 3));
      approachRef.current.scale.set(approachScale, approachScale, 1);
      const mat = approachRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(1, progress * 4) * 0.5;
    }

    if (mainRef.current) {
      const mat = mainRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(1, progress * 8);
    }
  });

  if (target.hit || target.missed) return null;

  return (
    <group ref={circleRef} position={[target.position.x, target.position.y, target.position.z]}>
      <mesh ref={mainRef}>
        <circleGeometry args={[CIRCLE_RADIUS, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
      </mesh>
      
      <mesh>
        <ringGeometry args={[CIRCLE_RADIUS - 0.05, CIRCLE_RADIUS, 32]} />
        <meshBasicMaterial color="white" transparent opacity={0.8} />
      </mesh>

      <mesh ref={approachRef}>
        <ringGeometry args={[CIRCLE_RADIUS - 0.02, CIRCLE_RADIUS + 0.02, 64]} />
        <meshBasicMaterial color="white" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function Slider({ target, color }: { target: Target, color: string }) {
  const ballRef = useRef<THREE.Group>(null);
  const path = target.sliderPath!;
  
  useFrame(() => {
    if (!ballRef.current || target.missed) return;
    
    const age = getGameTime() - target.startTime;
    const progress = age / target.duration;
    
    if (target.hit && progress >= 0 && progress <= 1) {
      const start = new THREE.Vector3(path[0].x, path[0].y, path[0].z);
      const end = new THREE.Vector3(path[1].x, path[1].y, path[1].z);
      ballRef.current.position.lerpVectors(start, end, progress);
      ballRef.current.visible = true;
    } else if (!target.hit) {
      ballRef.current.position.set(path[0].x, path[0].y, path[0].z);
      ballRef.current.visible = false;
    }
  });

  if (target.missed) return null;

  return (
    <group>
      {/* Slider Outer Path (Glow) */}
      <Line
        points={[
          [path[0].x, path[0].y, path[0].z],
          [path[1].x, path[1].y, path[1].z]
        ]}
        color={color}
        lineWidth={60}
        transparent
        opacity={0.1}
      />

      {/* Slider Inner Path */}
      <Line
        points={[
          [path[0].x, path[0].y, path[0].z],
          [path[1].x, path[1].y, path[1].z]
        ]}
        color="white"
        lineWidth={40}
        transparent
        opacity={0.2}
      />
      
      {/* Start Circle */}
      <HitCircle target={target} color={color} />
      
      {/* End Point Indicator */}
      <mesh position={[path[1].x, path[1].y, path[1].z]}>
        <ringGeometry args={[CIRCLE_RADIUS - 0.1, CIRCLE_RADIUS, 32]} />
        <meshBasicMaterial color="white" transparent opacity={0.4} />
      </mesh>

      {/* Slider Ball (Following) */}
      <group ref={ballRef}>
        <mesh>
          <sphereGeometry args={[0.85, 32, 32]} />
          <meshBasicMaterial color="white" transparent opacity={0.3} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.8, 0.9, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
}
