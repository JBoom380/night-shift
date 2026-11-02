window.NS_STORY = {
  title: "NIGHT SHIFT",
  subtitle: "A Moscow, Idaho case",
  credit: "Scene: \"Alley Way behind Cafe Artista, Moscow Idaho\" by Nathan B (coastalwolf), CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Modified: lighting, fog, rain, and game objects added. Music: NEON RAIN score.",
  disclaimer: "The people, the fire and the building in this story are fiction. The code rules and numbers are real. Each one shows its source. Code text as read on 11/1/2026; Council can change it.",
  prologue: [
    { text: "Dana Reyes works nights as a nurse. She comes to my office with rain on her coat and no sleep in her eyes." },
    { text: "Her brother Theo was 24. He had a full-time job. He died in a basement fire with one other tenant. Six people lived in that unit." },
    { text: "The police called it a slumlord case and closed it. Dana does not buy that. She says: Somebody did this to him. Find out who." }
  ],
  clues: [
    {
      id: "c1",
      object: "Lease",
      look: "A lease for a basement unit. Six names are typed in a column. The signature lines are worn from use.",
      line: "Six names on one lease. Somebody counted on nobody asking questions.",
      fact: "Not more than four persons may live together as one housekeeping unit when one or more of them is not related to the others. Related persons have no limit.",
      section: "Moscow City Code Title 4, Sec. 1-6, Family, item c",
      source: "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026)"
    },
    {
      id: "c2",
      object: "City letter",
      look: "A letter from the city, polite and cold. The words conditional use permit are circled in pen.",
      line: "Six strangers under one roof need a hearing first. Nobody asked the six.",
      fact: "Five or six unrelated adults need a conditional use permit in AF through R-3. In R-4 the use is permitted.",
      section: "Moscow City Code Title 4, Sec. 3-4, Land Use Table, row Dwelling Unit (up to 6 unrelated individuals)",
      source: "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026)"
    },
    {
      id: "c3",
      object: "Zoning map",
      look: "A city zoning map. The R-1 zone is shaded gray across the block. A pencil line marks one lot.",
      line: "R-1 is the zone for single houses. The lot size on this map tells the rest.",
      fact: "The R-1 minimum lot is 9,600 sq ft. That is 6.4 times 1,500 sq ft, the largest minimum lot a city may require in a state starter home subdivision.",
      section: "Moscow City Code Title 4, Sec. 4-2 table; SB 1352 starter home lot",
      source: "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026); SB 1352, effective 7/1/2026"
    },
    {
      id: "c4",
      object: "Lot survey",
      look: "A survey drawing of the lot. The width is marked in pencil, then crossed out and written again.",
      line: "Eighty feet of lot width. An alley gives back ten. The rest is up to the builder's luck.",
      fact: "An R-1 lot needs 80 ft of width, or 70 ft with rear alley access. In a starter home subdivision, state law bars a city from requiring a front width over 30 ft on narrow lots.",
      section: "Moscow City Code Title 4, Sec. 4-2 table, note 3; SB 1352, item (c)",
      source: "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026); SB 1352, effective 7/1/2026"
    },
    {
      id: "c5",
      object: "Permit denial",
      look: "A permit denial in a plain envelope. The box for a two family house is checked no.",
      line: "Two homes on one lot. The zone said no before the plans said anything.",
      fact: "A duplex is permitted only in R-3 and R-4. It is not allowed in AF, FR, SR, R-1, or R-2.",
      section: "Moscow City Code Title 4, Sec. 3-4, Land Use Table, two family row",
      source: "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026)"
    },
    {
      id: "c6",
      object: "ADU plan",
      look: "A site plan for a backyard unit. The square footage is written in the corner and underlined twice.",
      line: "A small house behind the big house. The code measures the small one against the big one.",
      fact: "An accessory dwelling unit (ADU) is no more than 600 sq ft or 40 percent of the main house, whichever is less. Behind a 1,000 sq ft house, the ADU is 400 sq ft at most.",
      section: "Moscow City Code Title 4, Sec. 3-5.A.2.b",
      source: "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026)"
    },
    {
      id: "c7",
      object: "Deed restriction form",
      look: "A blank deed restriction form. The owner line is ready. The notary stamp is not.",
      line: "The owner has to live on the lot. The paper outlasts the owner.",
      fact: "An ADU needs a recorded owner-occupancy deed restriction before the permit issues. The owner must live on the lot. The rule binds later owners and heirs.",
      section: "Moscow City Code Title 4, Sec. 3-5.A.2.d.i",
      source: "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026)"
    },
    {
      id: "c8",
      object: "Parking sketch",
      look: "A parking sketch with one car drawn. A second space is shaded in pencil, and the shading is empty.",
      line: "One more space for the back unit. Somebody has to pay for the asphalt.",
      fact: "A lot with an ADU needs one more off-street parking space.",
      section: "Moscow City Code Title 4, Sec. 3-5.A.2.e",
      source: "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026)"
    },
    {
      id: "c9",
      object: "Mobile home brochure",
      look: "A glossy brochure for a single-section mobile home. The square footage is in small print on the back.",
      line: "One section, small print. The code wants more home than that.",
      fact: "A manufactured home must be multisectional and at least 1,000 sq ft. A single-section home cannot qualify.",
      section: "Moscow City Code Title 4, Sec. 1-6, definition 92, Manufactured home",
      source: "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026)"
    }
  ],
  landlord: {
    trigger_after: 5,
    lines: [
      { who: "WALT", text: "Dana's brother. I know. I have not slept since the fire." },
      { who: "YOU", text: "You own the basement unit. Six people lived there. Say it." },
      { who: "WALT", text: "Six people. Yes. I rented it out room by room. It was not legal, and I knew it." },
      { who: "YOU", text: "Did you know what the code said?" },
      { who: "WALT", text: "The code says no to six. I took the rent anyway." },
      { who: "WALT", text: "Those six had nowhere legal to go. I looked. Every road I found ended in a no." },
      { who: "YOU", text: "Who wrote the no?" },
      { who: "WALT", text: "Not me. I am a small man with a loan and a roof that leaks. I did a bad thing. I did not make the shortage." },
      { who: "YOU", text: "Then who made it?" },
      { who: "WALT", text: "The lot size did. The width did. The paper did. There are a lot of people behind the paper, and none of them came to my door." }
    ]
  },
  board: {
    intro: "Four names are on the case board. Each name is a suspect. Each suspect has a clue that answers it.",
    numbers: [
      { label: "Median City permit fees on a new house", value: "$4,232.53", source: "City permit records, 2013 to 2026 (n = 441)" },
      { label: "Water and sewer hookups for one house", value: "$5,796", source: "Resolution 2025-20, FY2026" },
      { label: "New house permits per year", value: "46 to 66", source: "City permit records, 2017 to 2025" }
    ],
    suspects: [
      { id: "landlord", name: "The landlord", correct: false, rebuttal: "Walt broke the occupancy rule, and he admits it. But one landlord does not set the lot size. Clue 3 shows the R-1 minimum lot is 9,600 sq ft." },
      { id: "students", name: "The students", correct: false, rebuttal: "Renters did not write the rules. Clue 2 shows the city requires a conditional use permit for five or six unrelated adults. The limit is in the code." },
      { id: "developers", name: "The developers", correct: false, rebuttal: "Builders work inside the lot and the zone. Clue 4 shows an R-1 lot needs 80 ft of width, or 70 ft with an alley. The code sets that before any builder arrives." },
      { id: "code", name: "The code", correct: true, rebuttal: "" }
    ],
    verdict: "Walt broke the rules, and he knows it. The students and the builders worked inside the rules they were given. The lot sizes, the permits and the occupancy limits all come from the code. The code put six people in a basement with no legal place to live."
  },
  ending: [
    { text: "I hand Dana the case board. Nine clues. One name. She reads it twice at my desk." },
    { text: "She does not cry. She folds the page and puts it in her coat, next to her badge from the night shift." },
    { text: "Theo is still gone. The rules are not fixed. People write the codes, and those people answer to the voters." }
  ],
  sources: [
    "Moscow City Code Title 4 as amended by Ord. 2026-04 (07/06/2026), Sec. 1-6 Family, item c: not more than four persons, when one or more is unrelated. Source text read 11/1/2026.",
    "Moscow City Code Title 4, Sec. 3-4 Land Use Table, row Dwelling Unit (up to 6 unrelated individuals): C in AF, FR, SR, R-1, R-2, R-3; P in R-4. Ord. 2026-04 (07/06/2026).",
    "Moscow City Code Title 4, Sec. 4-2 table (Chapter 04 PDF p. 3): R-1 minimum lot 9,600 sq ft. Ord. 2026-04 (07/06/2026).",
    "SB 1352 (starter homes), effective 7/1/2026: starter home lot no greater than 1,500 sq ft, on 4 acres or more.",
    "Moscow City Code Title 4, Sec. 4-2 table, note 3: R-1 minimum lot width 80 ft, reduced by 10 feet with rear alley access (70 ft). Ord. 2026-04 (07/06/2026).",
    "SB 1352 (starter homes), effective 7/1/2026, item (c): cities must \"Prohibit requiring lot front widths exceeding thirty (30) feet for narrow lots\" in starter home subdivisions.",
    "Moscow City Code Title 4, Sec. 3-4 Land Use Table, two family row: P only in R-3 and R-4. Ord. 2026-04 (07/06/2026).",
    "Moscow City Code Title 4, Sec. 3-5.A.2.b: ADU 600 sq ft or 40 percent of the main house, whichever is less (example: 1,000 sq ft house gives 400 sq ft). Ord. 2026-04 (07/06/2026).",
    "Moscow City Code Title 4, Sec. 3-5.A.2.d.i: recorded owner-occupancy deed restriction before the ADU permit issues. Ord. 2026-04 (07/06/2026).",
    "Moscow City Code Title 4, Sec. 3-5.A.2.e: ADU needs one more off-street parking space. Ord. 2026-04 (07/06/2026).",
    "Moscow City Code Title 4, Sec. 1-6, definition 92: manufactured home multisectional and at least 1,000 sq ft. Ord. 2026-04 (07/06/2026).",
    "City permit records, 2013 to 2026 (n = 441): median total City permit fees on a new house permit, $4,232.53.",
    "Resolution 2025-20, FY2026: water hookup $2,914 plus sewer $131 per fixture unit times 22 fixture units = $5,796 for one house.",
    "City permit records, 2017 to 2025: 46 to 66 new single-family house permits per year.",
    "Change watch: Council hears the ADU and manufactured home draft on 11/2/2026. Sec. 3-5 and Sec. 1-6 definition 92 may change. Check before release.",
    "Fiction: Dana Reyes, Theo, Walt Kessler, the fire and the building are fiction."
  ]
};
