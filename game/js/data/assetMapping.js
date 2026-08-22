// Asset Mapping System - Maps card IDs to their corresponding image assets

const AssetMapping = {
    // Boon card art (id → filename under public/ART)
    boons: {
        'achilles_heel': 'achilles heel.png',
        'apollos_oracle': 'apollos oracle.png',
        'ascetics_vow': 'ascetics vow.png',
        'assembly_of_heroes': 'assembly of heroes.png',
        'bellows_of_war': 'bellows of war.png',
        'betrayal_by_paris': 'betrayal by paris.png',
        'carillon_of_the_muses': 'carillon of the muses.png',
        'cerberus_watch': 'cerberus watch.png',
        'chaos_primordial': 'chaos primordial.png',
        'charons_ferry_fare': 'charon ferry fare.png',
        'cornucopia_of_ploutos': 'cornucopia of ploutos.png',
        'cycle_of_seasons': 'cycle of seasons.png',
        'demeters_harvest': 'demeters harvest.png',
        'dionysus_revelry': 'dionysus revelry.png',
        'divine_synergy': 'divine synergy.png',
        'doubling_season': 'doubling season.png',
        'early_bird': 'early bird.png',
        'eruption_of_etna': 'eruption of etna.png',
        'first_blood': 'first blood.png',
        'forge_of_hephaestus': 'forge of hephaestus.png',
        'gamblers_charm': 'gamblers charm.png',
        'gold_standard': 'gold standard.png',
        'golden_touch': 'golden touch.png',
        'hestias_hearth': 'hestias hearth.png',
        'hydras_heads': 'hydras heads.png',
        'icarus_wings': 'icarus wings.png',
        'journey_of_perseus': 'journey of perseus.png',
        'kronos_hourglass': 'kronos hourglass.png',
        'lethe_waters': 'lethe waters.png',
        'lucky_dice_bag': 'lucky dice bag.png',
        'marathon_runner': 'marathon runner.png',
        'mathematicians_compass': 'mathematicians compass.png',
        'medusas_gaze': 'medusas gaze.png',
        'message_in_a_bottle': 'message in a bottle.png',
        'midas_touch': 'midas touch.png',
        'midnight_oil': 'midnight oil.png',
        'misery': 'misery.png',
        'mortal_vineyard': 'mortal vineyard.png',
        'mt_olympus': 'Mt Olympus.png',
        'nyxian_seduction': 'nyxian seduction.png',
        'pandoras_jar': 'pandoras jar.png',
        'parmenides_die': 'parmenides die.png',
        'pegasus_flight': 'pegasus flight.png',
        'prime_time': 'prime time.png',
        'prometheus_gift': 'prometheus gift.png',
        'proteus_disguise': 'proteus disguise.png',
        'reckless_abandon': 'reckless abandon.png',
        'reflection_of_narcissus': 'reflection of narcissus.png',
        'sisyphus_boulder': 'sisyphus boulder.png',
        'smog_of_morpheus': 'smog of morpheus.png',
        'symmetry': 'symmetry.png',
        'tantalus_curse': 'tantalus curse.png',
        'the_gambler': 'the gambler.png',
        'the_heretic': 'the heretic.png',
        'the_locksmith': 'the locksmith.png',
        'the_merchant': 'the merchant.png',
        'the_odyssey': 'the odyssey.png',
        'the_symposium': 'the symposium.png',
        'the_zealot': 'the zealot.png',
        'trojan_horse': 'trojan horse.png',
        'typhon': 'typhon.png',
    },

    // Worship Card Assets
    worship: {
        'worship_artemis': 'artemis bow.png',
        'worship_aphrodite': 'persephone pomegranate.png',
        'worship_hecate': 'morpheus poppy.png', // placeholder until Hecate art ships
        'worship_hera': 'worship hera.png',
        'worship_athena': 'worship athena.png',
        'worship_demeter': 'worship heracles.png', // placeholder until Demeter art ships
        'worship_hephaestus': 'worship heaphestus.png',
        'worship_ares': 'worship ares.png',
        'worship_dionysus': 'worship dionysus.png',
        'worship_hermes': 'worship hermes.png',
        'worship_apollo': 'worship apollo.png',
        'worship_iris': 'worship hermes.png', // placeholder until Iris art ships
        'worship_hades': 'worship nyx.png', // placeholder until Hades art ships
        'worship_zeus': 'worship zues.png', // Note: asset has typo "zues" instead of "zeus"
        'worship_nyx': 'worship nyx.png',
        'worship_pleiades': 'worship pleasdes.png', // Note: asset has typo "pleasdes" instead of "pleiades"
        'worship_poseidon_eights': 'worship posiedon.png', // Note: asset has typo "posiedon" instead of "poseidon"
        'worship_muses': 'worship muses.png',
        'worship_pandora': 'worship pandora.png'
    },

    // Libation Assets
    libations: {
        'kyphi_mead': 'mead.png',
        'tisane_hephaestus': 'tisane.png',
        'ambrosial_krasi': 'ambrosia.png',
        'retsina_echoes': 'retina of echoes.png',
        'soma_wild': 'soma of the wild.png',
        'blessed_nectar': 'blessed nectar.png',
        'kylix_hermit': 'kylix of hermit.png',
        'elixir_lethe': 'ekuxur of lethe.png',
        'chalice_helios': 'chalice of helios.png',
        'the_eucharist': 'the eucharist.png',
        'divine_guidance': 'dviine guidance.png'
    },

    artifacts: {
        'artifact_temple_market': 'artifact-temple-market.png',
        'artifact_grand_agora': 'artifact-grand-agora.png',
        'artifact_clearance_sale': 'artifact-merchants-arrival.png',
        'artifact_hermes_bargain': 'artifact-hermes-bargain.png',
        'artifact_telescope': 'artifact-altar.png',
        'artifact_hecatomb': 'artifact-hecatomb.png',
        'artifact_hall_of_heroes': 'artifact-hall-of-heroes.png',
        'artifact_antimatter': 'artifact-antikythra.png',
        'artifact_panegyris': 'artifact-panegyris.png',
        'artifact_the_auspices': 'artifact-the-auspices.png',
        'artifact_symposium': 'artifact-symposium.png',
        'artifact_ganymedes_cup': 'artifact-ganymedes-cup.png',
        'artifact_sixth_astragalus': 'artifact-sixth-astragalus.png',
        'artifact_seventh_astragalus': 'artifact-seventh-astragalus.png',
        'artifact_plutus_seed': 'artifact-plutus-seed.png',
        'artifact_plutus_grove': 'artifact-plutus-grove.png',
        'artifact_delphic_tithe': 'artifact-delphic-tithe.png',
        'artifact_pythias_indulgence': 'artifact-pythias-indulgence.png',
        'artifact_tyches_grace': 'artifact-tyches-grace.png',
        'artifact_tyches_bounty': 'artifact-tyches-bounty.png',
    },

    // Pack Assets
    packs: {
        'boon': 'boon pack.png',
        'worship': 'worship pack.png',
        'libation': 'Libation pack.png',
        'chaos': 'chaos pack.png'
    },

    // Frame Assets
    frames: {
        'boon': null, // CSS-based frame for boons
        'worship': null, // worship art has the shrine frame drawn in ('worship frame.png' is the blank source)
        'libation': null, // libation art has its cup frame drawn in ('libation frame.png' is the blank source)
        'artifact': null // relic art has the bronze Greek-key frame drawn in
    },

    // Dice face sprite sheet (built from diceFaceSources via npm run build-dice-spritesheet)
    diceFaceSheet: 'dice-faces-sheet.png',

    /** Source PNGs for spritesheet rebuild — not loaded at runtime */
    diceFaceSources: {
        1: 'die face 1.png',
        2: 'die face 2.png',
        3: 'die face 3.png',
        4: 'die face 4.png',
        5: 'die face 5.png',
        6: 'die face 6.png',
        7: 'die face 7.png',
        8: 'die face 8.png',
        9: 'die face 9.png',
        'question': 'dice face question mark.png'
    },

    /** @deprecated use diceFaceSheet + CSS data-face; kept for getDiceFaceAsset compat */
    diceFaces: {
        1: 'die face 1.png',
        2: 'die face 2.png',
        3: 'die face 3.png',
        4: 'die face 4.png',
        5: 'die face 5.png',
        6: 'die face 6.png',
        7: 'die face 7.png',
        8: 'die face 8.png',
        9: 'die face 9.png',
        'question': 'dice face question mark.png'
    },

    // Die Face Enhancement Assets
    // NOTE: Enhancement visuals are now handled by CSS tinting instead of image assets
    enhancements: {
        'parchment': null, // CSS: .cw-tex-parchment
        'iron': null, // CSS: .cw-tex-clockwork
        'gold': null, // CSS: .cw-tex-gold
        'mother_of_pearl': null, // CSS: .cw-tex-pearl
        'mirror': null, // CSS: .cw-tex-mirror
        'blessed': null, // CSS: .cw-tex-blessed
        'wild': null, // Tooltip only — no die-face tint
        'sevens': null, // Spritesheet frame 7
        'eights': null, // Spritesheet frame 8
        'nines': null // Spritesheet frame 9
    },

    // UI Assets (reserved for future getUIAsset use; paths must exist under public/ART)
    ui: {
        'diceTable': 'game-board.png',
        'rollButton': 'roll button.png',
        'title': 'Title art.png',
        'mainMenuBackground': 'main-menu-background.png',
        'inGameTitle': 'in game title.png',
        'columnScroll': 'column scroll new.png',
        'shopfront': 'shopfront-boons-libations.png',
        'artifactsChestClosed': 'artifacts-chest-closed.png',
        'artifactsChestOpen': 'artifacts-chest-open.png',
        'goldInfoPlaque': 'gold-info-plaque.png',
        'playStelaPillar': 'play-stela-pillar.png',
        'consumableStelaPillar': 'consumable-stela-pillar.png',
        'pantheonFrieze': 'pantheon-frieze.png',
    },

    // Helper function to get asset path for a card
    getCardAsset(cardId, cardType) {
        if (cardType === 'boon') {
            return this.boons[cardId] || null;
        }
        if (cardType === 'artifact') {
            return this.getArtifactAsset(cardId);
        }

        // Map card types to the correct mapping keys
        const typeMapping = {
            'worship': 'worship',
            'libation': 'libations'
        };

        const mappingKey = typeMapping[cardType] || cardType;
        const mapping = this[mappingKey] || this.boons;
        return mapping[cardId] || null;
    },

    // Helper function to get frame asset for a card type
    getFrameAsset(cardType) {
        return this.frames[cardType] || null;
    },

    // Helper function to get dice face asset
    getDiceFaceAsset(face) {
        return this.diceFaceSheet || this.diceFaces[face] || this.diceFaces['question'];
    },

    getDiceFaceSheetPath() {
        return this.getAssetPath(this.diceFaceSheet);
    },

    // Helper function to get enhancement asset
    getEnhancementAsset(enhancement) {
        return this.enhancements[enhancement] || null;
    },

    // Helper function to get UI asset
    getUIAsset(assetName) {
        return this.ui[assetName] || null;
    },

    // Helper function to get artifact asset
    getArtifactAsset(artifactId) {
        return this.artifacts[artifactId] || 'artifact-relic.png';
    },

    // Helper function to get boon asset (returns mapped asset or null for white fallback)
    getBoonAsset(boonId) {
        return this.boons[boonId] || null;
    },

    // Helper function to get pack asset
    getPackAsset(packType) {
        return this.packs[packType] || null;
    },

    // Helper function to get full asset path
    getAssetPath(assetName) {
        if (!assetName) return null;
        return `ART/${assetName}`;
    }
};

if (typeof window !== 'undefined') {
    window.AssetMapping = AssetMapping;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetMapping;
}
