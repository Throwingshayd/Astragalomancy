// Asset Mapping System - Maps card IDs to their corresponding image assets

const AssetMapping = {
    // Boon card art (id → filename under public/ART)
    boons: {
        'hestias_hearth': 'hestias hearth.png',
        'charons_ferry_fare': 'charon ferry fare.png',
        'the_gambler': 'the gambler.png',
        'achilles_heel': 'achiles heel.png',
        'midas_touch': 'midas touch.png',
        'icarus_wings': 'icarus wings.png',
        'lethe_waters': 'lethe waters.png',
        'forge_of_hephaestus': 'forge of hephestus.png',
        'prometheus_gift': 'promethues gift.png',
        'chaos_primordial': 'chaos primordial.png',
        'mt_olympus': 'Mt Olympus.png'
    },

    // Worship Card Assets
    worship: {
        'worship_artemis': 'artemis bow.png',
        'worship_aphrodite': 'persephone pomegranate.png',
        'worship_morpheus': 'morpheus poppy.png',
        'worship_hera': 'worship hera.png',
        'worship_athena': 'worship athena.png',
        'worship_heracles': 'worship heracles.png',
        'worship_hephaestus': 'worship heaphestus.png',
        'worship_ares': 'worship ares.png',
        'worship_dionysus': 'worship dionysus.png',
        'worship_hermes': 'worship hermes.png',
        'worship_apollo': 'worship apollo.png',
        'worship_zeus': 'worship zues.png', // Note: asset has typo "zues" instead of "zeus"
        'worship_nyx': 'worship nyx.png',
        'worship_pleiades': 'worship pleasdes.png', // Note: asset has typo "pleasdes" instead of "pleiades"
        'worship_poseidon_eights': 'worship posiedon.png', // Note: asset has typo "posiedon" instead of "poseidon"
        'worship_muses': 'worship muses.png'
    },

    // Libation Assets
    libations: {
        'kyphi_mead': 'mead.png',
        'tisane_hephaestus': 'tisane.png',
        'ambrosial_krasi': 'ambrosia.png',
        'retsina_echoes': 'retina of echoes.png',
        'soma_wild': 'soma of the wild.png',
        'kylix_hermit': 'kylix of hermit.png',
        'elixir_lethe': 'ekuxur of lethe.png',
        'chalice_helios': 'chalice of helios.png',
        'the_eucharist': 'the eucharist.png',
        'divine_guidance': 'dviine guidance.png'
    },

    // Artifact Assets - DISABLED: Artifacts now use fallback white box display
    artifacts: {
        // All artifacts will display as white boxes with text (no images)
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
        'worship': 'worship frame.png',
        'libation': 'libation frame.png'
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
        'parchment': null, // Now handled by CSS: .enh-parchment
        'iron': null, // Now handled by CSS: .enh-iron (1.5x favour if not selected)
        'gold': null, // Now handled by CSS: .enh-gold
        'mother_of_pearl': null, // Now handled by CSS: .enh-mother_of_pearl
        'mirror': null, // Now handled by CSS: .enh-mirror
        'wild': null, // Now handled by CSS: .enh-wild
        'cursed': null, // Now handled by CSS: .enh-cursed
        'sevens': null, // Now handled by CSS: .face-7
        'eights': null, // Now handled by CSS: .face-8
        'nines': null // Now handled by CSS: .face-9
    },

    // UI Assets (reserved for future getUIAsset use; paths must exist under public/ART)
    ui: {
        'diceTable': 'game-board.png',
        'rollButton': 'roll button.png',
        'title': 'Title art.png',
        'inGameTitle': 'in game title.png',
        'columnScroll': 'column scroll new.png',
        'shopfront': 'shopfront-boons-libations.png',
        'artifactsChestClosed': 'artifacts-chest-closed.png',
        'artifactsChestOpen': 'artifacts-chest-open.png',
        'playStelaPillar': 'play-stela-pillar.png',
        'pantheonFrieze': 'pantheon-frieze.png',
    },

    // Helper function to get asset path for a card
    getCardAsset(cardId, cardType) {
        if (cardType === 'boon') {
            return this.boons[cardId] || null;
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
    getArtifactAsset(_artifactId) {
        return null;
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssetMapping;
}
