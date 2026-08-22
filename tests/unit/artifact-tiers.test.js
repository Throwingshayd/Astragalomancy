/**
 * Artifacts are two-tier: ten families, base then upgrade, 10 gold each, one per trial.
 * apply() is additive and safe to call again. Every shipped id has a handler.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';

function loadScript(path, exportName) {
    const src = readFileSync(path, 'utf8')
        .replace(
            `if (typeof window !== 'undefined') window.${exportName} = ${exportName};`,
            `globalThis.${exportName} = ${exportName};`,
        );
    // eslint-disable-next-line no-eval
    eval(src);
}

/** Every artifact family in ship order, flattened to { id, tier, cost }. */
function rosterFromData() {
    const src = readFileSync('game/js/data/gameData.js', 'utf8');
    const block = src.slice(src.indexOf('    artifacts: {'), src.indexOf('    getAllCards:'));
    const entries = [...block.matchAll(/(base|upgraded):\s*\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*cost:\s*(\d+)/g)];
    return entries.map(([, tier, id, name, cost]) => ({ tier, id, name, cost: Number(cost) }));
}

describe('artifact roster', () => {
    const roster = rosterFromData();

    it('is ten families, every one of them a base plus an upgrade', () => {
        expect(roster.filter((a) => a.tier === 'base')).toHaveLength(10);
        expect(roster.filter((a) => a.tier === 'upgraded')).toHaveLength(10);
    });

    it('prices every tier at a flat 10 gold', () => {
        roster.forEach((a) => expect(a.cost).toBe(10));
        const constants = readFileSync('game/js/config/GameConstants.js', 'utf8');
        expect(constants).toMatch(/ARTIFACT_BASE_COST:\s*10/);
        expect(constants).toMatch(/ARTIFACT_UPGRADED_COST:\s*10/);
    });

    it('uses no id twice', () => {
        const ids = roster.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('maps every shipped artifact to art that exists on disk', () => {
        const mapping = readFileSync('game/js/data/assetMapping.js', 'utf8');
        const block = mapping.slice(mapping.indexOf('    artifacts: {'), mapping.indexOf('    // Pack Assets'));
        roster.forEach(({ id }) => {
            const file = block.match(new RegExp(`'${id}':\\s*'([^']+\\.png)'`));
            expect(file, `${id} has no artifacts mapping`).not.toBeNull();
            expect(existsSync(path.join('game', 'public', 'ART', file[1])), `${file[1]} missing`).toBe(true);
        });
    });

    it('paints relic art from AssetMapping, not window.AssetMapping', () => {
        const src = readFileSync('game/js/classes/Artifact.js', 'utf8');
        expect(src).toContain("typeof AssetMapping !== 'undefined'");
        expect(src).not.toContain('window.AssetMapping');
        expect(src).toContain('getArtifactAsset');
    });
});

describe('ArtifactEffects', () => {
    beforeAll(() => {
        globalThis.window = globalThis;
        globalThis.GAME_BALANCE = {
            STARTING_BOON_SLOTS: 5,
            STARTING_WORSHIP_SLOTS: 2,
            STARTING_LIBATION_SLOTS: 3,
            STARTING_ROLLS: 3,
            SHOP_REROLL_COST: 4,
            MAX_INTEREST: 5,
        };
        loadScript('game/js/game/ArtifactEffects.js', 'ArtifactEffects');
    });

    const own = (...ids) => ({ artifacts: ids.map((id) => ({ id })) });

    it('has a handler for every artifact that ships in the data', () => {
        const handled = Object.keys(globalThis.ArtifactEffects.CONTRIBUTIONS);
        const shipped = rosterFromData().map((a) => a.id);
        // Altar was sold for 10 gold with no handler at all; this is that bug's tripwire.
        expect(shipped.filter((id) => !handled.includes(id))).toEqual([]);
    });

    it('ships no handler for an artifact that does not exist', () => {
        const handled = Object.keys(globalThis.ArtifactEffects.CONTRIBUTIONS);
        const shipped = rosterFromData().map((a) => a.id);
        expect(handled.filter((id) => !shipped.includes(id))).toEqual([]);
    });

    it('leaves the run at baseline when nothing is owned', () => {
        const d = globalThis.ArtifactEffects.derive({ artifacts: [] });
        expect(d).toMatchObject({
            boonSlots: 5, worshipSlots: 2, libationSlots: 3,
            shopDiscount: 0, worshipLevelFavourScale: 1, extraDice: 0,
            maxInterest: 5, rerollDiscount: 0,
        });
    });

    it('stacks an upgrade on top of its base rather than replacing it', () => {
        const e = globalThis.ArtifactEffects;
        expect(e.derive(own('artifact_temple_market')).shopWares).toBe(1);
        expect(e.derive(own('artifact_temple_market', 'artifact_grand_agora')).shopWares).toBe(2);

        expect(e.derive(own('artifact_clearance_sale')).shopDiscount).toBe(0.25);
        expect(e.derive(own('artifact_clearance_sale', 'artifact_hermes_bargain')).shopDiscount).toBe(0.5);

        expect(e.derive(own('artifact_telescope')).worshipLevelFavourScale).toBe(2);
        expect(e.derive(own('artifact_telescope', 'artifact_hecatomb')).worshipLevelFavourScale).toBe(2);
        expect(e.derive(own('artifact_hecatomb')).boonSellAtCost).toBe(true);

        expect(e.derive(own('artifact_plutus_seed')).maxInterest).toBe(10);
        expect(e.derive(own('artifact_plutus_seed', 'artifact_plutus_grove')).maxInterest).toBe(20);

        expect(e.derive(own('artifact_tyches_grace')).trialGold).toBe(4);
        expect(e.derive(own('artifact_tyches_grace', 'artifact_tyches_bounty')).trialGold).toBe(8);
        expect(e.derive(own('artifact_pythias_indulgence')).forceSingleRoll).toBe(true);
    });

    it('does not compound when applied repeatedly', () => {
        const e = globalThis.ArtifactEffects;
        const state = own(
            'artifact_antimatter',
            'artifact_hall_of_heroes',
            'artifact_plutus_seed',
            'artifact_tyches_grace',
        );

        e.apply(state);
        const first = { ...state };
        e.apply(state);
        e.apply(state);

        expect(state.boonSlots).toBe(first.boonSlots);
        expect(state.boonSlots).toBe(6);
        expect(state.libationSlots).toBe(3);
        expect(state.worshipSlots).toBe(2);
        expect(state.consumableSlots).toBe(5);
        expect(state.maxInterest).toBe(10);
        expect(state.trialGold).toBe(4);
        expect(e.rollsPerTurn(state)).toBe(3);
        expect(e.trialStartGold(state)).toBe(4);
        expect(e.packRevealCount(state, 'boon')).toBe(4);
    });

    it('reads the same however the artifacts are ordered', () => {
        const e = globalThis.ArtifactEffects;
        const forward = e.derive(own('artifact_clearance_sale', 'artifact_hermes_bargain'));
        const reverse = e.derive(own('artifact_hermes_bargain', 'artifact_clearance_sale'));
        expect(forward).toEqual(reverse);
    });

    it('Delphic Tithe cheapens shop rerolls; Pythia takes your dice rerolls instead', () => {
        const e = globalThis.ArtifactEffects;
        expect(e.rerollCost({})).toBe(4);

        const tithe = own('artifact_delphic_tithe');
        e.apply(tithe);
        expect(e.rerollCost(tithe)).toBe(2);

        const both = own('artifact_delphic_tithe', 'artifact_pythias_indulgence');
        e.apply(both);
        expect(e.rerollCost(both)).toBe(2);
        expect(e.rollsPerTurn(both)).toBe(1);
        expect(e.sellPayout(own('artifact_hecatomb'), { type: 'boon', cost: 8, sellValue: 2 })).toBe(8);
        expect(e.sellPayout({}, { type: 'boon', cost: 8, sellValue: 2 })).toBe(2);
    });

    it('never lets the shop discount pay the player', () => {
        const e = globalThis.ArtifactEffects;
        const absurd = { artifacts: Array.from({ length: 12 }, () => ({ id: 'artifact_clearance_sale' })) };
        expect(e.derive(absurd).shopDiscount).toBe(0.9);
        e.apply(absurd);
        expect(absurd.shopPriceMultiplier).toBeGreaterThan(0);
    });

    it('ignores an unknown id instead of throwing', () => {
        expect(() => globalThis.ArtifactEffects.derive(own('artifact_from_a_future_save'))).not.toThrow();
        expect(globalThis.ArtifactEffects.derive(own('artifact_from_a_future_save')).boonSlots).toBe(5);
    });

    it('widens the matching pack and leaves the others at three', () => {
        const e = globalThis.ArtifactEffects;
        const state = own('artifact_hall_of_heroes', 'artifact_panegyris', 'artifact_symposium');
        expect(e.packRevealCount(state, 'boon')).toBe(4);
        expect(e.packRevealCount(state, 'worship')).toBe(4);
        expect(e.packRevealCount(state, 'libation')).toBe(4);
        expect(e.packRevealCount({}, 'boon')).toBe(3);
        expect(e.packRevealCount(own('artifact_antimatter'), 'boon')).toBe(3);
    });

    it('pins a worship pack to the highest god and a libation pack to the most poured drink', () => {
        const e = globalThis.ArtifactEffects;
        const worshipPool = [
            { id: 'worship_zeus', god: 'Zeus' },
            { id: 'worship_athena', god: 'Athena' },
        ];
        const libationPool = [
            { id: 'kyphi_mead' },
            { id: 'tisane_hephaestus' },
        ];

        const worshipState = {
            artifacts: [{ id: 'artifact_the_auspices' }],
            worshipLevels: { Zeus: 1, Athena: 4 },
        };
        expect(e.guaranteedPackCard(worshipState, 'worship', worshipPool).id).toBe('worship_athena');
        expect(e.guaranteedPackCard({ artifacts: [{ id: 'artifact_the_auspices' }] }, 'worship', worshipPool)).toBeNull();

        const pourState = {
            artifacts: [{ id: 'artifact_ganymedes_cup' }],
            libationPours: { kyphi_mead: 2, tisane_hephaestus: 5 },
        };
        expect(e.guaranteedPackCard(pourState, 'libation', libationPool).id).toBe('tisane_hephaestus');
        expect(e.guaranteedPackCard(pourState, 'libation', [{ id: 'ambrosial_krasi' }])).toBeNull();
    });

    it('counts a libation pour without compounding a missing id', () => {
        const e = globalThis.ArtifactEffects;
        const state = {};
        e.noteLibationPour(state, 'kyphi_mead');
        e.noteLibationPour(state, 'kyphi_mead');
        e.noteLibationPour(state, null);
        expect(state.libationPours).toEqual({ kyphi_mead: 2 });
        expect(e.mostPouredLibationId(state)).toBe('kyphi_mead');
    });
});

describe('one artifact per shop', () => {
    it('stocks one eligible artifact on every shop visit', () => {
        const gen = readFileSync('game/js/engine/ShopStockGenerator.js', 'utf8');
        expect(gen).not.toContain('shopIsTrialReward');
        expect(gen).toContain('pool[Math.floor(prng.random() * pool.length)]');
        expect(gen).toContain('return [artifact]');
    });

    it('offers an upgrade only once its base is owned', () => {
        const gen = readFileSync('game/js/engine/ShopStockGenerator.js', 'utf8');
        expect(gen).toContain('if (!purchasedIds.has(pair.base.id))');
        expect(gen).toContain('} else if (pair.upgraded && !purchasedIds.has(pair.upgraded.id))');
    });

    it('asks ArtifactEffects how many cards a pack reveals, and for the Telescope pin', () => {
        const gen = readFileSync('game/js/engine/ShopStockGenerator.js', 'utf8');
        expect(gen).toContain('ArtifactEffects.packRevealCount(gameState, packData.type)');
        expect(gen).toContain('ArtifactEffects.guaranteedPackCard(gameState, packData.type, poolFor(selected))');
        expect(gen).not.toContain('const numCards = 3;');
    });
});

describe('Trojan Horse', () => {
    it('sets boon multiplier from the current trial, not a leftover flag', () => {
        const engine = readFileSync('game/js/game/GameEngine.js', 'utf8');
        expect(engine).toContain('this.state.boonMultiplier = trojanActive ? 2 : 1;');
    });
});
