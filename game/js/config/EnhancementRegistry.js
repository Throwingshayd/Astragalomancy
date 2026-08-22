/* exported EnhancementRegistry */
/**
 * EnhancementRegistry - single source of truth for enhancement display + UI metadata.
 *
 * Internal enhancement ids (e.g. 'iron') are stable for saves/logic.
 * Display language can change (e.g. iron/steel => Clockwork) via this registry.
 *
 * tooltipDesc: one clean line for die tooltips (shop cards use gameData effect text).
 */
const EnhancementRegistry = {
    get(id) {
        return this._defs[id] || null;
    },

    displayName(id) {
        return this._defs[id]?.displayName || id;
    },

    oneLiner(id) {
        return this._defs[id]?.oneLiner || '';
    },

    triggerLine(id) {
        return this._defs[id]?.triggerLine || '';
    },

    tooltipDesc(id) {
        return this._defs[id]?.tooltipDesc || '';
    },

    ui(id) {
        return this._defs[id]?.ui || {};
    },

    textureClasses() {
        return Object.values(this._defs)
            .map((d) => d.ui?.textureClass)
            .filter(Boolean);
    },

    _defs: {
        parchment: {
            id: 'parchment',
            displayName: 'Parchment',
            oneLiner: '25% +1 Favour • 15% +5 Gold',
            triggerLine: 'When scored',
            tooltipDesc: 'When scored: 25% +1 Favour, 15% +5 Gold.',
            ui: { chipColor: '#c9a36a', textureClass: 'cw-tex-parchment' }
        },
        iron: {
            id: 'iron',
            displayName: 'Clockwork',
            oneLiner: '+5 Pips',
            triggerLine: 'When scored',
            tooltipDesc: 'When scored: +5 Pips.',
            ui: { chipColor: '#7aa6c2', textureClass: 'cw-tex-clockwork' }
        },
        gold: {
            id: 'gold',
            displayName: 'Gold',
            oneLiner: '+1 Gold',
            triggerLine: 'When scored',
            tooltipDesc: 'When scored: +1 Gold.',
            ui: { chipColor: '#f6c343', textureClass: 'cw-tex-gold' }
        },
        mother_of_pearl: {
            id: 'mother_of_pearl',
            displayName: 'Mother of Pearl',
            oneLiner: '+ adjacent value',
            triggerLine: 'When scored',
            tooltipDesc: 'When scored: add left or right die (50/50).',
            ui: { chipColor: '#d6d0ff', textureClass: 'cw-tex-pearl' }
        },
        wild: {
            id: 'wild',
            displayName: 'Wild',
            oneLiner: '−1 / 0 / +1 on roll',
            triggerLine: 'On roll',
            tooltipDesc: 'On roll: face becomes −1, 0, or +1.',
            ui: { chipColor: '#a78bfa', textureClass: null }
        },
        mirror: {
            id: 'mirror',
            displayName: 'Mirror',
            oneLiner: 'Scores twice',
            triggerLine: 'When scored',
            tooltipDesc: 'When scored: counts twice (incl. other effects).',
            ui: { chipColor: '#e9e7ff', textureClass: 'cw-tex-mirror' }
        },
    }
};

if (typeof window !== 'undefined') window.EnhancementRegistry = EnhancementRegistry;

