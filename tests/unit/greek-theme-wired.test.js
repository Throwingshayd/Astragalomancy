import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Greek theme wiring', () => {
    it('index.html loads card-sizes and card-present after tooltips', () => {
        const html = readFileSync('game/index.html', 'utf8');
        const stylesIdx = html.indexOf('href="css/styles.css"');
        const greekIdx = html.indexOf('href="css/greek-theme.css"');
        const tooltipsIdx = html.indexOf('href="css/tooltips.css"');
        const cardSizesIdx = html.indexOf('href="css/card-sizes.css"');
        const cardPresentIdx = html.indexOf('href="css/card-present.css"');
        const visualIdx = html.indexOf('href="css/visual-tokens.css"');
        expect(stylesIdx).toBeGreaterThan(-1);
        expect(greekIdx).toBeGreaterThan(stylesIdx);
        expect(greekIdx).toBeGreaterThan(visualIdx);
        expect(tooltipsIdx).toBeGreaterThan(greekIdx);
        expect(cardSizesIdx).toBeGreaterThan(tooltipsIdx);
        expect(cardPresentIdx).toBeGreaterThan(cardSizesIdx);
    });

    it('greek-theme.css defines open-stage HUD and pantheon frieze', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        const tokens = readFileSync('game/css/visual-tokens.css', 'utf8');
        const fonts = readFileSync('game/css/fonts-morris.css', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');
        expect(css).toContain('.main-game .pantheon-frieze');
        expect(css).toContain('var(--font-manuscript)');
        expect(tokens).toContain("--font-stack: 'Morris Roman'");
        expect(tokens).toContain('--color-title:');
        expect(fonts).toContain("font-family: 'Morris Roman'");
        expect(fonts).toContain('/fonts/MorrisRoman-Black.ttf');
        expect(tokens).toContain('--font-epic-title');
        expect(tokens).toContain('--font-pantheon-hand');
        expect(styles).toMatch(/\.pantheon-frieze \.pantheon-chip[\s\S]*font-family: var\(--font-pantheon-hand\)/);
        expect(css).toContain('felt-epic-title');
        expect(css).toContain('var(--gk-marble-1)');
        expect(css).toContain('Greater Pantheon');
        expect(css).toContain('--gk-meander-v');
        expect(css).toContain('--gk-meander-h');
        expect(css).toContain('.clepsydra');
        expect(css).toContain('.trial-banner');
        expect(css).toContain('.rolls-pips');
    });

    it('Kronos hourglass sits on the artifacts row with Roman numerals above', () => {
        const html = readFileSync('game/index.html', 'utf8');
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        const block = html.match(/id="clepsydra"[\s\S]*?id="rollsPips"/)[0];
        expect(block).not.toContain('clepsydra-label');
        expect(block.indexOf('clepsydra-readout')).toBeLessThan(block.indexOf('clepsydra-relic'));
        expect(block.indexOf('turnDisplay')).toBeLessThan(block.indexOf('clepsydra-relic'));
        expect(css).toMatch(
            /\.main-game \.center-game-area \.clepsydra \{[\s\S]*?left:\s*calc\(52px \+ 1\.5 \* var\(--felt-die-size, 95px\)\)/,
        );
        expect(css).toMatch(
            /\.main-game \.center-game-area \.clepsydra \{[\s\S]*?top:\s*calc\(468px - var\(--felt-die-size, 95px\)\)/,
        );
        expect(css).toMatch(
            /\.main-game \.center-game-area \.clepsydra-readout \{[\s\S]*?bottom:\s*100%[\s\S]*?translate\(-50%, var\(--felt-die-size, 95px\)\)/,
        );
    });

    it('shop Continue sits one die higher and gold has a marble plaque', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        expect(css).toMatch(
            /\.main-game\.shop-active \.center-game-area \.shop-continue-btn \{[\s\S]*?top:\s*calc\(590px - 2 \* var\(--felt-die-size, 95px\)\)/,
        );
        expect(css).toMatch(
            /\.main-game \.center-game-area \.felt-stone-gold \{[\s\S]*?felt-panel-marble/,
        );
    });

    it('score line reads pips amethyst and favour ember, never gold', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        expect(css).toMatch(/--gk-pips-1:\s*#b98ceb/);
        expect(css).toMatch(/--gk-favour-1:\s*#e2655f/);
        expect(css).toMatch(
            /\.center-game-area \.live-score-display\.felt-live \.pips \{[\s\S]*?color: var\(--gk-pips-1\)/,
        );
        expect(css).toMatch(
            /\.center-game-area \.live-score-display\.felt-live \.favour \{[\s\S]*?color: var\(--gk-favour-1\)/,
        );
        // Labels sit under their number and carry the same hue as it.
        expect(css).toMatch(
            /\.center-game-area \.live-score-display\.felt-live \.gnosis-pips-bonus \{\s*color: var\(--gk-pips-1\)/,
        );
        expect(css).toMatch(
            /\.center-game-area \.live-score-display\.felt-live \.gnosis-mult-bonus \{\s*color: var\(--gk-favour-1\)/,
        );
    });

    it('score line holds its geometry when digits, labels, or the +N chip change', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');
        const effects = readFileSync('game/css/balatro-effects.css', 'utf8');

        // Digits are tabular so count-up can't jitter the number's width.
        expect(css).toMatch(
            /\.live-score-display\.felt-live \.favour \{[\s\S]*?font-variant-numeric: tabular-nums/,
        );
        // Number band and label band are both fixed height.
        expect(css).toContain('--gnosis-num-h: 60px;');
        expect(css).toContain('--gnosis-label-h: 20px;');
        expect(css).toMatch(
            /\.live-score-display\.felt-live \.pips-line[\s\S]*?height: var\(--gnosis-num-h\)/,
        );
        // A longer label ("+25 pip bonus") can't wrap and push the row taller.
        expect(css).toMatch(
            /\.live-score-display\.felt-live \.gnosis-mult-bonus \{[\s\S]*?height: var\(--gnosis-label-h\)[\s\S]*?white-space: nowrap/,
        );
        // The "+N" chip stays out of flow (already) and the N/A state swaps rows
        // instead of stacking both — class rules out-rank the UA [hidden] sheet.
        expect(styles).toMatch(
            /\.live-score-display \.gnosis-row\[hidden\] \{\s*display: none !important;/,
        );
        expect(styles).toMatch(
            /\.live-score-display\.felt-live \.live-add \{[\s\S]*?position: absolute/,
        );
        // Pulses must not hardcode a palette or they flicker the felt hues.
        const pulses = effects.match(/@keyframes (pipsPulse|favourPulse) \{[\s\S]*?\n\}/g) || [];
        expect(pulses).toHaveLength(2);
        pulses.forEach((block) => expect(block).not.toMatch(/color:/));
    });

    it('scoring reads as a ledger: chips slide in and absorb, nothing wobbles', () => {
        const styles = readFileSync('game/css/styles.css', 'utf8');
        const scoringAnim = readFileSync('game/js/ui/ScoringAnimation.js', 'utf8');
        const liveScore = readFileSync('game/js/ui/LiveScoreController.js', 'utf8');

        // Chip enters from the right and leaves by sinking into its number.
        expect(styles).toMatch(
            /@keyframes live-add-enter \{[\s\S]*?transform: translateX\(18px\)/,
        );
        expect(styles).toMatch(
            /@keyframes live-add-absorb \{[\s\S]*?transform: translateX\(-14px\)/,
        );
        expect(styles).toMatch(/\.live-add\.is-entering \{\s*animation: live-add-enter/);
        expect(styles).toMatch(/\.live-add\.is-absorbing \{\s*animation: live-add-absorb/);
        // The lock brightens; it must not scale or rotate the digits.
        const lock = styles.match(/@keyframes live-row-lock \{[\s\S]*?\n\}/)?.[0] || '';
        expect(lock).toMatch(/filter: brightness/);
        expect(lock).not.toMatch(/transform:/);
        // No juice wobble on the live score line. The cashout receipt keeps its
        // one juiced payout row — that is the beat Lorcan likes.
        expect(scoringAnim).not.toMatch(/juiceUp/);
        const juiceCalls = (liveScore.match(/^.*juiceUp\(.*$/gm) || []).map((l) => l.trim());
        expect(juiceCalls).toEqual(['window.juiceManager.juiceUp(row, 0.18);']);
        expect(liveScore).toMatch(/s\.type === 'payout'[\s\S]{0,80}juiceUp/);
        // Dice pips land on the running total via a chip, same as boons.
        expect(scoringAnim).toMatch(
            /pips: this\.engine\.formatDisplay\(beforePips\), pipsAdd: true/,
        );
        // The chip is a bare numeral on the felt — no box behind it.
        expect(styles).toMatch(
            /\.felt-live \.live-add \{[\s\S]*?background: none;[\s\S]*?box-shadow: none;/,
        );
        // The offering's pip floor is the number dice land on, not a late step.
        expect(scoringAnim).toMatch(/let currentPips = categoryBasePips;/);
        expect(scoringAnim).not.toMatch(/shouldShowBonus/);
    });

    it('both card pillars hang from one shared top token', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');

        expect(css).toMatch(/--side-bar-top-main:\s*\d+px;/);
        // Left and right must move together, so neither may carry its own number.
        expect(styles).toMatch(
            /\.left-consumable-bar\.inventory-panel-consumables \{[\s\S]*?top: var\(--side-bar-top-main/,
        );
        expect(styles).toMatch(
            /\.right-boon-bar\.inventory-panel-boons \{[\s\S]*?top: var\(--side-bar-top-main/,
        );
    });

    it('sealed packs are a size above a single ware, from one token', () => {
        const sizes = readFileSync('game/css/card-sizes.css', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');

        expect(sizes).toMatch(/--pack-w:\s*\d+px;/);
        expect(sizes).toMatch(/--pack-h:\s*\d+px;/);
        expect(sizes).toMatch(/\.pack-card \{[^}]*width: var\(--pack-w\)/);
        // The shop stylesheet used to pin packs to the card footprint in raw px.
        expect(styles).not.toMatch(/#shopDefaultView \.pack-card \{[^}]*width: 140px/);
        expect(styles).toMatch(/#shopDefaultView \.pack-card \{[^}]*width: var\(--pack-w\)/);
    });

    it('pantheon tablets read their numeral size from one token', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        expect(css).toMatch(/--pantheon-score-size:\s*\d+px;/);
        expect(css).toMatch(
            /\.pantheon-chip \.potential-score \{[^}]*font-size: var\(--pantheon-score-size\)/,
        );
        expect(css).not.toMatch(/\.pantheon-chip \.potential-score \{[^}]*font-size: 18px/);
    });

    it('a tablet can swing on its own, and only when an offering lands', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');

        // The layout override used to pin transform to none, which left no angle to animate.
        expect(css).toMatch(/\.pantheon-chip \{[^}]*transform: rotate\(var\(--chip-swing/);
        expect(css).toMatch(/@property --chip-swing \{[\s\S]*?syntax: '<angle>'/);
        expect(css).toContain('@keyframes pantheon-chip-swing');
        const trigger = css.match(/[^\n]*\n[^\n]*\{\s*\n\s*animation: pantheon-chip-swing/)[0];
        expect(trigger).toContain('score-flash');
        expect(trigger).toContain('worship-drag-applied-flash');
    });

    it('a landed score reaches the tablet while the tally is still glowing', () => {
        const js = readFileSync('game/js/ui/ScoringAnimation.js', 'utf8');
        const waits = [...js.matchAll(/this\.engine\.scaleDelay\((\d+)\)\);/g)].map((m) => Number(m[1]));
        // The two waits between the tally settling and the number appearing on the
        // tablet; together they must stay inside the 460ms settle glow.
        const handoff = waits.filter((n) => n > 100 && n < 1000);
        expect(Math.max(...handoff)).toBeLessThanOrEqual(460);
    });

    it('a pack price hangs under its art, not off the shelf below it', () => {
        const css = readFileSync('game/css/card-present.css', 'utf8');
        expect(css).toMatch(
            /#shopDefaultView \.pack-card\[data-pack-shelf\] \.card-shop-cost \{[^}]*bottom: var\(--pack-cost-bottom/,
        );
    });

    it('worship targets light up for shop drags, not just owned cards', () => {
        const css = readFileSync('game/css/greek-theme.css', 'utf8');
        const hot = css.match(/^[^\n]*\.pantheon-chip\.pantheon-worship-drag-hot \{/m)[0];
        expect(hot).toContain('.shop-drag-active');
        expect(hot).toContain('.consumable-drag-active.drag-type-worship');
    });

    it('Greater Pantheon combo chips are in bonus-chip order', () => {
        const html = readFileSync('game/index.html', 'utf8');
        const upper = html.match(/pantheon-tier-upper[\s\S]*?<\/div>\s*<!-- Lower tier/)[0];
        const cats = [...upper.matchAll(/data-category="([^"]+)"/g)].map((m) => m[1]);
        expect(cats).toEqual([
            'Chance',
            'Three of a Kind',
            'Small Straight',
            'Full House',
            'Four of a Kind',
            'Large Straight',
            'Yahtzee',
            "Pandora's Box",
        ]);
    });
});
