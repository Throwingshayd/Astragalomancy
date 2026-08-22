/* exported BoonDisplayStats */
/* global NumberFormat */

const BoonDisplayStats = {
    _favourChip(engineFavour) {
        const shown = (typeof NumberFormat !== 'undefined')
            ? NumberFormat.favourContrib(engineFavour)
            : String(engineFavour / 100);
        return `+${shown}`;
    },

    currentFavour(boon, gameState) {
        if (!gameState) return 0;

        switch (boon.id) {
            case 'mt_olympus': {
                const worshipCount = Object.values(gameState.worshipLevels || {}).reduce((sum, level) => sum + level, 0);
                return worshipCount * 100;
            }
            case 'prometheus_gift':
                return 300;
            case 'forge_of_hephaestus': {
                const unusedRerolls = gameState.rollsLeft || 0;
                return Math.min(Math.max(0, unusedRerolls) * 50, 150);
            }
            case 'hestias_hearth':
                if (gameState.dice && gameState.dice.length > 0) {
                    const allFaces = gameState.dice.map(d => d.getEffectiveFace());
                    const allOdd = allFaces.every(face => face % 2 === 1);
                    const allEven = allFaces.every(face => face % 2 === 0);
                    return (allOdd || allEven) ? 300 : 0;
                }
                return 0;
            default:
                return 0;
        }
    },

    live(boon, gameState) {
        if (!gameState) return [];

        const stats = [];

        if (boon.id !== 'the_heretic' && boon.dynamicStats.pips > 0) {
            stats.push({ value: `+${boon.dynamicStats.pips}`, type: 'pips' });
        }

        if (boon.id !== 'mt_olympus' && boon.dynamicStats.favour > 0) {
            stats.push({ value: this._favourChip(boon.dynamicStats.favour), type: 'favour' });
        } else if (boon.id !== 'mt_olympus') {
            const favour = this.currentFavour(boon, gameState);
            if (favour > 0) {
                stats.push({ value: this._favourChip(favour), type: 'favour' });
            }
        }

        if (boon.dynamicStats.gold > 0) {
            stats.push({ value: `+${boon.dynamicStats.gold}g`, type: 'gold' });
        }

        if (boon.dynamicStats.other) {
            stats.push({ value: boon.dynamicStats.other, type: 'other' });
        }

        switch (boon.id) {
            case 'mt_olympus': {
                const worshipUsed = Object.values(gameState.worshipLevels || {}).reduce((sum, level) => sum + level, 0);
                if (worshipUsed > 0) {
                    stats.push({ value: `+${worshipUsed} Favour`, type: 'favour' });
                }
                break;
            }
            case 'golden_touch':
                stats.push({ value: '1 per 3g', type: 'other' });
                break;
            case 'the_heretic': {
                const hereticStacks = gameState.hereticStacks || 0;
                if (hereticStacks > 0) {
                    stats.push({ value: `+${hereticStacks}`, type: 'pips' });
                    stats.push({ value: '🚫 No Worship', type: 'other' });
                } else {
                    stats.push({ value: 'Reset', type: 'other' });
                }
                break;
            }
            case 'proteus_disguise': {
                const boons = gameState.boons || [];
                const idx = boons.findIndex(j => j === boon);
                const leftBoon = idx > 0 ? boons[idx - 1] : null;
                stats.push({ value: leftBoon ? `→${leftBoon.name}` : 'No target', type: 'other' });
                break;
            }
            default:
                break;
        }

        return stats;
    }
};

if (typeof window !== 'undefined') window.BoonDisplayStats = BoonDisplayStats;
