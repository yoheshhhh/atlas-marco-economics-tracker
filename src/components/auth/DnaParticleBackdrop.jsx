import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const SPHERE_PALETTE = [0x57e4ff, 0x78d4ff, 0x9ba3ff, 0xc58dff, 0xf0b6ff, 0xadf2ff];

function clamp01(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function samplePalette(palette, value) {
  const t = clamp01(value);
  if (palette.length <= 1) {
    return new THREE.Color(palette[0] ?? 0xffffff);
  }

  const scaled = t * (palette.length - 1);
  const leftIndex = Math.floor(scaled);
  const rightIndex = Math.min(palette.length - 1, leftIndex + 1);
  const localT = scaled - leftIndex;
  return new THREE.Color(palette[leftIndex]).lerp(new THREE.Color(palette[rightIndex]), localT);
}

function createSphereSamples(isMobile) {
  const particleCount = isMobile ? 2600 : 3800;
  const baseRadius = isMobile ? 1.86 : 2.18;
  const shellSpread = isMobile ? 0.1 : 0.14;
  const samples = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < particleCount; index += 1) {
    const progress = (index + 0.5) / particleCount;
    const phi = Math.acos(1 - (2 * progress));
    const theta = goldenAngle * index;
    const normal = new THREE.Vector3(
      Math.cos(theta) * Math.sin(phi),
      Math.cos(phi),
      Math.sin(theta) * Math.sin(phi),
    );

    const tangent = new THREE.Vector3(-normal.z, 0, normal.x);
    if (tangent.lengthSq() < 0.0001) {
      tangent.set(1, 0, 0);
    }
    tangent.normalize();

    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const ridge = Math.sin(theta * 2.55 + phi * 1.7);
    const seam = Math.cos(theta * 4.9 - phi * 3.35);
    const noise = Math.sin((normal.x - normal.z) * 5.5) * Math.cos((normal.y + normal.z) * 4.4);
    const disruption = (ridge * 0.09) + (seam * 0.065) + (noise * 0.075);
    const haloLift = Math.random() > 0.81 ? (0.07 + Math.random() * 0.22) : 0;
    const interiorDepth = Math.random() > 0.88 ? (0.76 + Math.random() * 0.14) : 1;
    const radius = baseRadius * (1 + disruption + haloLift);

    const position = normal
      .clone()
      .multiplyScalar(radius * interiorDepth)
      .add(tangent.clone().multiplyScalar((Math.random() - 0.5) * shellSpread))
      .add(bitangent.clone().multiplyScalar((Math.random() - 0.5) * shellSpread));

    const colorMix = clamp01(
      ((normal.y + 1) * 0.32)
      + (((Math.sin(theta * 1.4) + 1) * 0.5) * 0.28)
      + (Math.abs(disruption) * 0.52)
      + (haloLift * 1.1)
      + (Math.random() * 0.08),
    );
    const color = samplePalette(SPHERE_PALETTE, colorMix);
    const band = clamp01((Math.abs(disruption) * 2.4) + (haloLift * 2.8) + ((1 - interiorDepth) * 1.2));

    samples.push({
      position,
      normal,
      color,
      scale: (haloLift > 0 ? 1.15 : 0.88) + Math.random() * (haloLift > 0 ? 1.05 : 0.72),
      alpha: (haloLift > 0 ? 0.8 : 0.62) + Math.random() * 0.18,
      phase: Math.random() * Math.PI * 2,
      band,
      drift: (Math.random() * 2) - 1,
    });
  }

  return samples;
}

export default function DnaParticleBackdrop() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x03050a, 7.5, 18);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 42);
    camera.position.set(0, 0, isMobile ? 8.7 : 9.8);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isMobile,
        powerPreference: "high-performance",
      });
    } catch {
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.2 : 1.35));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const sphereGroup = new THREE.Group();
    sphereGroup.position.set(0, 0, 0);
    sphereGroup.rotation.x = isMobile ? 0.18 : 0.14;
    sphereGroup.rotation.y = isMobile ? 0.3 : 0.42;
    scene.add(sphereGroup);

    const samples = createSphereSamples(isMobile);
    const sampleCount = samples.length;

    const positions = new Float32Array(sampleCount * 3);
    const normals = new Float32Array(sampleCount * 3);
    const colors = new Float32Array(sampleCount * 3);
    const scales = new Float32Array(sampleCount);
    const alphas = new Float32Array(sampleCount);
    const phases = new Float32Array(sampleCount);
    const bands = new Float32Array(sampleCount);
    const drifts = new Float32Array(sampleCount);

    for (let index = 0; index < sampleCount; index += 1) {
      const sample = samples[index];
      const offset = index * 3;

      positions[offset] = sample.position.x;
      positions[offset + 1] = sample.position.y;
      positions[offset + 2] = sample.position.z;

      normals[offset] = sample.normal.x;
      normals[offset + 1] = sample.normal.y;
      normals[offset + 2] = sample.normal.z;

      colors[offset] = sample.color.r;
      colors[offset + 1] = sample.color.g;
      colors[offset + 2] = sample.color.b;

      scales[index] = sample.scale;
      alphas[index] = sample.alpha;
      phases[index] = sample.phase;
      bands[index] = sample.band;
      drifts[index] = sample.drift;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aNormal", new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute("aBand", new THREE.BufferAttribute(bands, 1));
    geometry.setAttribute("aDrift", new THREE.BufferAttribute(drifts, 1));

    const uniforms = {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uInteraction: { value: 0 },
      uPointSize: { value: isMobile ? 6.7 : 7.5 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float uTime;
        uniform vec2 uPointer;
        uniform float uInteraction;
        uniform float uPointSize;
        attribute vec3 aNormal;
        attribute vec3 aColor;
        attribute float aScale;
        attribute float aAlpha;
        attribute float aPhase;
        attribute float aBand;
        attribute float aDrift;
        varying vec3 vColor;
        varying float vAlpha;

        float heartbeat(float time, float phase) {
          float cycle = fract((time * 0.42) + (phase * 0.025));
          float primary = 1.0 - smoothstep(0.0, 0.11, abs(cycle - 0.08));
          float secondary = 1.0 - smoothstep(0.0, 0.08, abs(cycle - 0.2));
          return primary + (secondary * 0.68);
        }

        void main() {
          vec3 normal = normalize(aNormal + vec3(0.0001));
          vec3 tangent = normalize(vec3(-normal.z, 0.0, normal.x) + vec3(0.0001, 0.0001, 0.0001));
          vec3 bitangent = normalize(cross(normal, tangent));
          float beat = heartbeat(uTime, aPhase);
          float breath = (sin((uTime * 0.86) + aPhase) * 0.5) + 0.5;
          float ripple = sin((uTime * (1.28 + aBand * 0.9)) + (aPhase * 1.7) + dot(position, vec3(1.2, 0.85, 1.05)) * 2.4);
          float swirl = cos((uTime * 0.94) + (aPhase * 0.82) + dot(normal, vec3(2.2, 1.8, 1.4)));
          float pulse = (beat * 0.23) + (breath * 0.04);

          vec3 transformed = position;
          transformed += normal * pulse * (0.38 + aBand * 0.28);
          transformed += tangent * ripple * (0.06 + aBand * 0.035) * (1.0 + uInteraction * 0.35);
          transformed += bitangent * swirl * (0.045 + aBand * 0.028);
          transformed += normal * sin((uTime * 1.72) + (aPhase * 1.35) + aDrift * 3.4) * (0.05 + aBand * 0.03);

          transformed.x += uPointer.x * (0.28 + aBand * 0.08);
          transformed.y += uPointer.y * (0.22 + aBand * 0.07);
          transformed.z += ((uPointer.x * normal.x) + (uPointer.y * normal.y)) * (0.16 + aBand * 0.05);

          vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float depthScale = 320.0 / max(72.0, -mvPosition.z * 76.0);
          gl_PointSize = uPointSize * aScale * depthScale * (1.0 + beat * 0.14 + uInteraction * 0.08);

          vColor = aColor * (1.02 + beat * 0.42 + breath * 0.08 + uInteraction * 0.08);
          vAlpha = aAlpha * (0.76 + beat * 0.32 + uInteraction * 0.12);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          float core = 1.0 - smoothstep(0.0, 0.52, dist);
          float inner = 1.0 - smoothstep(0.0, 0.28, dist);
          float halo = (1.0 - smoothstep(0.12, 0.5, dist)) * 0.5;
          float alpha = (core * 0.8 + inner * 0.94 + halo * 0.44) * vAlpha;

          if (alpha < 0.02) discard;

          vec3 finalColor = vColor * (1.03 + inner * 0.34 + halo * 0.14);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });

    const points = new THREE.Points(geometry, material);
    sphereGroup.add(points);

    const hazeCount = isMobile ? 180 : 260;
    const hazePositions = new Float32Array(hazeCount * 3);
    const hazeColors = new Float32Array(hazeCount * 3);

    for (let index = 0; index < hazeCount; index += 1) {
      const offset = index * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = (isMobile ? 3.2 : 3.8) + Math.random() * (isMobile ? 1.1 : 1.5);
      const height = (Math.random() - 0.5) * (isMobile ? 3.8 : 4.8);
      const color = samplePalette(SPHERE_PALETTE, Math.random());

      hazePositions[offset] = Math.cos(angle) * radius;
      hazePositions[offset + 1] = height;
      hazePositions[offset + 2] = Math.sin(angle) * radius;
      hazeColors[offset] = color.r;
      hazeColors[offset + 1] = color.g;
      hazeColors[offset + 2] = color.b;
    }

    const hazeGeometry = new THREE.BufferGeometry();
    hazeGeometry.setAttribute("position", new THREE.BufferAttribute(hazePositions, 3));
    hazeGeometry.setAttribute("color", new THREE.BufferAttribute(hazeColors, 3));

    const hazeMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.045 : 0.052,
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const haze = new THREE.Points(hazeGeometry, hazeMaterial);
    scene.add(haze);

    let width = 1;
    let height = 1;
    const baseRotationX = isMobile ? 0.18 : 0.14;
    const baseRotationY = isMobile ? 0.3 : 0.42;
    const baseRotationZ = isMobile ? -0.08 : -0.06;
    let targetRotationX = baseRotationX;
    let targetRotationY = baseRotationY;
    let targetRotationZ = baseRotationZ;
    let targetPointerX = 0;
    let targetPointerY = 0;
    let interactionBoost = reducedMotion ? 0.12 : 0.24;
    let activeInteraction = 0;
    let rafId = 0;

    const resize = () => {
      width = Math.max(1, host.clientWidth);
      height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const onPointerMove = (event) => {
      const pointerX = (event.clientX / Math.max(window.innerWidth, 1)) - 0.5;
      const pointerY = (event.clientY / Math.max(window.innerHeight, 1)) - 0.5;

      targetPointerX = pointerX * 0.72;
      targetPointerY = pointerY * -0.56;
      targetRotationY = baseRotationY + (pointerX * 0.92);
      targetRotationX = baseRotationX + (pointerY * 0.34);
      targetRotationZ = baseRotationZ - (pointerX * 0.12);
      interactionBoost = 1;
    };

    const onPointerLeave = () => {
      targetPointerX = 0;
      targetPointerY = 0;
      targetRotationX = baseRotationX;
      targetRotationY = baseRotationY;
      targetRotationZ = baseRotationZ;
      interactionBoost = reducedMotion ? 0.1 : 0.18;
    };

    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const heartbeatCycle = elapsed * 0.42;
      const phase = heartbeatCycle % 1;
      const beatA = Math.max(0, 1 - Math.abs((phase - 0.08) / 0.06));
      const beatB = Math.max(0, 1 - Math.abs((phase - 0.2) / 0.045));
      const heartbeat = beatA + (beatB * 0.62);

      uniforms.uTime.value = elapsed;
      uniforms.uPointer.value.x += (targetPointerX - uniforms.uPointer.value.x) * 0.06;
      uniforms.uPointer.value.y += (targetPointerY - uniforms.uPointer.value.y) * 0.06;

      interactionBoost += (((reducedMotion ? 0.08 : 0.22)) - interactionBoost) * 0.035;
      activeInteraction += ((Math.max(interactionBoost, reducedMotion ? 0.08 : 0.18)) - activeInteraction) * 0.05;
      uniforms.uInteraction.value = activeInteraction;

      sphereGroup.rotation.x += (targetRotationX - sphereGroup.rotation.x) * 0.05;
      sphereGroup.rotation.y += (targetRotationY - sphereGroup.rotation.y) * 0.05;
      sphereGroup.rotation.z += (targetRotationZ - sphereGroup.rotation.z) * 0.05;
      sphereGroup.rotation.y += reducedMotion ? 0.0006 : 0.0012;

      const pulseScale = 1 + (heartbeat * 0.035) + (Math.sin(elapsed * 0.84) * 0.012);
      sphereGroup.scale.setScalar(pulseScale);

      haze.rotation.y += reducedMotion ? 0.00024 : 0.00042;
      haze.rotation.x = Math.sin(elapsed * 0.24) * 0.06;
      hazeMaterial.opacity = 0.16 + (heartbeat * 0.05) + (activeInteraction * 0.05);

      camera.position.x += (((uniforms.uPointer.value.x * 0.3)) - camera.position.x) * 0.026;
      camera.position.y += (((uniforms.uPointer.value.y * 0.14)) - camera.position.y) * 0.026;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointercancel", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointercancel", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);

      geometry.dispose();
      material.dispose();
      hazeGeometry.dispose();
      hazeMaterial.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden" aria-hidden="true">
      <div ref={hostRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(36%_36%_at_50%_50%,rgba(118,181,255,0.16),transparent_62%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(52%_52%_at_50%_52%,rgba(197,141,255,0.14),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(78%_68%_at_50%_52%,rgba(2,4,10,0.2),rgba(2,4,10,0.58)_70%,rgba(2,4,10,0.82)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,5,10,0.16)_0%,rgba(4,5,10,0.34)_48%,rgba(4,5,10,0.72)_100%)]" />
    </div>
  );
}
