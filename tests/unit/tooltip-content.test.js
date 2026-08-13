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

    it('still renders die popovers, including enhancements and temp modifier', () => {
        const html = TooltipContent.render(JSON.stringify({
            tooltipType: 'die',
            held: true,
            rolled: true,
            face: '5',
            enhancements: [{ name: 'Golden', desc: 'Pays 3 gold', color: '#FFD700' }],
            tempMod: 2,
        }));

        expect(html).toContain('tip-die-status is-held');
        expect(html).toContain('Face 5');
        expect(html).toContain('Golden');
        expect(html).toContain('Temp modifier +2');
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
