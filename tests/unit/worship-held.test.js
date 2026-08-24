import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';

function loadWorshipCard() {
    globalThis.Card = class Card {
        constructor(data = {}) {
            Object.assign(this, data);
            this.isActive = data.isActive !== false;
            this.usesLeft = data.usesLeft ?? -1;
        }

        canUse() {
            return this.isActive && (this.usesLeft > 0 || this.usesLeft === -1);
        }

        render() {
            return {
                classList: { add() {} },
                dataset: {},
                getAttribute: () => '{}',
                setAttribute() {},
            };
        }

        toJSON() {
            return { id: this.id };
        }
    };
    const src = readFileSync('game/js/classes/WorshipCard.js', 'utf8');
    // eslint-disable-next-line no-eval
    eval(`${src}\nglobalThis.WorshipCard = WorshipCard;`);
}

describe('held blessing — one full Trial', () => {
    beforeAll(() => {
        globalThis.DEVOTION_TRIALS_TO_ASCEND = 1;
        loadWorshipCard();
    });

    function blessing(extra = {}) {
        return new globalThis.WorshipCard({
            id: 'worship_artemis',
            name: 'Blessing of Artemis',
            god: 'Artemis',
            category: 'Ones',
            ...extra,
        });
    }

    it('does not ascend a blessing granted mid-Trial', () => {
        const card = blessing();
        const state = { consumables: [card] };
        globalThis.WorshipCard.tickHeldDevotionTrials(state, null);
        expect(card.devotionAscended).toBe(false);
        expect(card.heldTrials).toBe(0);
    });

    it('ascends after one Trial held start to finish', () => {
        const card = blessing();
        const state = { consumables: [card] };
        globalThis.WorshipCard.markHeldAtTrialStart(state);
        expect(card.heldFromTrialStart).toBe(true);
        globalThis.WorshipCard.tickHeldDevotionTrials(state, { showMessage() {} });
        expect(card.devotionAscended).toBe(true);
        expect(card.heldTrials).toBe(1);
        expect(card.heldFromTrialStart).toBe(false);
    });
});
