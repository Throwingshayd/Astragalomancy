/**
 * Tooltip popover placement. Pause menu uses side; everywhere else stays above/below.
 * @module ui/TooltipPlacement
 */

const TooltipPlacement = {
    position(tooltip, anchorEl, { preferBelow = false, preferSide = false, gap = 10 } = {}) {
        if (!anchorEl?.isConnected || !tooltip) return;

        tooltip.classList.remove('below', 'side-left', 'side-right');
        if (preferSide) {
            this._placeSide(tooltip, anchorEl, gap);
            return;
        }
        this._placeVertical(tooltip, anchorEl, { preferBelow, gap });
    },

    _placeVertical(tooltip, anchorEl, { preferBelow, gap }) {
        const pad = 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const anchor = anchorEl.getBoundingClientRect();
        const isPackShelf = anchorEl.classList.contains('pack-card');

        let placement = preferBelow ? 'below' : 'above';
        const measure = () => tooltip.getBoundingClientRect();
        let tip = measure();
        let left = anchor.left + anchor.width / 2 - tip.width / 2;
        left = Math.max(pad, Math.min(left, vw - tip.width - pad));

        let top;
        if (placement === 'above') {
            top = anchor.top - tip.height - gap;
            if (top < pad) {
                placement = 'below';
                top = anchor.bottom + gap;
            }
        } else {
            top = anchor.bottom + gap;
            if (top + tip.height > vh - pad) {
                if (isPackShelf) {
                    placement = 'below';
                    top = anchor.bottom + gap;
                } else {
                    placement = 'above';
                    top = anchor.top - tip.height - gap;
                }
            }
        }

        if (placement === 'below') {
            top = Math.max(pad, top);
        } else {
            top = Math.max(pad, Math.min(top, vh - tip.height - pad));
        }
        tip = measure();

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.dataset.placement = placement;
        if (placement === 'below') tooltip.classList.add('below');

        const arrowX = anchor.left + anchor.width / 2 - left;
        tooltip.style.setProperty('--tip-arrow-x', `${Math.max(18, Math.min(arrowX, tip.width - 18))}px`);
    },

    _placeSide(tooltip, anchorEl, gap) {
        const pad = 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const anchor = anchorEl.getBoundingClientRect();
        let tip = tooltip.getBoundingClientRect();
        const spaceRight = vw - pad - anchor.right;
        const spaceLeft = anchor.left - pad;
        let placement = spaceRight >= spaceLeft ? 'right' : 'left';
        if (placement === 'right' && spaceRight < tip.width + gap && spaceLeft >= tip.width + gap) {
            placement = 'left';
        } else if (placement === 'left' && spaceLeft < tip.width + gap && spaceRight >= tip.width + gap) {
            placement = 'right';
        }

        let left = placement === 'right' ? anchor.right + gap : anchor.left - tip.width - gap;
        left = Math.max(pad, Math.min(left, vw - tip.width - pad));
        let top = anchor.top + anchor.height / 2 - tip.height / 2;
        top = Math.max(pad, Math.min(top, vh - tip.height - pad));

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.dataset.placement = placement;
        tooltip.classList.add(placement === 'right' ? 'side-right' : 'side-left');

        const arrowY = anchor.top + anchor.height / 2 - top;
        tooltip.style.setProperty('--tip-arrow-y', `${Math.max(10, Math.min(arrowY, tip.height - 10))}px`);
    },
};

if (typeof window !== 'undefined') window.TooltipPlacement = TooltipPlacement;
if (typeof module !== 'undefined' && module.exports) module.exports = TooltipPlacement;
