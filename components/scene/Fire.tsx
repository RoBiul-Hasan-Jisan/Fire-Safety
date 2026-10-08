'use client';
import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FLAME_FRAG, FLAME_VERT, PART_FRAG, PART_VERT } from './shaders';

function FlameQuad({ x, z, seed, fire, g }: { x: number; z: number; seed: number; fire: number; g: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFire: { value: 0 }, uG: { value: 0 }, uSeed: { value: seed } }), [seed]);
  useFrame(({ clock }) => {
    const u = mat.current!.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uFire.value = fire;
    u.uG.value = Math.min(1, g);
    const s = 0.2 + fire * 1.0;
    const sy = s * (0.85 + 0.6 * Math.min(1, g * 2));
    mesh.current!.scale.set(s * (1.3 - 0.5 * g), sy, 1);
    mesh.current!.position.y = 0.9 * sy;
  });
  return (
    <Billboard position={[x, -0.55, z]}>
      <mesh ref={mesh}>
        <planeGeometry args={[1.2, 1.8]} />
        <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={FLAME_VERT} fragmentShader={FLAME_FRAG}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </Billboard>
  );
}

function Particles({ count, g, amt, col, size, additive, speed }: { count: number; g: number; amt: number; col: string; size: number; additive: boolean; speed: number }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const b = new THREE.BufferGeometry();
    b.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    b.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: count * 3 }, () => Math.random()), 3));
    return b;
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uG: { value: 0 }, uAmt: { value: 0 }, uPx: { value: 1 }, uSize: { value: size }, uCol: { value: new THREE.Color(col) } }), [size, col]);
  useFrame(({ clock, gl }) => {
    const u = mat.current!.uniforms;
    u.uTime.value = clock.elapsedTime * speed;
    u.uG.value = Math.min(1, g);
    u.uAmt.value = amt;
    u.uPx.value = gl.getPixelRatio();
  });
  return (
    <points geometry={geo} frustumCulled={false} position={[0, -0.5, 0]}>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={PART_VERT} fragmentShader={PART_FRAG}
        transparent depthWrite={false} blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending} toneMapped={false} />
    </points>
  );
}

/** Charred burning item with flickering glow. */
function Embers({ fire }: { fire: number }) {
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (m.current) m.current.emissiveIntensity = fire * (1.6 + 0.6 * Math.sin(clock.elapsedTime * 17) * Math.sin(clock.elapsedTime * 5.3)); });
  return (
    <mesh position={[0, -0.5, 0]} castShadow>
      <boxGeometry args={[1.0, 0.1, 0.6]} />
      <meshStandardMaterial ref={m} color="#15100c" emissive="#ff4a10" roughness={1} />
    </mesh>
  );
}

/** Shader flame + smoke + embers. All shape/speed driven by fire (0..1) and gravity. */
export default function Fire({ fire, smoke, g }: { fire: number; smoke: number; g: number }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = fire * 14 * (1 + 0.25 * Math.sin(clock.elapsedTime * 22));
  });
  return (
    <group>
      <FlameQuad x={-0.35} z={0} seed={0} fire={fire} g={g} />
      <FlameQuad x={0} z={0.1} seed={7.3} fire={fire} g={g} />
      <FlameQuad x={0.35} z={-0.05} seed={3.1} fire={fire} g={g} />
      <Particles count={240} g={g} amt={smoke * 0.6} col="#3a3836" size={110} additive={false} speed={1} />
      <Particles count={70} g={g} amt={fire} col="#ff8a2a" size={7} additive speed={2.2} />
      <pointLight ref={light} castShadow shadow-mapSize={[512, 512]} shadow-bias={-0.003} color={g < 0.05 ? '#6aa8ff' : '#ff7a28'} distance={10} decay={1.6} position={[0, 0.1, 0.7]} />
      <Embers fire={fire} />
    </group>
  );
}
