import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeAll } from 'vitest';

/**
 * Tooltip bodies are built by ui/TooltipContent.js so BalatroEffects only has to
 * place and pin the popover. A boon's live pips/mult must survive into the
 * tooltip: the rail overlaps cards, so the chips on the face can be covered.
 */

let TooltipContent;

beforeAll(() => {
    const src = readFileSync('game/js/ui/TooltipContent.js', 'utf8');
    // eslint-disable-next-line no-eval
    TooltipContent = eval(`${src}\nTooltipContent;`);
});

const card = (data) => TooltipContent.render(JSON.stringify(data));

describe('tooltip content', () => {
    it('renders a card body with title, live stats, effect and god', () => {
        const html = card({
            title: 'Journey of Perseus',
            effect: 'Gains +2 Pips each trial.',
            god: 'Zeus',
            stats: [{ value: '+20 Pips', type: 'pips' }, { value: 'x3 Mult', type: 'mult' }],
        });

        expect(html.indexOf('tooltip-title')).toBeLessThan(html.indexOf('tooltip-stats'));
        expect(html.indexOf('tooltip-stats')).toBeLessThan(html.indexOf('tooltip-effect'));
        expect(html).toContain('<span class="tooltip-stat pips">+20 Pips</span>');
        expect(html).toContain('<span class="tooltip-stat mult">x3 Mult</span>');
        expect(html).toContain('Journey of Perseus');
        expect(html).toContain('Zeus');
    });

    it('omits the stat row when a card has no live values', () => {
        expect(card({ title: 'Kylix', effect: 'Reroll once.' })).not.toContain('tooltip-stats');
        expect(card({ title: 'Kylix', stats: [] })).not.toContain('tooltip-stats');
        expect(card({ title: 'Kylix', stats: [{ value: null, type: 'pips' }] })).not.toContain('tooltip-stats');
    });

    it('escapes card text and stat values', () => {
        const html = card({ title: '<script>x</script>', stats: [{ value: '<b>9</b>', type: 'pips' }] });
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<b>9</b>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('renders die hover as score float + enhancement name', () => {
        const html = TooltipContent.render(JSON.stringify({
            tooltipType: 'die',
            held: true,
            rolled: true,
            face: 6,
            pips: 6,
            gold: 1,
            enhancements: [{ name: 'Gold', color: '#f6c343' }],
        }));

        expect(html).toContain('tip-die-scoreline');
        expect(html).toContain('tip-die-pips');
        expect(html).toContain('+6');
        expect(html).toContain('tip-die-gold');
        expect(html).toContain('+1g');
        expect(html).toContain('tip-die-enh-line');
        expect(html).toContain('Gold');
        expect(html).not.toContain('tip-die-status');
        expect(html).not.toContain('Face 6');
    });

    it('shows roll hint before dice are revealed', () => {
        const html = TooltipContent.render(JSON.stringify({
            tooltipType: 'die',
            rolled: false,
            face: null,
        }));
        expect(html).toContain('Roll to reveal');
        expect(html).not.toContain('tip-die-scoreline');
    });

    it('includes clockwork pips in the score line when provided', () => {
        const html = TooltipContent.render(JSON.stringify({
            tooltipType: 'die',
            rolled: true,
            face: 6,
            pips: 11,
            enhancements: [{ name: 'Clockwork', color: '#7aa6c2' }],
        }));
        expect(html).toContain('+11');
        expect(html).toContain('Clockwork');
        expect(html).not.toContain('tip-die-gold');
    });

    it('keeps modified, wild, and 7–9 info off the die face and in the tooltip', () => {
        const renderer = readFileSync('game/js/ui/renderers/DiceRenderer.js', 'utf8');
        const styles = readFileSync('game/css/styles.css', 'utf8');
        const registry = readFileSync('game/js/config/EnhancementRegistry.js', 'utf8');
        expect(renderer).not.toContain('rgba(138, 43, 226');
        expect(renderer).not.toContain("className = 'modification-badge'");
        expect(renderer).not.toContain("className = 'wild-badge'");
        expect(renderer).not.toContain('face-${currentFace}');
        expect(renderer).not.toContain("setAttribute('data-modified'");
        expect(styles).not.toContain('.die-enhancement-overlay.face-7');
        expect(styles).not.toContain('.die-enhancement-overlay.face-8');
        expect(styles).not.toContain('.die-enhancement-overlay.face-9');
        expect(registry).toMatch(/wild:[\s\S]*?textureClass:\s*null/);
    });

    it('falls back to plain text when the host attribute is not JSON', () => {
        expect(TooltipContent.render('just words')).toContain('just words');
    });

    it('is wired ahead of BalatroEffects, which no longer builds tooltip HTML', () => {
        const html = readFileSync('game/index.html', 'utf8');
        const effects = readFileSync('game/js/ui/BalatroEffects.js', 'utf8');
        const cardJs = readFileSync('game/js/classes/Card.js', 'utf8');

        expect(html.indexOf('js/ui/TooltipContent.js')).toBeLessThan(html.indexOf('js/ui/BalatroEffects.js'));
        expect(effects).toContain('TooltipContent.render(tooltipData)');
        expect(effects).not.toContain('parseTooltipData');
        expect(cardJs).toContain('stats: dynamicStats');
    });
});
