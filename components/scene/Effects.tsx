'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { Effect, ToneMappingMode } from 'postprocessing';
import { useMemo } from 'react';
import * as THREE from 'three';

/** Tight, subtle heat shimmer right above the flame (aspect-corrected, small radius). */
class HeatFx extends Effect {
  constructor() {
    super(
      'HeatFx',
      `uniform float uT;uniform float uA;uniform vec2 uC;uniform float uAsp;
       void mainUv(inout vec2 uv){vec2 dd=(uv-uC)*vec2(uAsp,1.);dd.y*=.6;float m=smoothstep(.11,.0,length(dd))*uA;
       uv+=vec2(sin(uv.y*55.+uT*6.),cos(uv.x*45.+uT*5.))*.0022*m;}`,
      { uniforms: new Map<string, THREE.Uniform>([['uT', new THREE.Uniform(0)], ['uA', new THREE.Uniform(0)], ['uAsp', new THREE.Uniform(1.7)], ['uC', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))]]) },
    );
  }
}

function Heat({ fire }: { fire: number }) {
  const fx = useMemo(() => new HeatFx(), []);
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    fx.uniforms.get('uT')!.value = clock.elapsedTime;
    fx.uniforms.get('uA')!.value = fire;
    fx.uniforms.get('uAsp')!.value = size.width / size.height;
    v.set(0, 0.6, 0).project(camera);
    (fx.uniforms.get('uC')!.value as THREE.Vector2).set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
  });
  return <primitive object={fx} dispose={null} />;
}

/** The composer bypasses renderer tone mapping, so ACES is applied here (fixes the blown-out look). */
export default function Effects({ fire }: { fire: number }) {
  return (
    <EffectComposer multisampling={4}>
      <Heat fire={fire} />
      <Bloom intensity={0.3 + fire * 0.55} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.25} darkness={0.7} />
      <Noise opacity={0.035} />
    </EffectComposer>
  );
}
