'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, Stars } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import Effects from './scene/Effects';
import Fire from './scene/Fire';
import { Crew, Habitat } from './scene/Habitat';

export type View = 'free' | 'orbit' | 'inside';
const VIEWS: Record<View, [number, number, number]> = { free: [3.6, 0.9, 6.4], orbit: [0, 1.5, 9], inside: [1.2, 0.2, 3] };

function Alarm({ fire }: { fire: number }) {
  const l = useRef<THREE.PointLight>(null);
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const on = fire > 0.2 ? 0.5 + 0.5 * Math.sin(clock.elapsedTime * 6) : 0;
    if (l.current) l.current.intensity = on * 5;
    if (m.current) m.current.emissiveIntensity = on * 3;
  });
  return (
    <group position={[0, 2.1, 1.5]}>
      <pointLight ref={l} color="#ff2a2a" distance={14} />
      <mesh><cylinderGeometry args={[0.1, 0.12, 0.12, 16]} /><meshStandardMaterial ref={m} color="#400" emissive="#ff1a1a" /></mesh>
    </group>
  );
}

/** Smoke thickens the air (fog) and pools at the ceiling. */
function Haze({ smoke }: { smoke: number }) {
  const { scene } = useThree();
  useFrame(() => { if (scene.fog) (scene.fog as THREE.FogExp2).density = 0.008 + smoke * 0.07; });
  return (
    <>
      <fogExp2 attach="fog" args={['#0b0e16', 0.01]} />
      <mesh position={[0, 2.18, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[11.8, 5]} /><meshBasicMaterial color="#26262b" transparent opacity={smoke * 0.55} depthWrite={false} /></mesh>
    </>
  );
}

function Rig({ view }: { view: View }) {
  const ctl = useRef<OrbitImpl>(null);
  useEffect(() => {
    const c = ctl.current;
    if (!c) return;
    c.object.position.set(...VIEWS[view]);
    c.target.set(0, 0, 0);
    c.update();
  }, [view]);
  return <OrbitControls ref={ctl} enablePan={false} minDistance={2} maxDistance={13} maxPolarAngle={Math.PI * 0.62} autoRotate={view === 'orbit'} autoRotateSpeed={0.5} />;
}

export default function Scene({ fire, smoke, g, crew, view }: { fire: number; smoke: number; g: number; crew: number; view: View }) {
  return (
    <Canvas shadows camera={{ position: VIEWS.free, fov: 50 }} dpr={[1, 1.75]} gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}>
      <color attach="background" args={['#02040a']} />
      <Stars radius={90} depth={40} count={2500} factor={3} fade />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#cfe3ff" position={[0, 4, 2]} scale={[8, 1, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.2} color="#ff9a55" position={[-6, 0, 2]} scale={[1, 4, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.8} color="#6ea8ff" position={[6, 1, 3]} scale={[1, 4, 1]} rotation-y={-Math.PI / 2} />
      </Environment>
      <hemisphereLight args={['#9cc4ff', '#1a2233', 0.25]} />
      <directionalLight position={[3, 5, 5]} intensity={0.55} color="#cfe3ff" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={4} shadow-camera-bottom={-3} shadow-bias={-0.0005} />
      <Habitat />
      <Crew crew={crew} g={g} emergency={fire > 0.4} />
      <Fire fire={fire} smoke={smoke} g={g} />
      <Alarm fire={fire} />
      <Haze smoke={smoke} />
      <Rig view={view} />
      <Effects fire={fire} />
    </Canvas>
  );
}
