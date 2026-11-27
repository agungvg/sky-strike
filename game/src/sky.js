// Sky dome, sun and fog. One sun direction is shared by the dome shader,
// the key light and the fog colour, so the frame never disagrees about
// where the sun is. Fog colour == horizon colour (golden-hour rule).
import * as THREE from 'three';
import { SUN, PALETTES } from './config.js';

const VERT = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // dome sits at the far plane
}`;

const FRAG = /* glsl */`
varying vec3 vDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uMid;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSunCore;
uniform float uSunSize;
uniform float uStars; // 0 = none, 1 = night stars
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
void main() {
  float h = clamp(vDir.y, -0.08, 1.0);
  // 3-stop gradient: warm horizon -> pink band -> violet zenith
  vec3 col = h < 0.35
    ? mix(uHorizon, uMid, h / 0.35)
    : mix(uMid, uZenith, (h - 0.35) / 0.65);
  // below-horizon haze: keep the horizon band warm, darken toward nadir
  if (vDir.y < 0.0) col = mix(uHorizon, uHorizon * 0.55, clamp(-vDir.y * 4.0, 0.0, 1.0));
  float d = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
  col += uSunColor * pow(d, 400.0) * 0.9;            // tight glow
  col += uSunColor * pow(d, 10.0) * 0.20;            // wide halo
  float disc = smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.75, d);
  col = mix(col, uSunCore, disc);                     // the visible disc
  if (uStars > 0.01) {
    vec3 sp = floor(vDir * 220.0);
    float s = step(0.9985, hash(sp));
    col += vec3(0.9, 0.95, 1.0) * s * uStars * smoothstep(0.05, 0.35, vDir.y);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.uniforms = {
      uZenith: { value: new THREE.Color(0x3d3678) },
      uHorizon: { value: new THREE.Color(0xff9a4d) },
      uMid: { value: new THREE.Color(0xd95f7e) },
      uSunDir: { value: new THREE.Vector3(-0.42, 0.20, -0.88).normalize() },
      uSunColor: { value: new THREE.Color(0xffd27a) },
      uSunCore: { value: new THREE.Color(0xfff3c4) },
      uSunSize: { value: 0.008 },
      uStars: { value: 0 },
    };
    const geo = new THREE.SphereGeometry(9000, 32, 20);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.dome = new THREE.Mesh(geo, mat);
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    this.key = new THREE.DirectionalLight(0xffb36b, 2.7);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.camera.left = -900; this.key.shadow.camera.right = 900;
    this.key.shadow.camera.top = 900; this.key.shadow.camera.bottom = -900;
    this.key.shadow.camera.near = 10; this.key.shadow.camera.far = 6000;
    this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 2.0;
    scene.add(this.key); scene.add(this.key.target);

    this.hemi = new THREE.HemisphereLight(0x8a7fd6, 0x5a3a28, 0.75);
    scene.add(this.hemi);

    this.sunDir = new THREE.Vector3();
    this.apply('golden');
  }

  // paletteName: 'golden' | 'storm' | 'night' | 'clouds'
  // sunKey: which SUN entry to use for the light direction.
  apply(paletteName, sunKey = 'golden') {
    const p = PALETTES[paletteName];
    const s = SUN[sunKey] || SUN.golden;
    this.sunDir.set(s.x, s.y, s.z).normalize();
    this.uniforms.uZenith.value.setHex(p.zenith);
    this.uniforms.uHorizon.value.setHex(p.horizon);
    this.uniforms.uMid.value.setHex(p.mid);
    this.uniforms.uSunDir.value.copy(this.sunDir);
    this.uniforms.uSunColor.value.setHex(p.sun);
    this.uniforms.uSunCore.value.setHex(p.sunCore);
    this.uniforms.uSunSize.value = 0.008;
    this.uniforms.uStars.value = paletteName === 'night' ? 1 : 0;
    this.key.color.setHex(p.key);
    this.key.intensity = p.keyIntensity;
    this.key.position.copy(this.sunDir).multiplyScalar(2500);
    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.hemi.intensity = p.hemi;
    this.scene.fog = new THREE.FogExp2(p.fog, p.fogDensity);
    this.scene.background = null; // dome covers everything
    this.renderer.toneMappingExposure = p.exposure;
    this.palette = p;
    this.paletteName = paletteName;
    if (this.waterMat) {
      this.waterMat.uniforms.uDeep.value.setHex(p.waterDeep || p.water);
      this.waterMat.uniforms.uShallow.value.setHex(p.waterShallow || p.water);
      this.waterMat.uniforms.uSky.value.setHex(p.horizon);
      this.waterMat.uniforms.uGlitter.value.setHex(p.waterGlitter);
    }
  }

  // The terrain hands Sky its water material so the palette stays in sync.
  bindWater(waterMat) { this.waterMat = waterMat; }

  // Keep the shadow frustum centred on the player instead of the whole map.
  follow(x, z) {
    this.key.target.position.set(x, 0, z);
    this.key.position.set(x + this.sunDir.x * 2500, this.sunDir.y * 2500, z + this.sunDir.z * 2500);
    this.dome.position.set(x, 0, z);
  }
}
