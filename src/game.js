(function () {
  'use strict';

  var NS = window.NS;
  var pc = window.pc;
  var S = NS.story;
  var UI = NS.UI;
  var Music = NS.Music;

  var params = new URLSearchParams(location.search);
  var debug = params.get('debug');
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var lowEnd = isTouch || Math.min(window.innerWidth, window.innerHeight) < 600;
  var wideScreen = window.innerWidth > 1600;

  var SPEED = 2.2;
  var EYE = 1.65;
  var RADIUS = 0.3;
  var TOTAL = S.clues.length;
  var TRIGGER = (S.landlord && S.landlord.trigger_after) || 5;
  var LANDLORD_LINES = (S.landlord && S.landlord.lines && S.landlord.lines.length) ? S.landlord.lines : [{ who: 'WALT', text: '' }];
  var DEG = Math.PI / 180;
  var PROMPT_D = 1.5;
  var GLINT_D = 3;
  var SHIMMER_D = 6;

  // Real alley. The splat (assets/scene/scene.json) has scale 1.0: 1 scan unit = 1 m.
  // Measured from the decoded splats: floor at scan y 0.675 (placed at world y 0), inner wall faces
  // at world x -1.57 and +1.65, usable scan length z -12 to +12 (world z = -scan z).
  // The green wheelie cart measures 1.10 m tall, which agrees with scale 1.0.
  // Clue n is the normal of the surface it lies on: up (floor), +x, -x, -z.
  var ALLEY = {
    spawn: { x: 0, z: -10, yaw: 180 },
    bounds: { x0: -1.0, x1: 1.0, z0: -12, z1: 12 },
    figure: { x: 0, z: -11 },
    fire: { x: 0, y: 1.6, z: 6 },
    clues: [
      { x: -0.475, y: 0, z: -5.5, n: 'up' },
      { x: 1.325, y: 0, z: -3.4, n: 'up' },
      { x: -1.325, y: 0, z: -1.3, n: 'up' },
      { x: 1.275, y: 0, z: 0.8, n: 'up' },
      { x: -1.325, y: 0, z: 2.9, n: 'up' },
      { x: 1.175, y: 0, z: 5.0, n: 'up' },
      { x: -1.225, y: 0, z: 7.1, n: 'up' },
      { x: 1.025, y: 0, z: 9.2, n: 'up' },
      { x: -1.325, y: 0, z: 11.3, n: 'up' }
    ],
    colliders: []
  };
  var NORMALS = { up: [0, 1, 0], '+x': [1, 0, 0], '-x': [-1, 0, 0], '-z': [0, 0, -1] };
  var PAPER_ROT = { up: [-90, 0, 0], '+x': [0, 90, 0], '-x': [0, -90, 0], '-z': [0, 180, 0] };
  var GLOW_ROT = { up: [0, 0, 0], '+x': [0, 0, -90], '-x': [0, 0, 90], '-z': [-90, 0, 0] };

  // Splat budget and render scale steps. Level 1 is the start for desktop.
  var QL = [
    { budget: 250000, scale: 0.6 },
    { budget: 400000, scale: 1.0 },
    { budget: 800000, scale: 1.0 },
    { budget: 1200000, scale: 1.0 }
  ];
  var PX_CAP = isTouch ? 1.5 : 1.0;
  var QUALITY_AT = [3, 6];

  var colliders = [];
  var app = null;
  var canvas = null;
  var rig = null;
  var cam = null;
  var flash = null;
  var lampLight = null;
  var figure = null;
  var figureActive = false;
  var standIn = [];
  var clueEnts = [];
  var clueMats = [];
  var rainDrops = [];
  var smokeEnts = [];
  var brickTex = null;
  var splatEnt = null;
  var splatReady = false;
  var splatMode = 'none';
  var lampBase = 2.2;
  var figureHold = false;
  var bounds = { x0: -2.7, x1: 2.7, z0: -6, z1: 39.5 };
  var freeCam = null;
  var fpsEl = null;
  var fpsFrames = 0;
  var fpsTime = 0;
  var fpsValue = 0;
  var qLevel = lowEnd ? 0 : 1;
  var qStepsUp = 0;
  var qDone = false;
  var qEval = 0;
  var qTime = -1;
  var qWindow = new Float32Array(1024);
  var qCount = 0;
  var qAcc = 0;
  var qAccN = 0;

  var state = 'boot';
  var found = [];
  var landlordDone = false;
  var flashOn = true;
  var player = { x: 0, z: 3 };
  var yaw = 180;
  var pitch = 0;
  var time = 0;
  var keys = {};
  var joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  var look = { id: null, x: 0, y: 0 };
  var hudKey = '';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function color(r, g, b) { return new pc.Color(r, g, b); }

  function mat(r, g, b, gloss) {
    var m = new pc.StandardMaterial();
    m.diffuse = color(r, g, b);
    m.specular = color(0.08, 0.08, 0.08);
    m.gloss = gloss === undefined ? 0.2 : gloss;
    m.useMetalness = false;
    m.update();
    return m;
  }

  function box(x, y, z, sx, sy, sz, material) {
    var e = new pc.Entity();
    e.addComponent('render', { type: 'box', material: material });
    e.setLocalPosition(x, y, z);
    e.setLocalScale(sx, sy, sz);
    app.root.addChild(e);
    standIn.push(e);
    return e;
  }

  function makeBrick() {
    try {
      var c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      var g = c.getContext('2d');
      g.fillStyle = '#3d2319';
      g.fillRect(0, 0, 256, 256);
      var seed = 7;
      function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      for (var row = 0; row < 8; row++) {
        var off = (row % 2) ? 32 : 0;
        for (var col = -1; col < 4; col++) {
          var v = rnd();
          g.fillStyle = 'rgb(' + Math.round(70 + v * 26) + ',' + Math.round(54 + v * 14) + ',' + Math.round(48 + v * 10) + ')';
          g.fillRect(col * 64 + off + 2, row * 32 + 2, 60, 28);
        }
      }
      var tex = new pc.Texture(app.graphicsDevice, {
        width: 256,
        height: 256,
        format: pc.PIXELFORMAT_RGBA8,
        mipmaps: true,
        addressU: pc.ADDRESS_REPEAT,
        addressV: pc.ADDRESS_REPEAT
      });
      tex.setSource(c);
      return tex;
    } catch (err) {
      return null;
    }
  }

  function wallMat(tx, ty) {
    var m = mat(0.36, 0.2, 0.15, 0.12);
    if (brickTex) {
      m.diffuse = color(0.85, 0.85, 0.85);
      m.diffuseMap = brickTex;
      m.diffuseMapTiling = new pc.Vec2(tx, ty);
      m.update();
    }
    return m;
  }

  function hazeMat() {
    var m = new pc.StandardMaterial();
    m.diffuse = color(0, 0, 0);
    m.emissive = color(0.34, 0.35, 0.38);
    m.opacity = 0.13;
    m.blendType = pc.BLEND_NORMAL;
    m.depthWrite = false;
    m.update();
    return m;
  }

  function smokeMat() {
    var c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    var tex = new pc.Texture(app.graphicsDevice, {
      width: 128,
      height: 128,
      format: pc.PIXELFORMAT_RGBA8,
      mipmaps: false,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });
    tex.setSource(c);
    var m = new pc.StandardMaterial();
    m.diffuse = color(0, 0, 0);
    m.emissive = color(0.34, 0.35, 0.38);
    m.opacity = 0.45;
    m.opacityMap = tex;
    m.opacityMapChannel = 'a';
    m.blendType = pc.BLEND_NORMAL;
    m.depthWrite = false;
    m.update();
    return m;
  }

  // Stand-in alley: only shown if the splat fails to load.
  function buildStandIn() {
    brickTex = makeBrick();
    var dark = mat(0.05, 0.045, 0.04, 0.2);
    var ground = mat(0.07, 0.075, 0.08, 0.75);
    var lampMat = new pc.StandardMaterial();
    lampMat.diffuse = color(0.9, 0.6, 0.25);
    lampMat.emissive = color(1, 0.62, 0.22);
    lampMat.update();

    box(-3.25, 6, 20, 0.5, 12, 40, wallMat(10, 3));
    box(3.25, 6, 20, 0.5, 12, 40, wallMat(10, 3));
    box(0, 6, 40.25, 7, 12, 0.5, wallMat(2, 3));
    box(0, -0.05, 15, 6, 0.1, 80, ground);
    var wins = [4.0, 7.5, 10.5];
    var wz = [6, 12, 18, 24];
    for (var w = 0; w < wins.length; w++) {
      for (var k = 0; k < wz.length; k++) {
        box(-3.0, wins[w], wz[k], 0.04, 1.2, 1.0, dark);
      }
    }
    var head = box(2.2, 4.3, 18, 0.3, 0.12, 0.3, lampMat);
    head.name = 'lamp';

    var lamp = new pc.Entity('lamp-light');
    lamp.addComponent('light', {
      type: 'omni',
      color: color(1, 0.62, 0.25),
      intensity: 2.2,
      range: 16,
      castShadows: false
    });
    lamp.setLocalPosition(2.1, 4.1, 18);
    app.root.addChild(lamp);
    lampLight = lamp;

    var hm = hazeMat();
    var p = new pc.Entity('haze');
    p.addComponent('render', { type: 'plane', material: hm });
    p.setLocalPosition(-1.5, 1.6, 34);
    p.setLocalEulerAngles(-90, 0, 0);
    p.setLocalScale(4, 1, 3);
    app.root.addChild(p);
    smokeEnts.push({ e: p, y: 1.6, s: 0 });
  }

  // Rain: one cheap batch of 120 thin drops, spread along the alley.
  function buildRain() {
    var m = new pc.StandardMaterial();
    m.diffuse = color(0, 0, 0);
    m.emissive = color(0.5, 0.55, 0.62);
    m.opacity = 0.32;
    m.blendType = pc.BLEND_NORMAL;
    m.depthWrite = false;
    m.update();
    for (var i = 0; i < 120; i++) {
      var e = new pc.Entity('drop');
      e.addComponent('render', { type: 'box', material: m });
      e.setLocalScale(0.006, 0.45, 0.006);
      app.root.addChild(e);
      rainDrops.push({
        e: e,
        x: -1.2 + Math.random() * 2.4,
        y: Math.random() * 6,
        z: player.z + (Math.random() * 20 - 4),
        v: 8 + Math.random() * 4
      });
    }
  }

  function radialTex() {
    var c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    var tex = new pc.Texture(app.graphicsDevice, {
      width: 128,
      height: 128,
      format: pc.PIXELFORMAT_RGBA8,
      mipmaps: false,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });
    tex.setSource(c);
    return tex;
  }

  // White paper with faint printed lines. Not emissive. The title is shown on the card only.
  function paperTexture() {
    var c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = '#f2f0ea';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(70,70,66,0.28)';
    g.lineWidth = 2;
    for (var y = 22; y < 124; y += 12) {
      g.beginPath();
      g.moveTo(12, y);
      g.lineTo(y % 24 === 10 ? 84 : 116, y);
      g.stroke();
    }
    var tex = new pc.Texture(app.graphicsDevice, { width: 128, height: 128, format: pc.PIXELFORMAT_RGBA8, mipmaps: true });
    tex.setSource(c);
    return tex;
  }

  // Clue sheet: 0.25 m by 0.18 m. Glow plane is the same size and lies on the paper.
  function placeClue(c, sp) {
    var n = NORMALS[sp.n];
    var r = PAPER_ROT[sp.n];
    var g = GLOW_ROT[sp.n];
    c.x = sp.x; c.y = sp.y; c.z = sp.z;
    c.e.setLocalScale(0.25, 0.18, 0.004);
    c.e.setLocalPosition(sp.x + n[0] * 0.006, sp.y + n[1] * 0.006, sp.z + n[2] * 0.006);
    c.e.setLocalEulerAngles(r[0], r[1], r[2]);
    var gs = sp.n === 'up' ? [0.27, 1, 0.21] : (sp.n === '-z' ? [0.27, 1, 0.2] : [0.2, 1, 0.27]);
    c.glow.setLocalScale(gs[0], gs[1], gs[2]);
    c.glow.setLocalPosition(sp.x + n[0] * 0.012, sp.y + n[1] * 0.012, sp.z + n[2] * 0.012);
    c.glow.setLocalEulerAngles(g[0], g[1], g[2]);
  }

  function buildClues() {
    var paperTex = paperTexture();
    var glowTex = radialTex();
    for (var i = 0; i < TOTAL; i++) {
      var pm = new pc.StandardMaterial();
      pm.diffuse = color(0.95, 0.94, 0.9);
      pm.diffuseMap = paperTex;
      pm.specular = color(0.05, 0.05, 0.05);
      pm.gloss = 0.1;
      pm.useMetalness = false;
      pm.update();
      var gm = new pc.StandardMaterial();
      gm.diffuse = color(0, 0, 0);
      gm.emissive = color(1, 0.96, 0.85);
      gm.opacity = 0;
      gm.opacityMap = glowTex;
      gm.opacityMapChannel = 'a';
      gm.blendType = pc.BLEND_NORMAL;
      gm.depthWrite = false;
      gm.update();
      var paper = new pc.Entity('clue' + i);
      paper.addComponent('render', { type: 'box', material: pm });
      var glow = new pc.Entity('clue-glint' + i);
      glow.addComponent('render', { type: 'plane', material: gm });
      app.root.addChild(paper);
      app.root.addChild(glow);
      var rec = { e: paper, glow: glow, x: 0, y: 0, z: 0 };
      placeClue(rec, ALLEY.clues[i]);
      clueEnts.push(rec);
      clueMats.push({ paper: pm, glow: gm, lastOp: -1, dimmed: false });
      if (debug === 'clues' || params.get('markers')) {
        var mk = new pc.Entity('clue-marker' + i);
        mk.addComponent('render', { type: 'box', material: mat(1, 0, 1, 0.1) });
        mk.setLocalScale(0.04, 3.0, 0.04);
        mk.setLocalPosition(rec.x, rec.y + 1.5, rec.z);
        app.root.addChild(mk);
      }
    }
  }

  function buildFigure() {
    figure = new pc.Entity('landlord');
    var fm = mat(0.14, 0.13, 0.12, 0.1);
    var body = new pc.Entity('body');
    body.addComponent('render', { type: 'cylinder', material: fm });
    body.setLocalScale(0.5, 1.75, 0.5);
    body.setLocalPosition(0, 0.875, 0);
    figure.addChild(body);
    var head = new pc.Entity('head');
    head.addComponent('render', { type: 'sphere', material: fm });
    head.setLocalScale(0.26, 0.26, 0.26);
    head.setLocalPosition(0, 1.9, 0);
    figure.addChild(head);
    var brim = new pc.Entity('brim');
    brim.addComponent('render', { type: 'box', material: fm });
    brim.setLocalScale(0.42, 0.06, 0.42);
    brim.setLocalPosition(0, 2.02, 0);
    figure.addChild(brim);
    figure.setLocalPosition(0.2, 0, 0.3);
    figure.enabled = false;
    app.root.addChild(figure);
  }

  function buildCamera() {
    cam = new pc.Entity('camera');
    cam.addComponent('camera', {
      clearColor: color(0.03, 0.035, 0.04),
      fov: 70,
      nearClip: 0.05,
      farClip: 25
    });
    rig = new pc.Entity('rig');
    rig.addChild(cam);
    app.root.addChild(rig);

    flash = new pc.Entity('flashlight');
    flash.addComponent('light', {
      type: 'spot',
      color: color(1, 0.95, 0.85),
      intensity: 3,
      range: 16,
      innerConeAngle: 12,
      outerConeAngle: 26,
      castShadows: false
    });
    flash.setLocalPosition(0.12, -0.1, 0);
    cam.addChild(flash);
  }

  function setupScene() {
    app.scene.ambientLight = color(0.05, 0.05, 0.07);
    app.scene.fog.type = pc.FOG_LINEAR;
    app.scene.fogColor = color(0.05, 0.06, 0.07);
    app.scene.fogStart = 5;
    app.scene.fogEnd = 42;
    buildStandIn();
    buildRain();
    buildClues();
    buildFigure();
    buildCamera();
  }

  function placeSplat(ent, m) {
    var p = m.position || [0, 0, 0];
    var r = m.rotation || [0, 0, 0];
    var s = m.scale || 1;
    ent.setLocalPosition(p[0], p[1], p[2]);
    ent.setLocalEulerAngles(r[0], r[1], r[2]);
    ent.setLocalScale(s, s, s);
    app.root.addChild(ent);
    splatEnt = ent;
  }

  // Quality: budget and render scale. Canvas pixel ratio is capped at 1 on desktop, 1.5 on touch.
  function scaleFor(level) {
    if (level === 1 && wideScreen) { return 0.75; }
    return QL[level].scale;
  }

  function applyQuality(level) {
    qLevel = level;
    app.scene.gsplat.splatBudget = QL[level].budget;
    app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, PX_CAP) * scaleFor(level);
    app.resizeCanvas();
  }

  function radialMat(r, g, b, op) {
    var m = new pc.StandardMaterial();
    m.diffuse = color(r, g, b);
    m.emissive = color(r, g, b);
    m.opacity = op;
    m.opacityMap = radialTex();
    m.opacityMapChannel = 'a';
    m.blendType = pc.BLEND_NORMAL;
    m.depthWrite = false;
    m.update();
    return m;
  }

  function addFireHaze() {
    // One soft sprite of smoke at the basement end.
    var hm = smokeMat();
    var p = new pc.Entity('haze-fire');
    p.addComponent('render', { type: 'plane', material: hm });
    p.setLocalPosition(ALLEY.fire.x, 0.5, ALLEY.fire.z);
    p.setLocalEulerAngles(-90, 0, 0);
    p.setLocalScale(2.4, 1, 2.4);
    app.root.addChild(p);
  }

  function applyAlleyLayout() {
    var L = ALLEY;
    colliders = L.colliders;
    bounds = L.bounds;
    for (var i = 0; i < clueEnts.length; i++) {
      placeClue(clueEnts[i], L.clues[i]);
    }
    figure.setLocalPosition(L.figure.x, 0, L.figure.z);
    if (lampLight) {
      lampLight.setLocalPosition(L.fire.x, L.fire.y, L.fire.z);
      lampLight.light.color = color(1, 0.55, 0.25);
      lampLight.light.range = 6;
      lampBase = 0.6;
    }
    addFireHaze();
    player.x = L.spawn.x;
    player.z = L.spawn.z;
    yaw = L.spawn.yaw;
    pitch = 0;
    app.scene.fogStart = 8;
    app.scene.fogEnd = 24;
    cam.camera.farClip = 25;
  }

  function hideStandIn() {
    for (var i = 0; i < standIn.length; i++) { standIn[i].enabled = false; }
    for (var s = 0; s < smokeEnts.length; s++) { smokeEnts[s].e.enabled = false; }
    splatReady = true;
    applyAlleyLayout();
  }

  function loadLod(m) {
    var fname = String(m.url).split('?')[0].split('/').pop();
    var asset = new pc.Asset(fname, 'gsplat', { url: m.url, filename: fname });
    asset.on('load', function () {
      var ent = new pc.Entity('splat');
      ent.addComponent('gsplat', { asset: asset, unified: true });
      ent.gsplat.lodBaseDistance = 4;
      ent.gsplat.lodMultiplier = 3;
      ent.gsplat.lodRangeMin = lowEnd ? 1 : 0;
      ent.gsplat.lodRangeMax = 99;
      applyQuality(qLevel);
      placeSplat(ent, m);
      hideStandIn();
    });
    asset.on('error', function (err) {
      console.warn('LOD splat failed. Loading chunk folders.', err);
      loadChunks(m);
    });
    app.assets.add(asset);
    app.assets.load(asset);
  }

  function loadChunks(m) {
    var base = String(m.url).replace(/lod-meta\.json.*$/, '');
    var names = m.chunks || ['0_0', '0_1', '0_2', '0_3', '1_0', '1_1'];
    var root = new pc.Entity('splat');
    var left = names.length;
    var okCount = 0;
    names.forEach(function (n) {
      var asset = new pc.Asset('chunk-' + n, 'gsplat', { url: base + n + '/meta.json', filename: 'meta.json' });
      var done = function () {
        left--;
        if (left === 0) {
          if (okCount > 0) { applyQuality(qLevel); placeSplat(root, m); hideStandIn(); }
          else { console.warn('No chunk loaded. Stand-in alley kept.'); }
        }
      };
      asset.on('load', function () {
        okCount++;
        var c = new pc.Entity('chunk-' + n);
        c.addComponent('gsplat', { asset: asset });
        root.addChild(c);
        done();
      });
      asset.on('error', function () { done(); });
      app.assets.add(asset);
      app.assets.load(asset);
    });
  }

  function loadScene() {
    fetch('assets/scene/scene.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (m) {
        if (!m || !m.url) { return; }
        if (m.format === 'sog-chunks' || params.get('splat') === 'chunks') {
          splatMode = 'chunks';
          loadChunks(m);
        } else {
          splatMode = 'lod';
          loadLod(m);
        }
      })
      .catch(function () {});
  }

  function collide() {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      var minX = c.minX - RADIUS, maxX = c.maxX + RADIUS;
      var minZ = c.minZ - RADIUS, maxZ = c.maxZ + RADIUS;
      if (player.x > minX && player.x < maxX && player.z > minZ && player.z < maxZ) {
        var dl = player.x - minX, dr = maxX - player.x, db = player.z - minZ, dt = maxZ - player.z;
        var m = Math.min(dl, dr, db, dt);
        if (m === dl) { player.x = minX; }
        else if (m === dr) { player.x = maxX; }
        else if (m === db) { player.z = minZ; }
        else { player.z = maxZ; }
      }
    }
    player.x = clamp(player.x, bounds.x0, bounds.x1);
    player.z = clamp(player.z, bounds.z0, bounds.z1);
  }

  function movePlayer(dt) {
    var mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) { my += 1; }
    if (keys.KeyS || keys.ArrowDown) { my -= 1; }
    if (keys.KeyD || keys.ArrowRight) { mx += 1; }
    if (keys.KeyA || keys.ArrowLeft) { mx -= 1; }
    mx += joy.x;
    my += joy.y;
    var len = Math.sqrt(mx * mx + my * my);
    if (len > 1) { mx /= len; my /= len; }
    if (mx === 0 && my === 0) { return; }
    var rad = yaw * DEG;
    var fx = -Math.sin(rad), fz = -Math.cos(rad);
    var rx = Math.cos(rad), rz = -Math.sin(rad);
    player.x += (fx * my + rx * mx) * SPEED * dt;
    player.z += (fz * my + rz * mx) * SPEED * dt;
    collide();
  }

  function nearestClue(maxD) {
    var best = -1, bestD = maxD;
    for (var i = 0; i < clueEnts.length; i++) {
      var dx = clueEnts[i].x - player.x, dz = clueEnts[i].z - player.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d <= bestD) { bestD = d; best = i; }
    }
    return best;
  }

  // Looking at a clue: within prompt distance and inside about 60 degrees of the view direction.
  function facingClue(maxD) {
    var rad = yaw * DEG;
    var fx = -Math.sin(rad), fz = -Math.cos(rad);
    var best = -1, bestD = maxD;
    for (var i = 0; i < clueEnts.length; i++) {
      var dx = clueEnts[i].x - player.x, dz = clueEnts[i].z - player.z;
      var d = Math.sqrt(dx * dx + dz * dz) || 1;
      var dot = (dx * fx + dz * fz) / d;
      if (d <= bestD && dot > 0.5) { bestD = d; best = i; }
    }
    return best;
  }

  function updateGlints() {
    var rad = yaw * DEG, prad = pitch * DEG;
    var fx = -Math.sin(rad) * Math.cos(prad), fy = Math.sin(prad), fz = -Math.cos(rad) * Math.cos(prad);
    for (var i = 0; i < clueEnts.length; i++) {
      var c = clueEnts[i];
      var m = clueMats[i];
      var isFound = found.indexOf(i) >= 0;
      if (isFound) {
        if (!m.dimmed) {
          m.paper.diffuse.set(0.55, 0.54, 0.5);
          m.paper.update();
          m.dimmed = true;
          m.glow.opacity = 0;
          m.glow.update();
          m.lastOp = 0;
        }
        continue;
      }
      var vx = c.x - player.x, vy = c.y - EYE, vz = c.z - player.z;
      var d = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      var dot = (vx * fx + vy * fy + vz * fz) / d;
      var lit = (flashOn && dot > 0.97 && d < GLINT_D) ? 1 : 0;
      // Shimmer: a soft light sweep about every 2.5 s, phase offset per clue.
      var ph = (time + i * 0.37) % 2.5;
      var sweep = ph < 0.6 ? Math.sin(Math.PI * ph / 0.6) : 0;
      var base = d < SHIMMER_D ? 0.02 : 0;
      var op = base + sweep * (0.08 + 0.5 * lit) * (d < SHIMMER_D ? 1 : 0) + lit * 0.12;
      op = clamp(op, 0, 0.65);
      if (Math.abs(op - m.lastOp) > 0.004) {
        m.glow.opacity = op;
        m.glow.update();
        m.lastOp = op;
      }
    }
  }

  function updateFigure(dt) {
    if (!figureActive || landlordDone || state !== 'alley' || figureHold) { return; }
    var dx = player.x - figure.getLocalPosition().x;
    var dz = player.z - figure.getLocalPosition().z;
    var d = Math.sqrt(dx * dx + dz * dz);
    if (d < 4) { startLandlord(); return; }
    var sp = 1.1 * dt / d;
    var p = figure.getLocalPosition();
    figure.setLocalPosition(p.x + dx * sp, 0, p.z + dz * sp);
    figure.setLocalEulerAngles(0, Math.atan2(dx, dz) / DEG, 0);
  }

  function updateRain(dt) {
    var cx = freeCam ? freeCam.x : player.x;
    var cy = freeCam ? freeCam.y : EYE;
    var cz = freeCam ? freeCam.z : player.z;
    for (var i = 0; i < rainDrops.length; i++) {
      var d = rainDrops[i];
      d.y -= d.v * dt;
      if (d.y < 0) {
        d.y = 6 + Math.random() * 3;
        d.x = -1.2 + Math.random() * 2.4;
        d.z = cz + (Math.random() * 20 - 4);
        d.v = 8 + Math.random() * 4;
      }
      d.e.setLocalPosition(d.x, d.y, d.z);
      var rx = d.x - cx, ry = d.y - cy, rz = d.z - cz;
      d.e.enabled = rx * rx + ry * ry + rz * rz > 2.25 && rx * rx + rz * rz < 400;
    }
    for (var s = 0; s < smokeEnts.length; s++) {
      var sm = smokeEnts[s];
      sm.e.setLocalPosition(sm.e.getLocalPosition().x, sm.y + Math.sin(time * 0.3 + sm.s) * 0.25, sm.e.getLocalPosition().z);
    }
    if (lampLight) {
      lampLight.light.intensity = lampBase + 0.15 * lampBase * Math.sin(time * 9) * Math.sin(time * 2.3);
    }
  }

  function updateHud() {
    var pool = document.getElementById('flash-pool');
    if (pool) { pool.hidden = !(state === 'alley' && flashOn); }
    var visible = ['alley', 'card', 'notebook', 'pause', 'dialog'].indexOf(state) >= 0;
    var near = facingClue(PROMPT_D);
    var prompt = '';
    if (state === 'alley') {
      if (found.length >= TOTAL) { prompt = 'All nine cards found.'; }
      else if (figureActive && !landlordDone) { prompt = 'A figure waits at the alley mouth.'; }
      else if (near >= 0 && !isTouch) { prompt = 'Press E to inspect.'; }
    }
    var hint = '';
    if (visible && !isTouch) {
      hint = document.pointerLockElement === canvas
        ? 'WASD move. E inspect. N notebook. F flashlight. Esc pause.'
        : 'Click the view to look around. WASD move. E inspect. N notebook.';
    } else if (visible && isTouch) {
      hint = 'Left side moves. Drag the right side to look.';
    }
    if (state === 'alley' && found.length >= TOTAL && document.pointerLockElement) { unlockPointer(); }
    var inspectable = near >= 0 || (figureActive && !landlordDone);
    var key = [visible, found.length, inspectable, state === 'alley', prompt, hint].join('|');
    if (key === hudKey) { return; }
    hudKey = key;
    UI.hud({
      visible: visible,
      found: found.length,
      touch: isTouch,
      inspectable: inspectable,
      boardReady: state === 'alley' && found.length >= TOTAL,
      prompt: prompt,
      hint: hint
    });
  }

  function moveFree(dt) {
    var mx = 0, my = 0, uy = 0;
    if (keys.KeyW || keys.ArrowUp) { my += 1; }
    if (keys.KeyS || keys.ArrowDown) { my -= 1; }
    if (keys.KeyD || keys.ArrowRight) { mx += 1; }
    if (keys.KeyA || keys.ArrowLeft) { mx -= 1; }
    if (keys.Space) { uy += 1; }
    if (keys.ShiftLeft || keys.ShiftRight) { uy -= 1; }
    var rad = yaw * DEG;
    var fx = -Math.sin(rad), fz = -Math.cos(rad);
    var rx = Math.cos(rad), rz = -Math.sin(rad);
    freeCam.x += (fx * my + rx * mx) * SPEED * dt;
    freeCam.z += (fz * my + rz * mx) * SPEED * dt;
    freeCam.y += uy * SPEED * dt;
  }

  function updateFps(rawDt) {
    fpsFrames++;
    fpsTime += rawDt;
    if (fpsTime >= 0.5) {
      fpsValue = fpsFrames / fpsTime;
      if (fpsEl) {
        fpsEl.textContent = 'fps ' + fpsValue.toFixed(1) + (splatReady ? ' splat' : ' stand-in') +
          ' | budget ' + (QL[qLevel].budget / 1000) + 'k | scale ' + scaleFor(qLevel);
      }
      fpsFrames = 0;
      fpsTime = 0;
    }
  }

  // Auto quality: record frame times in the alley. At 3 s and 6 s, read the median fps.
  // Above 55 steps up one level (max two up-steps). Below 40 steps down one level, once.
  function qualityTick(rawDt) {
    if (qDone || state !== 'alley' || freeCam) { return; }
    if (qTime < 0) { qTime = 0; qCount = 0; qAcc = 0; qAccN = 0; }
    qTime += rawDt;
    qAcc += rawDt;
    qAccN++;
    if (qAcc >= 0.5) {
      qWindow[qCount % qWindow.length] = qAccN / qAcc;
      qCount++;
      qAcc = 0;
      qAccN = 0;
    }
    if (qTime < QUALITY_AT[qEval]) { return; }
    var n = Math.min(qCount, qWindow.length);
    if (n === 0) { return; }
    var arr = Array.prototype.slice.call(qWindow, 0, n).sort(function (a, b) { return a - b; });
    var median = arr[Math.floor(arr.length / 2)];
    if (median > 55 && qLevel < QL.length - 1 && qStepsUp < 2) {
      qStepsUp++;
      applyQuality(qLevel + 1);
    } else if (median < 40 && qLevel > 0 && qStepsUp >= 0 && qEval === 0) {
      applyQuality(qLevel - 1);
      qDone = true;
    }
    qEval++;
    qTime = -1;
    if (qEval >= QUALITY_AT.length) { qDone = true; }
    qLastMedian = median;
  }
  var qLastMedian = 0;

  function update(dt) {
    updateFps(dt);
    qualityTick(dt);
    dt = Math.min(dt, 0.05);
    time += dt;
    if (freeCam) {
      moveFree(dt);
      rig.setLocalPosition(freeCam.x, freeCam.y, freeCam.z);
      rig.setLocalEulerAngles(0, yaw, 0);
      cam.setLocalEulerAngles(pitch, 0, 0);
      updateRain(dt);
      updateGlints();
      updateHud();
      return;
    }
    if (state === 'alley') {
      movePlayer(dt);
      updateFigure(dt);
    }
    rig.setLocalPosition(player.x, EYE, player.z);
    rig.setLocalEulerAngles(0, yaw, 0);
    cam.setLocalEulerAngles(pitch, 0, 0);
    updateRain(dt);
    updateGlints();
    updateHud();
  }

  function unlockPointer() {
    if (document.pointerLockElement && document.exitPointerLock) { document.exitPointerLock(); }
  }

  function lockPointer() {
    if (!isTouch && state === 'alley' && !document.pointerLockElement && canvas.requestPointerLock) {
      try {
        var r = canvas.requestPointerLock();
        if (r && r.catch) { r.catch(function () {}); }
      } catch (err) { /* ignored */ }
    }
  }

  function startAlley() {
    state = 'alley';
    UI.show(null);
    Music.play('alley', 2);
    lockPointer();
  }

  function openCard(i) {
    if (state !== 'alley') { return; }
    state = 'card';
    unlockPointer();
    if (found.indexOf(i) < 0) { found.push(i); }
    UI.openCard(i, closeCard);
  }

  function closeCard() {
    if (state !== 'card') { return; }
    state = 'alley';
    UI.show(null);
    if (!figureActive && !landlordDone && found.length >= TRIGGER) {
      figureActive = true;
      figure.enabled = true;
    }
    lockPointer();
  }

  function openNotebook() {
    if (state !== 'alley') { return; }
    state = 'notebook';
    unlockPointer();
    UI.openNotebook(found, function (i) { state = 'alley'; openCard(i); }, closeNotebook);
  }

  function closeNotebook() {
    if (state !== 'notebook') { return; }
    state = 'alley';
    UI.show(null);
    lockPointer();
  }

  function openPause() {
    if (state !== 'alley') { return; }
    state = 'pause';
    unlockPointer();
    UI.pause(resume);
  }

  function resume() {
    if (state !== 'pause') { return; }
    state = 'alley';
    UI.show(null);
    lockPointer();
  }

  function doInspect() {
    if (state !== 'alley') { return; }
    if (figureActive && !landlordDone) { startLandlord(); return; }
    var i = nearestClue(PROMPT_D);
    if (i >= 0) { openCard(i); }
  }

  function startLandlord() {
    if (state !== 'alley') { return; }
    state = 'dialog';
    unlockPointer();
    Music.play('landlord', 1.5);
    UI.dialog(LANDLORD_LINES, endLandlord);
  }

  function endLandlord() {
    landlordDone = true;
    figureActive = false;
    figure.enabled = false;
    state = 'alley';
    UI.show(null);
    Music.play('alley', 2);
    lockPointer();
  }

  function openBoard() {
    if (state === 'board' || state === 'ending' || state === 'credits') { return; }
    state = 'board';
    unlockPointer();
    Music.play('board', 2);
    UI.board(openEnding);
  }

  function openEnding() {
    state = 'ending';
    Music.play('ending', 2);
    UI.ending(openCredits);
  }

  function openCredits() {
    state = 'credits';
    UI.credits();
    var again = document.getElementById('btn-again');
    again.onclick = function () { location.href = location.pathname; };
  }

  function startPrologue() {
    state = 'prologue';
    Music.play('prologue', 1.5);
    UI.prologue(startAlley);
  }

  function bindInput() {
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space') { e.preventDefault(); }
      keys[e.code] = true;
      if (e.repeat) { return; }
      var active = document.activeElement;
      var onButton = active && active.tagName === 'BUTTON';
      switch (e.code) {
        case 'Escape':
          if (state === 'alley') { openPause(); }
          else if (state === 'pause') { resume(); }
          else if (state === 'card') { closeCard(); }
          else if (state === 'notebook') { closeNotebook(); }
          break;
        case 'KeyE':
          doInspect();
          break;
        case 'KeyN':
          if (state === 'alley') { openNotebook(); }
          else if (state === 'notebook') { closeNotebook(); }
          break;
        case 'KeyF':
          if (state === 'alley') {
            flashOn = !flashOn;
            flash.light.enabled = flashOn;
          }
          break;
        case 'Space':
        case 'Enter':
          if (!onButton && state !== 'alley' && state !== 'pause' && state !== 'notebook' && state !== 'title') {
            UI.advance();
          }
          break;
      }
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });

    window.addEventListener('mousemove', function (e) {
      if (document.pointerLockElement !== canvas || state !== 'alley') { return; }
      yaw -= e.movementX * 0.12;
      pitch = clamp(pitch - e.movementY * 0.12, -80, 80);
    });

    canvas.addEventListener('click', lockPointer);

    document.getElementById('btn-inspect').onclick = doInspect;
    document.getElementById('btn-notebook').onclick = openNotebook;
    document.getElementById('btn-board').onclick = openBoard;

    document.addEventListener('pointerdown', function () {
      Music.unlock();
    });

    bindTouch();
  }

  function showJoy(x, y) {
    var j = document.getElementById('joy');
    j.style.left = x + 'px';
    j.style.top = y + 'px';
    j.hidden = false;
  }

  function moveKnob(dx, dy) {
    document.getElementById('joy-knob').style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }

  function hideJoy() {
    document.getElementById('joy').hidden = true;
    moveKnob(0, 0);
  }

  function bindTouch() {
    window.addEventListener('touchstart', function (e) {
      if (state !== 'alley') { return; }
      if (e.target.closest && e.target.closest('button')) { return; }
      e.preventDefault();
      var half = window.innerWidth / 2;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.clientX < half && joy.id === null) {
          joy.id = t.identifier;
          joy.ox = t.clientX;
          joy.oy = t.clientY;
          joy.x = 0;
          joy.y = 0;
          showJoy(t.clientX, t.clientY);
        } else if (t.clientX >= half && look.id === null) {
          look.id = t.identifier;
          look.x = t.clientX;
          look.y = t.clientY;
        }
      }
    }, { passive: false });

    window.addEventListener('touchmove', function (e) {
      if (state !== 'alley') { return; }
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === joy.id) {
          var dx = t.clientX - joy.ox;
          var dy = t.clientY - joy.oy;
          var kx = clamp(dx, -60, 60);
          var ky = clamp(dy, -60, 60);
          joy.x = kx / 60;
          joy.y = -ky / 60;
          moveKnob(kx, ky);
        } else if (t.identifier === look.id) {
          yaw -= (t.clientX - look.x) * 0.22;
          pitch = clamp(pitch - (t.clientY - look.y) * 0.22, -80, 80);
          look.x = t.clientX;
          look.y = t.clientY;
        }
      }
    }, { passive: false });

    var end = function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier === joy.id) {
          joy.id = null;
          joy.x = 0;
          joy.y = 0;
          hideJoy();
        }
        if (t.identifier === look.id) { look.id = null; }
      }
    };
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
  }

  function boot() {
    canvas = document.getElementById('view');
    if (!pc) { return; }
    pc.createGraphicsDevice(canvas, { deviceTypes: ['webgl2'], antialias: !isTouch }).then(function (device) {
      app = new pc.Application(canvas, { graphicsDevice: device });
      app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
      app.setCanvasResolution(pc.RESOLUTION_AUTO);
      window.addEventListener('resize', function () { app.resizeCanvas(); });

      setupScene();
      applyQuality(qLevel);
      app.on('update', update);
      app.start();

      UI.bindScreens();
      bindInput();
      loadScene();

      if (debug) {
        var fps = document.createElement('div');
        fps.id = 'fps';
        fps.style.cssText = 'position:fixed;left:8px;top:8px;z-index:20;color:#D4A017;font:12px monospace;background:rgba(0,0,0,.5);padding:2px 6px;';
        document.body.appendChild(fps);
        fpsEl = fps;
      }
      if (debug && (debug === 'fly' || debug.indexOf('cam=') === 0)) {
        freeCam = { x: 0, y: EYE, z: 3 };
        if (debug.indexOf('cam=') === 0) {
          var v = debug.slice(4).split(',').map(Number);
          freeCam.x = v[0] || 0; freeCam.y = v[1] || EYE; freeCam.z = v[2] || 0;
          yaw = v[3] || 0; pitch = v[4] || 0;
        }
        state = 'alley';
        UI.show(null);
      } else if (debug === 'board') {
        for (var i = 0; i < TOTAL; i++) { found.push(i); }
        openBoard();
      } else if (debug === 'card') {
        startAlley();
        found.push(0);
        UI.openCard(0, closeCard);
        state = 'card';
        unlockPointer();
      } else {
        UI.showTitle(function () {
          Music.unlock();
          startPrologue();
        });
        state = 'title';
        Music.play('title', 1.5);
      }
    });
  }

  window.NS_DEBUG = {
    get splatLoaded() { return splatReady; },
    get splatMode() { return splatMode; },
    holdFigure: function (v) { figureHold = !!v; return figureHold; },
    get fps() { return fpsValue; },
    get quality() { return { level: qLevel, budget: QL[qLevel].budget, scale: scaleFor(qLevel), median: qLastMedian, done: qDone }; },
    stats: function () {
      var f = app && app.stats && app.stats.frame ? app.stats.frame : {};
      return { fps: fpsValue, budget: QL[qLevel].budget, scale: scaleFor(qLevel), dpr: window.devicePixelRatio, frame: JSON.stringify(f) };
    },
    clues: function () { return clueEnts.map(function (c) { return { x: c.x, y: c.y, z: c.z }; }); },
    place: function (x, z, yw, pt) {
      player.x = clamp(x, bounds.x0, bounds.x1);
      player.z = clamp(z, bounds.z0, bounds.z1);
      yaw = yw;
      pitch = pt || 0;
      return { x: player.x, z: player.z, yaw: yaw };
    },
    aim: function (i) {
      var c = clueEnts[i];
      if (!c) { return false; }
      var px = clamp(c.x * 0.3, bounds.x0, bounds.x1);
      var pz = clamp(c.z - 2.2, bounds.z0, bounds.z1);
      var dx = c.x - px, dz = c.z - pz;
      player.x = px;
      player.z = pz;
      yaw = Math.atan2(-dx, -dz) / DEG;
      pitch = Math.max(-30, Math.atan2(c.y - EYE, Math.sqrt(dx * dx + dz * dz)) / DEG);
      return true;
    },
    setCam: function (x, y, z, yw, pt) {
      if (!freeCam) { return false; }
      freeCam.x = x; freeCam.y = y; freeCam.z = z;
      yaw = yw; pitch = pt;
      return true;
    },
    hideSplat: function (v) {
      if (!splatEnt) { return false; }
      splatEnt.enabled = !v;
      return !v;
    },
    setSplat: function (p, r, s) {
      if (!splatEnt) { return false; }
      splatEnt.setLocalPosition(p[0], p[1], p[2]);
      splatEnt.setLocalEulerAngles(r[0], r[1], r[2]);
      splatEnt.setLocalScale(s, s, s);
      return true;
    },
    inspect: function (i) {
      var c = clueEnts[i];
      if (!c) { return 'none'; }
      player.x = clamp(c.x * 0.7, bounds.x0, bounds.x1);
      player.z = c.z;
      doInspect();
      return state;
    },
    state: function () {
      return { state: state, found: found.length, figureActive: figureActive, landlordDone: landlordDone };
    }
  };

  boot();
})();
