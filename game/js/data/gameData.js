/* exported CardData */
// Game Data - All cards, antes, and configurations

// AnteData is now defined in AnteData_js.js

const CardData = {
    boons: [
        // Boons from CSV database with standard timing hooks
        { 
            id: "hestias_hearth", 
            name: "Hestia's Hearth", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "If all 5 of your dice are odd or all 5 are even the hand gains +3 Favour.",
            timing: { before_score: true }
        },
        { 
            id: "charons_ferry_fare", 
            name: "Charon's Ferry Fare", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Gain +1 Gold after scoring any hand (does not trigger on a scratch).",
            timing: { after_score: true }
        },
        { id: "the_gambler", name: "The Gambler", rarity: "rustic", cost: 3, sellValue: 1, effect: "+10 Pips for every re-roll remaining.", timing: { before_score: true }, triggerPhase: "inventory" },
        { 
            id: "achilles_heel", 
            name: "Achilles' Heel", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "All scores gain +15 Pips but you lose 1 Gold at the start of each roll.",
            timing: { before_score: true, turn_start: true }
        },
        { 
            id: "midas_touch", 
            name: "Midas Touch", 
            rarity: "rustic", 
            cost: 4, 
            sellValue: 2, 
            effect: "Gain +0.1 Favour for every 5 Gold you have when scoring.",
            timing: { before_score: true }
        },
        { 
            id: "icarus_wings", 
            name: "Icarus' Wings", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Each unused re-roll at the end of a turn gives +10 Pips to the score. Chance to break after turn 1 in 8.",
            timing: { before_score: true, turn_end: true }
        },
        { 
            id: "lethe_waters", 
            name: "Lethe Waters", 
            rarity: "rustic", 
            cost: 4, 
            sellValue: 2, 
            effect: "All dice with a value of 2 or less are not counted for scoring but your final score gains +25 Pips.",
            timing: { before_score: true }
        },
        { 
            id: "forge_of_hephaestus", 
            name: "Forge of Hephaestus", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Gain +0.5 Favour for each unused re-roll (max +1.5).",
            timing: { before_score: true }
        },
        { 
            id: "prometheus_gift", 
            name: "Prometheus' Gift", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Gives +3 Favour to all hands but you have one less re-roll each turn.",
            timing: { before_score: true, turn_start: true }
        },
        { 
            id: "chaos_primordial", 
            name: "Chaos Primordial", 
            rarity: "legendary", 
            cost: 8, 
            sellValue: 2, 
            effect: "Doubles all Favour gains but you have one less re-roll each turn.",
            timing: { before_score: true, turn_start: true },
            shopExclude: true  // Legendary - not available in shop
        },
        { 
            id: "mt_olympus", 
            name: "Mt Olympus", 
            rarity: "epic", 
            cost: 8, 
            sellValue: 2, 
            effect: "Gain +1 Favour per total worship level across the pantheon.",
            timing: { before_score: true }
        },
        
        // === EPIC TIER - Game Changers ===
        { 
            id: "sisyphus_boulder", 
            name: "Sisyphus' Boulder", 
            rarity: "vibrant", 
            cost: 8, 
            sellValue: 2, 
            effect: "+5 Pips for every time you've rerolled this turn. Resets each turn.",
            god: "Sisyphus",
            timing: { before_score: true }
        },
        { 
            id: "kronos_hourglass", 
            name: "Kronos' Hourglass", 
            rarity: "epic", 
            cost: 9, 
            sellValue: 2, 
            effect: "Gain +1 roll at the start of each turn.",
            god: "Kronos",
            timing: { turn_start: true }
        },
        { 
            id: "pandoras_jar", 
            name: "Pandora's Jar", 
            rarity: "epic", 
            cost: 8, 
            sellValue: 2, 
            effect: "Every 3rd turn, randomly destroy a Boon and gain +2 Favour (stacks permanently).",
            god: "Pandora",
            timing: { before_score: true, turn_start: true }
        },
        
        // === VIBRANT TIER - Interesting Mechanics ===
        { 
            id: "demeters_harvest", 
            name: "Demeter's Harvest", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Each turn, one random die permanently gains +1 to its value (max 9).",
            god: "Demeter",
            timing: { turn_start: true }
        },
        { 
            id: "medusas_gaze", 
            name: "Medusa's Gaze", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Any die showing 6 cannot be rerolled (acts as automatic hold). Lower sanctum scores give +0.5 Favour.",
            god: "Medusa",
            timing: { after_roll: true, before_score: true }
        },
        { 
            id: "dionysus_revelry", 
            name: "Dionysus' Revelry", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Dice showing 2 pairs can be scored as Full House.",
            god: "Dionysus",
            description: "The god of revelry bends the rules for celebration.",
            timing: {}  // Special - modifies scoring logic
        },
        { 
            id: "apollos_oracle", 
            name: "Apollo's Oracle", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "+1 reroll per turn, reduce score input by 20%.",
            god: "Apollo",
            description: "More chances but weakened results.",
            timing: { turn_start: true, before_score: true }
        },
        { 
            id: "hydras_heads", 
            name: "Hydra's Heads", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Whenever you score with exactly 2 pairs (e.g. 2-2-3-3-5), gain +3 Favour.",
            god: "Hydra",
            timing: { before_score: true }
        },
        { 
            id: "tantalus_curse", 
            name: "Tantalus' Curse", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "+0.1 Favour for each gold you have, but cannot spend gold while active.",
            god: "Tantalus",
            description: "Punishment eternal: wealth you cannot touch.",
            timing: { before_score: true }
        },
        { 
            id: "pegasus_flight", 
            name: "Pegasus' Flight", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Dice showing 6 or more grant +0.5 Favour each when scored.",
            god: "Pegasus",
            timing: { before_score: true }
        },
        { 
            id: "cerberus_watch", 
            name: "Cerberus' Watch", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "The first 3 dice you hold each turn gain +3 Pips each when scored.",
            god: "Cerberus",
            description: "The three-headed guardian blesses what you protect.",
            timing: { before_score: true }
        },
        { 
            id: "trojan_horse", 
            name: "The Trojan Horse", 
            rarity: "legendary", 
            cost: 12, 
            sellValue: 3, 
            effect: "After Turn 10, all your Boons give ×2 their normal effect.",
            description: "Hidden power revealed when the time is right.",
            timing: { before_score: true },
            shopExclude: true  // Legendary - not available in shop
        },
        
        // === RUSTIC TIER - Simple but Effective ===
        { 
            id: "lucky_dice_bag", 
            name: "Lucky Dice Bag", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Whenever you roll a 1, reroll that die automatically (once per die per turn).",
            timing: { after_roll: true }
        },
        { 
            id: "gamblers_charm", 
            name: "Gambler's Charm", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "50% chance to gain +2 Gold when scoring, 50% chance to lose 1 gold.",
            timing: { after_score: true }
        },
        { 
            id: "marathon_runner", 
            name: "Marathon Runner", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Gain +1 Pips per roll taken (stacks, destroyed when scratched or reaches 42+ pips).",
            description: "Named for Pheidippides - the longer the journey, the greater the exhaustion.",
            timing: { before_score: true, after_roll: true, after_score: true }
        },
        { 
            id: "golden_touch", 
            name: "Golden Touch", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Interest is calculated at 1 gold per 3 saved (instead of 5).",
            god: "Midas",
            description: "Better interest rate on saved gold.",
            timing: { turn_start: true }
        },
        
        // === NEW BOONS - Wave 2 ===
        { 
            id: "mathematicians_compass", 
            name: "Mathematician's Compass", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Small and Large Straights gain +2 Favour.",
            description: "The geometer rewards a perfect sequence.",
            timing: { before_score: true }
        },
        { 
            id: "prime_time", 
            name: "Prime Time", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Each die showing a prime (2, 3, 5) grants +0.3 Favour.",
            description: "Indivisible numbers carry divine weight.",
            timing: { before_score: true }
        },
        { 
            id: "the_locksmith", 
            name: "The Locksmith", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Held dice gain +1 pips for each roll they were held, when scoring.",
            description: "The longer they're locked, the more valuable they become.",
            timing: { before_score: true, after_roll: true, turn_start: true }
        },
        { 
            id: "the_merchant", 
            name: "The Merchant", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Selling libation and worship cards gives +1 extra gold.",
            description: "A keen trader in sacred goods.",
            timing: { sell: true }
        },
        { 
            id: "the_heretic", 
            name: "The Heretic", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Each turn gain +2 pips (stacks, resets at end of trial or when worship card is used).",
            description: "Growing stronger without divine intervention.",
            timing: { before_score: true, turn_start: true, ante_end: true }
        },
        { 
            id: "reckless_abandon", 
            name: "Reckless Abandon", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Score with no dice held to gain ×2 Favour.",
            description: "Pure chaos, no strategy - commit everything.",
            timing: { before_score: true, after_roll: true }
        },
        { 
            id: "typhon", 
            name: "Typhon", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Each die showing a 1 when you score grants +0.5 Favour.",
            description: "The father of monsters, born from the lowest depths.",
            god: "Typhon",
            timing: { after_roll: true, before_score: true }
        },
        { 
            id: "early_bird", 
            name: "Early Bird Gets the Worm", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Turns 1-3: +20 Pips, turns 4-5 gain 2 gold, Turns 6-13: -5 Pips.",
            description: "Front-loaded power that fades over time.",
            timing: { before_score: true, after_score: true }
        },
        { 
            id: "the_symposium", 
            name: "The Symposium", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Each time you score 4+ matching dice, gain +0.05 Favour (stacks permanently).",
            description: "A gathering of equals - celebrations accumulate.",
            timing: { before_score: true }
        },
        { 
            id: "assembly_of_heroes", 
            name: "Assembly of Heroes", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "If all boon slots are full, gain +15 Pips when scoring.",
            description: "United heroes stand stronger together.",
            timing: { before_score: true }
        },
        { 
            id: "divine_synergy", 
            name: "Divine Synergy", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Boons of the same rarity amplify each other (+5 Pips per matching rarity).",
            description: "Similar rarities harmonize together.",
            timing: { before_score: true }
        },
        { 
            id: "first_blood", 
            name: "First Blood", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Your first score each Trial gives +50 Pips.",
            description: "Strike first, strike hard.",
            timing: { before_score: true }
        },
        { 
            id: "midnight_oil", 
            name: "Midnight Oil", 
            rarity: "rustic", 
            cost: 5, 
            sellValue: 1, 
            effect: "Turn 12+ gives +24 Pips but you lose 1 roll each turn.",
            description: "Burning the midnight oil - working harder at the end.",
            timing: { before_score: true, turn_start: true }
        },
        { 
            id: "parmenides_die", 
            name: "Parmenides Die", 
            rarity: "epic", 
            cost: 8, 
            sellValue: 2, 
            effect: "Scores swap between upper and lower pantheon (Ones↔Three of a Kind, Twos↔Small Straight, etc.).",
            description: "The philosopher of paradox - what you score in one sanctum appears in the other.",
            god: "Parmenides",
            timing: { turn_start: true }
        },
        { 
            id: "doubling_season", 
            name: "Doubling Season", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "All even numbers give +2 pips, odd numbers give -1 pip.",
            description: "Growth and decay in balance - evens flourish, odds wither.",
            timing: { before_score: true }
        },
        { 
            id: "symmetry", 
            name: "Symmetry", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Each time you roll a palindrome, this card permanently gains +0.5 Favour (stacks).",
            description: "Divine harmony accumulates with each perfect pattern.",
            timing: { after_roll: true, before_score: true }
        },
        { 
            id: "misery", 
            name: "Misery", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "If you have 0 gold, gain +2 Favour.",
            description: "Poverty grants divine Favour - suffering brings blessing.",
            timing: { before_score: true }
        },
        { 
            id: "smog_of_morpheus", 
            name: "Smog of Morpheus", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "After your final roll, all dice showing 2 or 4 become 3s.",
            description: "The god of dreams shapes your final reality.",
            god: "Morpheus",
            timing: { after_roll: true }
        },
        { 
            id: "the_zealot", 
            name: "The Zealot", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "When you score the pantheon row of the god you most recently Offered to this Trial, gain +1 Favour.",
            description: "Zealous devotion to the last worshipped god.",
            timing: { before_score: true }
        },
        { 
            id: "mortal_vineyard", 
            name: "Mortal Vineyard", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Selling a Boon gives you a random Libation.",
            description: "Transform the divine into sacred wine - alchemical conversion.",
            timing: { sell: true }
        },
        { 
            id: "proteus_disguise",
            name: "Proteus' Disguise",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "Copies the effect of the Boon to its left.",
            description: "The shape-shifter takes the form of its neighbour.",
            god: "Proteus",
            timing: { before_score: true, after_score: true, turn_start: true, turn_end: true }
        },
        { 
            id: "cornucopia_of_ploutos", 
            name: "Cornucopia of Ploutos", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "At end of Trial, gold ×1.5 (rounded down).",
            description: "The horn of plenty - wealth multiplies for the patient.",
            god: "Ploutos",
            timing: { ante_end: true }
        },
        { 
            id: "the_odyssey", 
            name: "The Odyssey", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "At end of Trial, if ALL categories filled with NO scratches, gain (total categories)² pips.",
            description: "Complete the perfect journey - 13² = 169, 14² = 196, 15² = 225, 16² = 256 pips.",
            god: "Odysseus",
            timing: { ante_end: true }
        },
        { 
            id: "message_in_a_bottle", 
            name: "Message in a Bottle", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "If you complete Trial with no other boons for entire trial gain +50% of score threshold.",
            description: "A solo journey - isolation brings great reward.",
            timing: { ante_end: true }
        },
        { 
            id: "betrayal_by_paris", 
            name: "Betrayal by Paris", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "Destroy a random Boon at end of each Trial, gain +10 Gold.",
            description: "The betrayer of Troy - your boons fear you.",
            god: "Paris",
            timing: { ante_end: true }
        },
        { 
            id: "eruption_of_etna", 
            name: "Eruption of Etna", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "If 3+ Boons trigger on same turn, +1 Favour (stacks, doesn't reset).",
            description: "Volcanic eruption - when many boons align, explosive power!",
            timing: { before_score: true }
        },
        { 
            id: "cycle_of_seasons", 
            name: "The Cycle of Seasons", 
            rarity: "vibrant", 
            cost: 5, 
            sellValue: 1, 
            effect: "When you Offer a Blessing, another god also gains +1 worship.",
            description: "The seasons cycle - worship spreads to other gods.",
            timing: {} // Special - triggers on worship card use
        },
        { 
            id: "ascetics_vow", 
            name: "Ascetic's Vow", 
            rarity: "epic", 
            cost: 8, 
            sellValue: 2, 
            effect: "If you have empty other Boon slots, gain +1 Favour for each.",
            description: "Less is more - the ascetic finds power in emptiness.",
            timing: { before_score: true }
        },
        { 
            id: "bellows_of_war", 
            name: "Bellows of War", 
            rarity: "epic", 
            cost: 8, 
            sellValue: 2, 
            effect: "Three/Four of Kind categories score as if you had one more matching die.",
            description: "The forge's bellows create phantom duplicates - virtual power.",
            god: "Hephaestus",
            timing: {} // Special - modifies scoring logic
        },
        { 
            id: "nyxian_seduction", 
            name: "Nyxian Seduction", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Chance category gives +69 Pips, reduce a random god's favour by 1 level (male gods preferred).",
            description: "Seductive night - weakens male gods through temptation.",
            god: "Nyx",
            timing: { before_score: true }
        },
        { 
            id: "gold_standard", 
            name: "Gold Standard", 
            rarity: "vibrant", 
            cost: 8, 
            sellValue: 2, 
            effect: "While you have 20+ Gold, gain ×1.5 Favour.",
            description: "Back every offering with a full treasury.",
            timing: { before_score: true }
        },
        { 
            id: "carillon_of_the_muses", 
            name: "Carillon of the Muses", 
            rarity: "epic", 
            cost: 10, 
            sellValue: 3, 
            effect: "If all 5 dice have enhancements, gain +3 Favour (secret: if all same enhancement, ×2.5 Favour).",
            description: "Perfect harmony - the bells ring when all are enhanced.",
            god: "The Nine Muses",
            timing: { before_score: true }
        },
        { 
            id: "reflection_of_narcissus", 
            name: "Reflection of Narcissus", 
            rarity: "epic", 
            cost: 11, 
            sellValue: 3, 
            effect: "Boons trigger twice, but you have -2 rolls per turn.",
            description: "The reflection doubles all - but limits your chances.",
            god: "Narcissus",
            timing: { turn_start: true }
        },
        { 
            id: "journey_of_perseus", 
            name: "Journey of Perseus", 
            rarity: "rustic", 
            cost: 3, 
            sellValue: 1, 
            effect: "Every 100 total score, this Boon gains +10 Pips.",
            description: "The hero's journey - power accumulates with achievement.",
            god: "Perseus",
            timing: { before_score: true }
        }
    ],

    worship: [
        // Shared package: Offer = pantheon level-up; Held 3 trials → Ascended.
        { id: "worship_artemis", name: "Blessing of Artemis", god: "Artemis", rarity: "worship", cost: 3, effect: "Offer on Ones: +1 level (+1 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Ones/Artemis)." },
        { id: "worship_aphrodite", name: "Blessing of Aphrodite", god: "Aphrodite", rarity: "worship", cost: 3, effect: "Offer on Twos: +1 level (+2 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Twos/Aphrodite)." },
        { id: "worship_morpheus", name: "Blessing of Morpheus", god: "Morpheus", rarity: "worship", cost: 3, effect: "Offer on Threes: +1 level (+3 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Threes/Morpheus)." },
        { id: "worship_hera", name: "Blessing of Hera", god: "Hera", rarity: "worship", cost: 3, effect: "Offer on Fours: +1 level (+4 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Fours/Hera)." },
        { id: "worship_athena", name: "Blessing of Athena", god: "Athena", rarity: "worship", cost: 3, effect: "Offer on Fives: +1 level (+5 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Fives/Athena)." },
        { id: "worship_heracles", name: "Blessing of Heracles", god: "Heracles", rarity: "worship", cost: 3, effect: "Offer on Sixes: +1 level (+6 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Sixes/Heracles)." },
        { id: "worship_hephaestus", name: "Blessing of Hephaestus", god: "Hephaestus", rarity: "worship", cost: 3, effect: "Offer on Three of a Kind: +1 level (+7 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Three of a Kind/Hephaestus)." },
        { id: "worship_ares", name: "Blessing of Ares", god: "Ares", rarity: "worship", cost: 3, effect: "Offer on Four of a Kind: +1 level (+15 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Four of a Kind/Ares)." },
        { id: "worship_dionysus", name: "Blessing of Dionysus", god: "Dionysus", rarity: "worship", cost: 3, effect: "Offer on Full House: +1 level (+12 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Full House/Dionysus)." },
        { id: "worship_hermes", name: "Blessing of Hermes", god: "Hermes", rarity: "worship", cost: 3, effect: "Offer on Small Straight: +1 level (+10 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Small Straight/Hermes)." },
        { id: "worship_apollo", name: "Blessing of Apollo", god: "Apollo", rarity: "worship", cost: 3, effect: "Offer on Large Straight: +1 level (+20 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Large Straight/Apollo)." },
        { id: "worship_zeus", name: "Blessing of Zeus", god: "Zeus", rarity: "worship", cost: 3, effect: "Offer on Heureka: +1 level (+25 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Heureka/Zeus)." },
        { id: "worship_nyx", name: "Blessing of Nyx", god: "Nyx", rarity: "worship", cost: 3, effect: "Offer on Chance: +1 level (+0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Chance/Nyx)." },
        { id: "worship_pleiades", name: "Blessing of the Pleiades", god: "The Pleiades", rarity: "worship", cost: 3, effect: "Offer on Sevens: +1 level (+7 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Sevens/The Pleiades)." },
        { id: "worship_poseidon_eights", name: "Blessing of Poseidon (Eights)", god: "Poseidon", rarity: "worship", cost: 3, effect: "Offer on Eights: +1 level (+8 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Eights/Poseidon)." },
        { id: "worship_muses", name: "Blessing of the Nine Muses", god: "The Nine Muses", rarity: "worship", cost: 3, effect: "Offer on Nines: +1 level (+9 pips & +0.25 Favour per level). Held 3 trials → Ascended (consecrate any row as Nines/The Nine Muses)." },
        { id: "worship_pandora", name: "Blessing of Pandora's Box", god: "Pandora's Box", rarity: "worship", cost: 3, effect: "Offer on Pandora's Box: +1 sanctum bonus level. Held 3 trials → Ascended (consecrate any row as Pandora's Box)." },
    ],

    libations: [
        // Libations from CSV database only
        { id: "kyphi_mead", name: "Kyphi Mead", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Parchment.", type: "instant" },
        { id: "tisane_hephaestus", name: "Tisane of Hephaestus", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Clockwork.", type: "instant" },
        { id: "ambrosial_krasi", name: "Ambrosial Krasi", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Gold.", type: "instant" },
        { id: "retsina_echoes", name: "Retsina of Echoes", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Mother of Pearl (adds left/right die).", type: "instant" },
        { id: "soma_wild", name: "Soma of the Wild", rarity: "libation", cost: 2, sellValue: 0, effect: "Add Wild to one die face. On roll: −1, 0, or +1.", type: "instant" },
        { id: "blessed_nectar", name: "Blessed Nectar", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Blessed.", type: "instant" },
        { id: "kylix_hermit", name: "Kylix of the Hermit", rarity: "libation", cost: 3, sellValue: 0, effect: "Double your gold (max gain 20).", type: "instant" },
        { id: "elixir_lethe", name: "Elixir of Lethe", rarity: "libation", cost: 2, sellValue: 0, effect: "Reduce a die face by 1.", type: "instant" },
        { id: "chalice_helios", name: "Chalice of Helios", rarity: "libation", cost: 2, sellValue: 0, effect: "Increase a die face by 1.", type: "instant" },
        { id: "the_eucharist", name: "The Eucharist", rarity: "libation", cost: 2, sellValue: 0, effect: "Gain +1 worship level in god of choice.", type: "instant" },
        { id: "divine_guidance", name: "Divine Guidance", rarity: "libation", cost: 2, sellValue: 0, effect: "Gain 2 random levels in any 2 scores.", type: "instant" },
    ],

    packs: [
        { type: 'boon', name: 'Boon Pack', cost: 4, description: 'Choose one Boon from the pack.' },
        { type: 'worship', name: 'Worship Pack', cost: 4, description: 'Choose one Blessing from the pack.' },
        { type: 'libation', name: 'Libation Pack', cost: 4, description: 'Choose one Libation from the pack.' },
        { type: 'chaos', name: 'Chaos Pack', cost: 6, description: 'Reveals 3 random cards - choose one from any combination of Boons, Blessings, and Libations!' }
    ],

    /**
     * Ten families, each a base and its upgrade. Both tiers cost 10 gold; the upgrade is
     * earned by scarcity, not price — it only enters the shop pool once you own its base,
     * and one artifact is offered per shop visit.
     *
     * Owning an upgrade means owning both cards, so the effect text on an upgrade reads as
     * the total the pair delivers while game/ArtifactEffects.js contributes only the
     * increment. Keep those two in step when editing.
     */
    artifacts: {
        'temple_market': {
            base: {
                id: "artifact_temple_market",
                name: "Temple Market",
                cost: 10,
                effect: "+1 ware in the shop.",
                description: "Traders follow the smell of incense. Your shop shows one more ware each visit.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_grand_agora",
                name: "Grand Agora",
                cost: 10,
                effect: "+2 wares in the shop.",
                description: "The stalls have spilled out across the whole square.",
                rarity: "artifact"
            }
        },
        'clearance_sale': {
            base: {
                id: "artifact_clearance_sale",
                name: "Merchants Arrival",
                cost: 10,
                effect: "All shop prices reduced by 25%.",
                description: "A caravan has come in heavy and wants to leave light.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_hermes_bargain",
                name: "Hermes' Bargain",
                cost: 10,
                effect: "All shop prices reduced by 50%.",
                description: "The god of traders and thieves has taken an interest in your haggling.",
                rarity: "artifact"
            }
        },
        'telescope': {
            base: {
                id: "artifact_telescope",
                name: "Altar",
                cost: 10,
                effect: "Double the Favour gained from worship levels.",
                description: "Somewhere to lay the offering, so the gods can see who sent it.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_hecatomb",
                name: "The Hecatomb",
                cost: 10,
                effect: "Selling a Boon pays its full shop cost.",
                description: "A hundred oxen. What you give up comes back as coin, not smoke.",
                rarity: "artifact"
            }
        },
        // Three pack families, one per pack type. Tier 1 widens the choice; tier 2 either
        // guarantees the card you actually keep reaching for, or (for boons) a slot to put
        // it in. Antikythra keeps its old artifact_antimatter id so existing saves and
        // anthology unlocks still resolve.
        'boon_pack': {
            base: {
                id: "artifact_hall_of_heroes",
                name: "Hall of Heroes",
                cost: 10,
                effect: "Boon Packs reveal 1 extra Boon.",
                description: "More names on the wall means more examples to follow.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_antimatter",
                name: "Antikythra",
                cost: 10,
                effect: "+1 Boon slot.",
                description: "Bronze gearing that keeps track of one more favour than it should.",
                rarity: "artifact"
            }
        },
        'worship_pack': {
            base: {
                id: "artifact_panegyris",
                name: "Panegyris",
                cost: 10,
                effect: "Worship Packs reveal 1 extra Blessing.",
                description: "The whole city has turned out, and every god sent a envoy.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_the_auspices",
                name: "The Auspices",
                cost: 10,
                effect: "Worship Packs always contain a Blessing for your highest god.",
                description: "Read the birds for long enough and you stop being surprised.",
                rarity: "artifact"
            }
        },
        'libation_pack': {
            base: {
                id: "artifact_symposium",
                name: "Symposium",
                cost: 10,
                effect: "Libation Packs reveal 1 extra Libation.",
                description: "The couches are full and the mixing bowl is deep.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_ganymedes_cup",
                name: "Ganymede's Cup",
                cost: 10,
                effect: "Libation Packs always contain your most-poured Libation.",
                description: "The cupbearer has learned your order by heart.",
                rarity: "artifact"
            }
        },
        'sixth_astragalus': {
            base: {
                id: "artifact_sixth_astragalus",
                name: "The Sixth Astragalus",
                cost: 10,
                effect: "+1 die. All of its faces start as 1s.",
                description: "A spare knucklebone. Every face is a 1 until you drink Lethe or Helios onto it.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_seventh_astragalus",
                name: "The Seventh Astragalus",
                cost: 10,
                effect: "+2 extra dice: one of all 1s, and one that is Wild on every face.",
                description: "The seventh bone will not sit still. It becomes whatever the throw needs, a little.",
                rarity: "artifact"
            }
        },
        'plutus_seed': {
            base: {
                id: "artifact_plutus_seed",
                name: "Seed of Plutus",
                cost: 10,
                effect: "Raise the interest cap to 10 Gold per cashout.",
                description: "Wealth grows for those patient enough to leave it in the ground.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_plutus_grove",
                name: "Grove of Plutus",
                cost: 10,
                effect: "Raise the interest cap to 20 Gold per cashout.",
                description: "The seed took. Now it drops coin the way an olive drops fruit.",
                rarity: "artifact"
            }
        },
        'delphic_tithe': {
            base: {
                id: "artifact_delphic_tithe",
                name: "Delphic Tithe",
                cost: 10,
                effect: "Shop rerolls cost 2 less Gold.",
                description: "Pay the temple up front and the oracle stops charging by the question.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_pythias_indulgence",
                name: "Pythia's Indulgence",
                cost: 10,
                effect: "You have no re-rolls. Each turn you Cast the Bones once.",
                description: "The Pythia answers once. Do not ask her to throw again.",
                rarity: "artifact"
            }
        },
        'tyches_grace': {
            base: {
                id: "artifact_tyches_grace",
                name: "Tyche's Grace",
                cost: 10,
                effect: "+4 Gold at the start of each Trial.",
                description: "Fortune leaves a coin in your palm before the first throw.",
                rarity: "artifact"
            },
            upgraded: {
                id: "artifact_tyches_bounty",
                name: "Tyche's Bounty",
                cost: 10,
                effect: "+8 Gold at the start of each Trial.",
                description: "She has stopped counting, and so should you.",
                rarity: "artifact"
            }
        }
    },

    getAllCards: function() {
        return [
            ...this.boons.map(c => ({...c, class: 'Boon'})),
            ...this.worship.map(c => ({...c, class: 'WorshipCard'})),
            ...this.libations.map(c => ({...c, class: 'LibationCard'}))
        ];
    }
};