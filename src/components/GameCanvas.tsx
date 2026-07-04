/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as THREE from 'three';
import { Heart, Skull, Zap, Swords, AlertTriangle, RefreshCw, Trophy, Sparkles, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye, EyeOff, MousePointer } from 'lucide-react';
import { GameOptions } from '../types';

interface GameCanvasProps {
  options: GameOptions;
  onGameOver: (score: number) => void;
  onWinGame: (score: number) => void;
}

// Interfaces for game entities
interface EnemyEntity {
  id: number;
  group: THREE.Group;
  planeMesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  row: number; // 0: Idle, 1: Walk
  col: number; // 0-3
  animTimer: number;
  hp: number; // 2 hp (2 hits to kill)
  hitCount: number; // 0, 1, or 2
  speed: number;
  isKnockedBack: boolean;
  knockbackVector: THREE.Vector3;
  knockbackTimer: number;
  isFlyingOff: boolean;
  flyVelocity: THREE.Vector3;
  flashTimer: number;
  flashColor: 'red' | 'white' | null;
  attackCooldown: number;
}

interface FireballEntity {
  id: number;
  mesh: THREE.Mesh;
  warningMesh: THREE.Mesh;
  targetPos: THREE.Vector3;
  currentY: number;
  speedY: number;
  spawnTime: number;
}

interface PotionEntity {
  id: number;
  group: THREE.Group;
  pos: THREE.Vector3;
  hoverOffset: number;
}

interface FloatText {
  id: number;
  text: string;
  x: number; // CSS screen percent X
  y: number; // CSS screen percent Y
  color: string;
  type: 'damage' | 'heal' | 'system' | 'critical';
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number; // 0 to 1
  decay: number;
}

export default function GameCanvas({ options, onGameOver, onWinGame }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // React states for HUD overlays
  const [playerLives, setPlayerLives] = useState(5);
  const [enemiesDefeated, setEnemiesDefeated] = useState(0);
  const [isBossActive, setIsBossActive] = useState(false);
  const [bossHP, setBossHP] = useState(8);
  const [bossMaxHP] = useState(8);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([]);
  const [bossPhaseText, setBossPhaseText] = useState<string>('');
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  // Refs for sharing between React UI and Three.js Loop
  const stateRef = useRef({
    playerLives: 5,
    enemiesDefeated: 0,
    isBossActive: false,
    bossHP: 8,
    isGameOver: false,
    isEndingTriggered: false,
    score: 0,
  });

  // Keep stateRef synced with local state for loop
  useEffect(() => {
    stateRef.current.playerLives = playerLives;
    stateRef.current.enemiesDefeated = enemiesDefeated;
    stateRef.current.isBossActive = isBossActive;
    stateRef.current.bossHP = bossHP;
  }, [playerLives, enemiesDefeated, isBossActive, bossHP]);

  // Handle floats in React
  const spawnFloatingText = (text: string, worldPos: THREE.Vector3, camera: THREE.Camera, color = 'text-yellow-400', type: 'damage' | 'heal' | 'system' | 'critical' = 'damage') => {
    // Project 3D position to 2D screen coordinates
    const proj = worldPos.clone().project(camera);
    const x = (proj.x * .5 + .5) * 100;
    const y = (-(proj.y * .5) + .5) * 100;
    
    // Check if the coordinates are reasonably on-screen
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      const id = Math.random();
      setFloatTexts((prev) => [...prev, { id, text, x, y, color, type }]);
      setTimeout(() => {
        setFloatTexts((prev) => prev.filter((t) => t.id !== id));
      }, 1000);
    }
  };

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    let width = containerRef.current.clientWidth;
    let height = containerRef.current.clientHeight;

    // --- Three.js Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020617'); // Dark slate deep space
    scene.fog = new THREE.FogExp2('#020617', 0.04);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    // Angular overhead angle (isometric feel)
    camera.position.set(0, 11, 13);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Lights
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#818cf8', 1.2); // Soft indigo light
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // --- Texture Loading ---
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    const textures: { [key: string]: THREE.Texture } = {};
    const textureUrls = {
      ground: 'https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png',
      player: 'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png',
      enemy: 'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png',
      boss: 'https://res.cloudinary.com/dsucg33fv/image/upload/v1782709455/boss_e8jti1.png',
      potion: 'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png',
      npc: 'https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/npc1_pdraha.png'
    };

    let loadedCount = 0;
    const totalTextures = Object.keys(textureUrls).length;

    const onTextureLoad = (key: string, tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      textures[key] = tex;
      loadedCount++;
      setLoadingProgress(Math.floor((loadedCount / totalTextures) * 100));

      if (loadedCount === totalTextures) {
        setIsLoaded(true);
        // Start spawn loops
        spawnEnemyInterval = window.setInterval(spawnEnemy, 2000);
        spawnPotionInterval = window.setInterval(spawnPotion, 8000);
      }
    };

    Object.entries(textureUrls).forEach(([key, url]) => {
      textureLoader.load(
        url,
        (tex) => onTextureLoad(key, tex),
        undefined,
        (err) => {
          console.error(`Error loading texture: ${key}`, err);
          // Fallback to solid color texture to prevent crash
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = key === 'ground' ? '#1e293b' : '#3b82f6';
            ctx.fillRect(0, 0, 64, 64);
          }
          const dummyTex = new THREE.CanvasTexture(canvas);
          onTextureLoad(key, dummyTex);
        }
      );
    });

    // --- Ground Creation ---
    // The user requested: "พื้น Ground Plane 50 ใส่ texture ... ทำ tiling เล็กหน่อย"
    // So plane size is 50. Repeat tiling small.
    let groundMesh: THREE.Mesh | null = null;
    const createGround = () => {
      const tex = textures['ground'];
      if (tex) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(25, 25); // Tile very small
      }
      const groundGeo = new THREE.PlaneGeometry(50, 50);
      const groundMat = new THREE.MeshBasicMaterial({
        map: tex || null,
        color: tex ? 0xffffff : 0x1e293b,
        side: THREE.DoubleSide,
      });
      groundMesh = new THREE.Mesh(groundGeo, groundMat);
      groundMesh.rotation.x = -Math.PI / 2; // Flat on floor
      groundMesh.position.y = 0;
      groundMesh.receiveShadow = true;
      scene.add(groundMesh);

      // Add a nice outer ring boundary border
      const ringGeo = new THREE.RingGeometry(24.8, 25, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide, opacity: 0.8, transparent: true });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      scene.add(ring);
    };

    // --- Player Creation ---
    let playerGroup: THREE.Group;
    let playerMesh: THREE.Mesh;
    let playerMat: THREE.MeshBasicMaterial;

    const setupPlayer = () => {
      playerGroup = new THREE.Group();
      playerGroup.position.set(0, 1.25, 0); // Position slightly above ground
      scene.add(playerGroup);

      const tex = textures['player'].clone(); // clone so we don't interfere with other uses
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      // 4 rows, 4 columns
      tex.repeat.set(0.25, 0.25);
      // Row 0 is at top: Offset Y = 0.75.
      // Offset X = 0
      tex.offset.set(0, 0.75);

      playerMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false, // Prevents sprite border blocking things behind
      });

      // Player geometry: 2.5 units tall
      const playerGeo = new THREE.PlaneGeometry(2.5, 2.5);
      playerMesh = new THREE.Mesh(playerGeo, playerMat);
      // Pivot is at bottom for clean rotation & ground contact
      playerGeo.translate(0, 0, 0);
      playerGroup.add(playerMesh);

      // Subtle shadow under player
      const shadowGeo = new THREE.RingGeometry(0, 0.7, 32);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -1.24;
      playerGroup.add(shadowMesh);
    };

    // Player State
    const playerState = {
      pos: new THREE.Vector3(0, 1.25, 0),
      speed: 6.0,
      facingRight: true,
      row: 0, // 0: Idle, 1: Walk, 2: Attack, 3: Dance
      col: 0,
      animTimer: 0,
      animSpeed: 0.15, // Seconds per frame
      attackTimer: 0,
      isAttacking: false,
      skillTimer: 0,
      isSkilling: false,
      invulnerableTimer: 0,
      lastMoveDir: new THREE.Vector3(1, 0, 0),
      targetDestination: null as THREE.Vector3 | null,
    };

    // Keyboard Tracking
    const keysPressed: { [key: string]: boolean } = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed[e.code] = true;

      // Handle Instant triggers
      const bindings = options.keyBindings;
      if (e.code === bindings.attack && !playerState.isAttacking && !playerState.isSkilling && stateRef.current.playerLives > 0) {
        triggerPlayerAttack();
      }
      if (e.code === bindings.skill && !playerState.isSkilling && !playerState.isAttacking && stateRef.current.playerLives > 0) {
        triggerPlayerSkill();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Raycasting for point-and-click movement on the ground
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let clickIndicator: { mesh: THREE.Mesh; timer: number } | null = null;
    const createClickIndicator = (pos: THREE.Vector3) => {
      if (clickIndicator) {
        scene.remove(clickIndicator.mesh);
        clickIndicator.mesh.geometry.dispose();
        if (Array.isArray(clickIndicator.mesh.material)) {
          clickIndicator.mesh.material.forEach((m) => m.dispose());
        } else {
          clickIndicator.mesh.material.dispose();
        }
      }

      const geo = new THREE.RingGeometry(0.1, 0.6, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x10b981, // Emerald green
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(pos).setY(0.05);
      scene.add(mesh);
      clickIndicator = { mesh, timer: 0.4 };
    };

    const handleCanvasPointerDown = (e: PointerEvent) => {
      if (e.target !== canvasRef.current) return;
      if (stateRef.current.playerLives <= 0 || stateRef.current.isGameOver) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      if (groundMesh) {
        const intersects = raycaster.intersectObject(groundMesh);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          playerState.targetDestination = point.clone().setY(1.25);
          createClickIndicator(point);
        }
      }
    };

    window.addEventListener('pointerdown', handleCanvasPointerDown);

    // --- Trigger Player Actions ---
    const triggerPlayerAttack = () => {
      if (!playerGroup) return;
      playerState.isAttacking = true;
      playerState.attackTimer = 0.3; // Attack animation duration
      playerState.row = 2; // Row 3 is attack (index 2)
      playerState.col = 0;
      playerState.animTimer = 0;
      playerState.animSpeed = 0.06; // Plays faster! "ปล่อย Hit Box เล่น Animation ไวขึ้น"

      // Spawn punch sparks visual
      const offsetPos = playerState.lastMoveDir.clone().multiplyScalar(1.5);
      const sparkPos = playerGroup.position.clone().add(offsetPos);
      spawnAttackParticles(sparkPos, 0x3b82f6);

      // Hitbox check
      checkPlayerAttackCollision();
    };

    const triggerPlayerSkill = () => {
      if (!playerGroup) return;
      playerState.isSkilling = true;
      playerState.skillTimer = 0.75; // Skill duration
      playerState.row = 3; // Dance/Skill row (index 3)
      playerState.col = 0;
      playerState.animTimer = 0;
      playerState.animSpeed = 0.12;

      // Spawn growing blue circle rings: "วงแหวนรอบตัวขยาย"
      createExpandingSkillRing();
    };

    // Special Skill Expanding Ring visual mesh
    let skillRings: { mesh: THREE.Mesh; currentRadius: number; maxRadius: number; opacity: number }[] = [];

    const createExpandingSkillRing = () => {
      if (!playerGroup) return;
      const ringGeo = new THREE.RingGeometry(0.1, 1, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x60a5fa, // Sky Blue
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(playerGroup.position.x, 0.05, playerGroup.position.z);
      scene.add(mesh);

      skillRings.push({
        mesh,
        currentRadius: 0.1,
        maxRadius: 5.5, // Large shockwave radius
        opacity: 0.8,
      });

      // Spawn extra sub-rings for multi-wave premium looks
      setTimeout(() => {
        if (stateRef.current.playerLives <= 0 || !playerGroup) return;
        const rGeo = new THREE.RingGeometry(0.1, 1, 64);
        const rMat = new THREE.MeshBasicMaterial({
          color: 0xa5b4fc, // Indigo soft
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });
        const m = new THREE.Mesh(rGeo, rMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(playerGroup.position.x, 0.04, playerGroup.position.z);
        scene.add(m);
        skillRings.push({
          mesh: m,
          currentRadius: 0.1,
          maxRadius: 4.8,
          opacity: 0.6,
        });
      }, 150);
    };

    // --- Hit Collision Logic ---
    const checkPlayerAttackCollision = () => {
      if (!playerGroup) return;
      // Find direction vector
      const lookDir = playerState.lastMoveDir.clone().normalize();
      const punchCenter = playerGroup.position.clone().add(lookDir.clone().multiplyScalar(1.5));

      // Check all enemies
      enemies.forEach((enemy) => {
        const dist = punchCenter.distanceTo(enemy.group.position);
        if (dist < 2.0 && enemy.hp > 0) {
          damageEnemy(enemy, lookDir);
        }
      });

      // Check Boss collision
      if (bossActive && bossMeshRef) {
        const dist = punchCenter.distanceTo(bossGroupRef.position);
        if (dist < 3.2) {
          damageBoss(lookDir);
        }
      }
    };

    const checkPlayerSkillCollision = (radius: number) => {
      // Any enemy inside the expanding ring radius gets knocked back hard
      enemies.forEach((enemy) => {
        const dist = playerGroup.position.distanceTo(enemy.group.position);
        // Hit if enemy is close to current ring boundary
        if (dist < radius && dist > radius - 1.2 && enemy.hp > 0 && enemy.flashTimer <= 0) {
          const pushDir = enemy.group.position.clone().sub(playerGroup.position).setY(0).normalize();
          if (pushDir.length() === 0) pushDir.set(1, 0, 0);
          damageEnemy(enemy, pushDir, true); // True means high skill damage / extreme knockback
        }
      });

      // Hit boss
      if (bossActive && bossMeshRef) {
        const dist = playerGroup.position.distanceTo(bossGroupRef.position);
        if (dist < radius && dist > radius - 1.5 && stateRef.current.bossHP > 0 && bossFlashTimer <= 0) {
          const pushDir = bossGroupRef.position.clone().sub(playerGroup.position).setY(0).normalize();
          damageBoss(pushDir);
        }
      }
    };

    const damageEnemy = (enemy: EnemyEntity, pushDir: THREE.Vector3, isSkill = false) => {
      enemy.hp -= 1;
      enemy.hitCount += 1;
      enemy.flashTimer = 0.25;

      const hitWorldPos = enemy.group.position.clone().setY(enemy.group.position.y + 0.5);

      if (enemy.hp <= 0 || enemy.hitCount >= 2) {
        // Explode or Fly off screen
        enemy.isKnockedBack = false;
        enemy.isFlyingOff = true;
        
        // Random spin fly off screen
        const angle = Math.random() * Math.PI * 2;
        enemy.flyVelocity.set(
          Math.cos(angle) * 8.0,
          15.0, // Launch high up
          Math.sin(angle) * 8.0
        );

        spawnFloatingText('KNOCKOUT!!', hitWorldPos, camera, 'text-red-500 font-extrabold scale-125', 'critical');
        spawnAttackParticles(enemy.group.position, 0xff0055);

        // Score increment
        setEnemiesDefeated((prev) => {
          const next = prev + 1;
          stateRef.current.enemiesDefeated = next;
          stateRef.current.score = next;
          return next;
        });
      } else {
        // First hit: knock back
        enemy.isKnockedBack = true;
        enemy.knockbackTimer = 0.35;
        enemy.knockbackVector.copy(pushDir).normalize().multiplyScalar(isSkill ? 12.0 : 6.0);
        enemy.flashColor = 'red';

        spawnFloatingText(isSkill ? 'MEGA HIT!' : 'HIT!', hitWorldPos, camera, isSkill ? 'text-indigo-400 font-bold' : 'text-slate-200', 'damage');
        spawnAttackParticles(enemy.group.position, 0xff7700);
      }
    };

    const damageBoss = (pushDir: THREE.Vector3) => {
      if (bossFlashTimer > 0 || stateRef.current.bossHP <= 0) return;

      const nextHP = Math.max(stateRef.current.bossHP - 1, 0);
      stateRef.current.bossHP = nextHP;
      setBossHP(nextHP);

      if (nextHP === 0) {
        handleBossDefeated();
      }

      bossFlashTimer = 0.3;
      bossFlashColor = 'white';
      
      // Flash boss white, slide back slightly
      bossKnockbackVec.copy(pushDir).normalize().multiplyScalar(2.0);
      bossKnockbackTimer = 0.25;

      const hitWorldPos = bossGroupRef.position.clone().setY(2.0);
      spawnFloatingText('BOSS HIT!', hitWorldPos, camera, 'text-yellow-400 font-black tracking-widest text-lg', 'critical');
      spawnAttackParticles(bossGroupRef.position, 0xffaa00);
    };

    const handleBossDefeated = () => {
      // Visual feedback
      spawnFloatingText('BOSS SLAIN!!', bossGroupRef.position, camera, 'text-red-500 font-black animate-pulse', 'critical');
      // Particle explosion
      for (let i = 0; i < 40; i++) {
        spawnAttackParticles(bossGroupRef.position, 0xef4444);
        spawnAttackParticles(bossGroupRef.position, 0xfacc15);
      }

      // Spawn Portal warp door
      setTimeout(() => {
        spawnWarpPortal(bossGroupRef.position.clone());
      }, 1000);
    };

    // --- Portal Warp Setup ---
    let warpPortalMesh: THREE.Group | null = null;
    let isWarpSpawned = false;

    const spawnWarpPortal = (pos: THREE.Vector3) => {
      warpPortalMesh = new THREE.Group();
      warpPortalMesh.position.copy(pos).setY(0.01); // flat on ground

      // Outer portal circle glowing
      const ringGeo = new THREE.RingGeometry(1.6, 1.8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      warpPortalMesh.add(ring);

      // Core portal blue warp disc
      const discGeo = new THREE.CircleGeometry(1.6, 32);
      const discMat = new THREE.MeshBasicMaterial({
        color: 0x0ea5e9,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = -Math.PI / 2;
      warpPortalMesh.add(disc);

      scene.add(warpPortalMesh);
      isWarpSpawned = true;

      spawnFloatingText('WARP PORTAL OPEN!', pos, camera, 'text-blue-400 font-bold tracking-wider', 'system');
    };

    // --- Entity Spawning Managers ---
    let enemies: EnemyEntity[] = [];
    let enemyIdCounter = 0;
    let spawnEnemyInterval: number;

    const spawnEnemy = () => {
      if (!playerGroup) return;
      if (stateRef.current.playerLives <= 0 || stateRef.current.isBossActive || stateRef.current.isGameOver) return;

      // Enemy limit to prevent crowded lag
      if (enemies.length >= 10) return;

      // Spawn in a circle surrounding player just offscreen
      const spawnRadius = 18;
      const angle = Math.random() * Math.PI * 2;
      const spawnX = playerGroup.position.x + Math.cos(angle) * spawnRadius;
      const spawnZ = playerGroup.position.z + Math.sin(angle) * spawnRadius;

      // Boundary check to ensure it spawns inside map bounds
      const clampedX = Math.max(-23, Math.min(23, spawnX));
      const clampedZ = Math.max(-23, Math.min(23, spawnZ));

      const enemyGroup = new THREE.Group();
      enemyGroup.position.set(clampedX, 1.2, clampedZ);
      scene.add(enemyGroup);

      const tex = textures['enemy'].clone();
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      // 4 frames x 2 rows
      tex.repeat.set(0.25, 0.5);
      tex.offset.set(0, 0.5); // Row 0 at top = Offset Y 0.5

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const planeGeo = new THREE.PlaneGeometry(2.3, 2.3);
      const mesh = new THREE.Mesh(planeGeo, mat);
      enemyGroup.add(mesh);

      // Shadow under enemy
      const shadowGeo = new THREE.RingGeometry(0, 0.6, 16);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -1.19;
      enemyGroup.add(shadowMesh);

      enemies.push({
        id: enemyIdCounter++,
        group: enemyGroup,
        planeMesh: mesh,
        material: mat,
        row: 1, // Start walking
        col: 0,
        animTimer: 0,
        hp: 2,
        hitCount: 0,
        speed: 1.8 + Math.random() * 0.8, // Slightly random speeds
        isKnockedBack: false,
        knockbackVector: new THREE.Vector3(),
        knockbackTimer: 0,
        isFlyingOff: false,
        flyVelocity: new THREE.Vector3(),
        flashTimer: 0,
        flashColor: null,
        attackCooldown: 0,
      });
    };

    // --- Potions (Items) Spawning ---
    let potions: PotionEntity[] = [];
    let potionIdCounter = 0;
    let spawnPotionInterval: number;

    const spawnPotion = () => {
      if (stateRef.current.playerLives <= 0 || stateRef.current.isGameOver) return;
      if (potions.length >= 3) return; // limit to 3 potions at once

      // Random position inside arena bounds
      const px = (Math.random() - 0.5) * 36;
      const pz = (Math.random() - 0.5) * 36;

      const group = new THREE.Group();
      group.position.set(px, 0.6, pz);
      scene.add(group);

      const tex = textures['potion'];
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const planeGeo = new THREE.PlaneGeometry(1.5, 1.5);
      const mesh = new THREE.Mesh(planeGeo, mat);
      group.add(mesh);

      // Light glow ring under potion
      const glowGeo = new THREE.RingGeometry(0.3, 0.6, 16);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.6 });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.rotation.x = -Math.PI / 2;
      glowMesh.position.y = -0.59;
      group.add(glowMesh);

      potions.push({
        id: potionIdCounter++,
        group,
        pos: new THREE.Vector3(px, 0.6, pz),
        hoverOffset: Math.random() * Math.PI, // Random offset for unsynced bobbing
      });
    };

    // --- Boss Creation ---
    let bossActive = false;
    let bossGroupRef: THREE.Group;
    let bossMeshRef: THREE.Mesh;
    let bossMatRef: THREE.MeshBasicMaterial;

    // Boss loop stats
    let bossHPVal = 8;
    let bossState: 'SPAWN_IN' | 'IDLE' | 'DASH' | 'WARNING_SQUASH' | 'FIRE_ATTACK' = 'SPAWN_IN';
    let bossStateTimer = 2.0; // Stay in phase for X seconds
    let bossCol = 0;
    let bossRow = 0;
    let bossAnimTimer = 0;
    let bossFlashTimer = 0;
    let bossFlashColor: 'red' | 'white' | null = null;
    let bossKnockbackVec = new THREE.Vector3();
    let bossKnockbackTimer = 0;
    let bossTargetDashPos = new THREE.Vector3();
    let fireballs: FireballEntity[] = [];
    let fireballIdCounter = 0;

    const summonBoss = () => {
      setIsBossActive(true);
      bossActive = true;
      setBossPhaseText('อัญเชิญบอสใหญ่! ระวังการพุ่งชนและลูกไฟยักษ์!');

      bossGroupRef = new THREE.Group();
      bossGroupRef.position.set(0, 10, 0); // Descends from sky!
      scene.add(bossGroupRef);

      const tex = textures['boss'].clone();
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(0.25, 0.5); // 4 frames x 2 rows
      tex.offset.set(0, 0.5); // Row 0 is Walk, Row 1 is Idle? We'll map them.

      bossMatRef = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      // Large scale! 5x5 units
      const planeGeo = new THREE.PlaneGeometry(5, 5);
      bossMeshRef = new THREE.Mesh(planeGeo, bossMatRef);
      bossGroupRef.add(bossMeshRef);

      // Huge shadow under Boss
      const shadowGeo = new THREE.RingGeometry(0, 1.8, 32);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.y = -2.49;
      bossGroupRef.add(shadowMesh);

      // Clear existing small enemies to focus on the boss duel
      enemies.forEach((enemy) => {
        scene.remove(enemy.group);
      });
      enemies = [];
    };

    const updateBossStatePattern = (delta: number) => {
      if (!bossActive || !bossGroupRef) return;

      // Handle hit flashes
      if (bossFlashTimer > 0) {
        bossFlashTimer -= delta;
        if (bossFlashTimer <= 0) {
          bossFlashColor = null;
          bossMatRef.color.setHex(0xffffff);
        } else {
          if (bossFlashColor === 'red') bossMatRef.color.setHex(0xff3333);
          else if (bossFlashColor === 'white') bossMatRef.color.setHex(0xffffff).multiplyScalar(3.0); // Extreme white glow
        }
      }

      // Handle slide back knockback
      if (bossKnockbackTimer > 0) {
        bossKnockbackTimer -= delta;
        bossGroupRef.position.addScaledVector(bossKnockbackVec, delta);
        // keep within bounds
        bossGroupRef.position.x = Math.max(-22, Math.min(22, bossGroupRef.position.x));
        bossGroupRef.position.z = Math.max(-22, Math.min(22, bossGroupRef.position.z));
      }

      // Animation frame step
      bossAnimTimer += delta;
      if (bossAnimTimer >= 0.15) {
        bossAnimTimer = 0;
        bossCol = (bossCol + 1) % 4;
        bossMatRef.map!.offset.set(bossCol * 0.25, bossRow * 0.5);
      }

      // Facing logic
      const toPlayerX = playerGroup.position.x - bossGroupRef.position.x;
      if (toPlayerX < 0) {
        bossMeshRef.scale.x = -1; // Face left
      } else {
        bossMeshRef.scale.x = 1; // Face right
      }

      // Pattern State Machine
      bossStateTimer -= delta;

      switch (bossState) {
        case 'SPAWN_IN':
          // Move from sky Y=10 to ground Y=2.5
          if (bossGroupRef.position.y > 2.5) {
            bossGroupRef.position.y -= delta * 5;
          } else {
            bossGroupRef.position.y = 2.5;
            bossState = 'IDLE';
            bossStateTimer = 1.5;
            setBossPhaseText('บอสใหญ่ลงจอดแล้ว! ระวังจังหวะชาร์จพุ่งชน!');
          }
          break;

        case 'IDLE':
          bossRow = 1; // Row 1 Idle
          if (bossStateTimer <= 0) {
            // Decide next pattern: Dash or Fireball warning
            const r = Math.random();
            if (r < 0.5) {
              bossState = 'DASH';
              // Dash target is Player's current position + slightly offset
              bossTargetDashPos.copy(playerGroup.position).setY(2.5);
              bossStateTimer = 1.0;
              setBossPhaseText('ระวัง! บอสกำลังพุ่งชนด้วยความเร็วสูง!');
            } else {
              bossState = 'WARNING_SQUASH';
              bossStateTimer = 1.5; // squash for 1.5s warning indicators
              setBossPhaseText('บอสกำลังรวบรวมพลังเวทมนตร์ยักษ์!');
            }
          }
          break;

        case 'DASH':
          bossRow = 0; // Row 0 Walk/Dash
          // Charge aggressively towards target position
          const dashDir = bossTargetDashPos.clone().sub(bossGroupRef.position);
          const distToTarget = dashDir.length();
          if (distToTarget > 0.5) {
            dashDir.normalize();
            bossGroupRef.position.addScaledVector(dashDir, delta * 15.0); // very fast dash speed!
            // Dust trail particles
            spawnAttackParticles(bossGroupRef.position.clone().setY(0.1), 0x94a3b8);
          }

          // Damage player on contact during dash
          const distToPlayer = bossGroupRef.position.distanceTo(playerGroup.position);
          if (distToPlayer < 2.5 && playerState.invulnerableTimer <= 0 && stateRef.current.playerLives > 0) {
            damagePlayer(1);
          }

          if (bossStateTimer <= 0 || distToTarget <= 0.5) {
            bossState = 'IDLE';
            bossStateTimer = 1.2;
          }
          break;

        case 'WARNING_SQUASH':
          bossRow = 1;
          // Squash and stretch "ขยายย่อ เป็น step บอก"
          const pulse = 1.0 + Math.sin(THREE.Clock.prototype.getElapsedTime ? THREE.Clock.prototype.getElapsedTime() * 15 : Date.now() * 0.015) * 0.25;
          bossMeshRef.scale.set(
            bossMeshRef.scale.x < 0 ? -pulse : pulse,
            2.0 - pulse,
            1.0
          );

          if (bossStateTimer <= 0) {
            // Reset scale
            bossMeshRef.scale.set(bossMeshRef.scale.x < 0 ? -1 : 1, 1, 1);
            
            // Launch Fireballs!
            bossState = 'FIRE_ATTACK';
            bossStateTimer = 3.0; // duration of fireball rain
            shootFireballs();
          }
          break;

        case 'FIRE_ATTACK':
          bossRow = 0;
          if (bossStateTimer <= 0) {
            bossState = 'IDLE';
            bossStateTimer = 2.0;
          }
          break;
      }
    };

    const shootFireballs = () => {
      // Create 3 fireballs that drop on/around the player's vicinity
      for (let i = 0; i < 3; i++) {
        const offsetRadius = Math.random() * 6.0;
        const offsetAngle = Math.random() * Math.PI * 2;
        const targetPos = playerGroup.position.clone().add(new THREE.Vector3(
          Math.cos(offsetAngle) * offsetRadius,
          0,
          Math.sin(offsetAngle) * offsetRadius
        )).setY(0);

        // Limit inside ground plane boundaries
        targetPos.x = Math.max(-23, Math.min(23, targetPos.x));
        targetPos.z = Math.max(-23, Math.min(23, targetPos.z));

        // Create warning circle decal on ground
        const warningGeo = new THREE.RingGeometry(0, 1.8, 32);
        const warningMat = new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const warningMesh = new THREE.Mesh(warningGeo, warningMat);
        warningMesh.rotation.x = -Math.PI / 2;
        warningMesh.position.set(targetPos.x, 0.03, targetPos.z);
        scene.add(warningMesh);

        // Create falling fireball red sphere
        const ballGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const ballMat = new THREE.MeshBasicMaterial({
          color: 0xf97316, // Orange fire
        });
        const ballMesh = new THREE.Mesh(ballGeo, ballMat);
        ballMesh.position.set(targetPos.x, 18, targetPos.z); // start high in air
        scene.add(ballMesh);

        fireballs.push({
          id: fireballIdCounter++,
          mesh: ballMesh,
          warningMesh,
          targetPos,
          currentY: 18,
          speedY: 10.0 + Math.random() * 4.0, // falling speeds
          spawnTime: THREE.Clock.prototype.getElapsedTime ? THREE.Clock.prototype.getElapsedTime() : Date.now() * 0.001,
        });
      }
    };

    const updateFireballs = (delta: number) => {
      for (let i = fireballs.length - 1; i >= 0; i--) {
        const fb = fireballs[i];
        fb.currentY -= fb.speedY * delta;
        fb.mesh.position.y = fb.currentY;

        // Visual warnings pulses
        const elapsed = (THREE.Clock.prototype.getElapsedTime ? THREE.Clock.prototype.getElapsedTime() : Date.now() * 0.001) - fb.spawnTime;
        const scaleVal = Math.min(1.0, 1.2 - (fb.currentY / 18));
        fb.warningMesh.scale.set(scaleVal, scaleVal, 1.0);
        // Flashing opacity
        (fb.warningMesh.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.abs(Math.sin(elapsed * 12)) * 0.5;

        // Check impact
        if (fb.currentY <= 0.3) {
          // Explode!
          scene.remove(fb.mesh);
          scene.remove(fb.warningMesh);

          // Impact particles
          spawnAttackParticles(fb.targetPos, 0xef4444);
          spawnAttackParticles(fb.targetPos, 0xf97316);

          // Distance check to damage player
          const dist = fb.targetPos.distanceTo(playerGroup.position);
          if (dist < 2.0 && playerState.invulnerableTimer <= 0 && stateRef.current.playerLives > 0) {
            damagePlayer(1);
            spawnFloatingText('FIRE BLAST!', playerGroup.position, camera, 'text-red-500 font-extrabold', 'critical');
          }

          fireballs.splice(i, 1);
        }
      }
    };

    // --- Damage Player Mechanics ---
    const damagePlayer = (amount: number) => {
      if (playerState.invulnerableTimer > 0 || stateRef.current.playerLives <= 0) return;

      const nextLives = Math.max(stateRef.current.playerLives - amount, 0);
      setPlayerLives(nextLives);
      stateRef.current.playerLives = nextLives;

      playerState.invulnerableTimer = 1.5; // Invulnerable state seconds
      playerState.row = 0; // Return to idle, flashes red

      const playerWorldPos = playerGroup.position.clone().setY(2.2);
      spawnFloatingText(`-${amount} LIFE!`, playerWorldPos, camera, 'text-red-500 font-bold', 'damage');
      
      // Screen shake or trigger camera rumble
      cameraRumble = 0.4;

      if (nextLives <= 0) {
        handleGameOver();
      }
    };

    let cameraRumble = 0;

    const handleGameOver = () => {
      stateRef.current.isGameOver = true;
      // Change to dead state Row 0 frame 0 or stop render
      setTimeout(() => {
        onGameOver(stateRef.current.score);
      }, 1000);
    };

    // --- Particle Spark Helpers ---
    let particles: Particle[] = [];

    const spawnAttackParticles = (pos: THREE.Vector3, colorHex: number) => {
      const count = 6;
      const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: colorHex });
        const pMesh = new THREE.Mesh(geo, mat);
        pMesh.position.copy(pos).setY(pos.y + (Math.random() - 0.5) * 0.5);
        scene.add(pMesh);

        const angle = Math.random() * Math.PI * 2;
        const speed = 2.0 + Math.random() * 4.0;
        const pVelocity = new THREE.Vector3(
          Math.cos(angle) * speed,
          2.0 + Math.random() * 5.0, // flies upwards
          Math.sin(angle) * speed
        );

        particles.push({
          mesh: pMesh,
          velocity: pVelocity,
          life: 1.0,
          decay: 1.5 + Math.random() * 1.5,
        });
      }
    };

    const updateParticles = (delta: number) => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= delta * p.decay;

        // Apply gravity and update position
        p.velocity.y -= 9.8 * delta; // Gravity pull down
        p.mesh.position.addScaledVector(p.velocity, delta);

        // Scale down size as life fades
        const scale = Math.max(0.001, p.life);
        p.mesh.scale.set(scale, scale, scale);

        // Remove dead particles
        if (p.life <= 0 || p.mesh.position.y < -0.5) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          particles.splice(i, 1);
        }
      }
    };

    // --- Main Game Loop ---
    const clock = new THREE.Clock();
    let animId: number;

    const update = () => {
      if (stateRef.current.isGameOver) return;
      animId = requestAnimationFrame(update);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Ensure textures are fully loaded before progressing loop
      if (!loadedCount || loadedCount < totalTextures) return;

      // Make sure Ground is set up
      if (!groundMesh) {
        createGround();
        setupPlayer();
      }

      if (!playerGroup) return;

      // 1. Update Player position and movement
      if (stateRef.current.playerLives > 0 && !playerState.isSkilling && !playerState.isAttacking) {
        let moveX = 0;
        let moveZ = 0;

        const bindings = options.keyBindings;

        // WASD / Custom movement binds check
        if (keysPressed[bindings.left] || keysPressed['ArrowLeft']) moveX = -1;
        if (keysPressed[bindings.right] || keysPressed['ArrowRight']) moveX = 1;
        if (keysPressed[bindings.up] || keysPressed['ArrowUp']) moveZ = -1;
        if (keysPressed[bindings.down] || keysPressed['ArrowDown']) moveZ = 1;

        if (moveX !== 0 || moveZ !== 0) {
          // Clear click-to-move target if physical keys are pressed
          playerState.targetDestination = null;

          // Normalize so diagonals aren't faster
          const dir = new THREE.Vector3(moveX, 0, moveZ).normalize();
          playerState.lastMoveDir.copy(dir);

          // Apply displacement
          playerGroup.position.addScaledVector(dir, delta * playerState.speed);

          // Tiling check to confine on map
          playerGroup.position.x = Math.max(-24.0, Math.min(24.0, playerGroup.position.x));
          playerGroup.position.z = Math.max(-24.0, Math.min(24.0, playerGroup.position.z));

          // Set walking state
          playerState.row = 1; // Row 1 walk (index 1)
          if (moveX < 0) playerState.facingRight = false;
          if (moveX > 0) playerState.facingRight = true;
        } else if (playerState.targetDestination) {
          // Click to move pathing
          const toTarget = playerState.targetDestination.clone().sub(playerGroup.position);
          toTarget.y = 0; // lock vertical plane
          const dist = toTarget.length();

          if (dist < 0.15) {
            playerState.targetDestination = null;
            playerState.row = 0; // Idle state
          } else {
            const dir = toTarget.normalize();
            playerState.lastMoveDir.copy(dir);

            // Move player
            playerGroup.position.addScaledVector(dir, Math.min(delta * playerState.speed, dist));

            // Tiling check to confine on map
            playerGroup.position.x = Math.max(-24.0, Math.min(24.0, playerGroup.position.x));
            playerGroup.position.z = Math.max(-24.0, Math.min(24.0, playerGroup.position.z));

            // Set walking state
            playerState.row = 1; // Walk
            if (dir.x < -0.05) playerState.facingRight = false;
            if (dir.x > 0.05) playerState.facingRight = true;
          }
        } else {
          // Idle state
          playerState.row = 0; // Row 0 idle
        }
      }

      // 2. Player Animation framing
      if (stateRef.current.playerLives > 0) {
        playerState.animTimer += delta;
        if (playerState.animTimer >= playerState.animSpeed) {
          playerState.animTimer = 0;
          playerState.col = (playerState.col + 1) % 4;
          
          // Apply frame offsets
          // Offset X is step column width = col * 0.25
          // Offset Y represents row bottom index = (3 - row) * 0.25 (since 4 rows)
          playerMat.map!.offset.set(playerState.col * 0.25, (3 - playerState.row) * 0.25);
        }

        // Apply visual facing flip
        playerMesh.scale.set(playerState.facingRight ? 1 : -1, 1, 1);

        // Handle active attack timers
        if (playerState.isAttacking) {
          playerState.attackTimer -= delta;
          if (playerState.attackTimer <= 0) {
            playerState.isAttacking = false;
            playerState.row = 0; // go back to idle
            playerState.animSpeed = 0.15; // standard walk/idle speeds
          }
        }

        // Handle active skill timers
        if (playerState.isSkilling) {
          playerState.skillTimer -= delta;
          if (playerState.skillTimer <= 0) {
            playerState.isSkilling = false;
            playerState.row = 0;
          }
        }

        // Handle player damage invulnerable flashing
        if (playerState.invulnerableTimer > 0) {
          playerState.invulnerableTimer -= delta;
          const flash = Math.floor(time * 25) % 2 === 0;
          playerMat.color.setHex(flash ? 0xff3333 : 0xffffff);
          if (playerState.invulnerableTimer <= 0) {
            playerMat.color.setHex(0xffffff); // reset to original
          }
        }
      }

      // 3. Update Camera smooth translation tracking
      if (playerGroup) {
        const targetCamX = playerGroup.position.x;
        const targetCamZ = playerGroup.position.z + 13.0; // keep offset
        
        // Handle screen rumbles
        let rumbleOffset = new THREE.Vector3();
        if (cameraRumble > 0) {
          cameraRumble -= delta * 2;
          rumbleOffset.set(
            (Math.random() - 0.5) * cameraRumble * 2.5,
            (Math.random() - 0.5) * cameraRumble * 2.5,
            0
          );
        }

        camera.position.x += (targetCamX - camera.position.x) * delta * 4;
        camera.position.z += (targetCamZ - camera.position.z) * delta * 4;
        camera.position.y += (11.0 - camera.position.y) * delta * 4;
        
        camera.position.add(rumbleOffset);
      }

      // 4. Upright cylindrical billboarding for player
      if (playerMesh && camera) {
        // Simple 2.5D facing normal loop
        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);
        const pPos = new THREE.Vector3();
        playerGroup.getWorldPosition(pPos);

        const dx = camPos.x - pPos.x;
        const dz = camPos.z - pPos.z;
        playerMesh.rotation.y = Math.atan2(dx, dz);
      }

      // 5. Update expanding skill shockwave rings
      for (let i = skillRings.length - 1; i >= 0; i--) {
        const ring = skillRings[i];
        ring.currentRadius += delta * 12.0; // expand fast
        ring.opacity -= delta * 1.5; // fade away

        // Scale up flat ring geometry
        const geoScale = ring.currentRadius;
        ring.mesh.scale.set(geoScale, geoScale, 1);
        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ring.opacity);

        // Hurt enemies hitting this ring boundary
        checkPlayerSkillCollision(ring.currentRadius);

        if (ring.opacity <= 0 || ring.currentRadius >= ring.maxRadius) {
          scene.remove(ring.mesh);
          ring.mesh.geometry.dispose();
          (ring.mesh.material as THREE.Material).dispose();
          skillRings.splice(i, 1);
        }
      }

      // 6. Spawn Boss trigger check (Kills >= 10 and not yet summoned)
      if (stateRef.current.enemiesDefeated >= 10 && !stateRef.current.isBossActive) {
        stateRef.current.isBossActive = true;
        summonBoss();
      }

      // 7. Update Boss pattern
      if (bossActive) {
        updateBossStatePattern(delta);
      }

      // 8. Update Falling Fireballs
      updateFireballs(delta);

      // 9. Update small Enemies movement & billboarding
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // Billboarding
        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);
        const ePos = new THREE.Vector3();
        enemy.group.getWorldPosition(ePos);
        enemy.planeMesh.rotation.y = Math.atan2(camPos.x - ePos.x, camPos.z - ePos.z);

        // Flashes timer
        if (enemy.flashTimer > 0) {
          enemy.flashTimer -= delta;
          if (enemy.flashTimer <= 0) {
            enemy.flashColor = null;
            enemy.material.color.setHex(0xffffff);
          } else {
            if (enemy.flashColor === 'red') {
              enemy.material.color.setHex(0xff4444);
            }
          }
        }

        // Handle Flying Out Of Screen death animation: "กระเด็นออกจากฉากไป ... แล้วหายไป"
        if (enemy.isFlyingOff) {
          enemy.flyVelocity.y -= 32 * delta; // strong gravity
          enemy.group.position.addScaledVector(enemy.flyVelocity, delta);
          enemy.group.rotation.z += 10 * delta; // spin around z-axis!

          // Flash white rapidly
          const flash = Math.floor(time * 30) % 2 === 0;
          enemy.material.color.setHex(flash ? 0xffffff : 0xff3333);

          if (enemy.group.position.y < -15.0) {
            // fully fell off scene, clean up!
            scene.remove(enemy.group);
            enemy.planeMesh.geometry.dispose();
            enemy.material.dispose();
            enemies.splice(i, 1);
          }
          continue; // skip AI/collision for dying enemy
        }

        // Knockback motion slide
        if (enemy.isKnockedBack) {
          enemy.knockbackTimer -= delta;
          enemy.group.position.addScaledVector(enemy.knockbackVector, delta);
          // constrain
          enemy.group.position.x = Math.max(-23.8, Math.min(23.8, enemy.group.position.x));
          enemy.group.position.z = Math.max(-23.8, Math.min(23.8, enemy.group.position.z));

          if (enemy.knockbackTimer <= 0) {
            enemy.isKnockedBack = false;
          }
          continue; // skip AI walking during knockback
        }

        // Normal walk behavior towards player
        const toPlayer = playerGroup.position.clone().sub(enemy.group.position).setY(0);
        const distance = toPlayer.length();

        // Sprite facing logic
        if (toPlayer.x < 0) {
          enemy.planeMesh.scale.x = -1; // Flip to face left (default faces right)
        } else {
          enemy.planeMesh.scale.x = 1; // Face right
        }

        // Walk towards player if not too close
        if (distance > 1.25) {
          toPlayer.normalize();
          enemy.group.position.addScaledVector(toPlayer, delta * enemy.speed);
          enemy.row = 1; // Walking row index
        } else {
          // Attack range! Attack player
          enemy.row = 0; // Idle/swing row index
          if (enemy.attackCooldown <= 0) {
            if (playerState.invulnerableTimer <= 0 && stateRef.current.playerLives > 0) {
              damagePlayer(1);
              enemy.attackCooldown = 1.4; // seconds between attacks
              enemy.flashTimer = 0.3;
              enemy.flashColor = 'red';
            }
          }
        }

        if (enemy.attackCooldown > 0) {
          enemy.attackCooldown -= delta;
        }

        // Step animation frame
        enemy.animTimer += delta;
        if (enemy.animTimer >= 0.15) {
          enemy.animTimer = 0;
          enemy.col = (enemy.col + 1) % 4;
          enemy.material.map!.offset.set(enemy.col * 0.25, (1 - enemy.row) * 0.5); // 2 rows (0: Idle, 1: Walk)
        }
      }

      // 10. Update Potion items bobbing and pickup collisions
      for (let i = potions.length - 1; i >= 0; i--) {
        const potion = potions[i];
        
        // Cylindrical billboarding
        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);
        const potPos = new THREE.Vector3();
        potion.group.getWorldPosition(potPos);
        potion.group.children[0].rotation.y = Math.atan2(camPos.x - potPos.x, camPos.z - potPos.z);

        // Hover bobbing effect
        potion.group.position.y = 0.55 + Math.sin(time * 3 + potion.hoverOffset) * 0.12;

        // Pickup collision
        const dist = playerGroup.position.distanceTo(potion.group.position);
        if (dist < 1.3 && stateRef.current.playerLives > 0) {
          // Collect item!
          scene.remove(potion.group);
          
          // Max health limit is 5
          const currentH = stateRef.current.playerLives;
          if (currentH < 5) {
            const nextH = currentH + 1;
            setPlayerLives(nextH);
            stateRef.current.playerLives = nextH;

            spawnFloatingText('+1 LIFE!', playerGroup.position.clone().setY(2.2), camera, 'text-green-400 font-bold scale-110', 'heal');
            spawnAttackParticles(potion.group.position, 0x10b981);
          } else {
            spawnFloatingText('MAX LIVES!', playerGroup.position.clone().setY(2.2), camera, 'text-blue-300 font-bold', 'system');
            spawnAttackParticles(potion.group.position, 0x38bdf8);
          }

          potions.splice(i, 1);
        }
      }

      // 11. Update Warp Portal rotation and warp trigger
      if (isWarpSpawned && warpPortalMesh) {
        warpPortalMesh.rotation.y += delta * 1.5;
        // Float ring slightly
        warpPortalMesh.children[0].position.y = 0.05 + Math.sin(time * 2) * 0.03;

        // Warp collision
        const dist = playerGroup.position.distanceTo(warpPortalMesh.position);
        if (dist < 1.6 && !stateRef.current.isEndingTriggered && stateRef.current.playerLives > 0) {
          stateRef.current.isEndingTriggered = true;
          // Trigger Win ending transition!
          onWinGame(stateRef.current.score);
        }
      }

      // 12. Update active visual particles
      updateParticles(delta);

      // Update click indicator animation
      if (clickIndicator) {
        clickIndicator.timer -= delta;
        if (clickIndicator.timer <= 0) {
          scene.remove(clickIndicator.mesh);
          clickIndicator.mesh.geometry.dispose();
          if (Array.isArray(clickIndicator.mesh.material)) {
            clickIndicator.mesh.material.forEach((m) => m.dispose());
          } else {
            clickIndicator.mesh.material.dispose();
          }
          clickIndicator = null;
        } else {
          const scale = 1 + (0.4 - clickIndicator.timer) * 3;
          clickIndicator.mesh.scale.set(scale, scale, 1);
          const mat = clickIndicator.mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = (clickIndicator.timer / 0.4) * 0.8;
        }
      }

      // 13. Render frame
      renderer.render(scene, camera);
    };

    // Trigger initial frame
    animId = requestAnimationFrame(update);

    // --- Container Resize Observer ---
    const handleResize = () => {
      if (!containerRef.current) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    // --- Cleanups on Unmount ---
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('pointerdown', handleCanvasPointerDown);
      clearInterval(spawnEnemyInterval);
      clearInterval(spawnPotionInterval);

      // Dispose webgl resources to prevent memory crash
      renderer.dispose();
      scene.clear();

      // Dispose all loaded textures
      Object.values(textures).forEach((tex) => tex.dispose());
    };
  }, [options, onGameOver, onWinGame]);

  // Hearts display helper
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < 5; i++) {
      hearts.push(
        <motion.div
          key={i}
          initial={{ scale: 0.8 }}
          animate={{ scale: i < playerLives ? [1, 1.12, 1] : 1 }}
          transition={{ repeat: i < playerLives ? Infinity : 0, repeatDelay: 1.5 + i * 0.1, duration: 0.4 }}
          className="relative"
        >
          <Heart
            className={`w-6 h-6 md:w-8 md:h-8 drop-shadow-md ${
              i < playerLives ? 'text-red-500 fill-red-500' : 'text-slate-700 fill-slate-900/60'
            }`}
          />
        </motion.div>
      );
    }
    return hearts;
  };

  const simulateKeyPress = (keyCode: string, isDown: boolean) => {
    const eventType = isDown ? 'keydown' : 'keyup';
    window.dispatchEvent(new KeyboardEvent(eventType, { code: keyCode }));
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 select-none" ref={containerRef}>
      {/* 3D Canvas element */}
      <canvas ref={canvasRef} className="w-full h-full block" id="game_three_canvas" />

      {/* Retro Loading Cover Screen */}
      {!isLoaded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white">
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <span className="font-mono text-xs tracking-[0.2em] uppercase text-indigo-400">Loading Game Assets...</span>
            </div>
            
            {/* Loading Bar */}
            <div className="w-56 h-2.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-slate-500">{loadingProgress}% Complete</span>
          </motion.div>
        </div>
      )}

      {/* Floating Damage & Action Texts Screen Overlay */}
      {isLoaded && (
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          {floatTexts.map((ft) => (
            <motion.div
              key={ft.id}
              initial={{ opacity: 1, scale: 0.8, y: ft.y + '%' }}
              animate={{ opacity: 0, scale: ft.type === 'critical' ? 1.4 : 1.1, y: ft.y - 12 + '%' }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: ft.x + '%',
                transform: 'translate(-50%, -50%)',
              }}
              className={`font-mono font-black text-sm md:text-base select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${ft.color}`}
            >
              {ft.text}
            </motion.div>
          ))}
        </div>
      )}

      {/* HUD Layout Overlays */}
      {isLoaded && (
        <>
          {/* Top Left Status Bar (Health & Score) */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-slate-950/70 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-800/80 shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
              <span className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest">Player HP</span>
            </div>
            <div className="flex items-center gap-1.5">
              {renderHearts()}
            </div>
            
            <div className="flex items-center justify-between font-mono text-xs text-slate-300 mt-1">
              <div className="flex items-center gap-1">
                <Skull className="w-3.5 h-3.5 text-slate-400" />
                <span>Killed:</span>
              </div>
              <span className="font-bold text-slate-100">{enemiesDefeated} / 10</span>
            </div>
          </div>

          {/* Top Right Controls/Options Status Indicator */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 text-right bg-slate-950/70 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-800/80 shadow-2xl font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-2 justify-end border-b border-slate-800 pb-1.5">
              <button 
                onClick={() => setIsControlsVisible(!isControlsVisible)}
                className="flex items-center gap-1.5 bg-slate-800/60 hover:bg-slate-700/80 active:scale-95 text-slate-200 px-2.5 py-1 rounded-md border border-slate-700 cursor-pointer transition-all"
                title="Toggle On-screen Touch Controls"
              >
                {isControlsVisible ? <EyeOff className="w-3.5 h-3.5 text-indigo-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                <span className="font-sans font-semibold text-[10px]">{isControlsVisible ? 'ซ่อนปุ่มจอ' : 'แสดงปุ่มจอ'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400 font-bold justify-end mt-0.5">
              <Zap className="w-3.5 h-3.5 animate-bounce" />
              <span>KEYBINDINGS ACTIVE</span>
            </div>
            <div className="mt-0.5 flex flex-col gap-0.5 font-medium text-slate-300">
              <div>Attack: <span className="text-white font-bold bg-slate-800 px-1.5 py-0.5 rounded ml-1">{options.keyBindings.attack.replace('Key', '')}</span></div>
              <div className="mt-1">Special Skill: <span className="text-white font-bold bg-slate-800 px-1.5 py-0.5 rounded ml-1">{options.keyBindings.skill.replace('Key', '')}</span></div>
            </div>
          </div>

          {/* Bottom Banner Status Phase Updates */}
          {bossPhaseText && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 max-w-md w-[90%] bg-indigo-950/85 border border-indigo-500/50 p-3 rounded-xl shadow-lg backdrop-blur-md text-center">
              <p className="font-sans font-semibold text-xs text-slate-200 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400 animate-spin-slow" />
                {bossPhaseText}
              </p>
            </div>
          )}

          {/* Active Boss Giant HP Bar Overlay */}
          {isBossActive && bossHP > 0 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-950/90 border border-red-500/30 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-black tracking-widest text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                    BOSS ENEMY
                  </span>
                  <span className="font-mono text-red-400 font-bold">{bossHP} / {bossMaxHP} HP</span>
                </div>
                
                {/* Boss Progress HP Segment */}
                <div className="w-full h-3 bg-slate-900 rounded-full border border-slate-800 overflow-hidden relative">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: `${(bossHP / bossMaxHP) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 80 }}
                    className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600 rounded-full"
                  />
                </div>
              </motion.div>
            </div>
          )}

          {/* Virtual On-screen Gamepad / Controller */}
          <AnimatePresence>
            {isControlsVisible && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="absolute bottom-4 inset-x-4 z-20 pointer-events-none flex items-end justify-between"
              >
                {/* Left Side: Virtual D-Pad */}
                <div className="pointer-events-auto bg-slate-950/75 backdrop-blur-md p-4 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col items-center gap-1.5">
                  <div className="text-[9px] font-mono font-bold text-slate-400 tracking-widest uppercase mb-1 flex items-center gap-1">
                    <MousePointer className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>D-PAD / CLICK GROUND</span>
                  </div>
                  
                  {/* D-Pad cross grid layout */}
                  <div className="grid grid-cols-3 gap-1.5 w-28 h-28">
                    {/* Row 1 */}
                    <div />
                    <button
                      onPointerDown={() => simulateKeyPress('ArrowUp', true)}
                      onPointerUp={() => simulateKeyPress('ArrowUp', false)}
                      onPointerLeave={() => simulateKeyPress('ArrowUp', false)}
                      className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-xl border border-slate-700/60 flex items-center justify-center transition-all cursor-pointer shadow-lg active:bg-indigo-600 active:border-indigo-500"
                    >
                      <ArrowUp className="w-4 h-4 text-indigo-400" />
                    </button>
                    <div />

                    {/* Row 2 */}
                    <button
                      onPointerDown={() => simulateKeyPress('ArrowLeft', true)}
                      onPointerUp={() => simulateKeyPress('ArrowLeft', false)}
                      onPointerLeave={() => simulateKeyPress('ArrowLeft', false)}
                      className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-xl border border-slate-700/60 flex items-center justify-center transition-all cursor-pointer shadow-lg active:bg-indigo-600 active:border-indigo-500"
                    >
                      <ArrowLeft className="w-4 h-4 text-indigo-400" />
                    </button>
                    <div className="w-9 h-9 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center text-[9px] font-mono text-slate-500 font-bold select-none">
                      MOVE
                    </div>
                    <button
                      onPointerDown={() => simulateKeyPress('ArrowRight', true)}
                      onPointerUp={() => simulateKeyPress('ArrowRight', false)}
                      onPointerLeave={() => simulateKeyPress('ArrowRight', false)}
                      className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-xl border border-slate-700/60 flex items-center justify-center transition-all cursor-pointer shadow-lg active:bg-indigo-600 active:border-indigo-500"
                    >
                      <ArrowRight className="w-4 h-4 text-indigo-400" />
                    </button>

                    {/* Row 3 */}
                    <div />
                    <button
                      onPointerDown={() => simulateKeyPress('ArrowDown', true)}
                      onPointerUp={() => simulateKeyPress('ArrowDown', false)}
                      onPointerLeave={() => simulateKeyPress('ArrowDown', false)}
                      className="w-9 h-9 bg-slate-800 hover:bg-slate-700 active:scale-90 text-white rounded-xl border border-slate-700/60 flex items-center justify-center transition-all cursor-pointer shadow-lg active:bg-indigo-600 active:border-indigo-500"
                    >
                      <ArrowDown className="w-4 h-4 text-indigo-400" />
                    </button>
                    <div />
                  </div>
                </div>

                {/* Right Side: Large Action Buttons (Attack and Skill) */}
                <div className="pointer-events-auto flex items-center gap-3 bg-slate-950/75 backdrop-blur-md p-3 rounded-3xl border border-slate-800/80 shadow-2xl">
                  {/* Skill Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onPointerDown={() => simulateKeyPress(options.keyBindings.skill, true)}
                      onPointerUp={() => simulateKeyPress(options.keyBindings.skill, false)}
                      className="w-12 h-12 bg-gradient-to-br from-indigo-950 to-slate-900 hover:from-indigo-900 hover:to-slate-800 active:scale-90 rounded-full border-2 border-indigo-500/60 flex items-center justify-center shadow-lg transition-all cursor-pointer relative group overflow-hidden active:bg-indigo-600"
                    >
                      <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Zap className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)] animate-pulse" />
                    </button>
                    <span className="font-mono text-[8px] text-indigo-300 uppercase tracking-widest font-bold">SKILL ({options.keyBindings.skill.replace('Key', '')})</span>
                  </div>

                  {/* Attack Button */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onPointerDown={() => simulateKeyPress(options.keyBindings.attack, true)}
                      onPointerUp={() => simulateKeyPress(options.keyBindings.attack, false)}
                      className="w-14 h-14 bg-gradient-to-br from-red-950 to-slate-900 hover:from-red-900 hover:to-slate-800 active:scale-90 rounded-full border-2 border-red-500/70 flex items-center justify-center shadow-2xl transition-all cursor-pointer relative group overflow-hidden active:bg-red-600"
                    >
                      <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Swords className="w-6 h-6 text-red-500 group-hover:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    </button>
                    <span className="font-mono text-[9px] text-red-400 uppercase tracking-widest font-bold font-black">ATTACK ({options.keyBindings.attack.replace('Key', '')})</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
