// Where the operators a game mode lends sort among the released ones: each entry is a
// mode-only operator and the released operator, of the same rarity, that it comes just
// after. Entries naming the same operator keep the order they are written in.
//
// These operators were never released, so nothing dates them: the game's tables give them
// no release date and Sanity Gone's ordinal skips them. The places below were worked out
// once, in October 2026, from AN-EN-Tags' own operator list (json/tl-akhr.json, whose file
// order is the order its grid shows): each goes after the newest released operator of its
// rarity that the list has before it. They were then checked against the wiki's date for
// each mode's first CN run, given beside each group. Recorded here rather than fetched on
// every build, because they do not change and the fetch was one more thing to fail.
//
// A mode-only operator added to the game later is missing from this list: the build warns,
// naming it, and sorts it last until it is given a line. To place it, find it in
// tl-akhr.json and take the newest released operator of its rarity listed above it.
export const MODE_AFTER = [
  // Integrated Strategies, first run (Ceobe's Fungimist, CN 2020-08-24). The 3-stars follow
  // Spot, the last 3-star ever released; the 5-stars follow that day's batch.
  ['char_504_rguard', 'char_284_spot'],      // Reserve Operator - Melee
  ['char_507_rsnipe', 'char_284_spot'],      // Reserve Operator - Sniper
  ['char_506_rmedic', 'char_284_spot'],      // Reserve Operator - Logistics
  ['char_505_rcast', 'char_284_spot'],       // Reserve Operator - Caster
  ['char_509_acast', 'char_415_flint'],      // Pith
  ['char_508_aguard', 'char_415_flint'],     // Sharp
  ['char_510_amedic', 'char_415_flint'],     // Touch
  ['char_511_asnipe', 'char_415_flint'],     // Stormeye

  // Integrated Strategies, later additions (Mizuki & Caerula Arbor, CN September 2022).
  // Shalem the trainer is not in AN-EN-Tags' list at all; it goes with Tulip.
  ['char_514_rdfend', 'char_284_spot'],      // Reserve Operator - Defender
  ['char_513_apionr', 'char_4066_highmo'],   // Tulip
  ['char_512_aprot', 'char_4066_highmo'],    // Shalem

  // Stronghold Protocol, first run (CN 2024-11-15): after the batch of 2024-10-31.
  ['char_600_cpione', 'char_4165_ctrail'],   // Reserve Operator - Vanguard
  ['char_601_cguard', 'char_4165_ctrail'],   // Reserve Operator - Guard
  ['char_602_cdfend', 'char_4165_ctrail'],   // Reserve Operator - Defender
  ['char_603_csnipe', 'char_4165_ctrail'],   // Reserve Operator - Sniper
  ['char_604_ccast', 'char_4165_ctrail'],    // Reserve Operator - Caster
  ['char_605_cmedic', 'char_4165_ctrail'],   // Reserve Operator - Medic
  ['char_606_csuppo', 'char_4165_ctrail'],   // Reserve Operator - Supporter
  ['char_607_cspec', 'char_4165_ctrail'],    // Reserve Operator - Specialist
  ['char_608_acpion', 'char_1038_whitw2'],   // Tulip
  ['char_609_acguad', 'char_1038_whitw2'],   // Sharp
  ['char_610_acfend', 'char_1038_whitw2'],   // Mechanist
  ['char_611_acnipe', 'char_1038_whitw2'],   // Stormeye
  ['char_612_accast', 'char_1038_whitw2'],   // Pith
  ['char_613_acmedc', 'char_1038_whitw2'],   // Touch
  ['char_614_acsupo', 'char_1038_whitw2'],   // Raidian
  ['char_615_acspec', 'char_1038_whitw2'],   // Misery

  // Stronghold Protocol: Alliance (CN 2025-11-14): after the batch of 2025-10-31.
  ['char_616_pithst', 'char_4051_akkord'],   // Alliance/Supportive Operator
  ['char_617_sharp2', 'char_1045_svash2'],   // Lord/Sharp
];
