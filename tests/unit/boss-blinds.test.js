import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';

function loadScript(path, assign) {
    let src = readFileSync(path, 'utf8');
    if (assign) src = src.replace(assign.from, assign.to);
    // eslint-disable-next-line no-eval
    eval(src);
}

describe('BlindDirector boss blinds', () => {
    beforeAll(() => {
        globalThis.DEBUG_FLAGS = { BOSS_BLINDS_DISABLED: false };
        const anteSrc = `${readFileSync('game/js/data/AnteData_js.js', 'utf8')}
globalThis.AnteData = AnteData;
globalThis.getAnteData = getAnteData;`;
        // eslint-disable-next-line no-eval
        eval(anteSrc);
        loadScript('game/js/game/BlindDirector.js', {
            from: "if (typeof window !== 'undefined') window.BlindDirector = BlindDirector;",
            to: 'globalThis.BlindDirector = BlindDirector;',
        });
    });

    const prng = (...vals) => {
        let i = 0;
        return { random: () => (i < vals.length ? vals[i++] : 0) };
    };

    it('ante 1 is always No Blind and keeps the 200 threshold', () => {
        const plan = globalThis.BlindDirector.planAnte({ ante: 1 }, prng(0.9));
        expect(plan.blindId).toBe('none');
        expect(plan.scoreThreshold).toBe(200);
        expect(plan.name).toBe('The Fool');
    });

    it('later antes pick a playable blind via prng, never none', () => {
        const plan = globalThis.BlindDirector.planAnte({ ante: 4, lastBlindId: 'none' }, prng(0));
        expect(plan.blindId).not.toBe('none');
        expect(globalThis.BlindDirector.playableIds).toContain(plan.blindId);
        expect(plan.scoreThreshold).toBe(600);
        expect(plan.name).toBe('The Empress');
    });

    it('same seed sequence yields the same blind', () => {
        const a = globalThis.BlindDirector.planAnte({ ante: 3, lastBlindId: 'none' }, prng(0.42));
        const b = globalThis.BlindDirector.planAnte({ ante: 3, lastBlindId: 'none' }, prng(0.42));
        expect(a.blindId).toBe(b.blindId);
    });

    it('does not repeat the previous blind when another option exists', () => {
        const first = globalThis.BlindDirector.playableIds[0];
        const plan = globalThis.BlindDirector.planAnte({ ante: 5, lastBlindId: first }, prng(0));
        expect(plan.blindId).not.toBe(first);
    });

    it('score_penalty raises the ante curve by 50% and shows that number', () => {
        const ids = globalThis.BlindDirector.playableIds;
        const penaltyIdx = ids.indexOf('score_penalty');
        const roll = (penaltyIdx + 0.01) / ids.length;
        const plan = globalThis.BlindDirector.planAnte({ ante: 4, lastBlindId: 'none' }, prng(roll));
        expect(plan.blindId).toBe('score_penalty');
        expect(plan.scoreThreshold).toBe(900);
    });

    it('DEBUG_FLAGS disables assignment to none', () => {
        globalThis.DEBUG_FLAGS.BOSS_BLINDS_DISABLED = true;
        const plan = globalThis.BlindDirector.planAnte({ ante: 8, lastBlindId: 'none' }, prng(0.5));
        expect(plan.blindId).toBe('none');
        expect(plan.scoreThreshold).toBe(2070);
        globalThis.DEBUG_FLAGS.BOSS_BLINDS_DISABLED = false;
    });

    it('the ante curve carries names and thresholds only — blinds live here', () => {
        // Blinds are rolled per run, so a fixed blind per ante would be a lie in the data.
        const src = readFileSync('game/js/data/AnteData_js.js', 'utf8');
        expect(src).not.toMatch(/blindId|blindName|blindEffect/);
        globalThis.AnteData.forEach((entry) => {
            expect(typeof entry.name).toBe('string');
            expect(typeof entry.scoreThreshold).toBe('number');
        });
    });

    it('hold rules: Rolling Stones blocks all holds, Iron Fist caps at 3', () => {
        const stones = { activeBlind: 'no_held_dice', held: [false, false, false, false, false], boons: [], turn: 8 };
        expect(globalThis.BlindDirector.denyHold(stones, 0)).toMatch(/Rolling Stones/);
        const fist = { activeBlind: 'max_3_hold', held: [true, true, true, false, false], boons: [], maxHeld: 5, turn: 8 };
        expect(globalThis.BlindDirector.denyHold(fist, 3)).toMatch(/3 dice/);
        expect(globalThis.BlindDirector.denyHold(fist, 0)).toBeNull();
    });

    it('use blocks match Sacred Silence / Solitary Path', () => {
        expect(globalThis.BlindDirector.blocksWorship({ activeBlind: 'no_worship', turn: 8 })).toBe(true);
        expect(globalThis.BlindDirector.blocksWorship({ activeBlind: 'half_upper_pips', turn: 8 })).toBe(false);
        expect(globalThis.BlindDirector.blocksLibations({ activeBlind: 'no_consumables', turn: 8 })).toBe(true);
        expect(globalThis.BlindDirector.blocksLibations({ activeBlind: 'no_worship', turn: 8 })).toBe(false);
        expect(globalThis.BlindDirector.getDef('no_worship').blindEffect).toMatch(/Cannot use Worship/i);
    });

    it('The Hook snatches one held die via prng', () => {
        const held = [true, true, true, true, false];
        const messages = [];
        const yanked = globalThis.BlindDirector.applyHook({
            state: { activeBlind: 'hook_yank', held, turn: 8 },
            prng: prng(0),
            showMessage: (m) => messages.push(m),
        });
        expect(yanked).toBe(1);
        expect(held).toEqual([false, true, true, true, false]);
        expect(messages[0]).toMatch(/Hook snatched a held die/);
        expect(globalThis.BlindDirector.applyHook({
            state: { activeBlind: 'half_upper_pips', held: [true, true, true, true, true], turn: 8 },
            prng: prng(0),
        })).toBe(0);
    });

    it('the boss only holds the last stretch — turns 1–7 play clean', () => {
        const B = globalThis.BlindDirector;
        expect(B.shopTurns).toEqual([4, 8]);
        expect(B.bossSegmentStartTurn).toBe(8);

        const early = { activeBlind: 'no_held_dice', held: [false, false, false, false, false], boons: [], turn: 7 };
        expect(B.isLive(early)).toBe(false);
        expect(B.liveBlind(early)).toBeNull();
        expect(B.denyHold(early, 0)).toBeNull();
        expect(B.blocksWorship({ activeBlind: 'no_worship', turn: 3 })).toBe(false);
        expect(B.blocksLibations({ activeBlind: 'no_consumables', turn: 7 })).toBe(false);
        expect(B.applyHook({ state: { activeBlind: 'hook_yank', held: [true, true], turn: 7 }, prng: prng(0) })).toBe(0);
        expect(B.denyScore({ activeBlind: 'the_eye', eyeFloorRank: 5, turn: 7 }, 'Ones')).toBeNull();

        // Same blind, one turn later — now it bites.
        const late = { ...early, turn: 8 };
        expect(B.isLive(late)).toBe(true);
        expect(B.denyHold(late, 0)).toMatch(/Rolling Stones/);
    });

    it('The Eye ladder only starts recording once the boss segment does', () => {
        const B = globalThis.BlindDirector;
        const state = { activeBlind: 'the_eye', eyeFloorRank: -1, turn: 4 };
        B.recordScore(state, 'Yahtzee');
        expect(state.eyeFloorRank).toBe(-1);
        state.turn = 8;
        B.recordScore(state, 'Fours');
        expect(state.eyeFloorRank).toBe(B.scoreLadder.indexOf('Fours'));
    });

    it('The Eye is a showdown: always last trial, suicide ladder upward only', () => {
        expect(globalThis.BlindDirector.playableIds).not.toContain('the_eye');
        expect(globalThis.BlindDirector.isShowdownAnte(12)).toBe(true);
        expect(globalThis.BlindDirector.isShowdownAnte(24)).toBe(true);
        expect(globalThis.BlindDirector.isShowdownAnte(4)).toBe(false);
        const finale = globalThis.BlindDirector.planAnte({ ante: 12, lastBlindId: 'hook_yank' }, prng(0));
        expect(finale.blindId).toBe('the_eye');
        expect(finale.blindName).toBe('The Eye');
        expect(finale.scoreThreshold).toBe(7000);
        const mid = globalThis.BlindDirector.planAnte({ ante: 4, lastBlindId: 'none' }, prng(0));
        expect(mid.blindId).not.toBe('the_eye');

        const state = { activeBlind: 'the_eye', eyeFloorRank: -1, turn: 8 };
        expect(globalThis.BlindDirector.denyScore(state, 'Ones')).toBeNull();
        globalThis.BlindDirector.recordScore(state, 'Ones');
        expect(globalThis.BlindDirector.denyScore(state, 'Fours')).toBeNull();
        globalThis.BlindDirector.recordScore(state, 'Fours');
        expect(globalThis.BlindDirector.denyScore(state, 'Twos')).toMatch(/behind you/);
        expect(globalThis.BlindDirector.denyScore(state, 'Threes')).toMatch(/behind you/);
        expect(globalThis.BlindDirector.denyScore(state, 'Fives')).toBeNull();
        expect(globalThis.BlindDirector.denyScore(state, 'Fours')).toBeNull();
    });

    it('GameEngine delegates ante start and does not grow the overlay in-place', () => {
        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');
        const html = readFileSync('game/index.html', 'utf8');
        expect(engine).toContain('BlindDirector.startAnte(this)');
        expect(engine).not.toContain('showAnteTransition');
        expect(engine).not.toContain('finalizeAnteStart');
        expect(html.indexOf('BlindDirector.js')).toBeGreaterThan(-1);
        expect(html.indexOf('BlindDirector.js')).toBeLessThan(html.indexOf('GameEngine.js'));
    });
});
