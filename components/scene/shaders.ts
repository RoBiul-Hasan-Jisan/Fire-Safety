export const FLAME_VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
/** Flame: round + blue in microgravity, tall + orange with buoyancy. uG is 0..1 (1 = Earth). */
export const FLAME_FRAG = `
uniform float uTime,uFire,uG,uSeed;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p*=2.;a*=.5;}return s;}
void main(){
 vec2 p=vec2(vUv.x-.5,vUv.y);float rise=mix(.15,1.,uG);
 float turb=fbm(vec2(p.x*4.+uSeed,p.y*2.5-uTime*2.4*rise))-.5;
 vec2 q=vec2((p.x+turb*.35*(p.y+.2))*2.,p.y);
 float sh=smoothstep(0.,.5,uG);
 float blob=length(vec2(q.x,(p.y-.38)*1.5));
 float tear=abs(q.x)*(.7+p.y*1.4)+p.y*.95;
 float d=clamp(1.-mix(blob,tear,sh)*(1.5-uFire*.4)+turb*.7,0.,1.);
 vec3 hot=mix(vec3(.85,.14,.02),vec3(1.,.72,.22),d);hot=mix(hot,vec3(1.,.93,.68),smoothstep(.8,1.,d)*.55);
 vec3 blue=mix(vec3(.05,.2,.9),vec3(.55,.8,1.),d);
 vec3 col=mix(hot,blue,1.-smoothstep(0.,.08,uG))*(.8+d*.8);
 gl_FragColor=vec4(col,smoothstep(0.,.4,d)*clamp(uFire*2.5,0.,1.)*.85);}`;
export const PART_VERT = `
attribute vec3 aSeed;uniform float uTime,uG,uAmt,uPx,uSize;varying float vA;varying float vS;
void main(){float ph=fract(aSeed.x+uTime*(.08+.4*uG)*(.5+aSeed.y));
 vec3 p=vec3((aSeed.y-.5)*2.,0.,(aSeed.z-.5)*1.4)*(.25+ph*mix(2.6,1.,uG));
 p.y=ph*mix(2.4,3.6,uG)-.2+(1.-uG)*(aSeed.z-.5)*ph*2.4;
 p.x+=sin(uTime*.5+aSeed.z*20.)*.25*ph;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=uPx*uSize*(.5+ph*1.6)*(14./-mv.z);
 vS=aSeed.y;vA=(1.-ph)*smoothstep(0.,.08,ph)*uAmt;gl_Position=projectionMatrix*mv;}`;
export const PART_FRAG = `uniform vec3 uCol;varying float vA;varying float vS;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){vec2 c=gl_PointCoord-.5;float nn=n(c*6.+vS*30.);float d=length(c)+(nn-.5)*.3;gl_FragColor=vec4(uCol*(.6+nn*.6),smoothstep(.5,.12,d)*vA);}`;
