/* exported CardData */
// Game Data - All cards, antes, and configurations

// AnteData is now defined in AnteData_js.js

const CardData = {
    boons: [
        // Crafted lore pool only: Wave 0 seats + Fits + near-miss redesigns (32).
        // Gambling / Balatro leftovers and superseded stickers cut — see BOON_CATALOGUE_V2 §5.
        {
            id: "silver_bow_of_artemis",
            name: "Silver Bow of Artemis",
            rarity: "rustic",
            cost: 3,
            sellValue: 1,
            effect: "Scoring Ones on the first Cast of the turn: +15 Pips.",
            description: "She hits on the first shot.",
            god: "Artemis",
            timing: {before_score:true}
        },
        {
            id: "girdle_of_aphrodite",
            name: "Girdle of Aphrodite",
            rarity: "rustic",
            cost: 3,
            sellValue: 1,
            effect: "+2 Pips per neighbouring pair of 2s, on any score.",
            description: "Desire sits side by side.",
            god: "Aphrodite",
            timing: {before_score:true}
        },
        {
            id: "triple_torch_of_hecate",
            name: "Triple Torch of Hecate",
            rarity: "rustic",
            cost: 3,
            sellValue: 1,
            effect: "+9 Pips if at least three 3s are showing (any score).",
            description: "Honour in three realms — three 3s is the rite.",
            god: "Hecate",
            timing: {before_score:true}
        },
        {
            id: "yoke_of_hera",
            name: "Yoke of Hera",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "Two pair can be scored as The Feast.",
            description: "Two couples become a household.",
            god: "Hera",
            timing: {}
        },
        {
            id: "mist_of_ithaca",
            name: "Mist of Ithaca",
            rarity: "rustic",
            cost: 3,
            sellValue: 1,
            effect: "Scoring Fives while Sixes is empty: +15 Pips.",
            description: "The shore, and the house still ahead.",
            god: "Athena",
            timing: {before_score:true}
        },
        {
            id: "pomegranate_of_persephone",
            name: "Pomegranate of Persephone",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "Even Trials: scoring Sixes +12 Pips. Odd Trials: scoring Sixes +6 Gold.",
            description: "Six seeds — she belongs to two realms.",
            god: "Demeter",
            timing: {before_score:true,after_score:true}
        },
        {
            id: "anvil_of_hephaestus",
            name: "Anvil of Hephaestus",
            rarity: "rustic",
            cost: 3,
            sellValue: 1,
            effect: "This boon gains +2 Pips if 3 dice are the same.",
            description: "Every strike leaves the iron hotter.",
            god: "Hephaestus",
            timing: {before_score:true}
        },
        {
            id: "spoils_of_ares",
            name: "Spoils of Ares",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "+0.5 Favour and +4 Gold when you score The Spoils.",
            description: "Loot the field.",
            god: "Ares",
            timing: {before_score:true,after_score:true}
        },
        {
            id: "dionysus_revelry",
            name: "Dionysus' Revelry",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "When you score The Feast, gain a random Libation. This boon gains +4 Pips when you drink a Libation.",
            description: "The krater is the hand; the sip is the god.",
            god: "Dionysus",
            timing: {before_score:true,after_score:true}
        },
        {
            id: "caduceus_of_hermes",
            name: "Caduceus of Hermes",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "+3 Gold when you score a Straight.",
            description: "Walk the road, lift a fee.",
            god: "Hermes",
            timing: {after_score:true}
        },
        {
            id: "pythian_course",
            name: "Pythian Course",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "When you score The Long Course as 2-3-4-5-6, gain a random Blessing.",
            description: "The course that climbs. Not the low run.",
            god: "Apollo",
            timing: {after_score:true}
        },
        {
            id: "spectrum_of_iris",
            name: "Spectrum of Iris",
            rarity: "epic",
            cost: 8,
            sellValue: 2,
            effect: "When you score The Spectrum, +1 level to every lower pantheon row.",
            description: "The arc joins the houses.",
            god: "Iris",
            timing: {after_score:true}
        },
        {
            id: "asphodel_of_hades",
            name: "Asphodel of Hades",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "+4 Pips per filled scorecard row when you score The House.",
            description: "The shades are many.",
            god: "Hades",
            timing: {before_score:true}
        },
        {
            id: "the_lots_of_zeus",
            name: "The Lots of Zeus",
            rarity: "epic",
            cost: 8,
            sellValue: 2,
            effect: "When you score Heureka, +1 level to Heureka, The House, and Eights.",
            description: "Sky, sea, and the hall below.",
            god: "Zeus",
            timing: {after_score:true}
        },
        {
            id: "veil_of_nyx",
            name: "Veil of Nyx",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "+0.1 Favour per different face when you score Night.",
            description: "Everything lives in the dark.",
            god: "Nyx",
            timing: {before_score:true}
        },
        {
            id: "seven_sisters",
            name: "Seven Sisters",
            rarity: "epic",
            cost: 8,
            sellValue: 2,
            effect: "7s count toward Pips even when the row ignores them.",
            description: "They appear in every house, not only their own.",
            god: "The Pleiades",
            timing: {before_score:true}
        },
        {
            id: "trident_of_poseidon",
            name: "Trident of Poseidon",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "This boon gains +0.1 Favour every 8 times you score.",
            description: "The eighth wave.",
            god: "Poseidon",
            timing: {before_score:true,after_score:true}
        },
        {
            id: "nine_muses",
            name: "Nine Muses",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "+0.5 Favour if all 5 dice are enhanced when you score.",
            description: "They only sing together.",
            god: "The Nine Muses",
            timing: {before_score:true}
        },
        {
            id: "pandoras_jar",
            name: "Elpis in the Jar",
            rarity: "epic",
            cost: 8,
            sellValue: 2,
            effect: "When another boon is destroyed, this boon gains +10 Pips. This boon cannot be destroyed.",
            description: "Hope stays under the rim.",
            god: "Pandora",
            timing: {before_score:true}
        },
        {
            id: "sisyphus_boulder",
            name: "Sisyphus' Boulder",
            rarity: "vibrant",
            cost: 8,
            sellValue: 2,
            effect: "+5 Pips for every time you've rerolled this turn. Resets each turn.",
            god: "Sisyphus",
            timing: {before_score:true}
        },
        {
            id: "tantalus_curse",
            name: "Tantalus' Curse",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "+0.1 Favour for each gold you have, but cannot spend gold while active.",
            description: "Punishment eternal: wealth you cannot touch.",
            god: "Tantalus",
            timing: {before_score:true}
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
            timing: {before_score:true,after_score:true,turn_start:true,turn_end:true}
        },
        {
            id: "icarus_wings",
            name: "Wax Wings",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "This boon gains +0.1 Favour each time you reroll. If you use all rolls this turn, destroy this boon.",
            timing: {after_roll:true,before_score:true}
        },
        {
            id: "lethe_waters",
            name: "Forgetfulness",
            rarity: "rustic",
            cost: 4,
            sellValue: 2,
            effect: "After you score, strip all enhancements from the dice you just cashed. This boon gains +0.1 Favour per enhancement stripped.",
            timing: {before_score:true,after_score:true}
        },
        {
            id: "medusas_gaze",
            name: "Medusa's Gaze",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "Dice showing 6 cannot be rerolled. When you score: +6 Pips per 6 showing.",
            god: "Medusa",
            timing: {after_roll:true,before_score:true}
        },
        {
            id: "cerberus_watch",
            name: "Cerberus' Watch",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "The first 3 dice you hold this turn are watched. Score with all 3 still held: +9 Pips. Release or reroll any of them → no bonus.",
            description: "The gate does not open.",
            god: "Cerberus",
            timing: {before_score:true,turn_start:true}
        },
        {
            id: "trojan_horse",
            name: "Horse of Troy",
            rarity: "legendary",
            cost: 12,
            sellValue: 3,
            effect: "Does nothing until Turn 10. From Turn 10, Favour is ×2.",
            description: "Ten years, then the gates.",
            timing: {before_score:true},
            shopExclude: true
        },
        {
            id: "typhon",
            name: "Typhon Beneath",
            rarity: "rustic",
            cost: 3,
            sellValue: 1,
            effect: "For every 10 ones rolled this run (need not be scored), this boon gains +1 Pip.",
            description: "A hundred serpent heads.",
            god: "Typhon",
            timing: {after_roll:true,before_score:true}
        },
        {
            id: "cornucopia_of_ploutos",
            name: "Ploutos",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "At end of Trial, if you have less than 10 Gold, your Gold becomes 10.",
            description: "Whoever meets him, him he makes rich.",
            god: "Ploutos",
            timing: {ante_end:true}
        },
        {
            id: "the_odyssey",
            name: "Wanderings of Odysseus",
            rarity: "vibrant",
            cost: 5,
            sellValue: 1,
            effect: "When you fill the last empty category this Trial, gain +5 Pips per scratch this Trial.",
            description: "The last shore after the wrecks.",
            god: "Odysseus",
            timing: {after_score:true}
        },
        {
            id: "bellows_of_war",
            name: "Twenty Bellows",
            rarity: "epic",
            cost: 8,
            sellValue: 2,
            effect: "Whenever you score with 3+ matching dice (any row), this boon banks +3 Pips. When you score The Anvil, add the banked Pips to that score, then clear the bank.",
            description: "The bellows keep the forge hot.",
            god: "Hephaestus",
            timing: {before_score:true}
        },
        {
            id: "reflection_of_narcissus",
            name: "Reflection of Narcissus",
            rarity: "epic",
            cost: 11,
            sellValue: 3,
            effect: "At the start of each turn: +1 reroll. A random other boon is disabled. If this is your only boon, it disables itself until you gain another.",
            description: "He only looks at himself.",
            god: "Narcissus",
            timing: {turn_start:true}
        }
    ],

    worship: [
        // Planet-style. Consecration whisper is added by WorshipCard, not this string.
        { id: "worship_artemis", name: "Blessing of Artemis", god: "Artemis", rarity: "worship", cost: 3, effect: "Level up Ones. +1 Pips & +0.25 Favour." },
        { id: "worship_aphrodite", name: "Blessing of Aphrodite", god: "Aphrodite", rarity: "worship", cost: 3, effect: "Level up Twos. +2 Pips & +0.25 Favour." },
        { id: "worship_hecate", name: "Blessing of Hecate", god: "Hecate", rarity: "worship", cost: 3, effect: "Level up Threes. +3 Pips & +0.25 Favour." },
        { id: "worship_hera", name: "Blessing of Hera", god: "Hera", rarity: "worship", cost: 3, effect: "Level up Fours. +4 Pips & +0.25 Favour." },
        { id: "worship_athena", name: "Blessing of Athena", god: "Athena", rarity: "worship", cost: 3, effect: "Level up Fives. +5 Pips & +0.25 Favour." },
        { id: "worship_demeter", name: "Blessing of Demeter", god: "Demeter", rarity: "worship", cost: 3, effect: "Level up Sixes. +6 Pips & +0.25 Favour." },
        { id: "worship_hephaestus", name: "Blessing of Hephaestus", god: "Hephaestus", rarity: "worship", cost: 3, effect: "Level up The Anvil. +7 Pips & +0.25 Favour." },
        { id: "worship_ares", name: "Blessing of Ares", god: "Ares", rarity: "worship", cost: 3, effect: "Level up The Spoils. +15 Pips & +0.25 Favour." },
        { id: "worship_dionysus", name: "Blessing of Dionysus", god: "Dionysus", rarity: "worship", cost: 3, effect: "Level up The Feast. +12 Pips & +0.25 Favour." },
        { id: "worship_hermes", name: "Blessing of Hermes", god: "Hermes", rarity: "worship", cost: 3, effect: "Level up The Short Road. +10 Pips & +0.25 Favour." },
        { id: "worship_apollo", name: "Blessing of Apollo", god: "Apollo", rarity: "worship", cost: 3, effect: "Level up The Long Course. +20 Pips & +0.25 Favour." },
        { id: "worship_iris", name: "Blessing of Iris", god: "Iris", rarity: "worship", cost: 3, effect: "Level up The Spectrum. +30 Pips & +0.25 Favour." },
        { id: "worship_hades", name: "Blessing of Hades", god: "Hades", rarity: "worship", cost: 3, effect: "Level up The House. +25 Pips & +0.25 Favour." },
        { id: "worship_zeus", name: "Blessing of Zeus", god: "Zeus", rarity: "worship", cost: 3, effect: "Level up Heureka. +40 Pips & +0.25 Favour." },
        { id: "worship_nyx", name: "Blessing of Nyx", god: "Nyx", rarity: "worship", cost: 3, effect: "Level up Night. +0.25 Favour." },
        { id: "worship_pleiades", name: "Blessing of the Pleiades", god: "The Pleiades", rarity: "worship", cost: 3, effect: "Level up Sevens. +7 Pips & +0.25 Favour." },
        { id: "worship_poseidon_eights", name: "Blessing of Poseidon (Eights)", god: "Poseidon", rarity: "worship", cost: 3, effect: "Level up Eights. +8 Pips & +0.25 Favour." },
        { id: "worship_muses", name: "Blessing of the Nine Muses", god: "The Nine Muses", rarity: "worship", cost: 3, effect: "Level up Nines. +9 Pips & +0.25 Favour." },
        { id: "worship_pandora", name: "Blessing of Pandora's Jar", god: "Pandora's Jar", rarity: "worship", cost: 3, effect: "Level up The Jar." },
    ],

    libations: [
        // Libations from CSV database only
        { id: "kyphi_mead", name: "Kyphi Mead", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Parchment.", type: "instant" },
        { id: "tisane_hephaestus", name: "Tisane of Hephaestus", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Clockwork.", type: "instant" },
        { id: "ambrosial_krasi", name: "Ambrosial Krasi", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Gold.", type: "instant" },
        { id: "retsina_echoes", name: "Retsina of Echoes", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Mother of Pearl (adds left/right die).", type: "instant" },
        { id: "moly", name: "Moly", rarity: "libation", cost: 2, sellValue: 0, effect: "Add Wild to one die face. On roll: −1, 0, or +1.", type: "instant" },
        { id: "blessed_nectar", name: "Blessed Nectar", rarity: "libation", cost: 2, sellValue: 0, effect: "Enhance a die face to Blessed.", type: "instant" },
        { id: "kylix_wanderer", name: "Kylix of the Wanderer", rarity: "libation", cost: 3, sellValue: 0, effect: "Double your gold (max gain 20).", type: "instant" },
        { id: "elixir_lethe", name: "Elixir of Lethe", rarity: "libation", cost: 2, sellValue: 0, effect: "Reduce a die face by 1.", type: "instant" },
        { id: "chalice_helios", name: "Chalice of Helios", rarity: "libation", cost: 2, sellValue: 0, effect: "Increase a die face by 1.", type: "instant" },
        { id: "sponde", name: "Sponde", rarity: "libation", cost: 2, sellValue: 0, effect: "Gain +1 worship level in god of choice.", type: "instant" },
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
     * and one artifact is offered per trial (same card in every shop until bought or the
     * next trial).
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
                description: "The guide and thief has taken an interest in your haggling.",
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
                id: "artifact_bird_omens",
                name: "The Bird Omens",
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
                effect: "+1 die. All of its faces start as 1s. Opens from The Jar (dash 4).",
                description: "A spare knucklebone, called when five faces agree. Every face is a 1 until you drink Lethe or Helios onto it.",
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