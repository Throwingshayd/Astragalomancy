import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8').replace(
        `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
        `globalThis.${exportName} = ${exportName};`,
    );
    eval(src);
}

function die(face, extras = {}) {
    const enhancements = new Set(extras.enhancements || []);
    return {
        face,
        currentFace: face,
        getEffectiveFace: () => face,
        faces: { [face]: { enhancements } },
    };
}

describe('NearMissBoonHandlers', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        globalThis.GAME_BALANCE = { STARTING_ROLLS: 3 };
        loadScript('game/js/game/NearMissBoonHandlers.js', 'NearMissBoonHandlers');
    });

    const H = () => globalThis.NearMissBoonHandlers;

    it('Elpis gains +10 Pips when another boon is destroyed and cannot die', () => {
        const elpis = { id: 'pandoras_jar', name: 'Elpis', dynamicStats: {} };
        const victim = { id: 'sisyphus_boulder', name: 'Sisyphus' };
        const state = { boons: [elpis, victim] };
        expect(H().destroyBoon(state, elpis, null)).toBe(false);
        expect(state.boons).toHaveLength(2);
        expect(H().destroyBoon(state, victim, null)).toBe(true);
        expect(state.boons).toHaveLength(1);
        expect(elpis.elpisPips).toBe(10);
    });

    it('Typhon gains +1 Pip every 10 ones rolled', () => {
        const boon = { id: 'typhon', typhonOnes: 0, typhonPips: 0, dynamicStats: {} };
        const state = {
            held: [false, false, false, false, false],
            dice: [die(1), die(1), die(1), die(1), die(1)],
            boons: [boon],
        };
        H().afterRoll(boon, state, null, { isReroll: false, rollsLeftAfter: 2 });
        expect(boon.typhonOnes).toBe(5);
        expect(boon.typhonPips || 0).toBe(0);
        H().afterRoll(boon, state, null, { isReroll: true, rollsLeftAfter: 1 });
        expect(boon.typhonOnes).toBe(10);
        expect(boon.typhonPips).toBe(1);
        const result = { pips: 0, isValid: true };
        H().beforeScore(boon, state, result, null);
        expect(result.pips).toBe(1);
    });

    it('Cerberus pays +9 only if the watched three stay held', () => {
        const boon = { id: 'cerberus_watch', dynamicStats: {} };
        const state = {
            held: [true, true, true, false, false],
            cerberusWatched: [0, 1, 2],
            cerberusBroken: false,
            dice: [die(2), die(3), die(4), die(5), die(6)],
            boons: [boon],
        };
        const ok = { pips: 10, isValid: true, category: 'Chance' };
        H().beforeScore(boon, state, ok, null);
        expect(ok.pips).toBe(19);

        state.cerberusBroken = true;
        const bad = { pips: 10, isValid: true, category: 'Chance' };
        H().beforeScore(boon, state, bad, null);
        expect(bad.pips).toBe(10);
    });

    it('Medusa pays +6 Pips per six showing', () => {
        const boon = { id: 'medusas_gaze', dynamicStats: {} };
        const result = { pips: 0, isValid: true };
        H().beforeScore(boon, {
            dice: [die(6), die(6), die(1), die(2), die(3)],
            boons: [boon],
        }, result, null);
        expect(result.pips).toBe(12);
    });

    it('Twenty Bellows banks on triples and dumps into The Anvil', () => {
        const boon = { id: 'bellows_of_war', bellowsBank: 0, dynamicStats: {} };
        const state = {
            dice: [die(4), die(4), die(4), die(1), die(2)],
            boons: [boon],
        };
        const chance = { pips: 5, isValid: true, category: 'Chance' };
        H().beforeScore(boon, state, chance, null);
        expect(boon.bellowsBank).toBe(3);
        expect(chance.pips).toBe(5);

        const anvil = { pips: 20, isValid: true, category: 'Three of a Kind' };
        H().beforeScore(boon, state, anvil, null);
        expect(anvil.pips).toBe(26); // +3 bank this score then dump 6? bank was 3, +3 = 6, dump 6
        expect(boon.bellowsBank).toBe(0);
    });

    it('Ploutos floors Gold under 10 at Trial end', () => {
        const boon = { id: 'cornucopia_of_ploutos' };
        const state = { gold: 4, boons: [boon] };
        H().anteEnd(boon, state, null);
        expect(state.gold).toBe(10);
        H().anteEnd(boon, state, null);
        expect(state.gold).toBe(10);
    });

    it('Narcissus disables itself when alone', () => {
        const boon = {
            id: 'reflection_of_narcissus',
            _randomInt: () => 0,
        };
        const state = { rollsLeft: 3, boons: [boon] };
        H().turnStart(boon, state, null);
        expect(state.narcissusSelfDisabled).toBe(true);
        expect(state.rollsLeft).toBe(3);
    });

    it('Horse sets favourMultiplier from Turn 10', () => {
        const state = {
            turn: 10,
            boons: [{ id: 'trojan_horse' }],
        };
        expect(H().syncHorseFavourMultiplier(state)).toBe(true);
        expect(state.favourMultiplier).toBe(2);
        expect(state.boonMultiplier).toBe(1);
    });

    it('Forgetfulness strips enhancements and stacks Favour', () => {
        const boon = { id: 'lethe_waters', letheFavour: 0, dynamicStats: {} };
        const d = die(5, { enhancements: ['iron', 'blessed'] });
        const state = { dice: [d], boons: [boon] };
        H().afterScore(boon, state, { isValid: true }, null);
        expect(d.faces[5].enhancements.size).toBe(0);
        expect(boon.letheFavour).toBe(20);
        const result = { favour: 100, isValid: true };
        H().beforeScore(boon, state, result, null);
        expect(result.favour).toBe(120);
    });
});
