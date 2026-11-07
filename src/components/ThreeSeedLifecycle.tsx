"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeSeedLifecycleProps {
  progress: number; // 0.0 to 1.0 normalized scroll progress
  className?: string;
  isSoundOn?: boolean;
}

export default function ThreeSeedLifecycle({
  progress,
  className = "",
}: ThreeSeedLifecycleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetProgressRef = useRef(progress);
  const currentProgressRef = useRef(progress);

  // Sync target progress
  useEffect(() => {
    targetProgressRef.current = Math.min(1, Math.max(0, progress));
  }, [progress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ────────────────────────────────────────────────────────────
    // 1. THREE.JS SCENE SETUP WITH FALLBACK PROTECTION
    // ────────────────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer | null = null;
    let fallbackCanvas: HTMLCanvasElement | null = null;
    let fallbackCtx: CanvasRenderingContext2D | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true,
        alpha: false,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
    } catch {
      fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.style.width = "100%";
      fallbackCanvas.style.height = "100%";
      fallbackCanvas.style.display = "block";
      fallbackCtx = fallbackCanvas.getContext("2d");
      container.appendChild(fallbackCanvas);
    }

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color(0x050608);
    const sceneFog = new THREE.FogExp2(0x050608, 0.035);
    scene.background = bgColor;
    scene.fog = sceneFog;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 7);

    // ────────────────────────────────────────────────────────────
    // 2. LIGHTING RIG
    // ────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xede7db, 0.35);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    sunLight.position.set(4, 7, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xe0a05c, 1.4);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    const subterraneanLight = new THREE.PointLight(0xffb35c, 0, 10);
    subterraneanLight.position.set(0, -2, 1);
    scene.add(subterraneanLight);

    // ────────────────────────────────────────────────────────────
    // 3. SEED GEOMETRY & MATERIAL
    // ────────────────────────────────────────────────────────────
    // Create organic teardrop seed using parametric lathe or scaled sphere
    const seedGroup = new THREE.Group();
    scene.add(seedGroup);

    const seedGeo = new THREE.SphereGeometry(1, 48, 36);
    // Deform into realistic tapered sunflower seed
    const posAttr = seedGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      // Taper top (apex) and flatten lateral profile
      const taper = 1.0 - (y + 1) * 0.32;
      x *= taper * 0.72;
      z *= taper * 0.45;
      y *= 1.35;

      // Add gentle longitudinal ribs
      const angle = Math.atan2(z, x);
      const rib = Math.sin(angle * 12) * 0.02;
      x += Math.cos(angle) * rib;
      z += Math.sin(angle) * rib;

      posAttr.setXYZ(i, x, y, z);
    }
    seedGeo.computeVertexNormals();

    const seedMat = new THREE.MeshStandardMaterial({
      color: 0x1a1614,
      roughness: 0.42,
      metalness: 0.18,
      emissive: 0x000000,
    });
    const seedMesh = new THREE.Mesh(seedGeo, seedMat);
    seedGroup.add(seedMesh);

    // Glowing fissures / awakening seams
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0xffb35c,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    const crackMesh = new THREE.Mesh(seedGeo.clone(), crackMat);
    crackMesh.scale.setScalar(1.01);
    seedGroup.add(crackMesh);

    // ────────────────────────────────────────────────────────────
    // 4. SUBTERRANEAN ROOTS (L-System Splines)
    // ────────────────────────────────────────────────────────────
    const rootGroup = new THREE.Group();
    rootGroup.position.set(0, -0.8, 0);
    scene.add(rootGroup);

    interface RootBranch {
      curve: THREE.CatmullRomCurve3;
      mesh: THREE.Mesh;
      maxPoints: number;
    }
    const rootBranches: RootBranch[] = [];
    const rootMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8dfcf,
      roughness: 0.6,
      metalness: 0.1,
    });

    const createRootCurve = (points: THREE.Vector3[]) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.045, 8, false);
      const mesh = new THREE.Mesh(tubeGeo, rootMaterial);
      mesh.scale.set(0.001, 0.001, 0.001);
      rootGroup.add(mesh);
      rootBranches.push({ curve, mesh, maxPoints: points.length });
    };

    // Central Taproot
    createRootCurve([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.04, -0.6, 0.02),
      new THREE.Vector3(-0.06, -1.3, -0.04),
      new THREE.Vector3(0.08, -2.1, 0.05),
      new THREE.Vector3(0.02, -3.0, 0.01),
    ]);
    // Lateral Branch Left 1
    createRootCurve([
      new THREE.Vector3(0.02, -0.7, 0.01),
      new THREE.Vector3(-0.4, -1.1, 0.15),
      new THREE.Vector3(-0.85, -1.6, 0.25),
      new THREE.Vector3(-1.3, -2.2, 0.35),
    ]);
    // Lateral Branch Right 1
    createRootCurve([
      new THREE.Vector3(-0.03, -0.9, -0.02),
      new THREE.Vector3(0.45, -1.3, -0.1),
      new THREE.Vector3(0.9, -1.8, -0.2),
      new THREE.Vector3(1.4, -2.4, -0.3),
    ]);
    // Deep Lateral Left 2
    createRootCurve([
      new THREE.Vector3(0.05, -1.5, 0.02),
      new THREE.Vector3(-0.35, -2.0, -0.18),
      new THREE.Vector3(-0.7, -2.6, -0.3),
    ]);
    // Deep Lateral Right 2
    createRootCurve([
      new THREE.Vector3(-0.02, -1.8, -0.01),
      new THREE.Vector3(0.4, -2.3, 0.18),
      new THREE.Vector3(0.75, -2.9, 0.28),
    ]);

    // ────────────────────────────────────────────────────────────
    // 5. GREEN STEM & UNTANGLED FOLIAGE
    // ────────────────────────────────────────────────────────────
    const plantGroup = new THREE.Group();
    plantGroup.position.set(0, 0, 0);
    scene.add(plantGroup);

    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.4, 0),
      new THREE.Vector3(0.02, 0.8, 0.04),
      new THREE.Vector3(-0.04, 2.0, -0.02),
      new THREE.Vector3(0.03, 3.4, 0.03),
      new THREE.Vector3(0, 4.8, 0),
    ]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 40, 0.07, 10, false);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x486b3b,
      roughness: 0.55,
      metalness: 0.08,
    });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.scale.set(0.001, 0.001, 0.001);
    plantGroup.add(stemMesh);

    // Leaves positioned along stem
    const leavesGroup = new THREE.Group();
    plantGroup.add(leavesGroup);

    const leafGeo = new THREE.PlaneGeometry(0.8, 1.3, 8, 8);
    // Bend leaf into natural concave cup
    const leafPos = leafGeo.attributes.position;
    for (let i = 0; i < leafPos.count; i++) {
      const lx = leafPos.getX(i);
      const ly = leafPos.getY(i);
      const curveY = (ly + 0.65) * 0.2;
      const foldX = Math.abs(lx) * 0.18;
      leafPos.setZ(i, -curveY - foldX);
    }
    leafGeo.computeVertexNormals();

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x3d6632,
      roughness: 0.45,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const leaves: { mesh: THREE.Mesh; targetScale: number; baseAngle: number }[] = [];
    const leafHeights = [1.1, 1.8, 2.7, 3.6];
    leafHeights.forEach((lh, idx) => {
      // 2 leaves opposing each node
      const angleOffset = (idx * Math.PI) / 2;
      [-1, 1].forEach((side) => {
        const leafMesh = new THREE.Mesh(leafGeo, leafMat);
        leafMesh.position.set(0, lh, 0);
        leafMesh.rotation.y = angleOffset + (side > 0 ? 0 : Math.PI);
        leafMesh.rotation.x = Math.PI / 3;
        leafMesh.scale.set(0.001, 0.001, 0.001);
        leavesGroup.add(leafMesh);
        leaves.push({
          mesh: leafMesh,
          targetScale: 0.85 + (4 - idx) * 0.15,
          baseAngle: angleOffset + (side > 0 ? 0 : Math.PI),
        });
      });
    });

    // ────────────────────────────────────────────────────────────
    // 6. SUNFLOWER BLOOM & PHYLLOTAXIS SEED DISK
    // ────────────────────────────────────────────────────────────
    const flowerGroup = new THREE.Group();
    flowerGroup.position.set(0, 4.8, 0);
    plantGroup.add(flowerGroup);

    // Sepals (Green base cup)
    const sepalGeo = new THREE.ConeGeometry(0.8, 0.4, 16, 1, true);
    const sepalMat = new THREE.MeshStandardMaterial({
      color: 0x2e4a25,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const sepalMesh = new THREE.Mesh(sepalGeo, sepalMat);
    sepalMesh.rotation.x = Math.PI;
    flowerGroup.add(sepalMesh);

    // Central Seed Disk (Fermat Spiral: r = c*sqrt(n), theta = n * 137.5 deg)
    const diskFloretCount = 280;
    const floretGeo = new THREE.ConeGeometry(0.038, 0.09, 5);
    floretGeo.rotateX(Math.PI / 2);
    const floretMat = new THREE.MeshStandardMaterial({
      color: 0x221a14,
      roughness: 0.5,
      metalness: 0.2,
    });
    const diskInstanced = new THREE.InstancedMesh(
      floretGeo,
      floretMat,
      diskFloretCount
    );

    const dummy = new THREE.Object3D();
    const goldenAngle = 137.507764 * (Math.PI / 180);
    const floretData: { targetPos: THREE.Vector3; targetRot: THREE.Euler }[] = [];

    for (let i = 0; i < diskFloretCount; i++) {
      const r = 0.065 * Math.sqrt(i);
      const theta = i * goldenAngle;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const z = -0.04 * (1 - (r / 1.1) ** 2); // slight convex dome

      const pos = new THREE.Vector3(x, y, z);
      const rot = new THREE.Euler(
        (y / (r + 0.001)) * 0.25,
        (-x / (r + 0.001)) * 0.25,
        theta
      );
      floretData.push({ targetPos: pos, targetRot: rot });

      dummy.position.copy(pos);
      dummy.rotation.copy(rot);
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      diskInstanced.setMatrixAt(i, dummy.matrix);
    }
    diskInstanced.instanceMatrix.needsUpdate = true;
    flowerGroup.add(diskInstanced);

    // Golden Petals (34 Ray Florets)
    const petalCount = 34;
    const petalGeo = new THREE.PlaneGeometry(0.35, 1.25, 4, 8);
    const petalPos = petalGeo.attributes.position;
    for (let i = 0; i < petalPos.count; i++) {
      const py = petalPos.getY(i);
      const px = petalPos.getX(i);
      // Taper tip and add curl
      const taper = Math.sin(((py + 0.625) / 1.25) * Math.PI);
      petalPos.setX(i, px * Math.max(0.1, taper));
      petalPos.setZ(i, Math.sin(py * 2.2) * 0.08);
    }
    petalGeo.computeVertexNormals();

    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const petalMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < petalCount; i++) {
      const mesh = new THREE.Mesh(petalGeo, petalMat);
      const angle = (i / petalCount) * Math.PI * 2;
      mesh.position.set(0.85 * Math.cos(angle), 0.85 * Math.sin(angle), -0.02);
      mesh.rotation.z = angle - Math.PI / 2;
      mesh.rotation.x = Math.PI / 2; // initial closed bud
      mesh.scale.set(0.001, 0.001, 0.001);
      flowerGroup.add(mesh);
      petalMeshes.push(mesh);
    }

    // Face flower slightly forward towards camera
    flowerGroup.rotation.x = -Math.PI / 5;

    // ────────────────────────────────────────────────────────────
    // 7. ATMOSPHERIC PARTICLE ENGINE (Dust, Pollen, Rain)
    // ────────────────────────────────────────────────────────────
    // Soil / Dust particles
    const dustCount = prefersReducedMotion ? 40 : 160;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustVelocities = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 14;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      dustVelocities[i * 3] = (Math.random() - 0.5) * 0.003;
      dustVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.004;
      dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    dustGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(dustPositions, 3)
    );

    const dustMat = new THREE.PointsMaterial({
      color: 0xffb35c,
      size: 0.065,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // Autumn Rain Particles (Active during Chapters 12-14)
    const rainCount = prefersReducedMotion ? 60 : 320;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 16;
      rainPositions[i * 3 + 1] = Math.random() * 12 - 2;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    rainGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(rainPositions, 3)
    );
    const rainMat = new THREE.PointsMaterial({
      color: 0x98b8c8,
      size: 0.075,
      transparent: true,
      opacity: 0,
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    scene.add(rainPoints);

    // Celestial Dust Ring (Chapter 17 "Again")
    const ringCount = 200;
    const ringGeo = new THREE.BufferGeometry();
    const ringPositions = new Float32Array(ringCount * 3);
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const r = 1.6 + (Math.random() - 0.5) * 0.3;
      ringPositions[i * 3] = r * Math.cos(angle);
      ringPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      ringPositions[i * 3 + 2] = r * Math.sin(angle);
    }
    ringGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(ringPositions, 3)
    );
    const ringMat = new THREE.PointsMaterial({
      color: 0xffb35c,
      size: 0.05,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const ringPoints = new THREE.Points(ringGeo, ringMat);
    ringPoints.rotation.x = Math.PI / 4;
    scene.add(ringPoints);

    // ────────────────────────────────────────────────────────────
    // 8. RESIZE LISTENER
    // ────────────────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (renderer) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      } else if (fallbackCanvas && fallbackCtx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        fallbackCanvas.width = width * dpr;
        fallbackCanvas.height = height * dpr;
        fallbackCtx.setTransform(1, 0, 0, 1, 0, 0);
        fallbackCtx.scale(dpr, dpr);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // ────────────────────────────────────────────────────────────
    // 9. ANIMATION LOOP & SCROLL TIMELINE
    // ────────────────────────────────────────────────────────────
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth progress dampening (lerp)
      const lerpFactor = prefersReducedMotion ? 0.2 : 0.075;
      currentProgressRef.current +=
        (targetProgressRef.current - currentProgressRef.current) * lerpFactor;
      const p = currentProgressRef.current;

      // ── CAMERA PATHWAY ──
      // Dynamic camera journey from void (0.0) -> underground (0.2) -> surface (0.35) -> hero flower (0.6) -> macro disk (0.65) -> return (0.8) -> seed ring (1.0)
      if (p < 0.18) {
        // Chapters 01 - 02 (The Seed & Burial)
        const t = p / 0.18;
        camera.position.x = Math.sin(time * 0.3) * 0.2;
        camera.position.y = THREE.MathUtils.lerp(0, -1.2, t);
        camera.position.z = THREE.MathUtils.lerp(6.8, 5.0, t);
        camera.lookAt(0, camera.position.y * 0.4, 0);

        seedGroup.position.set(0, THREE.MathUtils.lerp(0, -1.2, t), 0);
        seedGroup.rotation.y = time * 0.25 + t * 2.0;
        seedGroup.rotation.x = Math.sin(time * 0.35) * 0.15;
        seedMesh.scale.setScalar(1.0);
        crackMat.opacity = Math.max(0, (p - 0.12) / 0.06);
      } else if (p < 0.36) {
        // Chapters 03 - 05 (Awakening, Root, Upward)
        const t = (p - 0.18) / 0.18;
        camera.position.x = Math.cos(time * 0.2) * 0.3;
        camera.position.y = THREE.MathUtils.lerp(-1.2, -1.8, t);
        camera.position.z = THREE.MathUtils.lerp(5.0, 4.4, t);
        camera.lookAt(0, -1.5, 0);

        // Subterranean glowing fissures
        crackMat.opacity = Math.sin(t * Math.PI) * 0.85;

        // Root growth interpolation
        const rootProgress = THREE.MathUtils.clamp((p - 0.18) / 0.15, 0, 1);
        rootBranches.forEach((branch, idx) => {
          const branchScale = Math.max(
            0.001,
            Math.min(1, rootProgress * 1.3 - idx * 0.15)
          );
          branch.mesh.scale.set(branchScale, branchScale, branchScale);
        });

        // Seed shell begins yielding
        seedGroup.position.set(0, -1.2, 0);
      } else if (p < 0.60) {
        // Chapters 06 - 09 (First Light, Growth, Becoming, Bloom)
        const t = (p - 0.36) / 0.24;
        // Camera rises through soil surface into daylight
        camera.position.x = Math.sin(time * 0.2) * 0.4;
        camera.position.y = THREE.MathUtils.lerp(-1.0, 4.5, t);
        camera.position.z = THREE.MathUtils.lerp(4.5, 5.8, t);
        camera.lookAt(0, camera.position.y - 0.2, 0);

        // Stem elongation
        const stemScale = Math.min(1, Math.max(0.001, t * 1.15));
        stemMesh.scale.set(stemScale, stemScale, stemScale);

        // Leaves unfold progressively
        leaves.forEach((l, idx) => {
          const leafGrowth = THREE.MathUtils.clamp(t * 1.5 - idx * 0.15, 0, 1);
          const currentScale = leafGrowth * l.targetScale;
          l.mesh.scale.set(currentScale, currentScale, currentScale);
          // Leaves unfurl outwards
          l.mesh.rotation.x = THREE.MathUtils.lerp(
            Math.PI / 2.2,
            Math.PI / 4,
            leafGrowth
          );
        });

        // Flower blooming
        const bloomProgress = THREE.MathUtils.clamp((p - 0.48) / 0.12, 0, 1);
        petalMeshes.forEach((petal, idx) => {
          const petalScale = Math.min(1, bloomProgress * 1.2);
          petal.scale.set(petalScale, petalScale, petalScale);
          // Petals fold down from bud cone (PI/2) into radiant disc (0 rad)
          petal.rotation.x = THREE.MathUtils.lerp(
            Math.PI / 2.2,
            0.05 + Math.sin(idx + time) * 0.04,
            bloomProgress
          );
        });

        // Disk florets scale up
        for (let i = 0; i < diskFloretCount; i++) {
          const floretScale = THREE.MathUtils.clamp(
            bloomProgress * 1.4 - i * 0.0015,
            0.001,
            1.0
          );
          const data = floretData[i];
          dummy.position.copy(data.targetPos);
          dummy.rotation.copy(data.targetRot);
          dummy.scale.set(floretScale, floretScale, floretScale);
          dummy.updateMatrix();
          diskInstanced.setMatrixAt(i, dummy.matrix);
        }
        diskInstanced.instanceMatrix.needsUpdate = true;
      } else if (p < 0.72) {
        // Chapters 10 - 11 (Fullness, Seeds - Macro disk inspection)
        const t = (p - 0.6) / 0.12;
        camera.position.x = THREE.MathUtils.lerp(0, 0.45, t);
        camera.position.y = THREE.MathUtils.lerp(4.5, 4.75, t);
        camera.position.z = THREE.MathUtils.lerp(5.8, 2.4, t); // Zoom into sunflower center
        camera.lookAt(0, 4.8, 0);

        // Flower turns gently toward camera
        flowerGroup.rotation.y = Math.sin(time * 0.3) * 0.08 + t * 0.2;
      } else if (p < 0.88) {
        // Chapters 12 - 14 (Turning, Fall, Return - Autumn harvest & rain)
        const t = (p - 0.72) / 0.16;
        camera.position.x = Math.sin(time * 0.2) * 0.5;
        camera.position.y = THREE.MathUtils.lerp(4.75, 1.2, t);
        camera.position.z = THREE.MathUtils.lerp(2.4, 6.2, t);
        camera.lookAt(0, camera.position.y * 0.5, 0);

        // Flower bows under harvest weight
        flowerGroup.rotation.x = THREE.MathUtils.lerp(-Math.PI / 5, 0.35, t);

        // Petals dry & wilt
        petalMat.color.setHex(0xc48220);
        petalMat.roughness = 0.7;

        // Rain particles active
        rainMat.opacity = Math.sin(t * Math.PI) * 0.65;
        const rainPos = rainGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < rainCount; i++) {
          rainPos[i * 3 + 1] -= delta * 14;
          if (rainPos[i * 3 + 1] < -3) {
            rainPos[i * 3 + 1] = 9;
          }
        }
        rainGeo.attributes.position.needsUpdate = true;
      } else {
        // Chapters 15 - 17 (Ash, One Remains, Again)
        const t = (p - 0.88) / 0.12;
        camera.position.x = Math.sin(time * 0.2) * 0.2;
        camera.position.y = THREE.MathUtils.lerp(1.2, 0, t);
        camera.position.z = THREE.MathUtils.lerp(6.2, 6.8, t);
        camera.lookAt(0, 0, 0);

        // Dissolve flower & stem
        const plantFade = Math.max(0.001, 1 - t * 1.5);
        plantGroup.scale.set(plantFade, plantFade, plantFade);
        rainMat.opacity = Math.max(0, 0.65 * (1 - t * 2));

        // Solitary seed returns to focus at center
        seedGroup.position.set(0, 0, 0);
        seedGroup.rotation.y = time * 0.3;
        seedMesh.scale.setScalar(Math.min(1, t * 1.4));

        // Celestial dust ring activates
        ringMat.opacity = Math.min(0.85, Math.max(0, (t - 0.4) * 1.8));
        ringPoints.rotation.y = time * 0.4;
      }

      // ── LIGHTING ATMOSPHERE PROGRESSION ──
      if (p < 0.3) {
        // Obsidian void to subterranean
        bgColor.setHex(0x050608);
        sceneFog.color.setHex(0x050608);
        sunLight.intensity = THREE.MathUtils.lerp(1.5, 0.4, p / 0.3);
        sunLight.color.setHex(0xfffaed);
        ambientLight.intensity = 0.25;
      } else if (p < 0.7) {
        // Daylight golden field
        const dayT = (p - 0.3) / 0.4;
        const skyR = THREE.MathUtils.lerp(0.02, 0.18, dayT);
        const skyG = THREE.MathUtils.lerp(0.03, 0.26, dayT);
        const skyB = THREE.MathUtils.lerp(0.04, 0.22, dayT);
        bgColor.setRGB(skyR, skyG, skyB);
        sceneFog.color.setRGB(skyR, skyG, skyB);
        sunLight.intensity = THREE.MathUtils.lerp(0.8, 2.5, dayT);
        sunLight.color.setHex(0xfffae6);
        ambientLight.intensity = 0.55;
      } else if (p < 0.88) {
        // Autumn / Dusk
        const duskT = (p - 0.7) / 0.18;
        const duskR = THREE.MathUtils.lerp(0.18, 0.08, duskT);
        const duskG = THREE.MathUtils.lerp(0.26, 0.09, duskT);
        const duskB = THREE.MathUtils.lerp(0.22, 0.11, duskT);
        bgColor.setRGB(duskR, duskG, duskB);
        sceneFog.color.setRGB(duskR, duskG, duskB);
        sunLight.intensity = THREE.MathUtils.lerp(2.5, 0.7, duskT);
        sunLight.color.setHex(0xf5a623);
        ambientLight.intensity = 0.3;
      } else {
        // Return to obsidian loam
        const returnT = (p - 0.88) / 0.12;
        const voidR = THREE.MathUtils.lerp(0.08, 0.02, returnT);
        const voidG = THREE.MathUtils.lerp(0.09, 0.025, returnT);
        const voidB = THREE.MathUtils.lerp(0.11, 0.03, returnT);
        bgColor.setRGB(voidR, voidG, voidB);
        sceneFog.color.setRGB(voidR, voidG, voidB);
        sunLight.intensity = THREE.MathUtils.lerp(0.7, 1.8, returnT);
        sunLight.color.setHex(0xffb35c);
        ambientLight.intensity = 0.35;
      }

      // ── AMBIENT PARTICLES ──
      const dustPos = dustGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        dustPos[i * 3] += dustVelocities[i * 3];
        dustPos[i * 3 + 1] += dustVelocities[i * 3 + 1];
        dustPos[i * 3 + 2] += dustVelocities[i * 3 + 2];

        // Boundary wrap
        if (Math.abs(dustPos[i * 3]) > 7) dustPos[i * 3] *= -0.95;
        if (Math.abs(dustPos[i * 3 + 1]) > 7) dustPos[i * 3 + 1] *= -0.95;
        if (Math.abs(dustPos[i * 3 + 2]) > 5) dustPos[i * 3 + 2] *= -0.95;
      }
      dustGeo.attributes.position.needsUpdate = true;

      if (renderer) {
        renderer.render(scene, camera);
      } else if (fallbackCanvas && fallbackCtx) {
        // High-fidelity 2D Canvas fallback
        const w = container.clientWidth;
        const h = container.clientHeight;
        fallbackCtx.clearRect(0, 0, w, h);

        // Background atmosphere
        const bgGrad = fallbackCtx.createRadialGradient(
          w / 2,
          h * (p < 0.3 ? 0.5 : 0.35),
          20,
          w / 2,
          h / 2,
          Math.max(w, h) * 0.7
        );
        if (p < 0.3) {
          bgGrad.addColorStop(0, "#16120e");
          bgGrad.addColorStop(1, "#050608");
        } else if (p < 0.7) {
          bgGrad.addColorStop(0, "#2c3b28");
          bgGrad.addColorStop(1, "#0d1810");
        } else if (p < 0.88) {
          bgGrad.addColorStop(0, "#2a1c12");
          bgGrad.addColorStop(1, "#0a0705");
        } else {
          bgGrad.addColorStop(0, "#14110d");
          bgGrad.addColorStop(1, "#050608");
        }
        fallbackCtx.fillStyle = bgGrad;
        fallbackCtx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;

        // 1. Seed or Botanical subject
        if (p < 0.25 || p > 0.9) {
          // Central organic seed
          fallbackCtx.save();
          fallbackCtx.translate(cx, cy + (p < 0.25 ? (p / 0.25) * 80 : 0));
          fallbackCtx.rotate(time * 0.3);

          // Seed glow
          const seedGlow = fallbackCtx.createRadialGradient(0, 0, 5, 0, 0, 90);
          seedGlow.addColorStop(0, "rgba(255, 179, 92, 0.45)");
          seedGlow.addColorStop(1, "rgba(255, 179, 92, 0)");
          fallbackCtx.fillStyle = seedGlow;
          fallbackCtx.beginPath();
          fallbackCtx.arc(0, 0, 90, 0, Math.PI * 2);
          fallbackCtx.fill();

          // Seed shell
          fallbackCtx.fillStyle = "#1e1713";
          fallbackCtx.strokeStyle = "#ffb35c";
          fallbackCtx.lineWidth = 2.5;
          fallbackCtx.beginPath();
          fallbackCtx.moveTo(0, -50);
          fallbackCtx.bezierCurveTo(40, -10, 36, 45, 0, 50);
          fallbackCtx.bezierCurveTo(-36, 45, -40, -10, 0, -50);
          fallbackCtx.fill();
          fallbackCtx.stroke();

          // Veins
          fallbackCtx.strokeStyle = "rgba(255, 179, 92, 0.6)";
          fallbackCtx.lineWidth = 1.5;
          fallbackCtx.beginPath();
          fallbackCtx.moveTo(0, -35);
          fallbackCtx.lineTo(0, 35);
          fallbackCtx.moveTo(0, -10);
          fallbackCtx.lineTo(15, 10);
          fallbackCtx.moveTo(0, 5);
          fallbackCtx.lineTo(-15, 25);
          fallbackCtx.stroke();
          fallbackCtx.restore();
        } else if (p < 0.5) {
          // Subterranean root branching & shoot
          fallbackCtx.save();
          fallbackCtx.translate(cx, cy - 40);

          // Taproot
          const rootLen = Math.min(1, (p - 0.18) / 0.18) * 160;
          fallbackCtx.strokeStyle = "#e8dfcf";
          fallbackCtx.lineWidth = 3;
          fallbackCtx.beginPath();
          fallbackCtx.moveTo(0, 0);
          fallbackCtx.bezierCurveTo(15, 40, -20, 90, 5, rootLen);
          fallbackCtx.stroke();

          // Lateral root branches
          if (rootLen > 40) {
            fallbackCtx.lineWidth = 1.8;
            fallbackCtx.beginPath();
            fallbackCtx.moveTo(5, 50);
            fallbackCtx.bezierCurveTo(35, 70, 70, 85, 95, 110);
            fallbackCtx.moveTo(-8, 80);
            fallbackCtx.bezierCurveTo(-40, 100, -75, 115, -105, 135);
            fallbackCtx.stroke();
          }

          // Emerging shoot
          if (p > 0.28) {
            const shootLen = Math.min(1, (p - 0.28) / 0.15) * 120;
            fallbackCtx.strokeStyle = "#486b3b";
            fallbackCtx.lineWidth = 3.5;
            fallbackCtx.beginPath();
            fallbackCtx.moveTo(0, 0);
            fallbackCtx.bezierCurveTo(-10, -30, 8, -70, 0, -shootLen);
            fallbackCtx.stroke();
          }
          fallbackCtx.restore();
        } else if (p < 0.8) {
          // Sunflower bloom & phyllotaxis disk
          fallbackCtx.save();
          fallbackCtx.translate(cx, cy);

          // Golden Ray Petals
          const bloomT = Math.min(1, (p - 0.48) / 0.15);
          const petalRadius = 90 * bloomT;
          for (let i = 0; i < 34; i++) {
            const angle = (i / 34) * Math.PI * 2;
            const px = Math.cos(angle) * petalRadius;
            const py = Math.sin(angle) * petalRadius;
            fallbackCtx.fillStyle = i % 2 === 0 ? "#f5a623" : "#ffb35c";
            fallbackCtx.beginPath();
            fallbackCtx.ellipse(px, py, 14 * bloomT, 38 * bloomT, angle + Math.PI / 2, 0, Math.PI * 2);
            fallbackCtx.fill();
          }

          // Center disk florets
          fallbackCtx.fillStyle = "#221a14";
          fallbackCtx.beginPath();
          fallbackCtx.arc(0, 0, 55 * bloomT, 0, Math.PI * 2);
          fallbackCtx.fill();
          fallbackCtx.strokeStyle = "#ffb35c";
          fallbackCtx.lineWidth = 1.5;
          fallbackCtx.stroke();

          // Fermat spiral floret dots
          const dotCount = Math.floor(140 * bloomT);
          const ga = 137.507764 * (Math.PI / 180);
          for (let i = 0; i < dotCount; i++) {
            const r = 3.8 * Math.sqrt(i);
            const th = i * ga;
            fallbackCtx.fillStyle = "rgba(255, 179, 92, 0.75)";
            fallbackCtx.beginPath();
            fallbackCtx.arc(r * Math.cos(th), r * Math.sin(th), 1.5, 0, Math.PI * 2);
            fallbackCtx.fill();
          }
          fallbackCtx.restore();
        }

        // Autumn Rain (0.72 - 0.88)
        if (p >= 0.72 && p <= 0.88) {
          fallbackCtx.strokeStyle = "rgba(152, 184, 200, 0.4)";
          fallbackCtx.lineWidth = 1.2;
          for (let i = 0; i < 50; i++) {
            const rx = ((i * 137 + time * 200) % w);
            const ry = ((i * 93 + time * 600) % h);
            fallbackCtx.beginPath();
            fallbackCtx.moveTo(rx, ry);
            fallbackCtx.lineTo(rx - 3, ry + 16);
            fallbackCtx.stroke();
          }
        }
      }
    };

    animate();

    // ────────────────────────────────────────────────────────────
    // 10. CLEANUP & DISPOSAL
    // ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      // Dispose Three.js objects
      seedGeo.dispose();
      seedMat.dispose();
      crackMat.dispose();
      rootMaterial.dispose();
      stemGeo.dispose();
      stemMat.dispose();
      leafGeo.dispose();
      leafMat.dispose();
      sepalGeo.dispose();
      sepalMat.dispose();
      floretGeo.dispose();
      floretMat.dispose();
      petalGeo.dispose();
      petalMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      rainGeo.dispose();
      rainMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();

      rootBranches.forEach((b) => b.mesh.geometry.dispose());

      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      if (fallbackCanvas && container.contains(fallbackCanvas)) {
        container.removeChild(fallbackCanvas);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
}
