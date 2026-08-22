/**
 * DiceRenderer - Dice display and tooltips
 * @module ui/renderers/DiceRenderer
 */

const DiceRenderer = {
    getEnhancementDisplayName(enh) {
        return this._registry()?.displayName?.(enh) || enh;
    },

    _registry() {
        return (typeof EnhancementRegistry !== 'undefined') ? EnhancementRegistry : null;
    },

    _syncEnhancementTexture(dieEl, enhancementId) {
        const classes = this._registry()?.textureClasses?.() || [];
        classes.forEach((c) => dieEl.classList.remove(c));
        const textureClass = this._registry()?.ui?.(enhancementId)?.textureClass;
        if (textureClass) dieEl.classList.add(textureClass);
    },

    buildDieTooltipData(die, index, gameState, currentFace) {
        const held = !!(gameState.held && gameState.held[index]);
        const rolled = !!gameState.hasRolled;
        const payload = {
            tooltipType: 'die',
            held,
            rolled,
            face: currentFace > 0 ? currentFace : null,
            effective: null,
            pips: null,
            gold: null,
            enhancements: [],
        };

        // Only expose face/enhancement detail after roll — dice shuffle across slots on first roll.
        if (rolled && currentFace > 0) {
            const preview = DieScoreContribution.preview(die);
            payload.effective = preview.face;
            payload.pips = preview.pips > 0 ? preview.pips : null;
            payload.gold = preview.gold || null;
            payload.favour = preview.favour || null;

            const currentEnh = die.faces[currentFace]
                ? Array.from(die.faces[currentFace].enhancements)
                : [];
            payload.enhancements = currentEnh.map((id) => {
                const def = this._registry()?.get?.(id);
                return {
                    id,
                    name: def?.displayName || this.getEnhancementDisplayName(id),
                    color: def?.ui?.chipColor || '',
                };
            });
        }

        return payload;
    },

    bindDiceClick(container) {
        if (!container || container._diceClickBound) return;
        container._diceClickBound = true;
        container.addEventListener('click', (e) => {
            const dieEl = e.target.closest('.die');
            if (!dieEl || !container.contains(dieEl)) return;
            const index = parseInt(dieEl.dataset.dieIndex, 10);
            if (Number.isNaN(index)) return;
            const game = this._game;
            if (!game) return;
            const targeting = game.state.libationTargetingMode;
            if (targeting) {
                game.effects?.hideAllTooltips();
                const { libation } = targeting;
                const applied = game.uiManager?.applyLibationEnhancementToDie?.(
                    libation,
                    index,
                    game.state,
                    game,
                    targeting.enhancementType,
                    'die_click'
                );
                if (applied) return;
                game.showMessage?.('Cannot apply libation right now.');
                return;
            }
            game.toggleHold(index);
        });
    },

    _bindUnrolledDieHint(dieEl, index) {
        if (!dieEl || dieEl._unrolledHintBound) return;
        dieEl._unrolledHintBound = true;
        dieEl.addEventListener('mouseenter', () => {
            this._game?.ensureLiveScore?.()?.onUnrolledDieHover?.(index);
        });
        dieEl.addEventListener('mouseleave', () => {
            this._game?.ensureLiveScore?.()?.onUnrolledDieLeave?.(index);
        });
    },

    _ensureDieShell(container, index) {
        let slot = container.querySelector(`.die-slot[data-die-index="${index}"]`);
        if (slot) {
            const dieEl = slot.querySelector('.die');
            this._bindUnrolledDieHint(dieEl, index);
            return dieEl;
        }
        slot = document.createElement('div');
        slot.className = 'die-slot';
        slot.dataset.dieIndex = String(index);
        const dieEl = document.createElement('div');
        dieEl.className = 'die';
        dieEl.dataset.dieIndex = String(index);
        dieEl.style.position = 'relative';
        const caption = document.createElement('span');
        caption.className = 'die-id-caption';
        slot.append(dieEl, caption);
        this._bindUnrolledDieHint(dieEl, index);
        container.appendChild(slot);
        return dieEl;
    },

    _syncBadges(dieEl, die, index, gameState, currentFace, hasEnhancementsOnCurrentFace) {
        dieEl.querySelector('.modification-badge')?.remove();
        dieEl.querySelector('.wild-badge')?.remove();
        dieEl.querySelectorAll('.die-enhancement-overlay').forEach((n) => n.remove());

        const caption = dieEl.parentElement?.querySelector('.die-id-caption');
        if (caption) caption.textContent = `Die ${die.dieId ?? (index + 1)}`;

        const showEnhOnDie = gameState.hasRolled && hasEnhancementsOnCurrentFace && currentFace > 0 && die.faces[currentFace];
        if (showEnhOnDie) {
            const firstEnh = Array.from(die.faces[currentFace].enhancements)[0];
            if (firstEnh) this._syncEnhancementTexture(dieEl, firstEnh);
        } else {
            this._syncEnhancementTexture(dieEl, null);
        }

        let modifierBadge = dieEl.querySelector('.die-modifier-badge');
        if (die.tempModifier !== 0 && gameState.hasRolled) {
            if (!modifierBadge) {
                modifierBadge = document.createElement('div');
                modifierBadge.className = 'die-modifier-badge';
                modifierBadge.style.cssText = 'position:absolute;bottom:-8px;left:-8px;padding:2px 6px;border-radius:4px;font-size:12px;color:white;font-weight:bold;border:1px solid var(--stone-terracotta-dark);z-index:10;';
                dieEl.appendChild(modifierBadge);
            }
            modifierBadge.textContent = die.tempModifier > 0 ? `+${die.tempModifier}` : `${die.tempModifier}`;
            modifierBadge.style.background = die.tempModifier > 0 ? 'var(--accent-green)' : 'var(--accent-red)';
        } else if (modifierBadge) {
            modifierBadge.remove();
        }
    },

    _applyDieState(dieEl, die, index, gameState) {
        dieEl.classList.toggle('held', !!gameState.held[index]);
        const currentFace = die.currentFace;
        const hasEnhancementsOnCurrentFace = currentFace > 0 && die.faces[currentFace] && die.faces[currentFace].enhancements.size > 0;

        dieEl.style.boxShadow = '';
        dieEl.style.border = '';
        dieEl.removeAttribute('data-enhanced');
        dieEl.removeAttribute('data-modified');

        const displayFace = gameState.hasRolled ? die.getDisplayFace() : '?';
        const faceKey = (displayFace >= 1 && displayFace <= 9) || displayFace === '?' ? String(displayFace) : null;
        if (faceKey) {
            dieEl.setAttribute('data-face', faceKey);
            dieEl.textContent = '';
            dieEl.style.removeProperty('background-image');
            dieEl.style.removeProperty('background-size');
            dieEl.style.removeProperty('background-position');
            dieEl.style.removeProperty('background-repeat');
        } else {
            dieEl.removeAttribute('data-face');
            dieEl.textContent = displayFace;
        }

        const tooltipData = this.buildDieTooltipData(die, index, gameState, currentFace);
        dieEl.setAttribute('data-tooltip', JSON.stringify(tooltipData));
        this._game?.effects?.refreshHostTooltip?.(dieEl);
        this._syncBadges(dieEl, die, index, gameState, currentFace, hasEnhancementsOnCurrentFace);
    },

    updateDiceUI(dom, gameState, gameEngine) {
        if (!dom.diceContainer) { Logger.warn('Dice container not found'); return; }
        this._game = gameEngine;
        const container = dom.diceContainer;

        this.bindDiceClick(container);

        const targetingMode = gameEngine?.state?.libationTargetingMode;
        container.classList.toggle('libation-targeting', !!targetingMode);

        const count = gameState.dice.length;
        container.classList.toggle('dice-count-6', count >= 6);
        for (let index = 0; index < count; index += 1) {
            const dieEl = this._ensureDieShell(container, index);
            this._applyDieState(dieEl, gameState.dice[index], index, gameState);
        }
        container.querySelectorAll('.die-slot').forEach((el) => {
            const idx = parseInt(el.dataset.dieIndex, 10);
            if (Number.isNaN(idx) || idx >= count) el.remove();
        });
    },
};

if (typeof window !== 'undefined') window.DiceRenderer = DiceRenderer;
