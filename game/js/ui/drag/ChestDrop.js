/**
 * ChestDrop — the artifacts chest as the shop's purchase target.
 *
 * Artifacts and packs are bought by dragging them into the chest instead of onto the
 * gold stone, and the lid opens while the pointer is inside it so the drop reads as
 * "put it in the box". The chest is no longer an inventory — owned artifacts are
 * listed in the pause menu's Run Info tab — so the open lid means "drop here" and
 * nothing else.
 *
 * @module ui/drag/ChestDrop
 */

const ChestDrop = {
    /** Shop drag modes that are bought by dropping into the chest. */
    MODES: ['artifact', 'packShelf'],
    /** The painted lid is inset from the element box; forgive a near miss. */
    CATCH_PAD: 12,

    el() {
        return document.getElementById('artifactsChest');
    },

    accepts(mode) {
        return this.MODES.includes(mode);
    },

    contains(px, py) {
        const chest = this.el();
        if (!chest) return false;
        const pad = this.CATCH_PAD;
        const r = chest.getBoundingClientRect();
        return px >= r.left - pad && px <= r.right + pad && py >= r.top - pad && py <= r.bottom + pad;
    },

    /** Armed for the whole drag, so there is something to aim at before you arrive. */
    markTargets(mode) {
        if (!this.accepts(mode)) return;
        this.el()?.classList.add('shop-drop-glow');
    },

    /** Lid follows the pointer: open while inside, shut again on the way out. */
    updateHot(mode, px, py) {
        const chest = this.el();
        if (!chest || !this.accepts(mode)) return;
        const hot = this.contains(px, py);
        chest.classList.toggle('shop-drop-target-hot', hot);
        chest.classList.toggle('is-open', hot);
    },

    clearTargets() {
        this.el()?.classList.remove('shop-drop-glow', 'shop-drop-target-hot', 'is-open');
    },
};

if (typeof window !== 'undefined') window.ChestDrop = ChestDrop;
