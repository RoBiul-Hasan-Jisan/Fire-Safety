'use client';
import { RoundedBox, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLB_URL } from '@/lib/renderer';

/** Procedural surface textures (panel seams, rivets, grating, noise). */
function makeTex(kind: 'wall' | 'floor', rx: number, ry: number) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = kind === 'floor' ? '#4a5362' : '#a9b6c6';
  g.fillRect(0, 0, 512, 512);
  const id = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 22; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
  g.putImageData(id, 0, 0);
  g.strokeStyle = 'rgba(15,22,34,.85)';
  g.lineWidth = 4;
  if (kind === 'floor') {
    for (let i = 0; i <= 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  } else {
    g.strokeRect(3, 3, 506, 506);
    g.beginPath(); g.moveTo(256, 3); g.lineTo(256, 509); g.moveTo(3, 256); g.lineTo(509, 256); g.stroke();
    g.fillStyle = 'rgba(30,40,55,.9)';
    for (const x of [24, 232, 280, 488]) for (const y of [24, 232, 280, 488]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Procedural Earth: fbm continents, clouds. */
function earthTex() {
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const hs = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x: number, y: number) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (hs(ix, iy) * (1 - u) + hs(ix + 1, iy) * u) * (1 - v) + (hs(ix, iy + 1) * (1 - u) + hs(ix + 1, iy + 1) * u) * v; };
  const fb = (x: number, y: number) => { let a = 0.5, s = 0; for (let i = 0; i < 5; i++) { s += a * vn(x, y); x *= 2; y *= 2; a *= 0.5; } return s; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = fb(x / 55, y / 55), cl = fb(x / 30 + 9, y / 22 + 4);
    let r = 15, gg = 60, b = 140;
    if (v > 0.5) { const k = Math.min(1, (v - 0.5) * 5); r = 40 + 90 * k; gg = 100 + 40 * (1 - k); b = 50 + 20 * k; }
    const w = cl > 0.55 ? Math.min(1, (cl - 0.55) * 5) : 0;
    r += (240 - r) * w; gg += (244 - gg) * w; b += (250 - b) * w;
    const i = (y * W + x) * 4; img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const Surf = ({ t }: { t: THREE.Texture }) => <meshStandardMaterial map={t} bumpMap={t} bumpScale={1.2} metalness={0.55} roughness={0.5} side={THREE.DoubleSide} />;
const Metal = ({ c = '#8d9bad' }: { c?: string }) => <meshStandardMaterial color={c} metalness={0.85} roughness={0.32} />;

function Procedural() {
  const tx = useMemo(() => ({ floor: makeTex('floor', 6, 2.6), ceil: makeTex('wall', 6, 2.6), side: makeTex('wall', 2.6, 2), back: makeTex('wall', 2.4, 2), earth: earthTex() }), []);
  const racks = [-5, -3.6, -2.2, 2.2, 3.6, 5];
  return (
    <group>
      <mesh position={[0, -1.5, 0]} receiveShadow><boxGeometry args={[12, 0.1, 5.2]} /><Surf t={tx.floor} /></mesh>
      <mesh position={[0, 2.3, 0]} receiveShadow><boxGeometry args={[12, 0.1, 5.2]} /><Surf t={tx.ceil} /></mesh>
      {[-6, 6].map((x) => <mesh key={x} position={[x, 0.4, 0]} receiveShadow><boxGeometry args={[0.1, 3.9, 5.2]} /><Surf t={tx.side} /></mesh>)}
      {[-3.6, 3.6].map((x) => <mesh key={x} position={[x, 0.4, -2.6]} receiveShadow><boxGeometry args={[4.8, 3.9, 0.1]} /><Surf t={tx.back} /></mesh>)}
      {[-1.2, 1.2].map((x) => <mesh key={x} position={[x, 0.4, -2.55]} castShadow><boxGeometry args={[0.2, 3.9, 0.25]} /><Metal c="#5b6a7e" /></mesh>)}
      <mesh position={[0, -1.2, -2.55]}><boxGeometry args={[2.4, 0.5, 0.25]} /><Metal c="#5b6a7e" /></mesh>
      {racks.map((x) => (
        <group key={x} position={[x, -0.2, -2.15]}>
          <RoundedBox args={[1.2, 2.6, 0.7]} radius={0.04} castShadow receiveShadow><Metal c="#a7b4c5" /></RoundedBox>
          <mesh position={[0, 0.55, 0.36]}><planeGeometry args={[0.85, 0.5]} /><meshStandardMaterial color="#06223f" emissive="#2a8cff" emissiveIntensity={1.1} toneMapped /></mesh>
          {[-0.3, 0, 0.3].map((k) => <mesh key={k} position={[k, 0.1, 0.36]}><circleGeometry args={[0.05, 12]} /><meshStandardMaterial color="#111" emissive={k === 0 ? '#ff7a1a' : '#42ff9b'} emissiveIntensity={1.4} /></mesh>)}
          <mesh position={[0, -0.6, 0.36]}><planeGeometry args={[0.9, 0.5]} /><meshStandardMaterial color="#2c3646" metalness={0.8} roughness={0.4} /></mesh>
        </group>
      ))}
      {[-1.4, 1.4].map((x) => <mesh key={x} position={[x * 3.5, 1.9, -1.7]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.1, 0.1, 5, 12]} /><Metal c="#b8c2d0" /></mesh>)}
      <mesh position={[0, 2.05, 1.8]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 11.6, 10]} /><Metal c="#c9d2de" /></mesh>
      {[-1.2, 1.4].map((z) => <mesh key={z} position={[0, -1.05, z * 1.9]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 11.6, 8]} /><Metal c="#d8a838" /></mesh>)}
      <RoundedBox args={[2.4, 0.9, 1.2]} radius={0.05} position={[0, -1, 0]} castShadow receiveShadow><Metal c="#58697f" /></RoundedBox>
      <mesh position={[0, -0.62, 0.61]}><boxGeometry args={[2.2, 0.06, 0.02]} /><meshStandardMaterial color="#e8b200" emissive="#e8b200" emissiveIntensity={0.3} /></mesh>
      <mesh position={[0, 2.22, 0]}><boxGeometry args={[7, 0.05, 0.3]} /><meshStandardMaterial color="#fff" emissive="#bcd8ff" emissiveIntensity={1.2} /></mesh>
      <group position={[-3, 1.5, -26]}>
        <mesh><sphereGeometry args={[11, 64, 64]} /><meshStandardMaterial map={tx.earth} roughness={0.85} emissive="#0b2a55" emissiveIntensity={0.25} /></mesh>
        <mesh scale={1.035}><sphereGeometry args={[11, 48, 48]} /><meshBasicMaterial color="#6bb8ff" transparent opacity={0.18} side={THREE.BackSide} /></mesh>
      </group>
    </group>
  );
}

function Glb() {
  const { scene } = useGLTF(GLB_URL);
  useEffect(() => scene.traverse((o) => { o.castShadow = true; o.receiveShadow = true; }), [scene]);
  return <primitive object={scene} />;
}

/** Real model if /public/models/habitat.glb exists, otherwise the procedural fallback. */
export function Habitat() {
  const [hasGlb, setHasGlb] = useState(false);
  useEffect(() => {
    fetch(GLB_URL, { method: 'HEAD' }).then((r) => setHasGlb(r.ok && !(r.headers.get('content-type') ?? '').includes('html'))).catch(() => {});
  }, []);
  return hasGlb ? <Suspense fallback={<Procedural />}><Glb /></Suspense> : <Procedural />;
}

const SUIT = <meshStandardMaterial color="#e9edf2" roughness={0.75} />;
const Limb = ({ p, r, len }: { p: [number, number, number]; r: [number, number, number]; len: number }) => (
  <mesh position={p} rotation={r} castShadow><capsuleGeometry args={[0.075, len, 6, 10]} />{SUIT}</mesh>
);
function Astronaut({ x, z, phase, g, emergency }: { x: number; z: number; phase: number; g: number; emergency: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    const k = emergency ? 1.8 : 1;
    ref.current!.position.set(x + Math.sin(t * 0.4 * k) * 0.15, -0.55 + 0.4 * (1 - g) + Math.sin(t * 0.8 * k) * 0.12 * (1.2 - g), z);
    ref.current!.rotation.set(Math.sin(t * 0.5) * 0.15, 0.4 + Math.sin(t * 0.3) * 0.3, Math.sin(t * 0.45) * 0.2);
  });
  return (
    <group ref={ref} scale={1.15}>
      <RoundedBox args={[0.42, 0.52, 0.28]} radius={0.09} castShadow>{SUIT}</RoundedBox>
      <mesh position={[0, 0.05, 0.145]}><boxGeometry args={[0.2, 0.12, 0.01]} /><meshStandardMaterial color="#c93a1c" emissive="#c93a1c" emissiveIntensity={0.2} /></mesh>
      <RoundedBox args={[0.34, 0.46, 0.18]} radius={0.05} position={[0, 0.02, -0.23]} castShadow><meshStandardMaterial color="#cfd5dc" roughness={0.6} /></RoundedBox>
      <mesh position={[0, 0.4, 0]} castShadow><sphereGeometry args={[0.19, 20, 20]} />{SUIT}</mesh>
      <mesh position={[0, 0.41, 0.09]} scale={[1, 0.85, 0.7]}><sphereGeometry args={[0.15, 20, 20]} /><meshStandardMaterial color="#d9a441" metalness={1} roughness={0.08} /></mesh>
      <Limb p={[-0.33, 0.1, 0.1]} r={[0.9, 0, 0.5]} len={0.3} /><Limb p={[0.33, 0.1, 0.1]} r={[0.9, 0, -0.5]} len={0.3} />
      <Limb p={[-0.13, -0.5, -0.05]} r={[0.25, 0, 0.08]} len={0.38} /><Limb p={[0.13, -0.5, 0.05]} r={[-0.15, 0, -0.08]} len={0.38} />
      {[-0.15, 0.15].map((bx) => <mesh key={bx} position={[bx, -0.82, 0]}><boxGeometry args={[0.13, 0.1, 0.22]} /><meshStandardMaterial color="#2a2f38" roughness={0.8} /></mesh>)}
    </group>
  );
}

export function Crew({ crew, g, emergency }: { crew: number; g: number; emergency: boolean }) {
  const n = Math.ceil(crew / 34);
  const spots: [number, number][] = [[-3.4, 0.9], [3.2, 0.6], [-1.8, 1.4]];
  return <>{spots.slice(0, n).map(([x, z], i) => <Astronaut key={i} x={x} z={z} phase={i * 2} g={g} emergency={emergency} />)}</>;
}
