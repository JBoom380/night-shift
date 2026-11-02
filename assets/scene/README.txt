NIGHT SHIFT: scene folder

The game uses the real alley scan in alley\. The stand-in alley is kept as a fallback.

Scene
- Source: "Alley Way behind Cafe Artista, Moscow Idaho" by Nathan B (coastalwolf).
- License: CC BY 4.0. The license text is in alley\license.txt.
- Page: https://superspl.at/scene/23533997

Files
- alley\lod-meta.json: the streamed LOD index (PlayCanvas splat-transform v3.10.3, SOG format).
- alley\0_0 to alley\1_1: chunk folders. Each has meta.json and webp textures.
- scene.json: the URL, the format, and the placement of the scan.

How the game loads it
1. src\game.js reads scene.json.
2. It loads lod-meta.json as a gsplat asset with unified: true (engine LOD path).
3. If that fails, it loads the six chunk meta.json files as separate gsplat assets.
4. When the scan loads, the stand-in walls and props hide, and the clues, colliders and spawn move
   to the real alley (ALLEY in src\game.js).

Placement
- position [0, 0.5, 0] and rotation [180, 0, 0]. The 180 degree turn about X fixes the up axis.
  The capture has y pointing down. The floor is at world y 0.
- The alley runs along z. Walls are at x -0.95 and x +0.97. Dense capture runs z -3.0 to +3.0.
- Spawn is at z -2.4, facing +z.
