import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * On the table a card is its art — the name lives in the tooltip, not printed
 * across the face. The exception is cards with no art yet (every artifact
 * today, plus the odd boon/libation): those would render as blank rectangles,
 * so they keep `.card-type-indicator` as their face.
 *
 * The show rules must stay qualified with `:not(.has-asset)`. Several of them
 * match at the same specificity as the hide rule, so without that qualifier the
 * name comes back on art cards depending only on rule order in the file.
 */
const CSS_PATH = 'game/css/card-present.css';

function rules() {
    const css = readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((match) => ({
        selectors: match[1].split(',').map((s) => s.trim()).filter(Boolean),
        body: match[2],
    }));
}

function nameShowingRules() {
    return rules().filter(
        (rule) => rule.selectors.some((s) => s.includes('.card-type-indicator')) && /display:\s*flex/.test(rule.body)
    );
}

describe('card face names', () => {
    it('never prints the name on a card that has art', () => {
        const showing = nameShowingRules();
        expect(showing.length).toBeGreaterThan(0);

        for (const rule of showing) {
            for (const selector of rule.selectors) {
                if (!selector.includes('.card-type-indicator')) continue;
                expect(selector).toContain(':not(.has-asset)');
            }
        }

        const hides = rules().find(
            (rule) => rule.selectors.includes('.card.has-asset .card-type-indicator')
        );
        expect(hides?.body).toMatch(/display:\s*none/);
        expect(hides?.body).toMatch(/visibility:\s*hidden/);
    });

    it('keeps the name on art-less cards, on both surfaces and on drag ghosts', () => {
        const shown = nameShowingRules().flatMap((rule) => rule.selectors);

        expect(shown).toContain('.card:not(.has-asset)[data-card-surface="owned"] .card-type-indicator');
        expect(shown).toContain('.card:not(.has-asset)[data-card-surface="rack"] .card-type-indicator');
        expect(shown).toContain('.card.artifact-card:not(.has-asset)[data-card-surface="owned"] .card-type-indicator');
        expect(shown).toContain('.drag-ghost.card:not(.has-asset) .card-type-indicator');
    });
});
