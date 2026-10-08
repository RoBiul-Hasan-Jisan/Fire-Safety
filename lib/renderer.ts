/** FLAMEFALL renders with WebGL2 (reliable everywhere). WebGPU is detected and reported only. */
export const webgpuAvailable = () => typeof navigator !== 'undefined' && 'gpu' in navigator;
export const GLB_URL = '/models/habitat.glb';
