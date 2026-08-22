import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8')
        .replace(
            `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
            `globalThis.${exportName} = ${exportName};`,
        );
    // eslint-disable-next-line no-eval
    eval(src);
}

describe('The Sixth Astragalus — extra die whose faces start as 1s', () => {
    beforeAll(() => {
        globalThis.GAME_BALANCE = {
            STARTING_DICE_COUNT: 5,
            MIN_DIE_FACE: 1,
            MAX_DIE_FACE: 6,
            MAX_DIE_FACE_WITH_ENHANCEMENTS: 9,
        };
        globalThis.Logger = { trace() {}, warn() {}, error() {}, debug() {}, info() {} };
        const dieSrc = `${readFileSync('game/js/classes/Die.js', 'utf8')}\nglobalThis.Die = Die;`;
        // eslint-disable-next-line no-eval
        eval(dieSrc);
        loadScript('game/js/game/ArtifactDice.js', 'ArtifactDice');
        loadScript('game/js/engine/DieScoreContribution.js', 'DieScoreContribution');
        loadScript('game/js/engine/ScoringEngine.js', 'ScoringEngine');
    });

    const fiveDice = () => Array.from({ length: 5 }, (_, i) => new globalThis.Die(i + 1));

    it('setAllModifiedFaces makes every physical face score as 1', () => {
        const die = new globalThis.Die(6);
        die.setAllModifiedFaces(1);
        for (let face = 1; face <= 6; face += 1) {
            die.currentFace = face;
            expect(die.getEffectiveFace()).toBe(1);
            expect(die.faces[face].value).toBe(face);
        }
    });

    it('Lethe on the showing face wraps a 1 to 9 without touching other faces', () => {
        const die = ArtifactDice.createOnesDie(6);
        die.currentFace = 4;
        expect(die.modifyFaceValue(die.currentFace, -1)).toBe(true);
        expect(die.getEffectiveFace()).toBe(9);
        die.currentFace = 2;
        expect(die.getEffectiveFace()).toBe(1);
    });

    it('ensure adds one all-1s die and pads held, without rewriting existing extra dice', () => {
        const state = {
            dice: fiveDice(),
            held: [true, false, false, false, true],
            artifacts: [{ id: ArtifactDice.ID }],
        };
        ArtifactDice.ensure(state);
        expect(state.dice).toHaveLength(6);
        expect(state.held).toEqual([true, false, false, false, true, false]);
        for (let face = 1; face <= 6; face += 1) {
            state.dice[5].currentFace = face;
            expect(state.dice[5].getEffectiveFace()).toBe(1);
        }

        state.dice[5].faces[3].modifiedValue = 9;
        ArtifactDice.ensure(state);
        expect(state.dice).toHaveLength(6);
        expect(state.dice[5].faces[3].modifiedValue).toBe(9);
    });

    it('Seventh Astragalus adds a Wild extra die after the all-1s Sixth', () => {
        const state = {
            dice: fiveDice(),
            held: Array(5).fill(false),
            artifacts: [{ id: ArtifactDice.ID }, { id: ArtifactDice.SEVENTH_ID }],
        };
        ArtifactDice.ensure(state);
        expect(state.dice).toHaveLength(7);
        for (let face = 1; face <= 6; face += 1) {
            expect(state.dice[5].faces[face].modifiedValue).toBe(1);
            expect(state.dice[6].faces[face].enhancements.has('wild')).toBe(true);
        }
    });

    it('does not add a sixth die without the artifact', () => {
        const state = { dice: fiveDice(), held: Array(5).fill(false), artifacts: [] };
        ArtifactDice.ensure(state);
        expect(state.dice).toHaveLength(5);
        expect(ArtifactDice.expectedCount(state)).toBe(5);
    });

    it('validateRun accepts six dice only when the artifact is owned', () => {
        const withArtifact = {
            dice: [...fiveDice(), ArtifactDice.createOnesDie(6)],
            artifacts: [{ id: ArtifactDice.ID }],
        };
        expect(ScoringEngine.validateRun(withArtifact, 'Ones').ok).toBe(true);

        const extraWithout = { dice: [...fiveDice(), ArtifactDice.createOnesDie(6)], artifacts: [] };
        expect(ScoringEngine.validateRun(extraWithout, 'Ones')).toEqual({ ok: false, reason: 'dice_count' });
    });
});

describe('Sixth Astragalus wiring', () => {
    it('shops from CardData, is granted through ArtifactEffects, and is not sliced off on load', () => {
        const data = readFileSync('game/js/data/gameData.js', 'utf8');
        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');
        const effects = readFileSync('game/js/game/ArtifactEffects.js', 'utf8');
        const html = readFileSync('game/index.html', 'utf8');
        const libation = readFileSync('game/js/classes/LibationCard.js', 'utf8');
        expect(data).toContain('artifact_sixth_astragalus');
        expect(data).toContain('The Sixth Astragalus');
        // The grant moved out of GameEngine when the effect hub was extracted.
        expect(effects).toContain('ArtifactDice.ensure(state)');
        expect(engine).toContain('ArtifactDice.expectedCount(this.state)');
        expect(engine).toContain('ArtifactDice.syncHeld(state)');
        expect(engine).not.toContain('this.state.dice.length !== 5');
        expect(html.indexOf('ArtifactDice.js')).toBeGreaterThan(-1);
        expect(html.indexOf('ArtifactDice.js')).toBeLessThan(html.indexOf('ArtifactEffects.js'));
        expect(html.indexOf('ArtifactEffects.js')).toBeLessThan(html.indexOf('GameEngine.js'));
        expect(libation).toContain("enhancementType === 'permanent_reduce'");
        expect(libation).toContain('die.currentFace');
    });
});
