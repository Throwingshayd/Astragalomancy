/* exported NumberFormat */
// Balatro-style tiered number formatter.
//
// The live score row uses fixed-width cells. The formatter's job is to keep
// the rendered string bounded to ~7 visible chars so numbers from 0 to
// astronomical fit the same slot without reflow.
//
// Tiers (absolute value):
//   < 1e4    → integer            "1234"
//   < 1e6    → thousands w/ comma "12,345"
//   < 1e9    → millions           "1.23M"
//   < 1e12   → billions           "1.23B"
//   < 1e15   → trillions          "1.23T"
//   ≥ 1e15   → scientific         "1.23e15"
//   non-finite → "—"

const NumberFormat = {
    _tier(v) {
        const abs = Math.abs(v);
        if (abs < 1e4)  return 'int';
        if (abs < 1e6)  return 'comma';
        if (abs < 1e9)  return 'M';
        if (abs < 1e12) return 'B';
        if (abs < 1e15) return 'T';
        return 'sci';
    },

    _trim(str) {
        return str.replace(/\.?0+$/, '');
    },

    /**
     * Main display formatter for pips / favour total / score preview.
     * Always integer-truncated below 1e4 so count-up animation reads cleanly.
     * @param {number} n
     * @returns {string}
     */
    display(n) {
        const v = Number(n);
        if (!Number.isFinite(v)) return '—';
        switch (this._tier(v)) {
            case 'int':   return String(Math.trunc(v));
            case 'comma': return Math.trunc(v).toLocaleString('en-US');
            case 'M':     return this._trim((v / 1e6).toFixed(2)) + 'M';
            case 'B':     return this._trim((v / 1e9).toFixed(2)) + 'B';
            case 'T':     return this._trim((v / 1e12).toFixed(2)) + 'T';
            case 'sci':   return v.toExponential(2).replace('e+', 'e');
            default:      return String(Math.trunc(v));
        }
    },

    /**
     * Contribution popups ("+5 pips" chips over the dice). Small integers
     * almost always; falls back to display() for massive boon triggers.
     * @param {number} n
     */
    contrib(n) {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0';
        if (Math.abs(v) < 1e4 && v === Math.trunc(v)) return String(Math.trunc(v));
        return this.display(v);
    },

    _snapQuarter(v) {
        const q = Math.round(v * 4) / 4;
        return Math.abs(q - v) < 0.02 ? q : v;
    },

    /** Up to 2 decimals; avoids Math.round(x*10) breaking 1.25 → 1.3 */
    _formatMultDecimal(v) {
        const snapped = this._snapQuarter(v);
        const rounded = Math.round((snapped + Number.EPSILON) * 100) / 100;
        return rounded.toFixed(2).replace(/\.?0+$/, '');
    },

    /** Engine Favour is hundredths (100 = ×1). */
    _playerFavour(n) {
        const scale = (typeof BASE_FAVOUR !== 'undefined' && BASE_FAVOUR) ? BASE_FAVOUR : 100;
        return Number(n) / scale;
    },

    /**
     * Favour / mult total (Balatro-style × prefix). Engine 100 → ×1, 125 → ×1.25.
     * @param {number} n
     * @param {{ prefix?: boolean }} [opts]
     */
    favour(n, opts = {}) {
        const v = this._playerFavour(n);
        const withPrefix = opts.prefix !== false;
        if (!Number.isFinite(v) || v <= 0) return withPrefix ? '×1' : '1';
        if (Math.abs(v - Math.trunc(v)) > 1e-9 && Math.abs(v) < 1e4) {
            const s = this._formatMultDecimal(v);
            return withPrefix ? `×${s}` : s;
        }
        const intStr = this.display(Math.trunc(v));
        return withPrefix ? `×${intStr}` : intStr;
    },

    /** Additive Favour chip from engine hundredths. 25 → 0.25, 200 → 2. */
    favourContrib(n) {
        const v = this._playerFavour(n);
        if (!Number.isFinite(v) || v <= 0) return '0';
        if (Math.abs(v - Math.trunc(v)) < 1e-9) return this.contrib(v);
        return this._formatMultDecimal(v);
    }
};

if (typeof window !== 'undefined') window.NumberFormat = NumberFormat;
