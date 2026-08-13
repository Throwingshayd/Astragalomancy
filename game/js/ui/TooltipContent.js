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

    dieBody(parsed) {
        const statusClass = parsed.held ? 'is-held' : 'is-free';
        const statusLabel = parsed.held ? 'Held' : 'Free';

        let html = `<article class="tip-die">`;
        html += `<p class="tip-die-status ${statusClass}">${statusLabel}</p>`;

        if (!parsed.rolled || !parsed.face) {
            html += `<p class="tip-die-face">Roll to reveal</p>`;
        } else {
            html += `<p class="tip-die-face">Face ${this.escapeHtml(parsed.face)}</p>`;
            const notes = [];
            if (parsed.modified) {
                notes.push(`Modified ${parsed.modified.from}→${parsed.modified.to}`);
            }
            if (parsed.wildMod !== null && parsed.wildMod !== undefined) {
                const sign = parsed.wildMod > 0 ? '+' : '';
                notes.push(`Wild ${sign}${parsed.wildMod}`);
            }
            if (notes.length > 0) {
                html += `<p class="tip-die-note">${this.escapeHtml(notes.join(' · '))}</p>`;
            }
        }

        if (parsed.rolled && parsed.enhancements?.length > 0) {
            html += `<ul class="tip-die-enhs">`;
            parsed.enhancements.forEach((enh) => {
                const color = this.escapeAttr(enh.color || '');
                const style = color ? ` style="--enh-color:${color}"` : '';
                html += `<li class="tip-die-enh"${style}>
                    <span class="tip-die-enh-name">${this.escapeHtml(enh.name)}</span>
                    <span class="tip-die-enh-desc">${this.escapeHtml(enh.desc)}</span>
                </li>`;
            });
            html += `</ul>`;
        }

        if (parsed.tempMod) {
            const sign = parsed.tempMod > 0 ? '+' : '';
            html += `<footer class="tip-die-footer">`;
            html += `<div class="tip-die-footer-line">`;
            html += `<span class="tip-die-mod">Temp modifier ${sign}${parsed.tempMod}</span>`;
            html += `</div></footer>`;
        }

        html += `</article>`;
        return html;
    },
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TooltipContent;
}
