import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const EARTH_RADIUS = 1.72;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function zoomToDistance(zoom) {
  const numeric = Number(zoom || 3);
  return clamp(8 - numeric * 0.95, 2.35, 7.5);
}

function latLngToVector3(lat, lng, radius = EARTH_RADIUS) {
  const phi = (90 - Number(lat || 0)) * (Math.PI / 180);
  const theta = (Number(lng || 0) + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function polygonToCanvas(points, width, height) {
  return points.map(([lng, lat]) => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  });
}

function drawLandPolygon(ctx, polygon, width, height) {
  const points = polygonToCanvas(polygon, width, height);
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index][0], points[index][1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGradient.addColorStop(0, "#1f78d6");
  oceanGradient.addColorStop(0.45, "#1a63bf");
  oceanGradient.addColorStop(1, "#154d96");
  ctx.fillStyle = oceanGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let y = 0; y <= canvas.height; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  for (let x = 0; x <= canvas.width; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.fillStyle = "#2fb15f";
  ctx.strokeStyle = "rgba(12,58,31,0.55)";
  ctx.lineWidth = 2;

  const landPolygons = [
    [
      [-168, 72],
      [-145, 78],
      [-110, 78],
      [-75, 72],
      [-60, 52],
      [-74, 34],
      [-88, 22],
      [-106, 25],
      [-120, 34],
      [-128, 48],
      [-148, 62],
    ],
    [
      [-82, 12],
      [-70, 8],
      [-60, -8],
      [-56, -24],
      [-62, -40],
      [-71, -54],
      [-78, -45],
      [-81, -20],
      [-79, -2],
    ],
    [
      [-16, 37],
      [0, 45],
      [18, 56],
      [42, 58],
      [70, 56],
      [96, 60],
      [126, 52],
      [150, 54],
      [160, 42],
      [141, 31],
      [112, 24],
      [84, 18],
      [54, 22],
      [30, 34],
      [12, 40],
      [-2, 38],
    ],
    [
      [-18, 35],
      [6, 36],
      [24, 28],
      [34, 12],
      [36, -4],
      [30, -20],
      [20, -33],
      [5, -35],
      [-8, -26],
      [-14, -10],
      [-16, 12],
    ],
    [
      [112, -11],
      [130, -14],
      [146, -24],
      [151, -36],
      [142, -44],
      [124, -41],
      [112, -29],
      [109, -18],
    ],
    [
      [-54, 82],
      [-26, 79],
      [-18, 68],
      [-31, 60],
      [-45, 62],
      [-58, 70],
    ],
    [
      [-180, -66],
      [-130, -70],
      [-90, -74],
      [-50, -76],
      [0, -75],
      [50, -74],
      [90, -72],
      [130, -69],
      [180, -66],
      [180, -90],
      [-180, -90],
    ],
  ];

  landPolygons.forEach((polygon) => drawLandPolygon(ctx, polygon, canvas.width, canvas.height));

  const coastalGlow = ctx.createRadialGradient(canvas.width * 0.62, canvas.height * 0.32, 24, canvas.width * 0.62, canvas.height * 0.32, canvas.width * 0.45);
  coastalGlow.addColorStop(0, "rgba(255,255,255,0.08)");
  coastalGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = coastalGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createPinTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "rgba(239,68,68,0.98)";
  ctx.beginPath();
  ctx.moveTo(64, 18);
  ctx.bezierCurveTo(35, 18, 22, 42, 22, 61);
  ctx.bezierCurveTo(22, 84, 48, 101, 64, 118);
  ctx.bezierCurveTo(80, 101, 106, 84, 106, 61);
  ctx.bezierCurveTo(106, 42, 93, 18, 64, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0b0f17";
  ctx.beginPath();
  ctx.arc(64, 60, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createPulseTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  const gradient = ctx.createRadialGradient(64, 64, 6, 64, 64, 58);
  gradient.addColorStop(0, "rgba(248,113,113,0.65)");
  gradient.addColorStop(1, "rgba(248,113,113,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createArcCurve(from, to, intensity = 0.5, isManual = false) {
  const start = from.clone().normalize().multiplyScalar(EARTH_RADIUS + 0.025);
  const end = to.clone().normalize().multiplyScalar(EARTH_RADIUS + 0.025);
  const arcLift = isManual ? 0.56 : 0.34 + clamp(Number(intensity || 0), 0.05, 1) * 0.46;
  const control = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(EARTH_RADIUS + arcLift);
  return new THREE.QuadraticBezierCurve3(start, control, end);
}

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach((item) => disposeMaterial(item));
    return;
  }
  if (material.map) material.map.dispose();
  material.dispose();
}

export default function GlobeMap({
  hotspots = [],
  arcs = [],
  manualArc = null,
  onSelectCountry = () => {},
  mapKey = "default",
  initialZoom = 2.7,
  minZoom = 2.4,
  maxZoom = 6,
  markerVariant = "classic",
  instructionText = "Rotate to inspect global spillovers. Scroll to zoom. Click a red marker for country intelligence.",
}) {
  const mountRef = useRef(null);
  const tooltipRef = useRef(null);
  const onSelectCountryRef = useRef(onSelectCountry);
  const [hoveredSpot, setHoveredSpot] = useState(null);

  useEffect(() => {
    onSelectCountryRef.current = onSelectCountry;
  }, [onSelectCountry]);

  const hotspotLookup = useMemo(() => new Map(hotspots.map((spot) => [spot.id, spot])), [hotspots]);
  const renderedArcs = useMemo(() => {
    const rows = [...arcs];
    if (manualArc?.from && manualArc?.to) {
      rows.push({
        ...manualArc,
        color: manualArc.color || "#ffffff",
        intensity: 0.95,
        __manual: true,
      });
    }
    return rows;
  }, [arcs, manualArc]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return () => {};

    const width = mount.clientWidth || 960;
    const height = mount.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020712");
    scene.fog = new THREE.Fog("#020712", 7.5, 13.8);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(0, 0, zoomToDistance(initialZoom));

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor("#020712", 1);
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.68;
    controls.zoomSpeed = 0.84;
    controls.enablePan = false;
    controls.minDistance = zoomToDistance(maxZoom);
    controls.maxDistance = Math.max(controls.minDistance + 0.6, zoomToDistance(minZoom));
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;

    const ambient = new THREE.AmbientLight(0xb9d4ff, 0.58);
    const rimA = new THREE.DirectionalLight(0x75c6ff, 0.8);
    rimA.position.set(4, 2, 4.5);
    const rimB = new THREE.DirectionalLight(0x59a7ff, 0.46);
    rimB.position.set(-4, -1.5, -3.4);
    scene.add(ambient, rimA, rimB);

    const earthTexture = createEarthTexture();
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.9,
      metalness: 0.05,
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 96, 96), earthMaterial);
    scene.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.03, 64, 64),
      new THREE.MeshBasicMaterial({
        color: "#6ed0ff",
        transparent: true,
        opacity: 0.13,
        side: THREE.BackSide,
      }),
    );
    scene.add(atmosphere);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 34;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 34;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const starField = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: "#dbeafe",
        size: 0.03,
        opacity: 0.42,
        transparent: true,
        depthWrite: false,
      }),
    );
    scene.add(starField);

    const pinTexture = createPinTexture();
    const pulseTexture = createPulseTexture();
    const markerTargets = [];
    const pulseSprites = [];
    const elevatedPins = [];
    const upAxis = new THREE.Vector3(0, 1, 0);

    hotspots.forEach((spot, index) => {
      const heatFactor = clamp(Number(spot.heat || 0) / 100, 0.18, 1);

      if (markerVariant === "elevated") {
        const normal = latLngToVector3(spot.lat, spot.lng, 1).normalize();
        const stemLength = 0.14 + heatFactor * 0.2;
        const headRadius = 0.026 + heatFactor * 0.022;
        const coneHeight = headRadius * 1.55;
        const pulseScale = 0.28 + heatFactor * 0.24;
        const markerGroup = new THREE.Group();
        markerGroup.position.copy(normal.clone().multiplyScalar(EARTH_RADIUS + 0.006));
        markerGroup.quaternion.setFromUnitVectors(upAxis, normal);

        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.011, stemLength, 12, 1, true),
          new THREE.MeshStandardMaterial({
            color: "#fb7185",
            emissive: "#f43f5e",
            emissiveIntensity: 0.85,
            transparent: true,
            opacity: 0.72,
            roughness: 0.25,
            metalness: 0.35,
          }),
        );
        stem.position.set(0, stemLength * 0.5, 0);
        markerGroup.add(stem);

        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(headRadius, 16, 16),
          new THREE.MeshStandardMaterial({
            color: "#fb7185",
            emissive: "#be123c",
            emissiveIntensity: 1.25,
            roughness: 0.22,
            metalness: 0.3,
          }),
        );
        const baseCapY = stemLength + headRadius * 0.2;
        cap.position.set(0, baseCapY, 0);
        cap.userData = {
          type: "hotspot",
          spot,
          hoverAnchor: cap,
        };
        markerGroup.add(cap);

        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(headRadius * 0.55, coneHeight, 10),
          new THREE.MeshStandardMaterial({
            color: "#fecdd3",
            emissive: "#fb7185",
            emissiveIntensity: 0.95,
            roughness: 0.18,
            metalness: 0.42,
          }),
        );
        const baseTipY = stemLength + headRadius + coneHeight * 0.42;
        tip.position.set(0, baseTipY, 0);
        markerGroup.add(tip);

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(headRadius * 1.9, Math.max(headRadius * 0.11, 0.0035), 8, 28),
          new THREE.MeshBasicMaterial({
            color: "#fb7185",
            transparent: true,
            opacity: 0.56,
            depthWrite: false,
          }),
        );
        const baseRingY = stemLength + headRadius * 0.26;
        ring.position.set(0, baseRingY, 0);
        ring.rotation.x = Math.PI / 2;
        markerGroup.add(ring);

        const pulse = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: pulseTexture,
            color: "#fb7185",
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          }),
        );
        pulse.scale.set(pulseScale, pulseScale, 1);
        pulse.position.set(0, baseRingY, 0);
        pulse.userData = { baseScale: pulseScale };
        pulseSprites.push(pulse);
        markerGroup.add(pulse);

        markerTargets.push(cap);
        elevatedPins.push({
          group: markerGroup,
          cap,
          tip,
          ring,
          pulse,
          baseCapY,
          baseTipY,
          baseRingY,
          driftOffset: index * 0.67 + Math.random(),
        });
        scene.add(markerGroup);
        return;
      }

      const surfacePoint = latLngToVector3(spot.lat, spot.lng, EARTH_RADIUS + 0.01);
      const pinPoint = latLngToVector3(spot.lat, spot.lng, EARTH_RADIUS + 0.08);

      const stemGeometry = new THREE.BufferGeometry().setFromPoints([surfacePoint, pinPoint]);
      const stem = new THREE.Line(
        stemGeometry,
        new THREE.LineBasicMaterial({
          color: "#fca5a5",
          transparent: true,
          opacity: 0.28,
        }),
      );
      scene.add(stem);

      const pinMaterial = new THREE.SpriteMaterial({
        map: pinTexture,
        transparent: true,
        depthWrite: false,
      });
      const pinSprite = new THREE.Sprite(pinMaterial);
      const scale = 0.16 + heatFactor * 0.08;
      pinSprite.scale.set(scale, scale * 1.3, 1);
      pinSprite.position.copy(pinPoint);
      pinSprite.userData = {
        type: "hotspot",
        spot,
        hoverAnchor: pinSprite,
      };
      markerTargets.push(pinSprite);
      scene.add(pinSprite);

      const pulseMaterial = new THREE.SpriteMaterial({
        map: pulseTexture,
        color: "#f87171",
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const pulse = new THREE.Sprite(pulseMaterial);
      pulse.scale.set(scale * 2.4, scale * 2.4, 1);
      pulse.position.copy(pinPoint);
      pulse.userData = { baseScale: scale * 2.4 };
      pulseSprites.push(pulse);
      scene.add(pulse);
    });

    const arcParticles = [];
    renderedArcs.forEach((arc, index) => {
      const fromSpot = hotspotLookup.get(arc.from);
      const toSpot = hotspotLookup.get(arc.to);
      if (!fromSpot || !toSpot) return;

      const from = latLngToVector3(fromSpot.lat, fromSpot.lng, EARTH_RADIUS + 0.02);
      const to = latLngToVector3(toSpot.lat, toSpot.lng, EARTH_RADIUS + 0.02);
      const curve = createArcCurve(from, to, Number(arc.intensity || 0.5), Boolean(arc.__manual));
      const points = curve.getPoints(84);
      const curveGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const color = new THREE.Color(arc.color || "#fb7185");
      const line = new THREE.Line(
        curveGeometry,
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: arc.__manual ? 0.96 : 0.58,
        }),
      );
      scene.add(line);

      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 12, 12),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.95,
        }),
      );
      scene.add(particle);
      arcParticles.push({
        curve,
        mesh: particle,
        speed: (arc.__manual ? 0.0045 : 0.0028) + (index % 5) * 0.00045,
        offset: Math.random(),
      });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredMarker = null;
    let animationFrame = 0;

    const updateHover = (sprite) => {
      if (hoveredMarker === sprite) return;
      hoveredMarker = sprite;
      setHoveredSpot(sprite?.userData?.spot || null);
      renderer.domElement.style.cursor = sprite ? "pointer" : "grab";
    };

    const handlePointerMove = (event) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(markerTargets, false);
      updateHover(intersects[0]?.object || null);
    };

    const handlePointerLeave = () => updateHover(null);
    const handlePointerClick = () => {
      if (!hoveredMarker?.userData?.spot) return;
      onSelectCountryRef.current(hoveredMarker.userData.spot);
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", handlePointerLeave);
    renderer.domElement.addEventListener("click", handlePointerClick);

    const tooltipEl = tooltipRef.current;
    if (tooltipEl) {
      tooltipEl.style.opacity = "0";
    }

    const resize = () => {
      const nextWidth = mount.clientWidth || 960;
      const nextHeight = mount.clientHeight || 540;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };
    window.addEventListener("resize", resize);

    const clock = new THREE.Clock();
    const hoveredWorldPosition = new THREE.Vector3();
    const hoveredProjectedPosition = new THREE.Vector3();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      earth.rotation.y += 0.0008;
      atmosphere.rotation.y += 0.00035;

      pulseSprites.forEach((pulse, index) => {
        const base = Number(pulse.userData.baseScale || 0.34);
        const wobble = 1 + Math.sin(elapsed * 2.4 + index * 0.34) * 0.16;
        pulse.scale.set(base * wobble, base * wobble, 1);
      });

      elevatedPins.forEach((pin) => {
        const bob = Math.sin(elapsed * 2.65 + pin.driftOffset) * 0.048;
        pin.cap.position.y = pin.baseCapY + bob;
        pin.tip.position.y = pin.baseTipY + bob * 1.2;
        pin.pulse.position.y = pin.baseRingY + bob * 0.9;
        pin.ring.position.y = pin.baseRingY + bob * 0.82;

        const ringPulse = 1 + Math.sin(elapsed * 2.2 + pin.driftOffset) * 0.22;
        pin.ring.scale.set(ringPulse, ringPulse, 1);
        if (pin.ring.material && !Array.isArray(pin.ring.material)) {
          pin.ring.material.opacity = 0.34 + (ringPulse - 0.78) * 0.78;
        }
      });

      arcParticles.forEach((particle) => {
        particle.offset = (particle.offset + particle.speed) % 1;
        const point = particle.curve.getPointAt(particle.offset);
        particle.mesh.position.copy(point);
      });

      if (tooltipEl) {
        if (hoveredMarker) {
          const anchor = hoveredMarker.userData?.hoverAnchor || hoveredMarker;
          anchor.getWorldPosition(hoveredWorldPosition);
          hoveredProjectedPosition.copy(hoveredWorldPosition).project(camera);
          const x = (hoveredProjectedPosition.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
          const y = (-hoveredProjectedPosition.y * 0.5 + 0.5) * renderer.domElement.clientHeight;
          const inFront = hoveredProjectedPosition.z < 1;
          if (inFront) {
            tooltipEl.style.opacity = "1";
            tooltipEl.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - 10}px)`;
          } else {
            tooltipEl.style.opacity = "0";
          }
        } else {
          tooltipEl.style.opacity = "0";
        }
      }

      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave);
      renderer.domElement.removeEventListener("click", handlePointerClick);

      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) disposeMaterial(object.material);
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [hotspotLookup, hotspots, renderedArcs, mapKey, initialZoom, minZoom, maxZoom, markerVariant]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020712]">
      <div ref={mountRef} className="h-full w-full" />

      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-[1300] rounded-lg border border-white/20 bg-black/78 px-2.5 py-1.5 text-[11px] text-zinc-100 shadow-[0_12px_28px_rgba(0,0,0,0.5)] transition-opacity duration-100"
      >
        <div className="font-semibold">{hoveredSpot?.name || ""}</div>
        {hoveredSpot ? (
          <div className="mt-0.5 text-[10px] text-zinc-300">
            Heat {hoveredSpot.heat}/100 | Confidence {hoveredSpot.confidence}%
          </div>
        ) : null}
      </div>

      {instructionText ? (
        <div className="pointer-events-none absolute bottom-5 left-4 z-[1200] select-none rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] text-zinc-300 backdrop-blur-sm">
          {instructionText}
        </div>
      ) : null}
    </div>
  );
}
