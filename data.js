// ─────────────────────────────────────────────────────────────
// Tom's revision timetable – all the facts the planner works from.
// Edit this file to change dates, commitments or topics, then
// run `node tools/build-ics.mjs` to refresh the calendar feed.
// ─────────────────────────────────────────────────────────────

export const PLAN = {
  start: '2026-11-22',          // first revision day
  lastTermDay: '2026-12-16',    // last day of school term
  phases: [
    { id: 'notes',    name: 'Refine & make notes',   from: '2026-11-22', to: '2026-12-05' },
    { id: 'memorise', name: 'Memorise & recall',     from: '2026-12-06', to: '2026-12-19' },
    { id: 'papers',   name: 'Practice papers',       from: '2026-12-20', to: '2027-01-04' },
    { id: 'mocks',    name: 'Mock exams',            from: '2027-01-05', to: '2027-01-20' },
  ],
  end: '2027-01-20',
};

// Tom's limits
export const RULES = {
  schoolNight: { end: '22:00', totalMins: 150, homeworkMins: 45, sessions: [60, 45], gap: 5 },
  friday:      { homeworkMins: 45 },                       // homework only
  weekend:     { start: '11:00', end: '20:30', totalMins: 180, sessions: [60, 60, 60], gap: 15 },
  holiday:     { start: '10:00', end: '21:00', totalMins: 360, sessionMins: 60, gap: 15, freeBlockMins: 210 },
  maxSubjectMins: 60,           // per subject per day (practice papers exempt)
  reviewMins: 45,               // evening-before review in the mock fortnight
  markMins: 45,                 // marking & corrections after a practice paper
  lunch:  ['13:15', '14:00'],
  dinner: ['18:30', '19:15'],
};

// Home-time on school days (school + dinner)
export const HOME_TIME = { 1: '19:30', 2: '19:30', 3: '18:30', 4: '18:30', 5: '18:30' }; // Mon CCF, Tue hockey

// ─── Fixed commitments (blocks no revision can go in) ───
// type: hockey | school | lfc | f1 | tutor | family | off
export const EVENTS = [
  // Hockey (Edgbaston) – 30 min travel either side; away games 60 min
  { date: '2026-11-22', start: '13:45', end: '17:15', type: 'hockey', label: 'Hockey – Edgbaston (14:15–16:45)' },
  { date: '2026-11-28', start: '11:45', end: '15:45', type: 'hockey', label: 'Hockey – Edgbaston (12:15–15:15)' },
  { date: '2026-12-05', start: '10:00', end: '15:00', type: 'hockey', label: 'Hockey – Edgbaston at Stratford (11:00–14:00)' },
  { date: '2027-01-09', start: '12:15', end: '18:30', type: 'hockey', label: 'Hockey – Edgbaston at Warwick (13:15–17:30)' },
  { date: '2027-01-16', start: '13:15', end: '17:15', type: 'hockey', label: 'Hockey – Edgbaston (13:45–16:45)' },
  // School hockey away – home ~19:30 (Delia still on)
  { date: '2026-11-25', start: '18:30', end: '19:30', type: 'school', label: 'School hockey away at Warwick (home ~19:30)' },

  // Liverpool FC (exact match times, ~1h55)
  { date: '2026-11-22', start: '16:30', end: '18:25', type: 'lfc', label: 'Liverpool v Man Utd' },
  { date: '2026-11-25', start: '20:00', end: '21:55', type: 'lfc', label: 'Club Brugge v Liverpool (UCL)' },
  { date: '2026-11-29', start: '12:00', end: '13:55', type: 'lfc', label: 'Everton v Liverpool' },
  { date: '2026-12-02', start: '19:30', end: '21:25', type: 'lfc', label: 'Liverpool v Sunderland' },
  { date: '2026-12-05', start: '12:30', end: '14:25', type: 'lfc', label: 'Chelsea v Liverpool' },
  { date: '2026-12-09', start: '20:00', end: '21:55', type: 'lfc', label: 'Liverpool v FC Porto (UCL)' },
  { date: '2026-12-12', start: '15:00', end: '16:55', type: 'lfc', label: 'Liverpool v Leeds' },
  { date: '2026-12-19', start: '17:30', end: '19:25', type: 'lfc', label: 'Liverpool v Tottenham' },
  { date: '2026-12-26', start: '17:30', end: '19:25', type: 'lfc', label: 'Hull v Liverpool' },
  { date: '2026-12-30', start: '20:15', end: '22:10', type: 'lfc', label: 'Aston Villa v Liverpool' },
  { date: '2027-01-02', start: '15:00', end: '16:55', type: 'lfc', label: 'Liverpool v Coventry' },
  { date: '2027-01-05', start: '20:15', end: '22:10', type: 'lfc', label: 'Sunderland v Liverpool' },
  { date: '2027-01-16', start: '15:00', end: '16:55', type: 'lfc', label: 'Liverpool v Crystal Palace (provisional)' },
  { date: '2027-01-19', start: '20:00', end: '21:55', type: 'lfc', label: 'Inter v Liverpool (UCL)' },

  // F1 – qualifying (~1h) and race (~2h), UK times
  { date: '2026-11-28', start: '18:00', end: '19:00', type: 'f1', label: 'F1 Qatar – Qualifying' },
  { date: '2026-11-29', start: '16:00', end: '18:00', type: 'f1', label: 'F1 Qatar – Race' },
  { date: '2026-12-05', start: '14:00', end: '15:00', type: 'f1', label: 'F1 Abu Dhabi – Qualifying' },
  { date: '2026-12-06', start: '13:00', end: '15:00', type: 'f1', label: 'F1 Abu Dhabi – Race' },

  // Christmas & New Year
  { date: '2026-12-24', start: '17:00', end: '23:59', type: 'family', label: 'Leave for Suffolk' },
  { date: '2026-12-25', start: '00:00', end: '23:59', type: 'off',    label: 'Christmas Day – day off' },
  { date: '2026-12-26', start: '00:00', end: '23:59', type: 'off',    label: 'Boxing Day – day off' },
  { date: '2026-12-28', start: '00:00', end: '14:00', type: 'family', label: 'Drive home from Suffolk' },
  { date: '2026-12-31', start: '17:00', end: '23:59', type: 'off',    label: "New Year's Eve – evening off" },
  { date: '2027-01-01', start: '00:00', end: '23:59', type: 'off',    label: "New Year's Day – day off" },

  // Spanish oral
  { date: '2026-12-03', start: '09:00', end: '09:30', type: 'exam', label: 'Spanish oral (time tbc)', allDay: true },
];

// Weekly term-time commitments (Mon=1 … Sun=0)
export const WEEKLY_TERM = [
  { dow: 3, start: '19:30', end: '20:00', type: 'tutor', label: 'Delia' },
  { dow: 5, start: '20:00', end: '21:00', type: 'tutor', label: 'Dylan' },
];
export const WEEKLY_ALWAYS = [
  { dow: 6, start: '10:00', end: '11:00', type: 'tennis', label: 'Tennis' },
];

// Special day limits
export const DAY_OVERRIDES = {
  '2026-12-24': { end: '17:00' },                 // daytime only
  '2026-12-25': { off: true },
  '2026-12-26': { off: true },
  '2026-12-28': { start: '14:00', totalMins: 180 }, // half day after driving
  '2026-12-31': { end: '17:00' },
  '2027-01-01': { off: true },
};

// Extra Spanish oral prep evenings
export const ORAL_PREP = ['2026-12-01', '2026-12-02'];

// ─── Subjects, mock papers and topics ───
// Topic `p` = which mock paper(s) it is examined in.
export const SUBJECTS = [
  {
    id: 'englit', name: 'English Literature', short: 'Eng Lit', board: 'Edexcel IGCSE (4ET1)', colour: '#8e44ad',
    papers: [{ id: 'englit1', name: 'English Literature – Poetry & Modern Prose', date: '2027-01-05', start: '09:00', mins: 120 }],
    topics: [
      ['Unseen poetry – how to analyse language, form & structure', 'englit1'],
      ['Anthology: If– · Prayer Before Birth · Blessing', 'englit1'],
      ['Anthology: Search For My Tongue · Half-past Two · Piano', 'englit1'],
      ['Anthology: Hide and Seek · Sonnet 116 · La Belle Dame sans Merci', 'englit1'],
      ['Anthology: Poem at Thirty-Nine · War Photographer · The Tyger', 'englit1'],
      ['Anthology: My Last Duchess · Half-caste · Do not go gentle · Remember', 'englit1'],
      ['Comparing two anthology poems (30-mark essay plan)', 'englit1'],
      ['Of Mice and Men – plot, structure & foreshadowing', 'englit1'],
      ['Of Mice and Men – George & Lennie', 'englit1'],
      ['Of Mice and Men – Curley, Curley’s wife, Crooks, Candy, Slim', 'englit1'],
      ['Of Mice and Men – themes: dreams, loneliness, friendship', 'englit1'],
      ['Of Mice and Men – themes: power, prejudice, violence', 'englit1'],
      ['Of Mice and Men – context: Depression & migrant workers', 'englit1'],
      ['Of Mice and Men – key quotations', 'englit1'],
      ['Of Mice and Men – 40-mark essay technique', 'englit1'],
    ],
  },
  {
    id: 'englang', name: 'English Language', short: 'Eng Lang', board: 'Edexcel IGCSE (4EA1)', colour: '#d63384',
    papers: [{ id: 'englang1', name: 'English Language – Non-fiction & Transactional Writing', date: '2027-01-06', start: '13:30', mins: 135 }],
    topics: [
      ['Anthology: The Danger of a Single Story · A Passage to Africa', 'englang1'],
      ['Anthology: The Explorer’s Daughter · Explorers, or boys messing about?', 'englang1'],
      ['Anthology: Between a Rock and a Hard Place · Young and dyslexic?', 'englang1'],
      ['Anthology: A Game of Polo with a Headless Goat · Beyond the Sky and the Earth', 'englang1'],
      ['Anthology: H is for Hawk · Chinese Cinderella', 'englang1'],
      ['Unseen non-fiction – retrieval & short answers', 'englang1'],
      ['Language & structure analysis (anthology question)', 'englang1'],
      ['Comparing two texts (unseen v anthology)', 'englang1'],
      ['Transactional writing – articles & speeches', 'englang1'],
      ['Transactional writing – letters, reviews & reports', 'englang1'],
      ['Persuasive & rhetorical techniques', 'englang1'],
      ['Spelling, punctuation & sentence variety', 'englang1'],
    ],
  },
  {
    id: 'maths', name: 'Maths', short: 'Maths', board: 'Edexcel IGCSE Maths A Higher (4MA1)', colour: '#2471a3',
    papers: [
      { id: 'maths1', name: 'Maths Paper 1', date: '2027-01-08', start: '09:00', mins: 120 },
      { id: 'maths2', name: 'Maths Paper 2', date: '2027-01-19', start: '09:00', mins: 120 },
    ],
    topics: [
      ['Fractions, decimals & recurring decimals', '*'],
      ['Indices & standard form', '*'],
      ['Surds', '*'],
      ['Percentages, ratio & compound interest', '*'],
      ['Upper & lower bounds', '*'],
      ['Direct & inverse proportion', '*'],
      ['Expanding, factorising & algebraic fractions', '*'],
      ['Linear equations & rearranging formulae', '*'],
      ['Quadratics – factorising, formula, completing the square', '*'],
      ['Simultaneous equations (incl. linear/quadratic)', '*'],
      ['Inequalities (incl. quadratic & graphical)', '*'],
      ['Sequences & series', '*'],
      ['Functions – composite & inverse', '*'],
      ['Straight-line graphs & gradients', '*'],
      ['Curves & graph transformations', '*'],
      ['Differentiation – gradients, turning points, kinematics', '*'],
      ['Algebraic proof & identities', '*'],
      ['Angles, polygons & bearings', '*'],
      ['Pythagoras & right-angled trigonometry', '*'],
      ['Sine rule, cosine rule & ½ab sin C', '*'],
      ['3D Pythagoras & trigonometry', '*'],
      ['Circle theorems', '*'],
      ['Similarity (length, area, volume) & congruence', '*'],
      ['Area, arcs & sectors', '*'],
      ['Surface area & volume (cones, spheres, frusta)', '*'],
      ['Transformations', '*'],
      ['Vectors', '*'],
      ['Constructions & loci', '*'],
      ['Sets & Venn diagrams', '*'],
      ['Averages, grouped data & cumulative frequency', '*'],
      ['Histograms', '*'],
      ['Probability – tree diagrams & conditional', '*'],
    ],
  },
  {
    id: 'bio', name: 'Biology', short: 'Biology', board: 'AQA Triple (8461)', colour: '#1e8449',
    papers: [
      { id: 'bio1', name: 'Biology Paper 1', date: '2027-01-05', start: '13:30', mins: 105 },
      { id: 'bio2', name: 'Biology Paper 2', date: '2027-01-20', start: '09:00', mins: 105 },
    ],
    topics: [
      ['Cell structure, microscopy & culturing microorganisms', 'bio1'],
      ['Cell division, mitosis & stem cells', 'bio1'],
      ['Diffusion, osmosis & active transport', 'bio1'],
      ['Digestive system, enzymes & food tests', 'bio1'],
      ['Heart, blood & blood vessels', 'bio1'],
      ['Lungs, non-communicable disease & cancer', 'bio1'],
      ['Plant tissues, transpiration & translocation', 'bio1'],
      ['Communicable diseases (viral, bacterial, fungal, protist, plant)', 'bio1'],
      ['Defences, vaccination, antibiotics & drug development', 'bio1'],
      ['Monoclonal antibodies', 'bio1'],
      ['Photosynthesis & limiting factors', 'bio1'],
      ['Respiration, exercise & metabolism', 'bio1'],
      ['Required practicals – Paper 1', 'bio1'],
      ['Nervous system & reflexes', 'bio2'],
      ['The brain & the eye', 'bio2'],
      ['Thermoregulation', 'bio2'],
      ['Hormones, blood glucose & diabetes', 'bio2'],
      ['Kidneys, water balance & ADH', 'bio2'],
      ['Reproductive hormones, contraception & IVF', 'bio2'],
      ['Plant hormones', 'bio2'],
      ['Reproduction & meiosis', 'bio2'],
      ['DNA, genome & protein synthesis', 'bio2'],
      ['Inheritance, Punnett squares & genetic disorders', 'bio2'],
      ['Variation, evolution & speciation', 'bio2'],
      ['Selective breeding, genetic engineering & cloning', 'bio2'],
      ['Classification, fossils & antibiotic resistance', 'bio2'],
      ['Ecosystems, adaptations & competition', 'bio2'],
      ['Material cycles & decomposition', 'bio2'],
      ['Biodiversity, human impact & food security', 'bio2'],
      ['Required practicals – Paper 2', 'bio2'],
    ],
  },
  {
    id: 'phys', name: 'Physics', short: 'Physics', board: 'AQA Triple (8463)', colour: '#d35400',
    papers: [
      { id: 'phys1', name: 'Physics Paper 1', date: '2027-01-07', start: '13:30', mins: 105 },
      { id: 'phys2', name: 'Physics Paper 2', date: '2027-01-15', start: '13:30', mins: 105 },
    ],
    topics: [
      ['Energy stores & calculations (KE, GPE, elastic)', 'phys1'],
      ['Power, efficiency & specific heat capacity', 'phys1'],
      ['Energy resources', 'phys1'],
      ['Circuits – charge, current, potential difference, resistance', 'phys1'],
      ['I–V characteristics, series & parallel circuits', 'phys1'],
      ['Mains electricity, power & the National Grid', 'phys1'],
      ['Static electricity & electric fields', 'phys1'],
      ['Density & changes of state', 'phys1'],
      ['Internal energy & specific latent heat', 'phys1'],
      ['Gas pressure & particle motion', 'phys1'],
      ['Atomic structure & models of the atom', 'phys1'],
      ['Radioactive decay, nuclear equations & half-life', 'phys1'],
      ['Uses & hazards of radiation, fission & fusion', 'phys1'],
      ['Required practicals – Paper 1', 'phys1'],
      ['4.5.1 Forces & their interactions (scalars, vectors, weight, resultants)', 'phys2'],
      ['4.5.2–4.5.3 Work done & elasticity (F = ke)', 'phys2'],
      ['4.5.4 Moments, levers & gears', 'phys2'],
      ['4.5.5 Pressure in fluids & upthrust', 'phys2'],
      ['4.5.6 Speed, velocity & motion graphs', 'phys2'],
      ['4.5.6 Newton’s laws, terminal velocity & stopping distances', 'phys2'],
      ['4.5.7 Momentum', 'phys2'],
      ['4.6.1 Waves – properties, sound, ultrasound & seismic', 'phys2'],
      ['4.6.2 EM waves, lenses, colour & black-body radiation', 'phys2'],
      ['4.7.1 Permanent magnets & electromagnetism', 'phys2'],
      ['4.7.2 Motor effect, motors & loudspeakers', 'phys2'],
      ['4.7.3 Induced potential, generators & transformers', 'phys2'],
      ['4.8.1 Solar system, life cycle of stars & orbits', 'phys2'],
      ['4.8.2 Red-shift & the Big Bang', 'phys2'],
      ['Required practicals – Paper 2', 'phys2'],
    ],
  },
  {
    id: 'chem', name: 'Chemistry', short: 'Chemistry', board: 'Edexcel IGCSE (4CH1)', colour: '#b7950b',
    papers: [
      { id: 'chem1', name: 'Chemistry Paper 1', date: '2027-01-08', start: '13:30', mins: 120 },
      { id: 'chem2', name: 'Chemistry Paper 2', date: '2027-01-14', start: '09:00', mins: 75 },
    ],
    topics: [
      ['States of matter & diffusion', '*'],
      ['Elements, compounds, mixtures & separation (chromatography)', '*'],
      ['Atomic structure, isotopes & relative atomic mass', '*'],
      ['The Periodic Table', '*'],
      ['Formulae, equations & state symbols', '*'],
      ['Moles, reacting masses & percentage yield', '*'],
      ['Moles – gas volumes, concentrations & titration calculations', '*'],
      ['Ionic bonding', '*'],
      ['Covalent bonding & structures', '*'],
      ['Metallic bonding', '*'],
      ['Electrolysis', '*'],
      ['Group 1 & Group 7', '*'],
      ['Gases in the atmosphere (O₂, CO₂)', '*'],
      ['Reactivity series, displacement & rusting', '*'],
      ['Extraction & uses of metals', '*'],
      ['Acids, alkalis & titrations', '*'],
      ['Preparing salts', '*'],
      ['Chemical tests (ions & gases)', '*'],
      ['Energetics – ΔH, calorimetry & bond energies', '*'],
      ['Rates of reaction', '*'],
      ['Reversible reactions & equilibria', '*'],
      ['Crude oil, fractional distillation & cracking', '*'],
      ['Alkanes & alkenes', '*'],
      ['Alcohols', '*'],
      ['Carboxylic acids & esters', '*'],
      ['Synthetic polymers (addition & condensation)', '*'],
      ['Required practicals', '*'],
    ],
  },
  {
    id: 'geog', name: 'Geography', short: 'Geography', board: 'Edexcel IGCSE (4GE1)', colour: '#117a65',
    papers: [
      { id: 'geog1', name: 'Geography Paper 1 – Physical', date: '2027-01-06', start: '09:00', mins: 70 },
      { id: 'geog2', name: 'Geography Paper 2 – Human', date: '2027-01-18', start: '09:00', mins: 105 },
    ],
    topics: [
      ['Rivers – hydrological cycle & drainage basins', 'geog1'],
      ['Rivers – processes & landforms', 'geog1'],
      ['Rivers – flooding, hydrographs & management', 'geog1'],
      ['Rivers – water supply, quality & management', 'geog1'],
      ['Hazards – types & global distribution', 'geog1'],
      ['Hazards – earthquakes & volcanoes', 'geog1'],
      ['Hazards – tropical cyclones', 'geog1'],
      ['Hazards – impacts, responses & case studies', 'geog1'],
      ['Fieldwork – my rivers enquiry', 'geog1'],
      ['Economic activity – sectors & changing employment', 'geog2'],
      ['Economic activity – formal/informal work & location', 'geog2'],
      ['Energy – demand, sources & sustainability', 'geog2'],
      ['Urban – urbanisation & growth', 'geog2'],
      ['Urban – land use & urban issues', 'geog2'],
      ['Urban – managing urban challenges & case studies', 'geog2'],
      ['Fieldwork – my urban enquiry', 'geog2'],
      ['Fragile environments – desertification & deforestation', 'geog2'],
      ['Climate change – causes & impacts', 'geog2'],
      ['Climate change – responses', 'geog2'],
      ['Geographical skills – maps, graphs & statistics', '*'],
    ],
  },
  {
    id: 'pe', name: 'PE', short: 'PE', board: 'OCR (J587)', colour: '#3fa7d6',
    papers: [
      { id: 'pe1', name: 'PE Paper 1 – Physical factors', date: '2027-01-07', start: '09:00', mins: 60 },
      { id: 'pe2', name: 'PE Paper 2 – Socio-cultural & psychology', date: '2027-01-13', start: '09:00', mins: 60 },
    ],
    topics: [
      ['Skeletal system', 'pe1'],
      ['Muscular system', 'pe1'],
      ['Movement analysis – levers, planes & axes', 'pe1'],
      ['Cardiovascular & respiratory systems', 'pe1'],
      ['Effects of exercise (short & long term)', 'pe1'],
      ['Components of fitness & fitness tests', 'pe1'],
      ['Principles & methods of training', 'pe1'],
      ['Optimising training & preventing injury', 'pe1'],
      ['Engagement patterns in sport', 'pe2'],
      ['Commercialisation & the media', 'pe2'],
      ['Ethics, sportsmanship, deviance & drugs', 'pe2'],
      ['Skill classification & goal setting', 'pe2'],
      ['Mental preparation, guidance & feedback', 'pe2'],
      ['Health, fitness & wellbeing', 'pe2'],
      ['Diet & nutrition', 'pe2'],
      ['Using & interpreting data', '*'],
    ],
  },
  {
    id: 'food', name: 'Food Prep & Nutrition', short: 'Food', board: 'AQA (8585)', colour: '#8d5524',
    papers: [{ id: 'food1', name: 'Food Prep & Nutrition – Written', date: '2027-01-11', start: '13:30', mins: 105 }],
    topics: [
      ['Macronutrients – protein, fat, carbohydrate', 'food1'],
      ['Micronutrients – vitamins, minerals & water', 'food1'],
      ['Nutritional needs through life & diet-related health', 'food1'],
      ['Energy requirements & planning balanced diets', 'food1'],
      ['Cooking methods & heat transfer', 'food1'],
      ['Functional properties – proteins & carbohydrates', 'food1'],
      ['Functional properties – fats, oils & raising agents', 'food1'],
      ['Food spoilage & micro-organisms', 'food1'],
      ['Food safety – buying, storing, preparing, cooking', 'food1'],
      ['Food choice, labelling & marketing', 'food1'],
      ['British & international cuisines; sensory evaluation', 'food1'],
      ['Environmental impact & sustainability', 'food1'],
      ['Food processing & production', 'food1'],
    ],
  },
  {
    id: 'span', name: 'Spanish', short: 'Spanish', board: 'AQA Higher (8692)', colour: '#6a5acd',
    papers: [
      { id: 'span4', name: 'Spanish Writing', date: '2027-01-12', start: '11:00', mins: 75 },
      { id: 'span13', name: 'Spanish Listening & Reading', date: '2027-01-13', start: '13:30', mins: 105 },
    ],
    topics: [
      ['People & lifestyle – identity & relationships', '*'],
      ['People & lifestyle – healthy living', '*'],
      ['People & lifestyle – education & work', '*'],
      ['Popular culture – free time', '*'],
      ['Popular culture – customs, festivals & celebrations', '*'],
      ['Popular culture – celebrity culture', '*'],
      ['World around us – travel & tourism', '*'],
      ['World around us – media & technology', '*'],
      ['World around us – environment & where people live', '*'],
      ['Grammar – present & preterite', '*'],
      ['Grammar – imperfect, future & conditional', '*'],
      ['Grammar – perfect, pluperfect & subjunctive', '*'],
      ['Translation – Spanish to English', 'span13'],
      ['Translation – English to Spanish', 'span4'],
      ['Writing – 90-word & 150-word tasks', 'span4'],
      ['Listening technique & dictation', 'span13'],
      ['Reading technique', 'span13'],
    ],
  },
];

// Food practical is in the mock timetable but deliberately has no revision.
export const OTHER_EXAMS = [
  { id: 'foodprac', name: 'Food Prep & Nutrition – Practical', date: '2027-01-12', start: '13:30', mins: 120 },
];
