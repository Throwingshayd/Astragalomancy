/**
 * SafeMath - Overflow protection for score calculations
 * Clamps values to [0, Number.MAX_SAFE_INTEGER] to prevent NaN, Infinity, and integer overflow.
 * @module SafeMath
 */

const MAX_SAFE_INT = Number.MAX_SAFE_INTEGER;

/**
 * Clamp a value to safe integer range [0, MAX_SAFE_INT].
 * NaN → 0, +Infinity/overflow → MAX (a huge finite score, not a surprise 0),
 * negative/-Infinity → 0.
 * @param {number} value
 * @returns {number}
 */
function clampScore(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return 0;
    if (n >= MAX_SAFE_INT) return MAX_SAFE_INT;  // catches +Infinity and overflow
    if (n <= 0) return 0;                        // catches -Infinity and negatives
    return Math.floor(n);
}

/**
 * Safe multiply with overflow clamp. NaN operands → 0; an Infinite product clamps to MAX
 * rather than collapsing to 0.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function safeMultiply(a, b) {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isNaN(na) || Number.isNaN(nb)) return 0;
    return clampScore(na * nb);
}

/**
 * Final score: pips × (favour / 100). Engine Favour is hundredths so 100 = ×1
 * and worship +25 is +0.25, without storing a decimal multiplier.
 */
function safeScore(pips, favour) {
    const na = Number(pips);
    const nb = Number(favour);
    if (Number.isNaN(na) || Number.isNaN(nb)) return 0;
    const scale = (typeof BASE_FAVOUR !== 'undefined' && BASE_FAVOUR) ? BASE_FAVOUR : 100;
    const product = na * nb;
    if (product >= MAX_SAFE_INT) return MAX_SAFE_INT;
    return clampScore(product / scale);
}

/**
 * Safe add with overflow clamp
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function safeAdd(a, b) {
    let na = Number(a);
    let nb = Number(b);
    if (Number.isNaN(na)) na = 0;
    if (Number.isNaN(nb)) nb = 0;
    return clampScore(na + nb);
}

const SafeMath = { clampScore, safeMultiply, safeScore, safeAdd, MAX_SAFE_INT };

if (typeof window !== 'undefined') window.SafeMath = SafeMath;
