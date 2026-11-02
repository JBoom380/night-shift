# NIGHT SHIFT: design

**A short noir detective game in a real 3D capture of a Moscow alley. The player is a private eye who learns that the Moscow zoning code, not a slumlord, put six people in a basement that burned.**

- Host: games.johnslagboom.com/night-shift/ (games hub, no campaign tie). Push only on John's word "push".
- Scene: "Alley Way behind Cafe Artista, Moscow Idaho" by Nathan B (coastalwolf), CC BY 4.0, modified. File not on disk yet (site login needed; John downloads it to `E:\claude\Projects\night-shift-splat\source\`).
- Facts: only the confirmed items in `E:\claude\Projects\night-shift-splat\research\RESEARCH - Moscow Code Barriers for Game.md` (sections 1, 3, 5).
- Music: the NEON RAIN score (`neon-rain-fps\assets\music\`) and rain loops.
- One prototype. John reviews it before more work.

## 1. Intent (John)
1. A political game about the Moscow housing crisis.
2. The player figures out that "the housing crisis is all in the code."
3. Darker tone: a basement fire (John picked idea 2). Player: a private eye (John). Clues (John).

## 2. Story (builder's call, John said "figure it out")
1. Client: Dana Reyes, a night-shift nurse. Her brother Theo (24, full-time job) died in a basement fire with one other tenant. Six people lived in the unit. Police call it a slumlord case and close it.
2. Private eye: unnamed, first person, hard-boiled inner voice.
3. The alley: smoke, rain, police tape, a basement stair. The player finds 9 clues. Each clue is an object (a lease, a fire report, a city letter, a zoning map, a fee receipt, an ADU plan, a mobile home brochure, a "room for rent" flyer, a permit denial).
4. Twist after clue 5: the landlord, Walt Kessler, comes to the private eye. He is guilty of the illegal unit. He did not make the shortage.
5. Case board: the player picks the culprit from four suspects: the landlord, the students, the developers, the code. Wrong picks get a rebuttal from a clue. The correct pick is "the code".
6. Ending: Dana gets the case board. End card lists every code section with its source and date.
7. All people and the burned building are fiction. Cafe Artista is not named in the story. The scene credit names the capture only.

## 3. Clues (confirmed facts only, exact numbers)
1. Family definition: not more than 4 unrelated persons per unit (Sec. 1-6, "Family" item c).
2. 5 or 6 unrelated adults need a conditional use permit in AF to R-3 (Sec. 3-4).
3. R-1 minimum lot 9,600 sq ft, 6.4 times the 1,500 sq ft state starter home lot (Sec. 4-2; SB 1352).
4. R-1 minimum lot width 80 ft (70 ft with an alley); state starter home cap 30 ft (Sec. 4-2).
5. Duplex permitted only in R-3 and R-4 (Sec. 3-4).
6. ADU size: 600 sq ft or 40 percent of the main house, whichever is less (Sec. 3-5.A.2.b).
7. ADU owner-occupancy deed restriction (Sec. 3-5.A.2.d.i).
8. ADU needs one more off-street space (Sec. 3-5.A.2.e).
9. Manufactured home: multisectional, at least 1,000 sq ft (Sec. 1-6, def. 92).
Numbers for the case board: median City permit fees on a new house $4,232.53 (2013 to 2026); water and sewer hookups $5,796 (FY2026); 46 to 66 new house permits per year (2017 to 2025).
Change watch: Council hears the ADU and manufactured home draft on 11/2/2026. Clues 6 to 9 must be checked before push.
Never use the section 4 claims of the research file.

## 4. Play
1. Title screen, then 3 prologue cards over rain (Dana hires the private eye).
2. Alley: first-person walk. Desktop: WASD, mouse look (pointer lock), E inspect, N notebook. Phone: left joystick, right drag to look, tap INSPECT.
3. Flashlight on by default. Rain particles, fog, a smoke haze. Clue objects glint in the light.
4. Each clue opens a case card: the object, the private eye's line, the code fact, the section.
5. Notebook lists the cards found (n of 9).
6. Case board after 9 clues. Then the ending and the credits.
7. Length: about 10 minutes.

## 5. Music cues
1. Title: 01_neon_rain_main_theme. Prologue: 02_the_office. Alley: 05_somebody_elses_rain. Landlord: 06_interrogation. Case board: 09_the_glass_saint. Ending: 03_velas_theme.
2. Rain loop: rain_13_ext_alley_gutter.

## 6. Tech (builder's call)
1. Folder: `C:\Users\John\Documents\GitHub\projects\night-shift\`. `index.html` + `vendor\playcanvas.min.js` (local copy, no CDN) + `assets\`.
2. Engine: PlayCanvas (reads SuperSplat files). Until the scene file arrives, a stand-in alley of simple boxes is used. When `assets\scene\` holds the splat, the game loads it and hides the stand-in.
3. Invisible collision boxes along the alley walls.
4. Story data in `data\story.js` (`window.NS_STORY`). Game code reads it. Writers edit only that file.
5. Text style: case cards in short plain sentences. Dialog is noir but short.
