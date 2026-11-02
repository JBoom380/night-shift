# NIGHT SHIFT: phone patches for game.js

**The phone build already loads only LOD1, and memory is low (about 58 MB GPU textures, 43 MB JS heap). Two small game.js patches remain: a WebGL 2 error message and a budget cap on phones.**

- Measured with Playwright, 390x844, touch, DPR 3, on 2026-11-02.
- LOD1 only on phones: present in game.js and verified. The network log shows zero bytes from the LOD0 folders (0_0 to 0_3).
- Music competes with the splat on a slow link. Music and rain are 8.3 MB of the 25.8 MB the phone downloads.
- Next action: apply patches 1 and 2, then run tests\smoke.py.

## 1. Measurements

### 1.1 Load on the live site (CDP 4G: 9 Mbps x 0.9, 165 ms RTT, CPU 4x)

| Item | Value |
|---|---|
| Title visible | 0.6 s |
| LOD meta loaded (`splatLoaded` true) | 4.1 s |
| All LOD1 gaussians resident (994,445) | 26.8 s |
| Bytes at that point | 25.8 MB |
| Splat (1_0 + 1_1) | 16.8 MB |
| Music (title, prologue, alley) + rain | 7.4 MB + 0.9 MB |
| playcanvas.min.js (gzip) | 0.64 MB |
| LOD0 folders | 0 bytes |

- Fast 3G (1.6 Mbps x 0.9): the run was skipped. The figure below is an estimate from the 4G byte count, not a measurement. 25.8 MB at 0.18 MB/s gives about 145 s to a full alley, or about 100 s without the music.
- `splatLoaded` goes true when lod-meta.json loads, not when the gaussians arrive. On a slow link the player can enter an empty alley. The game now shows "Loading the alley..." in the alley, and the title shows "The alley is loading." (ui.js).

### 1.2 Memory at the phone settings (local server, no throttle, lodRangeMin 1)

| Item | Value |
|---|---|
| Gaussians resident | 994,445 (all of LOD1) |
| GPU textures (`device._vram.tex`) | 58.1 MB, about 61 B per resident gaussian |
| JS heap used / total (`performance.memory`) | 29.8 MB / 42.6 MB |
| Canvas | 585 x 1266 (DPR cap 1.5) |

- The same 58.1 MB shows at budgets 400k and 800k. When all of LOD1 is resident, the budget does not change texture memory.
- Estimate of the full tab: 58 MB GPU textures + about 6 MB frame buffers + 43 MB JS + about 15 MB transient webp decode per 524k chunk + about 60 to 80 MB browser base. That gives about 180 to 200 MB. This is well under the 500 MB target and far from the 1 to 1.5 GB iOS limit.
- If LOD0 were allowed on phones, there would be about 3x the gaussians (2.98M). By the same 61 B per gaussian, that is about 180 MB of textures and 35 MB more download. Keep LOD1 only.
- The headless desktop GPU runs at 60 fps, so the auto ladder stepped the phone up to 800k. A real phone steps only if its median fps is over 55.

## 2. Patches (apply in src/game.js)

### Patch 1. WebGL 2 missing: tell the player (no black screen, no silent fail)

`createGraphicsDevice` has no catch. On a phone without WebGL 2, the alley stays blank and nothing says why. ui.js stops its "loading" line when `t-load` has `data-error`.

Old text:
```
        // The player passed the title and prologue before the device was ready.
        lockPointer();
      }
    });
  }

  window.NS_DEBUG = {
```
New text:
```
        // The player passed the title and prologue before the device was ready.
        lockPointer();
      }
    }).catch(function (err) {
      console.warn('No WebGL 2 device.', err);
      var t = document.getElementById('t-load');
      if (t) {
        t.setAttribute('data-error', '1');
        t.textContent = 'This browser cannot show the 3D alley. Turn on WebGL 2 or use a newer browser.';
      }
    });
  }

  window.NS_DEBUG = {
```

### Patch 2. Phone budget cap at 800k

LOD1 holds 994,445 gaussians. On phones, level 3 (1.2M) gives no more detail and costs more sort work and heat. Cap touch devices at level 2.

Old text:
```
    if (median > 55 && qLevel < QL.length - 1 && qStepsUp < 2) {
```
New text:
```
    if (median > 55 && qLevel < (isTouch ? 2 : QL.length - 1) && qStepsUp < 2) {
```

### Patch 3. LOD1 only on phones: no change needed

This line is present and verified. It loads no LOD0 bytes on phones. Keep it.
```
      ent.gsplat.lodRangeMin = lowEnd ? 1 : 0;
```

## 3. Recommendation (asset change, director's call)

1. Music on a slow link: the title, prologue and alley tracks are 2.9 MB each at full bitrate. They share the link with the splat at the first tap. Half-bitrate copies for touch devices would cut about half of the 7.4 MB of music, which is about 3.7 MB or about 20 s on Fast 3G. This is not applied.
