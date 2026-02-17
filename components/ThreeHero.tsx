"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Mesh } from "three";

function AnimatedCore() {
  const mesh = useRef<Mesh>(null);
  const points = useMemo(() => {
    return Array.from({ length: 24 }).map((_, index) => ({
      x: Math.sin(index) * 2.2,
      y: Math.cos(index * 0.7) * 1.4,
      z: (index % 5) - 2,
      scale: (index % 4) * 0.06 + 0.15,
    }));
  }, []);

  useFrame((_, delta) => {
    if (!mesh.current) {
      return;
    }
    mesh.current.rotation.y += delta * 0.3;
    mesh.current.rotation.x += delta * 0.08;
  });

  return (
    <group>
      <Float speed={2} rotationIntensity={0.4} floatIntensity={0.7}>
        <mesh ref={mesh}>
          <icosahedronGeometry args={[1.25, 2]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.2} metalness={0.7} emissive="#3f2a00" />
        </mesh>
      </Float>
      {points.map((point, idx) => (
        <mesh key={idx} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[point.scale, 16, 16]} />
          <meshStandardMaterial color="#22d3ee" roughness={0.35} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function ThreeHero() {
  return (
    <div className="h-[240px] w-full overflow-hidden rounded-[1.4rem] border border-ring/30 bg-gradient-to-br from-card to-panel shadow-glow sm:h-[320px]">
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 5, 6]} intensity={1.2} />
        <directionalLight position={[-3, -1, -4]} intensity={0.5} color="#fb923c" />
        <AnimatedCore />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
