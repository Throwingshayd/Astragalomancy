/* exported TooltipContent */
/**
 * Tooltip body HTML for cards and dice.
 *
 * Split out of BalatroEffects (which owns positioning, pinning and lifecycle)
 * so the string building is pure and testable: in → the JSON string on a
 * host's data-tooltip, out → the inner HTML of the popover.
 *
 * Card hosts may carry a `stats` array ([{ value, type }], written by
 * Card.render) so a boon's live pips/mult read in the tooltip as well as on
 * the card face, which the rail's overlap can hide.
 */

const TooltipContent = {
    escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    escapeAttr(s) {
        return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    /**
     * @param {string} data - JSON from a host's data-tooltip attribute
     * @returns {string} inner HTML for .tooltip-inner
     */
    render(data) {
        try {
            const parsed = JSON.parse(data);
            return parsed.tooltipType === 'die' ? this.dieBody(parsed) : this.cardBody(parsed);
        } catch (_e) {
            return `<div class="tooltip-effect">${this.escapeHtml(data)}</div>`;
        }
    },

    cardBody(parsed) {
        let html = '';
        if (parsed.title) html += `<div class="tooltip-title">${this.escapeHtml(parsed.title)}</div>`;
        if (parsed.stats?.length) html += this.statChips(parsed.stats);
        if (parsed.effect) html += `<div class="tooltip-effect">${this.escapeHtml(parsed.effect)}</div>`;
        if (parsed.god) html += `<div class="tooltip-god">${this.escapeHtml(parsed.god)}</div>`;
        return html;
    },

    /** Live values as they stand right now (e.g. "+20 Pips", "x3 Favour"). */
    statChips(stats) {
        const chips = stats
            .filter((stat) => stat && stat.value !== undefined && stat.value !== null)
            .map((stat) => {
                const type = this.escapeAttr(stat.type || 'pips');
                return `<span class="tooltip-stat ${type}">${this.escapeHtml(stat.value)}</span>`;
            })
            .join('');
        return chips ? `<div class="tooltip-stats">${chips}</div>` : '';
    },

    /**
     * Die hover: scoring-float style (+pips / +gold), enhancement name underneath.
     * No white panel copy — matches .die-pip-popup look via CSS.
     */
    dieBody(parsed) {
        let html = `<article class="tip-die">`;

        if (!parsed.rolled || !parsed.face) {
            html += `<p class="tip-die-hint">Roll to reveal</p>`;
        } else {
            const parts = [];
            if (parsed.pips != null && parsed.pips > 0) {
                parts.push(`<span class="tip-die-pips">+${this.escapeHtml(parsed.pips)}</span>`);
            }
            if (parsed.gold != null && parsed.gold > 0) {
                parts.push(`<span class="tip-die-gold">+${this.escapeHtml(parsed.gold)}g</span>`);
            }
            if (parsed.favour != null && parsed.favour > 0) {
                const shown = typeof NumberFormat !== 'undefined'
                    ? NumberFormat.favourContrib(parsed.favour)
                    : String(parsed.favour / 100);
                parts.push(`<span class="tip-die-favour">+${this.escapeHtml(shown)} Favour</span>`);
            }
            if (parts.length > 0) {
                html += `<p class="tip-die-scoreline">${parts.join(' ')}</p>`;
            }

            if (parsed.enhancements?.length > 0) {
                const names = parsed.enhancements.map((enh) => {
                    const color = this.escapeAttr(enh.color || '');
                    const style = color ? ` style="--enh-color:${color}"` : '';
                    return `<span class="tip-die-enh-name"${style}>${this.escapeHtml(enh.name)}</span>`;
                });
                html += `<p class="tip-die-enh-line">${names.join('<span class="tip-die-enh-sep"> · </span>')}</p>`;
            }
        }

        html += `</article>`;
        return html;
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TooltipContent;
}
