/**
 * Dice inspect — pause Run Info Dice tab (columns by die id + count lists).
 * @module ui/DiceInspectOverlay
 */

const DiceInspectOverlay = {
    sortedDice(state) {
        const dice = Array.isArray(state?.dice) ? state.dice.slice() : [];
        return dice.sort((a, b) => (Number(a?.dieId) || 0) - (Number(b?.dieId) || 0));
    },

    faceKeys(state) {
        const keys = [1, 2, 3, 4, 5, 6];
        const unlocked = state?.unlockedCategories || {};
        if (unlocked.Sevens) keys.push(7);
        if (unlocked.Eights) keys.push(8);
        if (unlocked.Nines) keys.push(9);
        return keys;
    },

    facePreview(die, key) {
        if (typeof DieScoreContribution !== 'undefined' && DieScoreContribution.previewFace) {
            return DieScoreContribution.previewFace(die, key);
        }
        const data = die?.faces?.[key];
        const shown = Number(data?.modifiedValue ?? data?.value ?? key);
        const face = Number.isFinite(shown) && shown > 0 ? shown : 0;
        return { face, pips: face, gold: 0 };
    },

    faceTooltip(die, key) {
        const preview = this.facePreview(die, key);
        const enh = die?.faces?.[key]?.enhancements
            ? Array.from(die.faces[key].enhancements)
            : [];
        const registry = typeof EnhancementRegistry !== 'undefined' ? EnhancementRegistry : null;
        return JSON.stringify({
            tooltipType: 'die',
            rolled: true,
            face: preview.face,
            pips: preview.pips > 0 ? preview.pips : null,
            gold: preview.gold > 0 ? preview.gold : null,
            favour: preview.favour > 0 ? preview.favour : null,
            enhancements: enh.map((id) => ({
                id,
                name: registry?.displayName?.(id) || id,
                color: registry?.ui?.(id)?.chipColor || '',
            })),
        });
    },

    textureClass(enhId) {
        const registry = typeof EnhancementRegistry !== 'undefined' ? EnhancementRegistry : null;
        return registry?.ui?.(enhId)?.textureClass || '';
    },

    enhName(id) {
        return (typeof EnhancementRegistry !== 'undefined' && EnhancementRegistry.displayName?.(id)) || id;
    },

    enhancementIds() {
        if (typeof EnhancementRegistry !== 'undefined' && EnhancementRegistry._defs) {
            return Object.keys(EnhancementRegistry._defs);
        }
        return ['parchment', 'iron', 'gold', 'mother_of_pearl', 'wild', 'mirror', 'blessed'];
    },

    tally(state) {
        const keys = this.faceKeys(state);
        const allowed = new Set(keys);
        const faces = {};
        keys.forEach((key) => { faces[key] = 0; });
        const enhancements = {};
        this.sortedDice(state).forEach((die) => {
            keys.forEach((key) => {
                const shown = this.facePreview(die, key).face || key;
                const bucket = allowed.has(shown) ? shown : key;
                faces[bucket] = (faces[bucket] || 0) + 1;
                const enh = die?.faces?.[key]?.enhancements;
                if (!enh) return;
                Array.from(enh).forEach((id) => {
                    enhancements[id] = (enhancements[id] || 0) + 1;
                });
            });
        });
        return { faces, enhancements, keys };
    },

    renderCountList(entries) {
        return `<ul class="dice-inspect-counts">${entries.map(([label, n]) => (
            `<li class="${n === 0 ? 'is-zero' : ''}"><span>${this._esc(label)}</span><span>×${n}</span></li>`
        )).join('')}</ul>`;
    },

    renderAside(state) {
        const { faces, enhancements, keys } = this.tally(state);
        const faceRows = keys.map((key) => [String(key), faces[key] || 0]);
        const catalog = this.enhancementIds();
        const extraIds = Object.keys(enhancements).filter((id) => !catalog.includes(id));
        const enhRows = catalog.concat(extraIds)
            .map((id) => [this.enhName(id), enhancements[id] || 0]);
        return `
            <aside class="dice-inspect-aside">
                <section class="dice-inspect-counts-block">
                    <h3 class="settings-section-title">Faces</h3>
                    ${this.renderCountList(faceRows)}
                </section>
                <section class="dice-inspect-counts-block">
                    <h3 class="settings-section-title">Enhancements</h3>
                    ${this.renderCountList(enhRows)}
                </section>
            </aside>
        `;
    },

    renderBody(state) {
        const dice = this.sortedDice(state);
        if (dice.length === 0) {
            return '<p class="dice-inspect-empty">No dice in this run.</p>';
        }
        const keys = this.faceKeys(state);
        const rolled = !!state.hasRolled;
        const tallClass = keys.length > 6 ? ' has-high-faces' : '';
        const columns = dice.map((die, index) => {
            const id = die.dieId ?? (index + 1);
            const faces = keys.map((key) => {
                const preview = this.facePreview(die, key);
                const faceArt = preview.face > 0 ? preview.face : key;
                const firstEnh = die?.faces?.[key]?.enhancements
                    ? Array.from(die.faces[key].enhancements)[0]
                    : null;
                const tex = firstEnh ? this.textureClass(firstEnh) : '';
                const up = rolled && die.currentFace === key;
                const classes = ['die', 'dice-inspect-face'];
                if (tex) classes.push(tex);
                if (up) classes.push('is-up');
                const tip = this._esc(this.faceTooltip(die, key));
                return `<li><div class="${classes.join(' ')}" data-face="${this._esc(faceArt)}" data-tooltip="${tip}" role="img" aria-label="Die ${this._esc(id)} face ${this._esc(faceArt)}"></div></li>`;
            }).join('');
            return `<section class="dice-inspect-die" data-die-id="${this._esc(id)}">`
                + `<h3 class="dice-inspect-label">Die ${this._esc(id)}</h3>`
                + `<ol class="dice-inspect-faces">${faces}</ol>`
                + `</section>`;
        }).join('');
        return `<div class="dice-inspect-list${tallClass}">${columns}</div>`;
    },

    _esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },
};

if (typeof window !== 'undefined') window.DiceInspectOverlay = DiceInspectOverlay;
if (typeof module !== 'undefined' && module.exports) module.exports = DiceInspectOverlay;
