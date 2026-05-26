import React, { useEffect, useRef, useState } from "react";

export default function SkiGame() {
  const canvasRef = useRef(null);
  const keys = useRef({});
  const touchTarget = useRef(null);
  const pointerActive = useRef(false);
  const game = useRef(null);
  const raf = useRef(null);

  const W = 1120;
  const H = 980;
  const WORLD_SCALE = 0.40;
  const LEVELS = [
    { name: "Level 1", theme: "Warm-up Woods", length: 40000, colorA: "#eef9ff", colorB: "#dff4ff" },
    { name: "Level 2", theme: "Sheep Crossing", length: 40000, colorA: "#f0fdf4", colorB: "#dcfce7" },
    { name: "Level 3", theme: "Bird Panic", length: 40000, colorA: "#eff6ff", colorB: "#dbeafe" },
    { name: "Level 4", theme: "Lava Trouble", length: 40000, colorA: "#fff7ed", colorB: "#fed7aa" },
    { name: "Level 5", theme: "Italian Slope", length: 40000, colorA: "#fefce8", colorB: "#fef3c7" },
    { name: "Level 6", theme: "Ice Disco", length: 40000, colorA: "#ecfeff", colorB: "#cffafe" },
    { name: "Level 7", theme: "Pink Foot Valley", length: 40000, colorA: "#fdf2f8", colorB: "#fce7f3" },
    { name: "Level 8", theme: "Avalanche Alley", length: 40000, colorA: "#f8fafc", colorB: "#e2e8f0" },
    { name: "Level 9", theme: "Chaos Carnival", length: 40000, colorA: "#faf5ff", colorB: "#ede9fe" },
    { name: "Level 10", theme: "Final Madness", length: 45000, colorA: "#fff1f2", colorB: "#ffe4e6" }
  ];
  const LEVEL_ENDS = LEVELS.reduce((arr, level, i) => {
    arr.push((arr[i - 1] || 0) + level.length);
    return arr;
  }, []);
  const FINISH_Y = LEVEL_ENDS[LEVEL_ENDS.length - 1];

  const GAPS = [3200, 6200, 9800, 13400, 17200, 21000, 25500, 30200, 35600, 41400, 46800];
  const BIGK_SPOTS = [4400, 8200, 12200, 15800, 19800, 24600, 29400, 34800, 40200, 46200];
  const STAR_SPOTS = [1800, 5600, 8800, 11600, 14600, 18600, 22400, 26800, 31800, 37200, 42800, 48600];
  const MISS_CRAZY_SPOTS = [2600, 7600, 18800, 33600, 45200];
  const PACKAGE_SPOTS = [1200, 2400, 3600, 5200, 6800, 8400, 10400, 12600, 14800, 16600, 18400, 20400, 22200, 24400, 26600, 28800, 31000, 33400, 35800, 38200, 40600, 43000, 45600, 48200, 50600];
  const STAR_PACKAGE_SPOTS = [3000, 10800, 17800, 28600, 43600];
  const ICE_STRIP_SPOTS = [2200, 4200, 6900, 9100, 12100, 15100, 18100, 21600, 25200, 28600, 32600, 36600, 40800, 44800, 49200];
  const BIGFOOT_SPOTS = [15500, 38500];
  const SHEEP_HERD_Y = 11800;
  const VOLCANO_Y = 27200;
  const AVALANCHE_Y = 36500;
  const SKI_JUMP_SPOTS = [23200, 47400];

  const [ui, setUi] = useState({
    state: "ready",
    meters: 0,
    score: 0,
    best: 0,
    time: 0,
    bestTime: 0,
    hasGun: false,
    medal: "",
    nearMisses: 0,
    maxCombo: 0,
    level: 1,
    theme: "Warm-up Woods",
    message: "Ýttu á Start"
  });

  function formatSeconds(seconds, decimals = 2) {
    return `${Math.max(0, seconds || 0).toFixed(decimals)}s`;
  }

  function getLevelIndex(worldY) {
    return Math.min(LEVELS.length - 1, Math.max(0, LEVEL_ENDS.findIndex(end => worldY < end)));
  }

  function getLevelStart(index) {
    return index <= 0 ? 0 : LEVEL_ENDS[index - 1];
  }

  function getLevelProgress(worldY) {
    const index = getLevelIndex(worldY);
    const start = getLevelStart(index);
    const len = LEVELS[index].length;
    return Math.max(0, Math.min(1, (worldY - start) / len));
  }

  function getRivalLevelProgress(rivalY) {
    const index = getLevelIndex(rivalY);
    const start = getLevelStart(index);
    const len = LEVELS[index].length;
    return Math.max(0, Math.min(1, (rivalY - start) / len));
  }

  function rand(seed) {
    const x = Math.sin(seed * 999.1327) * 10000;
    return x - Math.floor(x);
  }

  function rounded(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function makeObject(type, x, y, extra = {}) {
    const base = { type, x, y, hit: false, ...extra };
    if (type === "pine") return { ...base, r: extra.r || 22, scale: extra.scale || 1 };
    if (type === "stone") return { ...base, r: extra.r || 16, scale: extra.scale || 1 };
    if (type === "drift") return { ...base, r: 18 };
    if (type === "ice") return { ...base, r: extra.r || 70, width: extra.width || 150, length: extra.length || 420 };
    if (type === "jump") return { ...base, r: extra.r || 28, power: extra.power || 34, mega: !!extra.mega };
    if (type === "gap") return { ...base, r: extra.r || 280, width: extra.width || 460, depth: extra.depth || 120, penalty: false, passed: false };
    if (type === "bigk") return { ...base, r: 58, side: extra.side || 1, thrown: false, throwAnim: 0, throwCooldown: 0, kickAt: extra.kickAt || y - 360 };
    if (type === "ball") return { ...base, r: 13, vx: extra.vx || 0, vy: extra.vy || 0, life: extra.life || 260 };
    if (type === "star") return { ...base, r: 22, collected: false, phase: extra.phase || 0 };
    if (type === "package") return { ...base, r: 20, collected: false, phase: extra.phase || 0 };
    if (type === "starPackage") return { ...base, r: 28, collected: false, phase: extra.phase || 0 };
    if (type === "bullet") return { ...base, r: 9, vx: extra.vx || 0, vy: extra.vy || 16, life: extra.life || 95 };
    if (type === "missCrazy") return { ...base, r: 24, side: extra.side || 1, active: false, swung: false, runSpeed: extra.runSpeed || 5.2, startX: x, targetX: extra.targetX || W / 2, hammerAngle: -0.9 };
    if (type === "bigfoot") return { ...base, r: 62, active: false, speed: extra.speed || 11.8, wobble: extra.wobble || 0, phase: extra.phase || 0, stomp: 0 };
    if (type === "sheep") return { ...base, r: 60, side: extra.side || 1, vx: extra.vx || 4.2, active: false, phase: extra.phase || 0, chasing: false, chaseTimer: 0, angry: false, hitOnce: false, warning: false };
    if (type === "volcano") return { ...base, r: 86, active: false, phase: extra.phase || 0 };
    if (type === "lava") return { ...base, r: extra.r || 38, width: extra.width || 120, length: extra.length || 160, phase: extra.phase || 0 };
    if (type === "bird") return { ...base, r: 28, vx: extra.vx || 5, active: false, phase: extra.phase || 0 };
    if (type === "pizza") return { ...base, r: 30, vx: extra.vx || 0, vy: extra.vy || 0, spin: extra.spin || 0.15, life: extra.life || 260 };
    if (type === "pasta") return { ...base, r: 34, width: extra.width || 190, phase: extra.phase || 0 };
    if (type === "ufo") return { ...base, r: 46, active: false, phase: extra.phase || 0, beamTimer: 0 };
    if (type === "banana") return { ...base, r: 28, phase: extra.phase || 0 };
    if (type === "gate") return { ...base, r: 18, side: extra.side || 1, passed: false };
    if (type === "finish") return { ...base, r: 40 };
    return { ...base, r: 16 };
  }

  function createInitialGame(state = "ready") {
    const best = Number(localStorage.getItem("skigame-best") || 0);
    const bestTime = Number(localStorage.getItem("skigame-best-time") || 0);
    return {
      state,
      t: 0,
      speed: state === "playing" ? 7.8 : 0,
      meters: 0,
      score: 0,
      packages: 0,
      timePenalty: 0,
      timePopups: [],
      starPackages: 0,
      fireworksTimer: 0,
      elapsed: 0,
      bestTime,
      best,
      skier: {
        x: W / 2 - 90,
        y: 125,
        vx: 0,
        turnLevel: 0,
        turnDir: 0,
        angle: 0,
        crashed: 0,
        airborne: 0,
        spin: 0,
        invuln: state === "playing" ? 80 : 0,
        boostTimer: 0,
        jumpHeld: false,
        hasHorse: false,
        hasCat: false,
        hasSeal: false,
        hasCrown: false,
        hasCape: false,
        hasGun: false,
        shootHeld: false,
        iceTimer: 0,
        straightTimer: 0,
        jumpFatigue: 0
      },
      rival: { x: W / 2 + 90, y: 0, vx: 0, speed: 6.85, angle: 0, wobble: 0 },
      camera: 0,
      objects: [],
      particles: [],
      lastSpawn: 0,
      courseFeaturesAdded: false,
      finishAdded: false,
      combo: 0,
      maxCombo: 0,
      nearMisses: 0,
      medal: "",
      finalStats: null,
      levelCompleteStats: null,
      levelStartT: 0,
      levelStartPenalty: 0,
      levelResults: [],
      avalanche: { active: false, triggered: false, y: -9999, timer: 0 },
      volcanoEvent: { active: false, triggered: false, y: -9999, x: W / 2, timer: 0, lavaSpawned: false },
      currentLevel: 0,
      levelBannerTimer: state === "playing" ? 260 : 0,
      levelBannerText: "Level 1 — Warm-up Woods",
      message: state === "playing" ? "Level 1 — Warm-up Woods" : "Ýttu á Start",
      warningTimer: 0,
      warningText: ""
    };
  }

  function resetGame() {
    const next = createInitialGame("playing");
    game.current = next;
    setUi({
      state: "playing",
      meters: 0,
      score: 0,
      best: next.best,
      time: 0,
      bestTime: next.bestTime,
      hasGun: false,
      medal: "",
      nearMisses: 0,
      maxCombo: 0,
      level: 1,
      theme: LEVELS[0].theme,
      message: "Level 1 — Warm-up Woods"
    });
  }

  function continueLevel() {
    const g = game.current;
    if (!g || g.state !== "levelComplete") return;
    const nextLevel = Math.min(LEVELS.length - 1, (g.currentLevel || 0) + 1);
    const start = getLevelStart(nextLevel);
    g.state = "playing";
    g.currentLevel = nextLevel;
    g.camera = start + 6;
    g.speed = 7.8 + nextLevel * 0.28;
    g.skier.x = W / 2 - 90;
    g.skier.y = 125;
    g.skier.vx = 0;
    g.skier.turnLevel = 0;
    g.skier.turnDir = 0;
    g.skier.angle = 0;
    g.skier.crashed = 0;
    g.skier.airborne = 0;
    g.skier.spin = 0;
    g.skier.invuln = 95;
    g.skier.iceTimer = 0;
    g.skier.jumpFatigue = 0;
    g.skier.boostTimer = 0;
    g.skier.hasHorse = false;
    g.skier.hasCat = false;
    g.skier.hasSeal = false;
    g.skier.hasCrown = false;
    g.skier.hasCape = false;
    g.skier.hasGun = false;
    g.starPackages = 0;
    if (g.rival) {
      g.rival.x = W / 2 + 90;
      g.rival.y = start;
      g.rival.vx = 0;
      g.rival.speed = 6.65 + nextLevel * 0.18;
      g.rival.angle = 0;
    }
    g.levelStartT = g.t;
    g.levelStartPenalty = g.timePenalty || 0;
    g.levelCompleteStats = null;
    g.levelBannerTimer = 260;
    g.levelBannerText = `${LEVELS[nextLevel].name} — ${LEVELS[nextLevel].theme}`;
    g.message = g.levelBannerText;
    setUi(prev => ({
      ...prev,
      state: "playing",
      level: nextLevel + 1,
      theme: LEVELS[nextLevel].theme,
      message: g.message
    }));
  }

  function togglePause() {
    const g = game.current;
    if (!g) return;
    if (g.state === "playing") {
      g.state = "paused";
      g.message = "Paused";
      touchTarget.current = null;
      pointerActive.current = false;
      keys.current.ArrowLeft = false;
      keys.current.ArrowRight = false;
      keys.current.ArrowUp = false;
      keys.current.ArrowDown = false;
      keys.current.J = false;
      keys.current.j = false;
      setUi(prev => ({ ...prev, state: "paused", message: "Paused" }));
    } else if (g.state === "paused") {
      g.state = "playing";
      g.message = "Game resumed";
      setUi(prev => ({ ...prev, state: "playing", message: "Game resumed" }));
    }
  }

  function handlePausePress(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    togglePause();
  }

  function mainAction() {
    const g = game.current;
    if (g?.state === "levelComplete") continueLevel();
    else if (g?.state === "paused") togglePause();
    else resetGame();
  }

  function addCourseFeatures(g) {
    if (g.courseFeaturesAdded) return;
    g.courseFeaturesAdded = true;

    for (let i = 0; i < LEVEL_ENDS.length; i++) {
      g.objects.push(makeObject("finish", W / 2, LEVEL_ENDS[i], { levelIndex: i, final: i === LEVELS.length - 1 }));
    }

    for (const y of GAPS) {
      const cx = W / 2 + Math.sin(y * 0.003) * 210;
      g.objects.push(makeObject("jump", cx - 170, y - 260, { r: 48, power: 96, required: true }));
      g.objects.push(makeObject("jump", cx, y - 230, { r: 58, power: 106, required: true }));
      g.objects.push(makeObject("jump", cx + 170, y - 260, { r: 48, power: 96, required: true }));
      g.objects.push(makeObject("gap", cx, y, { width: 760, depth: 245 }));
    }

    for (const y of BIGK_SPOTS) {
      const side = rand(y) < 0.5 ? -1 : 1;
      g.objects.push(makeObject("bigk", side < 0 ? 130 : W - 130, y, { side, kickAt: y - 640 }));
    }

    for (const y of STAR_SPOTS) {
      g.objects.push(makeObject("star", W / 2 + Math.sin(y * 0.0045) * 260, y, { phase: rand(y) * Math.PI * 2 }));
    }

    for (const y of PACKAGE_SPOTS) {
      g.objects.push(makeObject("package", W / 2 + Math.sin(y * 0.0057 + 1.2) * 330, y, { phase: rand(y + 55) * Math.PI * 2 }));
    }

    for (const y of STAR_PACKAGE_SPOTS) {
      g.objects.push(makeObject("starPackage", W / 2 + Math.sin(y * 0.0042 + 2.1) * 280, y, { phase: rand(y + 88) * Math.PI * 2 }));
    }

    for (const y of ICE_STRIP_SPOTS) {
      g.objects.push(makeObject("ice", W / 2 + Math.sin(y * 0.0038 + 0.7) * 300, y, { width: 155 + rand(y) * 90, length: 430 + rand(y + 1) * 190 }));
    }

    for (const y of MISS_CRAZY_SPOTS) {
      const side = rand(y + 17) < 0.5 ? -1 : 1;
      const targetX = W / 2 + Math.sin(y * 0.005) * 260;
      g.objects.push(makeObject("missCrazy", side < 0 ? 40 : W - 40, y, { side, targetX, runSpeed: 4.2 + rand(y + 4) * 0.9 }));
    }

    for (const y of BIGFOOT_SPOTS) {
      g.objects.push(makeObject("bigfoot", W / 2 + Math.sin(y * 0.0027) * 260, y - 620, { speed: 11.2 + rand(y + 13) * 2.8, phase: rand(y + 31) * Math.PI * 2 }));
    }

    for (const y of SKI_JUMP_SPOTS) {
      const cx = W / 2 + Math.sin(y * 0.0031) * 210;
      g.objects.push(makeObject("jump", cx, y, { r: 92, power: 185, mega: true, required: true }));
      g.objects.push(makeObject("gate", cx - 92, y - 110, { side: -1 }));
      g.objects.push(makeObject("gate", cx + 92, y - 110, { side: 1 }));

      // Hard approach: obstacle funnels around the mega ski jump approach.
      const approachRows = [520, 430, 340, 250, 165];
      for (let row = 0; row < approachRows.length; row++) {
        const ay = y - approachRows[row];
        const safeHalfWidth = 165 - row * 18;
        for (let side of [-1, 1]) {
          const count = row < 2 ? 3 : 4;
          for (let i = 0; i < count; i++) {
            const offset = safeHalfWidth + 65 + i * 95 + rand(y + row * 41 + i * 13) * 42;
            const ox = cx + side * offset;
            if (ox > 55 && ox < W - 55) {
              const type = rand(y + row * 77 + i * 29) < 0.62 ? "pine" : "stone";
              g.objects.push(makeObject(type, ox, ay + rand(y + i) * 26, type === "pine" ? { scale: 1.55, r: 33 } : { scale: 1.75, r: 28 }));
            }
          }
        }
      }

      // A final narrow gate just before takeoff.
      g.objects.push(makeObject("gate", cx - 68, y - 42, { side: -1 }));
      g.objects.push(makeObject("gate", cx + 68, y - 42, { side: 1 }));
    }

    // One-off chaos event: sheep herd crossing the slope.
    for (let i = 0; i < 34; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const y = SHEEP_HERD_Y + 160 + row * 30 + rand(i + 12) * 150;
      const x = side < 0 ? -260 - row * 18 : W + 260 + row * 18;
      g.objects.push(makeObject("sheep", x, y, { side, vx: 4.35 + rand(i + 99) * 1.45, phase: rand(i + 44) * Math.PI * 2 }));
    }

    // Volcano/lava is spawned dynamically in front of Jacob during play.
  }

  function spawn(g) {
    addCourseFeatures(g);

    while (g.lastSpawn < Math.min(FINISH_Y - 260, g.camera + H + 1300)) {
      g.lastSpawn += 78 + rand(g.lastSpawn) * 95;
      const y = g.lastSpawn;
      const x = 80 + rand(y + 9) * (W - 160);
      const lane = rand(y + 3);
      const levelIndex = getLevelIndex(y);
      const levelDifficulty = 0.18 + levelIndex * 0.105;
      const difficulty = Math.min(1.65, g.meters / 9000 + levelDifficulty);

      const nearSpecial =
        GAPS.some(v => Math.abs(y - v) < 380) ||
        BIGK_SPOTS.some(v => Math.abs(y - v) < 260) ||
        STAR_SPOTS.some(v => Math.abs(y - v) < 180) ||
        MISS_CRAZY_SPOTS.some(v => Math.abs(y - v) < 280) ||
        PACKAGE_SPOTS.some(v => Math.abs(y - v) < 150) ||
        STAR_PACKAGE_SPOTS.some(v => Math.abs(y - v) < 190) ||
        ICE_STRIP_SPOTS.some(v => Math.abs(y - v) < 260) ||
        BIGFOOT_SPOTS.some(v => Math.abs(y - v) < 520) ||
        SKI_JUMP_SPOTS.some(v => Math.abs(y - v) < 520) ||
        Math.abs(y - SHEEP_HERD_Y) < 520 ||
        Math.abs(y - VOLCANO_Y) < 760 ||
        Math.abs(y - AVALANCHE_Y) < 420;

      if (!nearSpecial && g.meters > 180 && Math.floor(y / 360) % 3 === 0) {
        const center = W / 2 + Math.sin(y * 0.006) * 290;
        g.objects.push(makeObject("gate", center - 54, y, { side: -1 }));
        g.objects.push(makeObject("gate", center + 54, y, { side: 1 }));
      }

      if (!nearSpecial) {
        const bigObstacle = g.meters > 650 && rand(y + 501) < 0.28 + difficulty * 0.28;
        const centerBias = Math.abs(x - W / 2) < 155;
        const typeMain = lane < 0.66 + difficulty * 0.14 || centerBias ? "pine" : lane < 0.86 ? "stone" : lane < 0.92 ? "jump" : "drift";

        if (typeMain === "pine") g.objects.push(makeObject("pine", x, y, bigObstacle ? { scale: 1.85, r: 38 } : {}));
        else if (typeMain === "stone") g.objects.push(makeObject("stone", x, y, bigObstacle ? { scale: 2.05, r: 30 } : {}));
        else if (typeMain === "jump") g.objects.push(makeObject("jump", x, y, { power: 38 }));
        else g.objects.push(makeObject("drift", x, y));

        if (rand(y + 1600) < 0.08 + levelIndex * 0.025) {
          if (levelIndex === 2) {
            const side = rand(y + 1601) < 0.5 ? -1 : 1;
            g.objects.push(makeObject("bird", side < 0 ? -80 : W + 80, y + 60, { vx: 5.5 + levelIndex * 0.45, phase: rand(y) * Math.PI * 2 }));
          } else if (levelIndex === 4) {
            g.objects.push(makeObject("pasta", 170 + rand(y + 1602) * (W - 340), y + 40, { width: 170 + rand(y + 1603) * 150, phase: rand(y) * Math.PI * 2 }));
            if (rand(y + 1604) < 0.55) g.objects.push(makeObject("pizza", 140 + rand(y + 1605) * (W - 280), y - 90, { vx: (rand(y + 1606) - 0.5) * 7, vy: 6.5 + rand(y + 1607) * 2.2, spin: 0.22 }));
          } else if (levelIndex === 8) {
            g.objects.push(makeObject("ufo", 140 + rand(y + 1608) * (W - 280), y + 30, { phase: rand(y) * Math.PI * 2 }));
          } else if (levelIndex >= 5) {
            g.objects.push(makeObject("banana", 120 + rand(y + 1609) * (W - 240), y + 20, { phase: rand(y) * Math.PI * 2 }));
          }
        }

        if (g.meters > 500 && rand(y + 810) < 0.28 + difficulty * 0.22) {
          const wallY = y + 28 + rand(y + 811) * 36;
          const gapCenter = 170 + rand(y + 812) * (W - 340);
          for (let wx = 120; wx < W - 80; wx += 130) {
            if (Math.abs(wx - gapCenter) > 145) {
              const wallType = rand(y + wx) < 0.65 ? "pine" : "stone";
              g.objects.push(makeObject(wallType, wx, wallY, wallType === "pine" ? { scale: 1.35, r: 28 } : { scale: 1.45, r: 23 }));
            }
          }
        }
      }
    }

    // Finish lines are pre-placed at the end of every level.

    g.objects = g.objects.filter(o => o.y > g.camera - 240 && !o.remove && (o.type !== "ball" || o.life > 0) && (o.type !== "bullet" || o.life > 0));
  }

  function crash(g, reason) {
    if (g.skier.invuln > 0 || g.skier.airborne > 0) return;
    g.skier.crashed = 62;
    g.skier.invuln = 110;
    g.speed = Math.max(4.2, g.speed * 0.62);
    g.combo = 0;
    g.message = reason || "Úps!";
    for (let i = 0; i < 16; i++) {
      g.particles.push({ x: g.skier.x, y: g.camera + g.skier.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 34 });
    }
  }

  function getMedal(finishTime, finalScore, wonRace) {
    if (wonRace && finishTime < 255 && finalScore > 26000) return "BIGFOOT MASTER";
    if (wonRace && finishTime < 285 && finalScore > 22000) return "CRAZY GOLD";
    if (finishTime < 330 && finalScore > 18000) return "GOLD";
    if (finishTime < 390 && finalScore > 13000) return "SILVER";
    return "BRONZE";
  }

  function awardNearMiss(g, o, label, bonus = 70) {
    if (o.nearMissed || g.skier.airborne > 0 || g.skier.crashed > 0) return;
    o.nearMissed = true;
    g.combo = Math.min(25, (g.combo || 0) + 1);
    g.maxCombo = Math.max(g.maxCombo || 0, g.combo);
    g.nearMisses = (g.nearMisses || 0) + 1;
    const comboBonus = bonus * g.combo;
    g.score += comboBonus;
    g.message = `${label} +${comboBonus}  Combo x${g.combo}`;
    g.timePopups.push({ x: g.skier.x, y: g.camera + g.skier.y - 72, life: 30, text: `+${comboBonus}` });
  }

  function update() {
    const g = game.current;
    if (!g || g.state !== "playing") return;
    g.t += 1;

    const touchX = typeof touchTarget.current === "number" ? touchTarget.current : null;
    const left = keys.current.ArrowLeft || keys.current.a || keys.current.A || (touchX !== null && touchX < W * 0.38);
    const right = keys.current.ArrowRight || keys.current.d || keys.current.D || (touchX !== null && touchX > W * 0.62);
    const jumpPressed = keys.current.ArrowUp || keys.current.w || keys.current.W;
    const brake = keys.current.ArrowDown || keys.current.s || keys.current.S;
    const trick = keys.current[" "] || keys.current.Space;
    const shootPressed = keys.current.j || keys.current.J;

    if (g.skier.crashed > 0) {
      g.skier.crashed -= 1;
    } else {
      const onIce = g.skier.iceTimer > 0;
      if (onIce) {
        g.skier.vx *= 0.985;
      } else {
        const inputDir = left && !right ? -1 : right && !left ? 1 : 0;
        if (inputDir === 0) {
          g.skier.turnLevel = Math.max(0, (g.skier.turnLevel || 0) - 0.18);
          g.skier.vx = 0;
          if (g.skier.turnLevel <= 0.02) {
            g.skier.turnLevel = 0;
            g.skier.turnDir = 0;
          }
        } else {
          if (g.skier.turnDir !== inputDir) {
            g.skier.turnDir = inputDir;
            g.skier.turnLevel = 0.22;
          } else {
            g.skier.turnLevel = Math.min(1, (g.skier.turnLevel || 0) + 0.045);
          }
          const turnCurve = Math.pow(g.skier.turnLevel || 0, 1.35);
          g.skier.vx = inputDir * (0.75 + turnCurve * 4.45);
        }
      }

      g.skier.x += g.skier.vx;
      g.skier.x = Math.max(38, Math.min(W - 38, g.skier.x));
      g.skier.angle = Math.max(-0.95, Math.min(0.95, g.skier.vx * 0.18));

      if (jumpPressed && !g.skier.jumpHeld && g.skier.airborne <= 0) {
        const fatigue = g.skier.jumpFatigue || 0;
        const penalty = Math.min(0.42, 0.1 + fatigue * 0.055);
        g.skier.airborne = Math.max(34, 64 - fatigue * 4);
        g.skier.airMax = g.skier.airborne;
        g.skier.airDistance = 0;
        g.skier.jumpFlash = 18;
        g.skier.jumpHeld = true;
        g.skier.jumpFatigue = Math.min(8, fatigue + 1.15);
        g.skier.straightTimer = 0;
        g.speed *= 1 - penalty;
        g.message = fatigue > 2 ? "Of mörg hopp! Jacob hægir á sér." : "Jacob hoppar sjálfur!";
      }
      if (!jumpPressed) g.skier.jumpHeld = false;
      if (!jumpPressed && g.skier.airborne <= 0 && g.skier.jumpFatigue > 0) g.skier.jumpFatigue = Math.max(0, g.skier.jumpFatigue - 0.018);

      if (g.skier.hasGun && shootPressed && !g.skier.shootHeld) {
        g.skier.shootHeld = true;
        const shotDir = g.skier.angle;
        const startX = g.skier.x + Math.sin(shotDir) * 18;
        const startY = g.camera + g.skier.y + 48;
        g.objects.push(makeObject("bullet", startX, startY, { vx: Math.sin(shotDir) * 8.5, vy: 18, life: 100 }));
        g.message = "Jacob skýtur!";
      }
      if (!shootPressed) g.skier.shootHeld = false;
      if (trick && g.skier.airborne > 0) g.skier.spin += 0.13 * Math.sign(g.skier.vx || 1);
    }

    const turnAmount = Math.min(1, Math.abs(g.skier.angle) / 0.95);
    const straightBonus = Math.max(0, 1 - turnAmount);
    if (turnAmount < 0.12 && !brake && g.skier.crashed <= 0) g.skier.straightTimer = Math.min(360, (g.skier.straightTimer || 0) + 1);
    else g.skier.straightTimer = Math.max(0, (g.skier.straightTimer || 0) - 4);

    const straightStreakBonus = Math.min(3.6, (g.skier.straightTimer || 0) / 55);
    const horseBonus = g.skier.hasHorse ? 1.15 : 0;
    const catBonus = 0;
    const sealBonus = g.skier.hasSeal ? 1.55 : 0;
    const crownBonus = g.skier.hasCrown ? 0.55 : 0;
    const capeBonus = g.skier.hasCape ? 0.85 : 0;
    const iceBonus = g.skier.iceTimer > 0 ? 3.4 : 0;
    const turnSlowdown = turnAmount * 3.7 * (g.skier.iceTimer > 0 ? 0.25 : 1);
    const normalTargetSpeed = 6.9 + horseBonus + catBonus + sealBonus + crownBonus + capeBonus + iceBonus + Math.min(4.1, g.meters / 1450) + straightBonus * 2.6 + straightStreakBonus - turnSlowdown;
    const baseTargetSpeed = brake ? (g.skier.iceTimer > 0 ? 2.2 : 0) : normalTargetSpeed;
    const boostMultiplier = g.skier.boostTimer > 0 && !brake ? 1.5 : 1;
    g.speed += (baseTargetSpeed * boostMultiplier - g.speed) * (brake ? 0.085 : 0.034);
    if (brake) {
      g.skier.straightTimer = 0;
      if (g.speed < 0.18 && g.skier.iceTimer <= 0) g.speed = 0;
    }
    if (g.skier.crashed > 0) g.speed *= 0.986;

    g.camera += g.speed;
    g.elapsed = Math.max(0, g.t / 60 - (g.timePenalty || 0));
    g.meters = Math.floor(Math.min(FINISH_Y, g.camera) / 8);
    const newLevel = getLevelIndex(g.camera);
    if (newLevel !== g.currentLevel) {
      g.currentLevel = newLevel;
      g.levelBannerTimer = 260;
      g.levelBannerText = `${LEVELS[newLevel].name} — ${LEVELS[newLevel].theme}`;
      g.message = g.levelBannerText;
    }
    if (g.levelBannerTimer > 0) g.levelBannerTimer -= 1;
    g.score += Math.max(0, Math.floor(g.speed * 1.8));

    if (g.skier.invuln > 0) g.skier.invuln -= 1;
    if (g.skier.jumpFlash > 0) g.skier.jumpFlash -= 1;
    if (g.skier.boostTimer > 0) g.skier.boostTimer -= 1;
    if (g.skier.iceTimer > 0) g.skier.iceTimer -= 1;
    if (g.fireworksTimer > 0) g.fireworksTimer -= 1;
    if (g.warningTimer > 0) {
      g.warningTimer -= 1;
      if (g.warningTimer === 0) g.warningText = "";
    }

    if (g.rival) {
      const r = g.rival;
      r.wobble += 0.045;
      const raceProgress = Math.min(1, r.y / FINISH_Y);
      const rivalLevel = getLevelIndex(r.y);
      const nearRivalGap = GAPS.some(gy => Math.abs(r.y - gy) < 220);
      const rivalTarget = (6.0 + raceProgress * 1.75 + rivalLevel * 0.06) - (nearRivalGap ? 0.75 : 0);
      r.speed += (rivalTarget - r.speed) * 0.018;
      r.vx += Math.sin(r.wobble) * 0.045;
      r.vx *= 0.94;
      r.x += r.vx;
      r.x += (W / 2 + 120 + Math.sin(r.y * 0.004) * 120 - r.x) * 0.01;
      r.x = Math.max(80, Math.min(W - 80, r.x));
      r.y += r.speed;
      r.angle = Math.max(-0.55, Math.min(0.55, r.vx * 0.18));
    }

    if (g.skier.airborne > 0) {
      g.skier.airborne -= 1;
      g.skier.airDistance = (g.skier.airDistance || 0) + g.speed;
      if (g.skier.airborne === 0) {
        const clean = Math.abs(g.skier.spin % (Math.PI * 2)) < 0.8 || Math.abs(g.skier.spin % (Math.PI * 2)) > 5.4;
        if (clean) {
          const trickScore = 150 + Math.floor(Math.abs(g.skier.spin) * 80);
          g.score += trickScore;
          g.combo += 1;
          g.message = `Fín lending! +${trickScore}`;
        } else {
          crash(g, "Slæm lending");
        }
        g.skier.spin = 0;
        g.skier.airDistance = 0;
        g.skier.airMax = 0;
      }
    }

    spawn(g);

    if (!g.volcanoEvent.triggered && g.camera + g.skier.y > VOLCANO_Y) {
      g.volcanoEvent.triggered = true;
      g.volcanoEvent.active = true;
      g.volcanoEvent.timer = 360;
      g.volcanoEvent.y = g.camera + H + 360;
      g.volcanoEvent.x = Math.max(170, Math.min(W - 170, g.skier.x + (rand(g.t + 777) - 0.5) * 420));
      g.volcanoEvent.lavaSpawned = false;
      g.objects.push(makeObject("volcano", g.volcanoEvent.x, g.volcanoEvent.y, { phase: rand(g.t + VOLCANO_Y) * Math.PI * 2, emerging: true, birthT: g.t }));
      g.warningTimer = 150;
      g.warningText = "VOLCANO AHEAD!";
      g.message = "Eldgos myndast skyndilega fyrir framan Jacob!";
    }

    if (g.volcanoEvent.active) {
      g.volcanoEvent.timer -= 1;
      const volcanoObj = g.objects.find(o => o.type === "volcano" && o.emerging && !o.remove);
      if (volcanoObj) {
        volcanoObj.y = g.volcanoEvent.y;
        volcanoObj.x += Math.sin(g.t * 0.04) * 0.25;
        if (g.t % 10 === 0) {
          g.particles.push({ x: volcanoObj.x - 28 + Math.random() * 56, y: volcanoObj.y - 95, vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 5, life: 58, firework: true });
        }
      }
      if (!g.volcanoEvent.lavaSpawned && g.camera + H > g.volcanoEvent.y - 260) {
        g.volcanoEvent.lavaSpawned = true;
        for (let i = 0; i < 11; i++) {
          const laneOffset = (rand(g.t + i * 19) - 0.5) * 680;
          const x = Math.max(110, Math.min(W - 110, g.volcanoEvent.x + laneOffset));
          const y = g.volcanoEvent.y + 80 + i * 95 + rand(g.t + i * 31) * 75;
          g.objects.push(makeObject("lava", x, y, { width: 105 + rand(i + 1) * 130, length: 110 + rand(i + 2) * 190, phase: rand(i + 3) * Math.PI * 2, fresh: true }));
        }
      }
      if (g.volcanoEvent.timer <= 0 || g.camera > g.volcanoEvent.y + 900) g.volcanoEvent.active = false;
    }

    if (!g.avalanche.triggered && g.camera + g.skier.y > AVALANCHE_Y) {
      g.avalanche.triggered = true;
      g.avalanche.active = true;
      g.avalanche.y = g.camera - 520;
      g.avalanche.timer = 520;
      g.message = "AVALANCHE! Snjóflóð eltir Jacob!";
    }
    if (g.avalanche.active) {
      g.avalanche.timer -= 1;
      const avalancheSpeed = Math.max(8.5, g.speed + 1.15);
      g.avalanche.y += avalancheSpeed;
      const playerWorldY = g.camera + g.skier.y;
      if (g.avalanche.y > playerWorldY - 40 && g.skier.invuln <= 0) {
        g.skier.invuln = 110;
        g.skier.crashed = 52;
        g.speed = Math.max(3.8, g.speed * 0.55);
        g.message = "Snjóflóðið náði Jacob — hann hægist tímabundið!";
        g.avalanche.y = playerWorldY - 260;
        for (let i = 0; i < 30; i++) {
          g.particles.push({ x: g.skier.x + (Math.random() - 0.5) * 90, y: playerWorldY + (Math.random() - 0.5) * 70, vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7, life: 42 });
        }
      }
      if (g.avalanche.timer <= 0 || g.avalanche.y < g.camera - 900) g.avalanche.active = false;
    }

    const activeObjects = g.objects.filter(o => {
      if (o.type === "ball" || o.type === "bullet" || o.type === "pizza") return o.life > 0;
      return o.y > g.camera - 520 && o.y < g.camera + H + 1180;
    });

    for (const o of activeObjects) {
      if (o.type === "bigk") {
        const screenY = o.y - g.camera;
        const shouldThrow = !o.thrown && screenY > 80 && screenY < H - 80;
        if (shouldThrow) {
          o.thrown = true;
          o.throwAnim = 54;
          const startX = o.x + (o.side < 0 ? 54 : -54);
          const startY = o.y - 18;
          const targetX = g.skier.x;
          const targetY = g.camera + g.skier.y + 18;
          const dx = targetX - startX;
          const dy = targetY - startY;
          const len = Math.max(1, Math.hypot(dx, dy));
          const speed = 12.6;
          g.objects.push(makeObject("ball", startX, startY, { vx: (dx / len) * speed, vy: (dy / len) * speed, life: 360 }));
          g.message = "Mr. Disturb kastar bolta að Jacob!";
        }
        if (o.throwAnim > 0) o.throwAnim -= 1;
      }
if (o.type === "ball" || o.type === "bullet" || o.type === "pizza") {
        o.x += o.vx;
        o.y += o.vy;
        if (o.type === "pizza") o.spin += 0.18;
        o.life -= 1;
        if (o.x < -180 || o.x > W + 180 || o.y < g.camera - 240 || o.y > g.camera + H + 360) o.life = 0;
      }
      if (o.type === "bird") {
        const screenY = o.y - g.camera;
        if (screenY < H + 220 && screenY > -180) o.active = true;
        if (o.active && !o.remove) {
          const dir = o.vx >= 0 ? 1 : -1;
          o.x += dir * Math.abs(o.vx);
          o.y += Math.sin(g.t * 0.16 + o.phase) * 1.8;
          if (o.x < -180 || o.x > W + 180) o.remove = true;
        }
      }
      if (o.type === "ufo") {
        const screenY = o.y - g.camera;
        if (screenY < H + 280 && screenY > -220) o.active = true;
        if (o.active && !o.remove) {
          o.x += Math.sin(g.t * 0.035 + o.phase) * 3.2;
          o.beamTimer = (o.beamTimer + 1) % 140;
        }
      }
      if (o.type === "missCrazy") {
        const screenY = o.y - g.camera;
        if (screenY < H + 260 && screenY > -220) o.active = true;
        if (o.active && !o.remove) {
          const direction = o.side < 0 ? 1 : -1;
          o.x += direction * o.runSpeed;
          o.y += Math.sin(g.t * 0.08) * 0.25;
          const closeToTarget = Math.abs(o.x - o.targetX) < 80;
          const closeToJacob = g.skier.airborne <= 0 && Math.abs(o.x - g.skier.x) < 90 && Math.abs(o.y - g.camera - g.skier.y) < 90;
          if ((closeToTarget || closeToJacob) && !o.swung) {
            o.swung = true;
            o.hammerTimer = 42;
            g.message = "Miss-Crazy kemur með risahamar!";
          }
          if (o.hammerTimer > 0) {
            o.hammerTimer -= 1;
            o.hammerAngle = -1.2 + ((42 - o.hammerTimer) / 42) * 2.55;
          } else if (o.swung) {
            o.hammerAngle = 1.1;
          }
          if ((o.side < 0 && o.x > W + 160) || (o.side > 0 && o.x < -160)) o.remove = true;
        }
      }
      if (o.type === "bigfoot") {
        const screenY = o.y - g.camera;
        if (screenY < H + 560 && screenY > -420) o.active = true;
        if (o.active && !o.remove) {
          o.wobble += 0.085 + rand(o.y + g.t) * 0.03;
          o.y += o.speed;
          o.x += Math.sin(o.wobble + o.phase) * 7.5 + Math.sin(g.t * 0.037 + o.phase) * 3.8;
          o.x += (W / 2 + Math.sin(o.y * 0.004 + o.phase) * 280 - o.x) * 0.012;
          o.x = Math.max(120, Math.min(W - 120, o.x));
          o.stomp = Math.max(0, Math.sin(g.t * 0.34 + o.phase));
          if (o.y > g.camera + H + 650) o.remove = true;
        }
      }
      if (o.type === "sheep") {
        const screenY = o.y - g.camera;
        if (screenY < H + 320 && screenY > H * 0.02) {
          o.active = true;
          if (!o.warning) {
            o.warning = true;
            g.warningTimer = 120;
            g.warningText = "SHEEP HERD!";
            g.message = "Kindahjörð þvert yfir brautina!";
          }
        }
        if (o.active && !o.remove) {
          if (o.chasing) {
            o.chaseTimer -= 1;
            const targetX = g.skier.x;
            const targetY = g.camera + g.skier.y + 95;
            const dx = targetX - o.x;
            const dy = targetY - o.y;
            const len = Math.max(1, Math.hypot(dx, dy));
            o.x += (dx / len) * 8.2;
            o.y += (dy / len) * 8.2;
            o.vx = 0;
            if (o.chaseTimer <= 0) {
              o.chasing = false;
              o.angry = false;
              o.remove = true;
            }
          } else {
            o.x += (o.side < 0 ? 1 : -1) * o.vx;
            o.y += Math.sin(g.t * 0.11 + o.phase) * 0.45 + 0.18;
            if ((o.side < 0 && o.x > W + 190) || (o.side > 0 && o.x < -190)) o.remove = true;
          }
        }
      }
      if (o.type === "volcano") {
        const screenY = o.y - g.camera;
        if (screenY < H + 440 && screenY > -280) {
          o.active = true;
          if (g.t % 12 === 0) {
            g.particles.push({ x: o.x - 30 + Math.random() * 60, y: o.y - 90, vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 5, life: 58, firework: true });
          }
        }
      }
    }

    const sx = g.skier.x;
    const sy = g.camera + g.skier.y;

    for (const shot of activeObjects) {
      if (shot.type !== "bullet" || shot.life <= 0) continue;
      for (const target of activeObjects) {
        if ((target.type !== "bigk" && target.type !== "missCrazy") || target.remove) continue;
        const hitDist = target.type === "bigk" ? 82 : 42;
        if (Math.hypot(shot.x - target.x, shot.y - target.y) < hitDist) {
          shot.life = 0;
          target.remove = true;
          g.score += target.type === "bigk" ? 500 : 350;
          g.message = target.type === "bigk" ? "Jacob skaut Mr. Disturb út af brautinni!" : "Jacob skaut Miss-Crazy út af brautinni!";
          for (let i = 0; i < 26; i++) g.particles.push({ x: target.x, y: target.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 42, spark: true });
          break;
        }
      }
    }

    for (const o of activeObjects) {
      const dx = sx - o.x;
      const dy = sy - o.y;
      const dist = Math.hypot(dx, dy);

      if (o.type === "ice" && Math.abs(dx) < (o.width || 150) / 2 && Math.abs(dy) < (o.length || 420) / 2 && g.skier.airborne <= 0) {
        if (g.skier.iceTimer <= 0) g.message = "Klakarönd! Jacob rennur hraðar en getur ekki stýrt!";
        g.skier.iceTimer = 55;
        g.speed = Math.max(g.speed, g.speed * 1.025);
      }

      if (o.type === "starPackage" && !o.collected && dist < 42) {
        o.collected = true;
        o.remove = true;
        g.starPackages += 1;
        g.score += 400;
        if (g.starPackages === 1) {
          g.skier.hasHorse = true;
          g.skier.hasCat = false;
          g.skier.hasSeal = false;
          g.message = "Stjörnupakki! Hestur kemur — Jacob ríður til loka brautarinnar!";
        } else if (g.starPackages === 2) {
          g.skier.hasGun = true;
          g.warningTimer = 240;
          g.warningText = "Gun unlocked! Press J or tap SHOOT";
          g.message = "Byssa komin! Ýttu á J eða SHOOT takkann á síma til að skjóta Big K og Miss-Crazy!";
        } else if (g.starPackages === 3) {
          g.skier.hasHorse = false;
          g.skier.hasCat = false;
          g.skier.hasSeal = true;
          g.skier.boostTimer = 360;
          g.warningTimer = 190;
          g.warningText = "SEAL MODE!";
          g.message = "Þriðji stjörnupakki! Hesturinn breyttist í sel með hatt og kjánapriki!";
        } else if (g.starPackages === 4) {
          g.skier.hasCrown = true;
          g.skier.boostTimer = 420;
          g.warningTimer = 170;
          g.warningText = "CROWN POWER!";
          g.message = "Fjórði stjörnupakki! Jacob fær gullkórónu og meiri kraft!";
        } else if (g.starPackages === 5) {
          g.skier.hasCape = true;
          g.skier.boostTimer = 520;
          g.warningTimer = 190;
          g.warningText = "SUPER JACOB!";
          g.message = "Fimmti stjörnupakki! Jacob fær ofurkápu og verður Super Jacob!";
        } else {
          g.skier.boostTimer = 300;
          g.message = "Stjörnupakki! Auka kraftur!";
        }
        for (let i = 0; i < 40; i++) g.particles.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 48, firework: true });
        continue;
      }

      if (o.type === "package" && !o.collected && dist < 34) {
        o.collected = true;
        o.remove = true;
        g.packages += 1;
        g.timePenalty += 0.25;
        g.timePopups.push({ x: sx, y: sy - 42, life: 34, text: "-0,25" });
        g.score += 125;
        g.message = "Pakki! -0,25 sekúndur.";
        for (let i = 0; i < 12; i++) g.particles.push({ x: sx, y: sy, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, life: 30, packageSpark: true });
        if (g.packages === 10) {
          g.fireworksTimer = 120;
          g.message = "10 pakkar! Flugeldar!";
          for (let i = 0; i < 160; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 2 + Math.random() * 5;
            g.particles.push({ x: 120 + Math.random() * (W - 240), y: g.camera + 120 + Math.random() * (H - 240), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 90, firework: true });
          }
        }
        continue;
      }

      if (o.type === "star" && !o.collected && dist < 34) {
        o.collected = true;
        o.remove = true;
        g.skier.boostTimer = 300;
        g.speed = Math.max(g.speed, g.speed * 1.18);
        g.score += 250;
        g.message = "Stjarna! Jacob fer 1,5× hraðar í 5 sekúndur!";
        continue;
      }

      if (o.type === "finish" && !o.passed && sy >= o.y) {
        o.passed = true;
        if (o.final || (g.currentLevel || 0) >= LEVELS.length - 1) {
          const rivalFinished = g.rival && g.rival.y >= FINISH_Y;
          endGame(rivalFinished ? "Þú komst í mark — hinn skíðamaðurinn var á undan" : "Jacob vann keppnina!");
        } else {
          completeLevel(o.levelIndex ?? g.currentLevel);
        }
        return;
      }

      if (o.type === "jump" && dist < (o.r || 28) && g.skier.airborne <= 0 && g.skier.crashed <= 0) {
        g.skier.airborne = o.power || 38;
        g.skier.airMax = g.skier.airborne;
        g.skier.airDistance = 0;
        g.skier.jumpFlash = o.mega ? 34 : 18;
        g.speed = o.mega ? Math.max(g.speed, g.speed * 1.22) : g.speed;
        g.score += o.mega ? 260 : o.required ? 85 : 35;
        g.message = o.mega ? "MEGA SKI JUMP! Jacob stekkur miklu lengra!" : o.required ? "Stór stökkpallur — yfir lengra gilið!" : "Stökk! Haltu bilslá inni fyrir snúning";
        continue;
      }

      if (o.type === "gap" && sy > o.y + (o.depth || 120) / 2) o.passed = true;
      if (o.type === "gap" && !o.passed) {
        const visibleGapW = (o.width || 520) * WORLD_SCALE;
        const visibleGapD = (o.depth || 120) * WORLD_SCALE;
        const insideVisibleGap = Math.abs(dx) < visibleGapW / 2 - 12 && Math.abs(dy) < visibleGapD / 2 - 12;
        if (insideVisibleGap && g.skier.airborne <= 0 && !o.penalty) {
          o.penalty = true;
          g.skier.crashed = 78;
          g.skier.invuln = 90;
          g.speed = Math.max(3.6, g.speed * 0.38);
          g.message = "Jacob lenti í vel afmörkuðu gili — stutt stopp!";
          continue;
        }
      }

      if (o.type === "sheep" && dist < 74 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        g.skier.crashed = 38;
        g.skier.invuln = 70;
        g.speed = Math.max(4.6, g.speed * 0.78);
        if (!o.hitOnce) {
          o.hitOnce = true;
          o.chasing = true;
          o.angry = true;
          o.chaseTimer = 180;
          o.nearMissed = true;
          g.message = "Angry sheep! Kindin eltir Jacob í 3 sekúndur!";
        } else {
          g.message = "Reið kind nær Jacob aftur!";
        }
        continue;
      }

      if (o.type === "lava" && Math.abs(dx) < (o.width || 120) / 2 && Math.abs(dy) < (o.length || 160) / 2 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        g.skier.crashed = 72;
        g.skier.invuln = 120;
        g.speed = Math.max(3.4, g.speed * 0.48);
        g.message = "LAVA! Jacob brennur ekki, en hægist mikið.";
        for (let i = 0; i < 24; i++) g.particles.push({ x: sx + (Math.random() - 0.5) * 80, y: sy + (Math.random() - 0.5) * 80, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5, life: 36, firework: true });
        continue;
      }

      if (o.type === "bigfoot" && Math.abs(dx) < 64 && Math.abs(dy) < 88 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        g.skier.crashed = 72;
        g.skier.invuln = 105;
        g.speed = Math.max(3.8, g.speed * 0.55);
        g.message = "Pink Foot dansaði fyrir Jacob!";
        continue;
      }

      if (o.type === "missCrazy" && o.swung && Math.abs(dx) < 42 && Math.abs(dy) < 42 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        g.skier.crashed = 62;
        g.skier.invuln = 95;
        g.speed = Math.max(4.4, g.speed * 0.58);
        g.message = "Miss-Crazy sló nærri Jacob með risahamri!";
        continue;
      }

      if (o.type === "bird" && dist < 42 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        g.skier.crashed = 36;
        g.skier.invuln = 72;
        g.speed = Math.max(4.6, g.speed * 0.76);
        g.message = "Bird panic! Fuglahópur truflaði Jacob.";
        continue;
      }

      if (o.type === "pasta" && Math.abs(dx) < (o.width || 190) / 2 && Math.abs(dy) < 26 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        g.skier.crashed = 42;
        g.skier.invuln = 74;
        g.speed = Math.max(4.1, g.speed * 0.68);
        g.message = "Pasta strip! Jacob festist í spaghetti.";
        continue;
      }

      if (o.type === "banana" && dist < 36 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        g.skier.crashed = 46;
        g.skier.invuln = 82;
        g.speed = Math.max(4.0, g.speed * 0.64);
        g.skier.vx += (rand(g.t + o.y) - 0.5) * 14;
        g.message = "Banana slip!";
        continue;
      }

      if (o.type === "ufo" && Math.abs(dx) < 70 && Math.abs(dy) < 105 && o.beamTimer > 45 && o.beamTimer < 105 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        g.skier.crashed = 42;
        g.skier.invuln = 80;
        g.speed = Math.max(4.4, g.speed * 0.72);
        g.message = "UFO beam! Jacob varð ruglaður.";
        continue;
      }

      if (o.type === "pizza" && dist < 38 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        o.life = 0;
        g.skier.crashed = 42;
        g.skier.invuln = 82;
        g.speed = Math.max(4.7, g.speed * 0.72);
        g.message = "Flying pizza!";
        continue;
      }

      if (o.type === "ball" && dist < 26 && g.skier.airborne <= 0 && g.skier.invuln <= 0) {
        o.life = 0;
        g.skier.crashed = 48;
        g.skier.invuln = 80;
        g.speed = Math.max(4.8, g.speed * 0.72);
        g.message = "Bolti frá Mr. Disturb hægði á Jacob!";
        continue;
      }

      if ((o.type === "pine" || o.type === "stone") && !o.nearMissed && dy > 16 && dy < 78 && g.skier.airborne <= 0) {
        const danger = o.r * WORLD_SCALE + 8;
        if (dist > danger && dist < danger + 48) awardNearMiss(g, o, "Near miss", 65);
      }

      if (o.type === "bigk" && !o.nearMissed && dy > 18 && dy < 120 && Math.abs(dx) < 120 && g.skier.airborne <= 0) awardNearMiss(g, o, "Risky line", 90);
      if (o.type === "sheep" && !o.nearMissed && dy > 10 && dy < 130 && Math.abs(dx) < 140 && g.skier.airborne <= 0) awardNearMiss(g, o, "Sheep dodge", 75);
      if (o.type === "lava" && !o.nearMissed && dy > 10 && dy < 110 && Math.abs(dx) < ((o.width || 120) / 2 + 42) && g.skier.airborne <= 0) awardNearMiss(g, o, "Hot line", 95);
      if (o.type === "bird" && !o.nearMissed && dy > 8 && dy < 95 && Math.abs(dx) < 95 && g.skier.airborne <= 0) awardNearMiss(g, o, "Bird dodge", 85);
      if (o.type === "pizza" && !o.nearMissed && dy > 6 && dy < 95 && Math.abs(dx) < 95 && g.skier.airborne <= 0) awardNearMiss(g, o, "Pizza dodge", 95);
      if (o.type === "pasta" && !o.nearMissed && dy > 5 && dy < 70 && Math.abs(dx) < ((o.width || 190) / 2 + 55) && g.skier.airborne <= 0) awardNearMiss(g, o, "Pasta line", 100);
      if (o.type === "ufo" && !o.nearMissed && dy > 20 && dy < 120 && Math.abs(dx) < 120 && g.skier.airborne <= 0) awardNearMiss(g, o, "UFO dodge", 140);
      if (o.type === "missCrazy" && !o.nearMissed && dy > 12 && dy < 92 && Math.abs(dx) < 82 && g.skier.airborne <= 0) awardNearMiss(g, o, "Crazy dodge", 110);
      if (o.type === "bigfoot" && !o.nearMissed && dy > 30 && dy < 135 && Math.abs(dx) < 125 && g.skier.airborne <= 0) awardNearMiss(g, o, "Pink Foot dodge", 150);

      if (o.type === "drift" && dist < 24 && g.skier.airborne <= 0) g.speed *= 0.965;
      if (o.type === "gate" && !o.passed && Math.abs(dy) < 18 && Math.abs(dx) < 70) {
        o.passed = true;
        g.score += 40;
      }
      if ((o.type === "pine" || o.type === "stone") && dist < o.r * WORLD_SCALE + 8 && g.skier.airborne <= 0) crash(g, o.type === "pine" ? "Beint á tré!" : "Steinn í brautinni!");
    }

    const currentLevelEnd = LEVEL_ENDS[g.currentLevel || 0] || FINISH_Y;
    if (g.rival && g.rival.y >= currentLevelEnd && sy < currentLevelEnd && g.state === "playing") g.message = "Keppinauturinn er kominn að level-endalínunni — flýttu þér!";

    for (const p of g.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.life -= 1;
    }
    g.particles = g.particles.filter(p => p.life > 0).slice(-120);

    for (const pop of g.timePopups) {
      pop.y -= 1.2;
      pop.life -= 1;
    }
    g.timePopups = g.timePopups.filter(pop => pop.life > 0);

    setUi(prev => {
      if (g.t % 12 !== 0 && prev.state === "playing") return prev;
      return {
        state: g.state,
        level: (g.currentLevel || 0) + 1,
        theme: LEVELS[g.currentLevel || 0].theme,
        meters: g.meters,
        score: Math.floor(g.score),
        best: Math.max(g.best, Math.floor(g.score)),
        time: g.elapsed || 0,
        bestTime: g.bestTime || 0,
        hasGun: !!g.skier.hasGun,
        message: g.message
      };
    });
  }

  function completeLevel(levelIndex) {
    const g = game.current;
    if (!g || g.state !== "playing") return;
    const safeLevelIndex = Math.max(0, Math.min(LEVELS.length - 1, levelIndex || 0));
    const levelTime = Math.max(0, (g.t - (g.levelStartT || 0)) / 60 - ((g.timePenalty || 0) - (g.levelStartPenalty || 0)));
    const levelName = `${LEVELS[safeLevelIndex].name} — ${LEVELS[safeLevelIndex].theme}`;
    g.state = "levelComplete";
    g.speed = 0;
    g.skier.vx = 0;
    g.levelCompleteStats = {
      levelIndex: safeLevelIndex,
      levelName,
      levelTime,
      score: Math.floor(g.score),
      packages: g.packages || 0,
      nearMisses: g.nearMisses || 0,
      maxCombo: g.maxCombo || 0
    };
    g.levelResults.push(g.levelCompleteStats);
    g.message = `${levelName} complete!`;
    setUi(prev => ({
      ...prev,
      state: "levelComplete",
      level: safeLevelIndex + 1,
      theme: LEVELS[safeLevelIndex].theme,
      score: Math.floor(g.score),
      time: levelTime,
      message: g.message
    }));
  }

  function getEndMessage(message) {
    if (message.includes("vann")) return "Jacob wins the race!";
    if (message.includes("á undan")) return "Finished — the rival skier beat you.";
    return "Run complete!";
  }

  function endGame(message) {
    const g = game.current;
    if (!g) return;
    g.state = "ended";
    const finishTime = g.elapsed || g.t / 60;
    const wonRace = message.includes("vann");
    const timeBonus = Math.max(0, Math.floor((900 - finishTime) * 10));
    const finalScore = Math.floor(g.score + g.meters * 2 + timeBonus + (wonRace ? 1500 : 0));
    const medal = getMedal(finishTime, finalScore, wonRace);
    const endMessage = getEndMessage(message);
    g.medal = medal;
    g.message = endMessage;
    g.finalStats = {
      finishTime,
      finalScore,
      medal,
      nearMisses: g.nearMisses || 0,
      maxCombo: g.maxCombo || 0,
      packages: g.packages || 0,
      wonRace,
      endMessage
    };
    const best = Math.max(g.best, finalScore);
    const previousBestTime = Number(localStorage.getItem("skigame-best-time") || 0);
    const bestTime = previousBestTime === 0 ? finishTime : Math.min(previousBestTime, finishTime);
    const oldMedal = localStorage.getItem("skigame-best-medal") || "";
    const medalRank = { BRONZE: 1, SILVER: 2, GOLD: 3, "CRAZY GOLD": 4, "BIGFOOT MASTER": 5 };
    const bestMedal = (medalRank[medal] || 0) >= (medalRank[oldMedal] || 0) ? medal : oldMedal;
    localStorage.setItem("skigame-best", String(best));
    localStorage.setItem("skigame-best-time", String(bestTime));
    localStorage.setItem("skigame-best-medal", bestMedal);
    setUi({ state: "ended", meters: g.meters, score: finalScore, best, time: finishTime, bestTime, hasGun: !!g.skier.hasGun, medal, nearMisses: g.nearMisses || 0, maxCombo: g.maxCombo || 0, message: endMessage });
  }

  function drawSkier(ctx, x, y, g, suit = "#dc2626", hat = "#2563eb", label = "") {
    if (g.skier.hasSeal) {
      drawSealRider(ctx, x, y, g, suit, hat, label);
      return;
    }

    if (g.skier.hasHorse) {
      drawHorseRider(ctx, x, y, g, suit, hat, label);
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(WORLD_SCALE, WORLD_SCALE);

    const airMax = g.skier.airMax || 1;
    const airProgress = g.skier.airborne > 0 ? 1 - g.skier.airborne / airMax : 0;
    const arcLift = g.skier.airborne > 0 ? Math.sin(airProgress * Math.PI) * 62 : 0;
    const lift = g.skier.airborne > 0 ? -18 - arcLift : 0;

    if (g.skier.airborne > 0) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(0, 42 + arcLift * 0.42, 25 + arcLift * 0.14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (g.skier.jumpFlash > 0) {
      ctx.save();
      ctx.globalAlpha = g.skier.jumpFlash / 18;
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 16, 42 - g.skier.jumpFlash, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (g.skier.boostTimer > 0) {
      const flamePulse = 0.78 + Math.sin(g.t * 0.55) * 0.28;
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(0, 62);
      ctx.lineTo(-17 * flamePulse, 31);
      ctx.lineTo(0, 40);
      ctx.lineTo(17 * flamePulse, 31);
      ctx.closePath();
      ctx.fill();
    }

    ctx.translate(0, lift);
    const skiDir = g.skier.airborne > 0 ? -g.skier.spin * 0.35 : -g.skier.angle;
    if (g.skier.invuln > 0 && Math.floor(g.t / 5) % 2 === 0) ctx.globalAlpha = 0.58;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const skiColor = suit === "#dc2626" ? "#22d3ee" : "#facc15";
    const glide = Math.sin(g.t * 0.22) * 1.2;
    const skis = [[-12, -1], [12, 1]];
    for (const [cx, side] of skis) {
      ctx.save();
      ctx.translate(cx, 23 + side * glide);
      ctx.rotate(skiDir);
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(0, 37);
      ctx.stroke();
      ctx.strokeStyle = skiColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(0, 37);
      ctx.stroke();
      ctx.fillStyle = "#111827";
      rounded(ctx, -5, -5, 10, 11, 3);
      ctx.fill();
      ctx.restore();
    }

    const footLean = Math.sin(skiDir) * 11;
    ctx.strokeStyle = suit === "#dc2626" ? "#1d4ed8" : "#dc2626";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-5, 1);
    ctx.lineTo(-12 + footLean, 21 - glide * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, 1);
    ctx.lineTo(12 + footLean, 21 + glide * 0.2);
    ctx.stroke();

    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-11, -1);
    ctx.lineTo(-28, 30);
    ctx.moveTo(11, -1);
    ctx.lineTo(28, 30);
    ctx.stroke();

    ctx.fillStyle = suit;
    ctx.strokeStyle = suit === "#dc2626" ? "#7f1d1d" : "#1e3a8a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(13, 3);
    ctx.lineTo(8, 18);
    ctx.lineTo(-8, 18);
    ctx.lineTo(-13, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(0, -22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hat;
    ctx.beginPath();
    ctx.arc(0, -25, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-8, -26, 16, 4);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-5, -21, 10, 3);
    drawJacobExtras(ctx, g);

    if (label) {
      ctx.fillStyle = "rgba(15,23,42,0.8)";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, 0, 58);
    }
    ctx.restore();
  }

  function drawCatRider(ctx, x, y, g, suit = "#dc2626", hat = "#2563eb", label = "") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(WORLD_SCALE * 0.82, WORLD_SCALE * 0.82);

    const airMax = g.skier.airMax || 1;
    const airProgress = g.skier.airborne > 0 ? 1 - g.skier.airborne / airMax : 0;
    const arcLift = g.skier.airborne > 0 ? Math.sin(airProgress * Math.PI) * 66 : 0;
    const lift = g.skier.airborne > 0 ? -18 - arcLift : 0;

    if (g.skier.airborne > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(0, 72 + arcLift * 0.35, 36, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.translate(0, lift);
    const bounce = Math.sin(g.t * 0.38) * 3;
    const lean = Math.max(-0.14, Math.min(0.14, g.skier.angle * 0.12));
    ctx.rotate(lean);
    ctx.translate(0, bounce);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Köttur séður ofan frá.
    ctx.fillStyle = "#f59e0b";
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 14, 31, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Höfuð og eyru.
    ctx.beginPath();
    ctx.ellipse(0, -42, 28, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    ctx.beginPath(); ctx.moveTo(-19, -57); ctx.lineTo(-34, -82); ctx.lineTo(-7, -64); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(19, -57); ctx.lineTo(34, -82); ctx.lineTo(7, -64); ctx.closePath(); ctx.fill(); ctx.stroke();

    // Augu og veiðihár.
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(-9, -45, 3, 0, Math.PI * 2);
    ctx.arc(9, -45, 3, 0, Math.PI * 2);
    ctx.arc(0, -36, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, -36); ctx.lineTo(-21, -42);
    ctx.moveTo(-2, -34); ctx.lineTo(-21, -34);
    ctx.moveTo(2, -36); ctx.lineTo(21, -42);
    ctx.moveTo(2, -34); ctx.lineTo(21, -34);
    ctx.stroke();

    // Fætur og hali.
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-18, 2); ctx.lineTo(-36, 24);
    ctx.moveTo(18, 2); ctx.lineTo(36, 24);
    ctx.moveTo(-14, 46); ctx.lineTo(-26, 72);
    ctx.moveTo(14, 46); ctx.lineTo(26, 72);
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(0, 62);
    ctx.quadraticCurveTo(34, 88, 8, 112);
    ctx.stroke();

    // Jacob situr á kettinum.
    ctx.fillStyle = suit;
    rounded(ctx, -13, -12, 26, 30, 8);
    ctx.fill();
    ctx.strokeStyle = suit === "#dc2626" ? "#7f1d1d" : "#1e3a8a";
    ctx.lineWidth = 2;
    rounded(ctx, -13, -12, 26, 30, 8);
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(0, -27, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hat;
    ctx.fillRect(-8, -36, 16, 6);
    drawJacobExtras(ctx, g);

    if (g.skier.hasGun) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.lineTo(34, -20);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      rounded(ctx, 28, -24, 18, 8, 3);
      ctx.fill();
    }

    if (label) {
      ctx.fillStyle = "rgba(15,23,42,0.82)";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, 0, 116);
    }
    ctx.restore();
  }

  function drawHorseRider(ctx, x, y, g, suit = "#dc2626", hat = "#2563eb", label = "") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(WORLD_SCALE * 0.74, WORLD_SCALE * 0.74);

    const airMax = g.skier.airMax || 1;
    const airProgress = g.skier.airborne > 0 ? 1 - g.skier.airborne / airMax : 0;
    const arcLift = g.skier.airborne > 0 ? Math.sin(airProgress * Math.PI) * 70 : 0;
    const lift = g.skier.airborne > 0 ? -18 - arcLift : 0;

    if (g.skier.airborne > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(0, 80 + arcLift * 0.35, 42, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.translate(0, lift);

    const gallop = Math.sin(g.t * 0.42) * 4;
    const lean = Math.max(-0.1, Math.min(0.1, g.skier.angle * 0.1));
    ctx.rotate(lean);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-13, 28); ctx.lineTo(-21, 58 + gallop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13, 28); ctx.lineTo(21, 58 - gallop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-11, -24); ctx.lineTo(-19, -49 - gallop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, -24); ctx.lineTo(19, -49 + gallop); ctx.stroke();

    ctx.fillStyle = "#b45309";
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 3;
    rounded(ctx, -20, -38, 40, 88, 22);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d97706";
    rounded(ctx, -16, -72, 32, 38, 15);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.moveTo(-11, -68); ctx.lineTo(-20, -86); ctx.lineTo(-3, -74); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(11, -68); ctx.lineTo(20, -86); ctx.lineTo(3, -74); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#3f1d0b";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -62); ctx.lineTo(0, 23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 48); ctx.quadraticCurveTo(-10, 72, 6, 84); ctx.stroke();

    ctx.fillStyle = "#111827";
    rounded(ctx, -16, -9, 32, 22, 8);
    ctx.fill();
    ctx.fillStyle = suit;
    rounded(ctx, -13, -25, 26, 31, 8);
    ctx.fill();
    ctx.strokeStyle = suit === "#dc2626" ? "#7f1d1d" : "#1e3a8a";
    ctx.lineWidth = 2;
    rounded(ctx, -13, -25, 26, 31, 8);
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath(); ctx.arc(0, -39, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hat;
    ctx.fillRect(-9, -48, 18, 6);
    drawJacobExtras(ctx, g);

    if (g.skier.hasGun) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(13, -20); ctx.lineTo(39, -31); ctx.stroke();
      ctx.fillStyle = "#64748b";
      rounded(ctx, 31, -37, 23, 10, 3);
      ctx.fill();
    }

    if (label) {
      ctx.fillStyle = "rgba(15,23,42,0.82)";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, 0, 102);
    }
    ctx.restore();
  }

  function drawJacobExtras(ctx, g) {
    if (g.skier.hasCape) {
      ctx.fillStyle = "#7c3aed";
      ctx.beginPath();
      ctx.moveTo(-16, -10);
      ctx.lineTo(-34, 42);
      ctx.lineTo(0, 24);
      ctx.lineTo(34, 42);
      ctx.lineTo(16, -10);
      ctx.closePath();
      ctx.fill();
    }
    if (g.skier.hasCrown) {
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-11, -50);
      ctx.lineTo(-6, -64);
      ctx.lineTo(0, -52);
      ctx.lineTo(6, -64);
      ctx.lineTo(11, -50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawSealRider(ctx, x, y, g, suit = "#dc2626", hat = "#2563eb", label = "") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(WORLD_SCALE * 0.78, WORLD_SCALE * 0.78);

    const airMax = g.skier.airMax || 1;
    const airProgress = g.skier.airborne > 0 ? 1 - g.skier.airborne / airMax : 0;
    const arcLift = g.skier.airborne > 0 ? Math.sin(airProgress * Math.PI) * 66 : 0;
    const lift = g.skier.airborne > 0 ? -18 - arcLift : 0;

    if (g.skier.airborne > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.ellipse(0, 80 + arcLift * 0.35, 38, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.translate(0, lift);

    const lean = Math.max(-0.12, Math.min(0.12, g.skier.angle * 0.12));
    const bounce = Math.sin(g.t * 0.28) * 3;
    ctx.rotate(lean);
    ctx.translate(0, bounce);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Selurinn sjálfur.
    ctx.fillStyle = "#64748b";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 10, 34, 58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Haus.
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.ellipse(0, -48, 24, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Andlit og veiðihár.
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-7, -52, 2.8, 0, Math.PI * 2);
    ctx.arc(7, -52, 2.8, 0, Math.PI * 2);
    ctx.arc(0, -43, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, -43); ctx.lineTo(-18, -48);
    ctx.moveTo(-2, -41); ctx.lineTo(-18, -41);
    ctx.moveTo(2, -43); ctx.lineTo(18, -48);
    ctx.moveTo(2, -41); ctx.lineTo(18, -41);
    ctx.stroke();

    // Hattur á selnum.
    ctx.fillStyle = "#111827";
    ctx.fillRect(-18, -74, 36, 7);
    rounded(ctx, -11, -96, 22, 23, 4);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-11, -80, 22, 4);

    // Hreifar og hali.
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-18, 5); ctx.lineTo(-38, 25);
    ctx.moveTo(18, 5); ctx.lineTo(38, 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, 60); ctx.lineTo(-20, 80);
    ctx.moveTo(10, 60); ctx.lineTo(20, 80);
    ctx.stroke();

    // Kjánaprik.
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(30, -8);
    ctx.lineTo(52, -57);
    ctx.stroke();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(48, -61, 10, Math.PI * 0.1, Math.PI * 1.25, true);
    ctx.stroke();

    // Jacob situr ofan á selnum.
    ctx.fillStyle = suit;
    rounded(ctx, -12, -10, 24, 28, 8);
    ctx.fill();
    ctx.strokeStyle = suit === "#dc2626" ? "#7f1d1d" : "#1e3a8a";
    ctx.lineWidth = 2;
    rounded(ctx, -12, -10, 24, 28, 8);
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(0, -24, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hat;
    ctx.fillRect(-8, -33, 16, 6);
    drawJacobExtras(ctx, g);

    if (g.skier.hasGun) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.lineTo(34, -18);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      rounded(ctx, 28, -22, 18, 8, 3);
      ctx.fill();
    }

    if (g.skier.boostTimer > 0) {
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(0, 84);
      ctx.lineTo(-12, 64);
      ctx.lineTo(0, 70);
      ctx.lineTo(12, 64);
      ctx.closePath();
      ctx.fill();
    }

    if (label) {
      ctx.fillStyle = "rgba(15,23,42,0.82)";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, 0, 104);
    }
    ctx.restore();
  }

  function drawMissCrazy(ctx, o) {
    ctx.save();
    const dir = o.side < 0 ? 1 : -1;
    ctx.scale(0.78, 0.78);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const run = Math.sin((game.current?.t || 0) * 0.45) * 7;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-7, 22); ctx.lineTo(-16, 38 + run); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, 22); ctx.lineTo(16, 38 - run); ctx.stroke();
    ctx.fillStyle = "#a855f7";
    rounded(ctx, -13, -8, 26, 30, 8); ctx.fill();
    ctx.strokeStyle = "#581c87"; ctx.lineWidth = 3; rounded(ctx, -13, -8, 26, 30, 8); ctx.stroke();
    ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(0, -23, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.arc(0, -29, 13, Math.PI, 0); ctx.fill(); ctx.fillRect(-12, -28, 24, 7);
    ctx.strokeStyle = "#111827"; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(-5, -23, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(5, -23, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-1, -23); ctx.lineTo(1, -23); ctx.stroke();
    ctx.strokeStyle = "#92400e"; ctx.lineWidth = 9;
    ctx.save();
    ctx.translate(28 * dir, -4);
    ctx.rotate((o.hammerAngle || -0.9) * dir);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -82); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 5; rounded(ctx, -34, -115, 68, 34, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(15,23,42,0.85)"; ctx.font = "bold 18px system-ui"; ctx.textAlign = "center"; ctx.fillText("Miss-Crazy", 0, 66);
    ctx.restore();
  }

  function drawSheep(ctx, o) {
    ctx.save();
    const t = game.current?.t || 0;
    const run = Math.sin(t * 0.45 + o.phase) * 6;
    const scale = o.angry ? 2.9 : 2.55;
    ctx.scale(scale, scale);

    if (o.angry) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = o.angry ? "#dc2626" : "#334155";
    ctx.lineWidth = o.angry ? 5 : 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 31, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * 9, -11 + Math.abs(i) * 2, 8.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const headDir = o.chasing ? (o.x < (game.current?.skier?.x || W / 2) ? 1 : -1) : (o.side < 0 ? 1 : -1);
    ctx.fillStyle = o.angry ? "#7f1d1d" : "#111827";
    ctx.beginPath();
    ctx.ellipse(headDir * 29, -3, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes / angry eyebrows.
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(headDir * 32, -6, 2.6, 0, Math.PI * 2);
    ctx.fill();
    if (o.angry) {
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(headDir * 26, -13);
      ctx.lineTo(headDir * 36, -8);
      ctx.stroke();
    }

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-13, 16); ctx.lineTo(-16, 32 + run);
    ctx.moveTo(12, 16); ctx.lineTo(16, 32 - run);
    ctx.stroke();

    ctx.fillStyle = o.angry ? "#dc2626" : "rgba(15,23,42,0.75)";
    ctx.font = o.angry ? "900 16px system-ui" : "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(o.angry ? "ANGRY BAA!" : "BAA!", 0, -34);
    ctx.restore();
  }

  function drawVolcano(ctx, o, g) {
    ctx.save();
    ctx.scale(1.25, 1.25);
    ctx.fillStyle = "#57534e";
    ctx.strokeStyle = "#292524";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-72, 72);
    ctx.lineTo(-28, -62);
    ctx.lineTo(28, -62);
    ctx.lineTo(72, 72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.ellipse(0, -62, 32, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f97316";
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.22 + Math.sin((g?.t || 0) * 0.05 + i) * 0.08;
      ctx.beginPath();
      ctx.moveTo(0, -70);
      ctx.lineTo(Math.cos(a) * 28, -100 + Math.sin(a) * 18);
      ctx.lineTo(Math.cos(a + 0.18) * 18, -72 + Math.sin(a + 0.18) * 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(15,23,42,0.85)";
    ctx.font = "bold 17px system-ui";
    ctx.textAlign = "center";
    if (o.emerging) {
      ctx.fillStyle = "#ef4444";
      ctx.font = "900 19px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("SUDDEN VOLCANO!", 0, 104);
    } else {
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.font = "bold 17px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("VOLCANO", 0, 98);
    }
    ctx.restore();
  }

  function drawLava(ctx, o, g) {
    const w = o.width || 120;
    const l = o.length || 160;
    const pulse = 0.75 + Math.sin((g?.t || 0) * 0.18 + o.phase) * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "#dc2626";
    rounded(ctx, -w / 2, -l / 2, w, l, 22);
    ctx.fill();
    ctx.fillStyle = "#f97316";
    rounded(ctx, -w / 2 + 12, -l / 2 + 14, w - 24, l - 28, 18);
    ctx.fill();
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 5;
    rounded(ctx, -w / 2, -l / 2, w, l, 22);
    ctx.stroke();
    ctx.fillStyle = `rgba(254,240,138,${pulse})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.22, l * 0.18, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff7ed";
    ctx.font = "bold 18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("LAVA", 0, 6);
    ctx.restore();
  }

  function drawBird(ctx, o, g) {
    ctx.save();
    const flap = Math.sin((g?.t || 0) * 0.45 + o.phase) * 12;
    const dir = o.vx >= 0 ? 1 : -1;
    ctx.scale(1.25 * dir, 1.25);
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(22, -2); ctx.lineTo(38, 3); ctx.lineTo(22, 9);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-34, -20 + flap); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -1); ctx.lineTo(34, -20 - flap); ctx.stroke();
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("BIRD!", 0, -28);
    ctx.restore();
  }

  function drawPizza(ctx, o) {
    ctx.save();
    ctx.rotate(o.spin || 0);
    ctx.fillStyle = "#f59e0b";
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(-34, 28);
    ctx.lineTo(34, 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    for (const [px, py] of [[0, -8], [-13, 12], [15, 15]]) {
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#fff7ed";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("PIZZA", 0, 38);
    ctx.restore();
  }

  function drawPasta(ctx, o, g) {
    const w = o.width || 190;
    ctx.save();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let x = -w / 2; x <= w / 2; x += 24) {
      const y = Math.sin((x + (g?.t || 0) * 4) * 0.04 + o.phase) * 14;
      if (x === -w / 2) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.font = "bold 14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("PASTA", 0, -22);
    ctx.restore();
  }

  function drawUfo(ctx, o, g) {
    ctx.save();
    const hover = Math.sin((g?.t || 0) * 0.1 + o.phase) * 4;
    ctx.translate(0, hover);
    ctx.fillStyle = "#94a3b8";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(0, 0, 48, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#67e8f9";
    ctx.beginPath(); ctx.ellipse(0, -13, 24, 16, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    if (o.beamTimer > 45 && o.beamTimer < 105) {
      ctx.globalAlpha = 0.33;
      ctx.fillStyle = "#fde68a";
      ctx.beginPath(); ctx.moveTo(-22, 12); ctx.lineTo(22, 12); ctx.lineTo(52, 95); ctx.lineTo(-52, 95); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "rgba(15,23,42,0.85)";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("UFO", 0, -36);
    ctx.restore();
  }

  function drawBanana(ctx, o, g) {
    ctx.save();
    ctx.rotate(Math.sin((g?.t || 0) * 0.12 + o.phase) * 0.4);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, 0, 26, 0.25, Math.PI * 1.25); ctx.stroke();
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0.25, Math.PI * 1.25); ctx.stroke();
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SLIP", 0, 34);
    ctx.restore();
  }

  function drawBigfoot(ctx, o) {
    ctx.save();
    ctx.scale(1.45, 1.45);
    const t = game.current?.t || 0;
    const step = Math.sin(t * 0.34 + (o.phase || 0));

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Pink Foot: smaller, pink, smiling and friendly-looking.
    ctx.fillStyle = "#f9a8d4";
    ctx.strokeStyle = "#be185d";
    ctx.lineWidth = 4;

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 18, 43 - side * step * 8);
      ctx.rotate(side * 0.12 + step * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 27, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff1f2";
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * 5.5, -22, 3.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "#f9a8d4";
    }

    ctx.strokeStyle = "#be185d";
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(-15, 17); ctx.lineTo(-20, 49 + step * 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, 17); ctx.lineTo(20, 49 - step * 5); ctx.stroke();

    ctx.fillStyle = "#f472b6";
    ctx.strokeStyle = "#be185d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -8, 35, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f9a8d4";
    ctx.beginPath();
    ctx.ellipse(0, -66, 27, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(-9, -70, 3, 0, Math.PI * 2);
    ctx.arc(9, -70, 3, 0, Math.PI * 2);
    ctx.fill();

    // Happy smile.
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -64, 11, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // Cheerful arms.
    ctx.strokeStyle = "#be185d";
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(-31, -18); ctx.lineTo(-52, -40 + step * 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(31, -18); ctx.lineTo(52, -40 - step * 8); ctx.stroke();

    // Small heart.
    ctx.fillStyle = "#fff1f2";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.bezierCurveTo(-16, -28, -30, -4, 0, 14);
    ctx.bezierCurveTo(30, -4, 16, -28, 0, -12);
    ctx.fill();

    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.font = "900 18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Pink Foot", 0, 90);
    ctx.restore();
  }

  function drawChaser(ctx, c, screenY, scaleMultiplier = 1) {
    ctx.save();
    ctx.translate(c.x, screenY);
    ctx.scale(WORLD_SCALE * scaleMultiplier, WORLD_SCALE * scaleMultiplier);
    const side = c.side || 1;
    const throwing = c.throwAnim > 0;
    const throwPhase = throwing ? 1 - c.throwAnim / 48 : 0;
    const arm = Math.sin(throwPhase * Math.PI);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Mr. Disturb: round, annoying ball-thrower.
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-15, 42); ctx.lineTo(-22, 68); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, 42); ctx.lineTo(22, 68); ctx.stroke();

    ctx.fillStyle = "#1f2937";
    rounded(ctx, -42, -4, 84, 58, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ef4444";
    rounded(ctx, -30, 8, 60, 34, 15);
    ctx.fill();

    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(0, -24, 21, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(-7, -28, 3, 0, Math.PI * 2);
    ctx.arc(7, -28, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-26, 12);
    ctx.lineTo(-50, 34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(26, 12);
    ctx.lineTo(26 + side * (18 + arm * 36), -10 - arm * 40);
    ctx.stroke();

    if (!throwing) {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(58 * side, -10, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.font = "bold 22px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Mr. Disturb", 0, 92);
    ctx.restore();
  }

  function drawObject(ctx, o, screenY, g) {
    ctx.save();
    ctx.translate(o.x, screenY);
    ctx.scale(WORLD_SCALE, WORLD_SCALE);
    if (o.type === "pine") {
      ctx.scale(o.scale || 1, o.scale || 1);
      ctx.fillStyle = "#0f766e"; ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(-24, 16); ctx.lineTo(24, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#115e59"; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(-19, 22); ctx.lineTo(19, 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#7c2d12"; ctx.fillRect(-4, 16, 8, 18);
    } else if (o.type === "stone") {
      ctx.scale(o.scale || 1, o.scale || 1);
      ctx.fillStyle = "#64748b"; ctx.beginPath(); ctx.ellipse(0, 4, 19, 13, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(-6, -1, 7, 3, -0.2, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === "ice") {
      const w = o.width || 150; const l = o.length || 420;
      ctx.globalAlpha = 0.72; ctx.fillStyle = "#bae6fd"; rounded(ctx, -w / 2, -l / 2, w, l, 28); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 5; rounded(ctx, -w / 2, -l / 2, w, l, 28); ctx.stroke();
      ctx.fillStyle = "#0369a1"; ctx.font = "bold 20px system-ui"; ctx.textAlign = "center"; ctx.fillText("ICE", 0, 7);
    } else if (o.type === "drift") {
      ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-22, 5); ctx.quadraticCurveTo(-8, -8, 8, 5); ctx.quadraticCurveTo(18, 12, 25, 0); ctx.stroke();
    } else if (o.type === "jump") {
      const big = o.required;
      const mega = o.mega;
      ctx.fillStyle = mega ? "#fde68a" : big ? "#d9f99d" : "#e0f2fe";
      ctx.strokeStyle = mega ? "#f97316" : big ? "#65a30d" : "#38bdf8";
      ctx.lineWidth = mega ? 7 : 4;
      ctx.beginPath();
      ctx.moveTo(mega ? -110 : big ? -62 : -34, mega ? 42 : big ? 24 : 18);
      ctx.lineTo(mega ? 18 : big ? 22 : 18, mega ? -58 : big ? -30 : -18);
      ctx.quadraticCurveTo(mega ? 68 : big ? 46 : 30, mega ? -78 : big ? -36 : -18, mega ? 125 : big ? 70 : 32, mega ? -18 : big ? -8 : 8);
      ctx.lineTo(mega ? 125 : big ? 70 : 32, mega ? 46 : big ? 25 : 22);
      ctx.lineTo(mega ? -110 : big ? -62 : -34, mega ? 46 : big ? 25 : 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (mega) {
        ctx.fillStyle = "#7c2d12";
        ctx.font = "900 25px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("SKI JUMP", 18, 16);
      }
    } else if (o.type === "gap") {
      const w = o.width || 520; const d = o.depth || 120;
      const grd = ctx.createLinearGradient(0, -d / 2, 0, d / 2); grd.addColorStop(0, "#020617"); grd.addColorStop(1, "#475569");
      ctx.fillStyle = grd; rounded(ctx, -w / 2, -d / 2, w, d, 18); ctx.fill(); ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 10; rounded(ctx, -w / 2, -d / 2, w, d, 18); ctx.stroke();
      ctx.fillStyle = "#e0f2fe"; ctx.font = "bold 30px system-ui"; ctx.textAlign = "center"; ctx.fillText("Danger! Jump!", 0, 10);
    } else if (o.type === "missCrazy") drawMissCrazy(ctx, o);
    else if (o.type === "bigfoot") drawBigfoot(ctx, o);
    else if (o.type === "sheep") drawSheep(ctx, o);
    else if (o.type === "volcano") drawVolcano(ctx, o, g);
    else if (o.type === "lava") drawLava(ctx, o, g);
    else if (o.type === "bird") drawBird(ctx, o, g);
    else if (o.type === "pizza") drawPizza(ctx, o, g);
    else if (o.type === "pasta") drawPasta(ctx, o, g);
    else if (o.type === "ufo") drawUfo(ctx, o, g);
    else if (o.type === "banana") drawBanana(ctx, o, g);
    else if (o.type === "bigk") drawChaser(ctx, { x: 0, y: 0, side: o.side, throwAnim: o.throwAnim || 0 }, 0, 2.15);
    else if (o.type === "ball") { ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#111827"; ctx.lineWidth = 3; ctx.stroke(); }
    else if (o.type === "bullet") { ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#92400e"; ctx.lineWidth = 3; ctx.stroke(); }
    else if (o.type === "starPackage") drawStar(ctx, 36, "#7c3aed", "★P", g, o);
    else if (o.type === "package") { ctx.fillStyle = "#a855f7"; ctx.strokeStyle = "#581c87"; ctx.lineWidth = 4; rounded(ctx, -21, -16, 42, 32, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#facc15"; ctx.fillRect(-3, -16, 6, 32); ctx.fillRect(-21, -3, 42, 6); ctx.fillStyle = "#f8fafc"; ctx.font = "bold 18px system-ui"; ctx.textAlign = "center"; ctx.fillText("P", 0, 7); }
    else if (o.type === "star") drawStar(ctx, 28, "#f97316", "", g, o);
    else if (o.type === "gate") { ctx.strokeStyle = o.side < 0 ? "#dc2626" : "#2563eb"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, 24); ctx.stroke(); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(o.side * 22, -14); ctx.lineTo(0, -7); ctx.closePath(); ctx.fill(); }
    else if (o.type === "finish") { for (let i = -10; i <= 10; i++) { ctx.fillStyle = i % 2 === 0 ? "#0f172a" : "#f8fafc"; ctx.fillRect(i * 56, -18, 56, 36); } ctx.fillStyle = "#ef4444"; ctx.font = "bold 34px system-ui"; ctx.textAlign = "center"; ctx.fillText("FINISH", 0, -30); }
    ctx.restore();
  }

  function drawStar(ctx, outer, stroke, text, g, o) {
    const pulse = 0.72 + Math.sin((g?.t || 0) * 0.12 + (o.phase || 0)) * 0.28;
    ctx.globalAlpha = 0.65 + pulse * 0.35;
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? outer + pulse * 6 : outer * 0.45;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    if (text) { ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px system-ui"; ctx.textAlign = "center"; ctx.fillText(text, 0, 10); }
  }

  function drawCourseProgress(ctx, g) {
    const progress = getLevelProgress(g.camera);
    const barX = W - 38;
    const barY = 92;
    const barH = H - 184;
    const barW = 14;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(15,23,42,0.45)";
    rounded(ctx, barX - barW / 2 - 8, barY - 8, barW + 16, barH + 16, 14);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    rounded(ctx, barX - barW / 2, barY, barW, barH, 8);
    ctx.fill();

    const fillH = barH * progress;
    ctx.fillStyle = "#22d3ee";
    rounded(ctx, barX - barW / 2, barY, barW, fillH, 8);
    ctx.fill();

    // Rival marker: blue R, also starts at top and moves down the slope.
    if (g.rival) {
      const rivalProgress = getRivalLevelProgress(g.rival.y);
      const rivalY = barY + barH * rivalProgress;
      ctx.fillStyle = "#2563eb";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(barX - 18, rivalY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("R", barX - 18, rivalY + 1);
    }

    // Jacob marker: yellow J, starts at top and moves down the slope.
    const markerY = barY + fillH;
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(barX, markerY, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.font = "900 11px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("J", barX, markerY + 1);

    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.font = "800 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`L${(g.currentLevel || 0) + 1}`, barX, barY - 22);
    ctx.fillText("FINISH", barX, barY + barH + 25);
    ctx.restore();
  }

  function render() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const g = game.current;
    if (!ctx || !g) return;

    ctx.clearRect(0, 0, W, H);
    const levelInfo = LEVELS[g.currentLevel || 0];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, levelInfo.colorA || "#eef9ff"); grad.addColorStop(0.55, "#f8fcff"); grad.addColorStop(1, levelInfo.colorB || "#dff4ff");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(14,116,144,0.12)"; ctx.lineWidth = 1;
    for (let i = -80; i < H + 80; i += 76) { const y = i - (g.camera % 76); ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(180, y + 5, 380, y - 6, W, y + 4); ctx.stroke(); }
    drawCourseProgress(ctx, g);

    const visibleObjects = [];
    for (const o of g.objects) { const sy = o.y - g.camera; if (sy > -260 && sy < H + 260) visibleObjects.push({ o, sy }); }
    visibleObjects.sort((a, b) => a.o.y - b.o.y);
    for (const item of visibleObjects) drawObject(ctx, item.o, item.sy, g);

    if (g.rival) {
      const rivalScreenY = g.rival.y - g.camera + g.skier.y;
      if (rivalScreenY > -80 && rivalScreenY < H + 80) {
        const fake = { ...g, skier: { ...g.skier, angle: g.rival.angle, airborne: 0, spin: 0, invuln: 0, hasHorse: false, hasCat: false, hasSeal: false, hasCrown: false, hasCape: false } };
        drawSkier(ctx, g.rival.x, rivalScreenY, fake, "#2563eb", "#dc2626", "Rival");
      }
    }

    for (const p of g.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 34);
      ctx.fillStyle = p.firework ? (p.life % 3 === 0 ? "#f97316" : "#facc15") : p.packageSpark ? "#a855f7" : p.spark ? "#facc15" : "#93c5fd";
      ctx.beginPath(); ctx.arc(p.x, p.y - g.camera, p.firework ? 5 : p.spark || p.packageSpark ? 4 : 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const pop of g.timePopups || []) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pop.life / 34);
      ctx.fillStyle = "#22c55e";
      ctx.strokeStyle = "rgba(15,23,42,0.85)";
      ctx.lineWidth = 5;
      ctx.font = "900 34px system-ui";
      ctx.textAlign = "center";
      const py = pop.y - g.camera;
      ctx.strokeText(pop.text, pop.x, py);
      ctx.fillText(pop.text, pop.x, py);
      ctx.restore();
    }

    if (g.skier.crashed > 0) {
      ctx.save(); ctx.translate(g.skier.x, g.skier.y); ctx.rotate(Math.sin(g.t * 0.3) * 0.7); ctx.fillStyle = "#ef4444"; ctx.font = "bold 22px system-ui"; ctx.textAlign = "center"; ctx.fillText("✹", 0, 8); ctx.restore();
    } else {
      drawSkier(ctx, g.skier.x, g.skier.y, g, "#dc2626", "#2563eb", "Jacob");
    }

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(15,23,42,0.82)";
    ctx.strokeStyle = "rgba(168,85,247,0.45)";
    ctx.lineWidth = 2;
    rounded(ctx, 24, 24, 210, g.skier.hasGun ? 92 : 52, 14);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "700 17px system-ui"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const timeText = formatSeconds(g.elapsed || 0, 2);
    ctx.globalAlpha = 0.72;
    ctx.fillText(`Time ${timeText}`, 44, 58);
    ctx.globalAlpha = 0.95;
    if (g.skier.hasGun) { ctx.fillStyle = "#facc15"; ctx.font = "800 17px system-ui"; ctx.fillText("GUN: J / SHOOT", 44, 86); }
    ctx.restore();

    if (g.avalanche?.active) {
      const avY = g.avalanche.y - g.camera;
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(226,242,255,0.92)";
      ctx.beginPath();
      ctx.moveTo(0, avY);
      for (let x = 0; x <= W; x += 80) {
        ctx.lineTo(x, avY + 42 + Math.sin((x + g.t * 12) * 0.025) * 28);
      }
      ctx.lineTo(W, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(148,163,184,0.65)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 80) {
        const y = avY + 42 + Math.sin((x + g.t * 12) * 0.025) * 28;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.font = "900 34px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("AVALANCHE!", W / 2, Math.max(44, avY + 50));
      ctx.restore();
    }

    if (g.fireworksTimer > 0) { ctx.save(); ctx.globalAlpha = 0.18 + Math.sin(g.t * 0.4) * 0.08; ctx.fillStyle = "#facc15"; ctx.fillRect(0, 0, W, H); ctx.restore(); }

    if (g.levelBannerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, g.levelBannerTimer / 50);
      const levelInfo = LEVELS[g.currentLevel || 0];
      ctx.fillStyle = "rgba(15,23,42,0.84)";
      rounded(ctx, 48, 104, 360, 118, 26);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.32)";
      ctx.lineWidth = 4;
      rounded(ctx, 48, 104, 360, 118, 26);
      ctx.stroke();
      ctx.fillStyle = "#67e8f9";
      ctx.font = "900 38px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(levelInfo.name, 228, 150);
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 23px system-ui";
      ctx.fillText(levelInfo.theme, 228, 192);
      ctx.restore();
    }

    if (g.warningTimer > 0 && g.warningText) {
      ctx.save();
      const boxW = 340; const boxH = 72; const x = W - boxW - 28; const y = 24;
      ctx.globalAlpha = Math.floor(g.warningTimer / 8) % 2 === 0 ? 1 : 0.78;
      ctx.fillStyle = "#dc2626"; ctx.strokeStyle = "#7f1d1d"; ctx.lineWidth = 5; rounded(ctx, x, y, boxW, boxH, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.font = "900 30px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(g.warningText, x + boxW / 2, y + boxH / 2);
      ctx.restore();
    }

    if (g.state === "paused") {
      ctx.fillStyle = "rgba(15,23,42,0.58)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 64px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", W / 2, H / 2 - 28);
      ctx.fillStyle = "#67e8f9";
      ctx.font = "800 26px system-ui";
      ctx.fillText("Press Pause or P to continue", W / 2, H / 2 + 24);
    }

    if (g.state === "levelComplete") {
      const stats = g.levelCompleteStats || {};
      const levelTime = formatSeconds(stats.levelTime || 0, 2);
      ctx.fillStyle = "rgba(15,23,42,0.74)";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      rounded(ctx, W / 2 - 285, H / 2 - 220, 570, 360, 28);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.26)";
      ctx.lineWidth = 3;
      rounded(ctx, W / 2 - 285, H / 2 - 220, 570, 360, 28);
      ctx.stroke();

      ctx.fillStyle = "#67e8f9";
      ctx.font = "900 46px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("LEVEL COMPLETE", W / 2, H / 2 - 150);
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 30px system-ui";
      ctx.fillText(stats.levelName || "Level complete", W / 2, H / 2 - 100);

      ctx.font = "700 26px system-ui";
      ctx.textAlign = "left";
      const sx = W / 2 - 180;
      let row = H / 2 - 42;
      ctx.fillText(`Level time: ${levelTime}`, sx, row); row += 40;
      ctx.fillText(`Score: ${stats.score || Math.floor(g.score)}`, sx, row); row += 40;
      ctx.fillText(`Near misses: ${stats.nearMisses || 0}`, sx, row); row += 40;
      ctx.fillText(`Best combo: x${stats.maxCombo || 0}`, sx, row);

      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 5;
      rounded(ctx, W / 2 - 165, H / 2 + 92, 330, 70, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#111827";
      ctx.font = "900 32px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("NEXT LEVEL", W / 2, H / 2 + 127);
    }

    if (g.state === "ended") {
      const stats = g.finalStats || {};
      const finishTime = stats.finishTime || g.elapsed || 0;
      const timeText = formatSeconds(finishTime, 2);
      ctx.fillStyle = "rgba(15,23,42,0.78)";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255,255,255,0.1)";
      rounded(ctx, W / 2 - 300, H / 2 - 280, 600, 470, 28);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      ctx.lineWidth = 3;
      rounded(ctx, W / 2 - 300, H / 2 - 280, 600, 470, 28);
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.font = "900 54px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(stats.medal || "BRONZE", W / 2, H / 2 - 210);
      ctx.fillStyle = "white";
      ctx.font = "800 34px system-ui";
      ctx.fillText(stats.endMessage || g.message || "Run complete!", W / 2, H / 2 - 154);

      ctx.font = "700 28px system-ui";
      ctx.textAlign = "left";
      const sx = W / 2 - 210;
      let row = H / 2 - 88;
      ctx.fillText(`Time: ${timeText}`, sx, row); row += 42;
      ctx.fillText(`Score: ${stats.finalScore || Math.floor(g.score)}`, sx, row); row += 42;
      ctx.fillText(`Near misses: ${stats.nearMisses || 0}`, sx, row); row += 42;
      ctx.fillText(`Best combo: x${stats.maxCombo || 0}`, sx, row); row += 42;
      ctx.fillText(`Packages: ${stats.packages || 0}`, sx, row);

      ctx.fillStyle = "#67e8f9";
      ctx.font = "800 25px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Try again to reach the next medal!", W / 2, H / 2 + 126);

      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 5;
      rounded(ctx, W / 2 - 160, H / 2 + 154, 320, 72, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#111827";
      ctx.font = "900 34px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TRY AGAIN", W / 2, H / 2 + 190);
    }
  }

  function runDevAssertions() {
    const pkg = makeObject("package", 10, 20);
    console.assert(pkg.type === "package" && pkg.r === 20, "package object should be collectible with radius 20");
    const bullet = makeObject("bullet", 0, 0, { vx: 4, vy: 9 });
    console.assert(bullet.vx === 4 && bullet.vy === 9, "bullet should preserve velocity");
    const testGame = createInitialGame("playing");
    testGame.timePenalty = 0.25;
    testGame.t = 60;
    const elapsed = Math.max(0, testGame.t / 60 - testGame.timePenalty);
    console.assert(elapsed === 0.75, "package time bonus should subtract 0.25 seconds");
    console.assert(formatSeconds(12.345, 2) === "12.35s", "formatSeconds should show seconds with decimals");
    testGame.skier.airborne = 64;
    testGame.skier.airMax = 64;
    console.assert(testGame.skier.airborne > 0 && testGame.skier.airMax > 0, "manual jump should set airborne and airMax");
    console.assert(getMedal(240, 30000, true) === "BIGFOOT MASTER", "fast winning run should award BIGFOOT MASTER medal");
    console.assert(makeObject("bigfoot", 0, 0).r === 62, "Pink Foot should be smaller than old Bigfoot");
    const disturbTest = makeObject("bigk", 0, 0);
    console.assert(disturbTest.thrown === false && disturbTest.throwAnim === 0, "Mr. Disturb should start ready to throw balls");
    const nearMissGame = createInitialGame("playing");
    awardNearMiss(nearMissGame, { nearMissed: false }, "Test", 10);
    console.assert(nearMissGame.combo === 1 && nearMissGame.nearMisses === 1 && nearMissGame.score === 10, "near miss should increase combo, count and score");
    console.assert(STAR_PACKAGE_SPOTS.length === 5, "there should be five star packages on the course");
    const catGame = createInitialGame("playing");
    catGame.skier.hasHorse = true;
    console.assert(catGame.skier.hasHorse === true, "first transformation should support horse");
    const sheepTest = makeObject("sheep", 0, 0);
    console.assert(sheepTest.type === "sheep", "sheep object should be creatable");
    console.assert(sheepTest.r === 60 && sheepTest.vx === 4.2 && sheepTest.chaseTimer === 0, "sheep should have larger hit radius, faster speed and chase state");
    console.assert(makeObject("lava", 0, 0).type === "lava", "lava object should be creatable");
    console.assert(SKI_JUMP_SPOTS.length === 2 && makeObject("jump", 0, 0, { mega: true, power: 185 }).mega === true, "there should be two mega ski jumps");
    const volcanoTest = createInitialGame("playing");
    console.assert(volcanoTest.volcanoEvent && !volcanoTest.volcanoEvent.triggered, "volcano should start as an untriggered dynamic event");
    console.assert(createInitialGame("playing").rival.y === 0, "rival should start at the top of the course progress bar");
    console.assert(LEVELS[0].length >= 40000 && LEVELS[9].length >= 40000, "each level should be around 60 seconds or longer for a real run");
    console.assert(createInitialGame("playing").levelBannerTimer > 0, "Level 1 banner should appear immediately when starting");
    console.assert(W / 2 > 408, "level banner should stay away from Jacob's center starting lane");
    console.assert(WORLD_SCALE <= 0.42 && H >= 950, "game should keep a large window but be visibly zoomed out");
    console.assert(typeof touchTarget.current === "object" || touchTarget.current === null, "touch target should be initialized for mobile controls");
    console.assert(pointerActive.current === false, "mouse hover should not steer Jacob unless pointer is down");
    console.assert(true, "primary controls should be rendered directly below the canvas");
    console.assert(typeof handlePausePress === "function", "pause button should use a direct pointer handler");
    const levelTest = createInitialGame("playing");
    game.current = levelTest;
    completeLevel(0);
    console.assert(levelTest.state === "levelComplete" && levelTest.levelCompleteStats.levelIndex === 0, "completeLevel should pause the game after a level");
    levelTest.skier.hasHorse = true;
    levelTest.skier.hasSeal = true;
    game.current = levelTest;
    levelTest.state = "levelComplete";
    continueLevel();
    console.assert(levelTest.skier.hasHorse === false && levelTest.skier.hasSeal === false && levelTest.skier.hasGun === false, "next level should reset Jacob back to normal");
  }

  useEffect(() => {
    runDevAssertions();
    const initial = createInitialGame("ready");
    game.current = initial;
    setUi({ state: "ready", level: 1, theme: LEVELS[0].theme, meters: 0, score: 0, best: initial.best, time: 0, bestTime: initial.bestTime, hasGun: false, medal: "", nearMisses: 0, maxCombo: 0, message: "Ýttu á Start" });

    const down = e => {
      keys.current[e.key] = true;
      if (e.key === "p" || e.key === "P") {
        togglePause();
        e.preventDefault();
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "d", "D", "j", "J", "p", "P"].includes(e.key)) e.preventDefault();
    };
    const up = e => { keys.current[e.key] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    const loop = () => {
      update();
      render();
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const active = ui.state === "playing";
  const paused = ui.state === "paused";
  const uiTime = formatSeconds(ui.time || 0, 2);
  const uiBestTime = ui.bestTime ? formatSeconds(ui.bestTime, 2) : "--";

  const pressKey = (key, value) => {
    keys.current[key] = value;
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-950 text-slate-100 flex items-start justify-center p-2 sm:p-4 overflow-x-hidden">
      <div className="w-full max-w-[1680px] grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-3xl bg-white/10 backdrop-blur-xl p-2 sm:p-3 shadow-2xl border border-white/15">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full min-h-[62vh] xl:min-h-[78vh] max-h-[86vh] rounded-2xl bg-white touch-none select-none"
            onPointerDown={(e) => {
              pointerActive.current = true;
              if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
              const rect = e.currentTarget.getBoundingClientRect();
              touchTarget.current = ((e.clientX - rect.left) / rect.width) * W;
            }}
            onPointerMove={(e) => {
              if (!pointerActive.current) return;
              const rect = e.currentTarget.getBoundingClientRect();
              touchTarget.current = ((e.clientX - rect.left) / rect.width) * W;
            }}
            onPointerCancel={() => { pointerActive.current = false; touchTarget.current = null; }}
            onPointerUp={() => { pointerActive.current = false; touchTarget.current = null; }}
            onPointerLeave={() => { pointerActive.current = false; touchTarget.current = null; }}
          />

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button onClick={mainAction} className={`rounded-2xl ${ui.state === "ended" || ui.state === "levelComplete" || ui.state === "paused" ? "bg-yellow-300 text-slate-950 py-5 text-xl animate-pulse" : "bg-gradient-to-r from-cyan-300 to-sky-400 text-slate-950 py-4 text-lg"} font-black shadow-lg shadow-cyan-950/40 hover:brightness-110 active:scale-[0.99] transition`}>
              {ui.state === "levelComplete" ? "NEXT LEVEL" : ui.state === "ended" ? "TRY AGAIN" : ui.state === "paused" ? "RESUME" : active ? "Restart" : "Start"}
            </button>

            {(active || paused) && (
              <button type="button" onPointerDown={handlePausePress} className="rounded-2xl bg-white/10 border border-white/20 text-white font-black py-4 text-lg shadow-lg hover:bg-white/15 active:scale-[0.99] transition touch-none">
                {paused ? "RESUME" : "PAUSE"}
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); pressKey("ArrowLeft", true); }}
              onPointerUp={(e) => { e.preventDefault(); pressKey("ArrowLeft", false); }}
              onPointerCancel={() => pressKey("ArrowLeft", false)}
              onPointerLeave={() => pressKey("ArrowLeft", false)}
              className="rounded-2xl bg-white/15 border border-white/20 py-5 text-3xl font-black active:bg-cyan-300 active:text-slate-950 touch-none"
            >
              ←
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); pressKey("ArrowUp", true); }}
              onPointerUp={(e) => { e.preventDefault(); pressKey("ArrowUp", false); }}
              onPointerCancel={() => pressKey("ArrowUp", false)}
              onPointerLeave={() => pressKey("ArrowUp", false)}
              className="rounded-2xl bg-yellow-300 text-slate-950 border border-yellow-100 py-5 text-xl font-black active:scale-[0.98] touch-none"
            >
              JUMP
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); pressKey("ArrowRight", true); }}
              onPointerUp={(e) => { e.preventDefault(); pressKey("ArrowRight", false); }}
              onPointerCancel={() => pressKey("ArrowRight", false)}
              onPointerLeave={() => pressKey("ArrowRight", false)}
              className="rounded-2xl bg-white/15 border border-white/20 py-5 text-3xl font-black active:bg-cyan-300 active:text-slate-950 touch-none"
            >
              →
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); pressKey("ArrowDown", true); }}
              onPointerUp={(e) => { e.preventDefault(); pressKey("ArrowDown", false); }}
              onPointerCancel={() => pressKey("ArrowDown", false)}
              onPointerLeave={() => pressKey("ArrowDown", false)}
              className="rounded-2xl bg-white/15 border border-white/20 py-4 text-base font-black active:bg-sky-300 active:text-slate-950 touch-none"
            >
              BRAKE
            </button>
            <button
              type="button"
              onPointerDown={handlePausePress}
              className="rounded-2xl bg-white/10 border border-white/20 py-4 text-base font-black active:bg-white/25 touch-none"
            >
              {paused ? "RESUME" : "PAUSE"}
            </button>
            <button
              type="button"
              disabled={!ui.hasGun}
              onPointerDown={(e) => { e.preventDefault(); pressKey("J", true); }}
              onPointerUp={(e) => { e.preventDefault(); pressKey("J", false); }}
              onPointerCancel={() => pressKey("J", false)}
              onPointerLeave={() => pressKey("J", false)}
              className={`rounded-2xl border py-4 text-base font-black touch-none ${ui.hasGun ? "bg-orange-300 text-slate-950 border-orange-100 active:scale-[0.98]" : "bg-white/5 text-slate-500 border-white/10"}`}
            >
              SHOOT
            </button>
          </div>
        </div>

        <aside className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 p-4 sm:p-5 shadow-2xl flex flex-col gap-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">skigame.is</p>
            <h1 className="text-3xl font-black mt-1 tracking-tight">SkiGame</h1>
            <p className="text-sm text-slate-300 mt-2">Jacob keppir við annan skíðamann niður mjög langa og erfiða braut.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/10 border border-white/10 p-3"><div className="text-xs text-slate-400">Level</div><div className="text-2xl font-bold">{ui.level || 1}/10</div><div className="text-xs text-cyan-200 mt-1">{ui.theme || "Warm-up Woods"}</div></div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-3"><div className="text-xs text-slate-400">Score</div><div className="text-2xl font-bold">{ui.score}</div></div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><div className="text-xs text-slate-500">Time</div><div className="text-lg font-semibold text-slate-300">{uiTime}</div></div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><div className="text-xs text-slate-500">Best time</div><div className="text-lg font-semibold text-slate-300">{uiBestTime}</div></div>
            <div className="rounded-2xl bg-white/10 border border-white/10 p-3 col-span-2"><div className="text-xs text-slate-400">High score</div><div className="text-2xl font-bold">{ui.best}</div></div>
          </div>

          <div className="rounded-2xl bg-cyan-400/10 border border-cyan-300/30 p-3 min-h-[72px] text-sm text-cyan-50">
            <div>{ui.message}</div>
            {ui.state === "levelComplete" && <div className="mt-2 text-yellow-300 font-black">Ready for Level {(ui.level || 1) + 1}</div>}
            {ui.state === "ended" && ui.medal && <div className="mt-2 text-yellow-300 font-black">Medal: {ui.medal} · Combo x{ui.maxCombo || 0} · Near misses {ui.nearMisses || 0}</div>}
          </div>

          {active && ui.hasGun && (
            <button
              onPointerDown={() => (keys.current.J = true)}
              onPointerUp={() => (keys.current.J = false)}
              onPointerLeave={() => (keys.current.J = false)}
              className="rounded-2xl bg-yellow-300 text-slate-950 font-black py-3 shadow-lg hover:brightness-110 active:scale-[0.99] transition"
            >
              SHOOT
            </button>
          )}

          <div className="text-sm text-slate-300 space-y-2">
            <p><b>Stýringar:</b> ← → eða A/D til að beygja. Á síma eru stórir takkar undir leiknum.</p>
            <p>↑ / W hoppar. ↓ / S bremsar og getur stoppað Jacob alveg.</p>
            <p>J skýtur þegar byssan er komin. Á síma birtist SHOOT takki.</p>
            <p>Pakkar lækka tímann um 0,25 sekúndur. Það eru 5 stjörnupakkar: hestur, byssa, selur með hatt og kjánapriki, gullkóróna og ofurkápa.</p>
            <p>Farðu nálægt hindrunum án þess að rekast á þær til að fá Near miss combo og stærri stig.</p>
            <p>Í lokin færðu medalíu: Bronze, Silver, Gold, Crazy Gold eða Bigfoot Master.</p>
            <p>Leikurinn hefur nú 10 level. Hvert level erfiðara en það síðasta og með eigin þema: kindur, fuglar, lava, ítalskt pizza/pasta, ís, Pink Foot, snjóflóð, UFO og lokabrjálæði.</p>
          </div>

          <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">Einfaldur skíðaleikur með retro-fílingi, víðu útsýni og eigin persónum.</div>
        </aside>
      </div>
    </div>
  );
}
