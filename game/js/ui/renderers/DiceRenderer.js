/**
 * DiceRenderer - Dice display and tooltips
 * @module ui/renderers/DiceRenderer
 */

const DiceRenderer = {
    getEnhancementDisplayName(enh) {
        return window.EnhancementRegistry?.displayName?.(enh) || enh;
    },

    _syncEnhancementTexture(dieEl, enhancementId) {
        const classes = window.EnhancementRegistry?.textureClasses?.() || [];
        classes.forEach((c) => dieEl.classList.remove(c));
        const textureClass = window.EnhancementRegistry?.ui?.(enhancementId)?.textureClass;
        if (textureClass) dieEl.classList.add(textureClass);
    },

    buildDieTooltipData(die, index, gameState, currentFace, hasModifiedValue) {
        const slot = index + 1;
        const held = !!(gameState.held && gameState.held[index]);
        const rolled = !!gameState.hasRolled;
        const payload = {
            tooltipType: 'die',
            slot,
            held,
            rolled,
            face: currentFace > 0 ? currentFace : null,
            effective: null,
            modified: null,
            wildMod: null,
            enhancements: [],
            tempMod: null,
        };

        // Only expose face/enhancement detail after roll — dice shuffle across slots on first roll.
        if (rolled && currentFace > 0) {
            payload.effective = die.getEffectiveFace();
            if (hasModifiedValue && die.faces[currentFace]) {
                payload.modified = {
                    from: die.faces[currentFace].value,
                    to: die.faces[currentFace].modifiedValue,
                };
            }
            if (die.wildValue !== undefined && die.hasEnhancementForCurrentFace('wild')) {
                payload.wildMod = die.wildValue - currentFace;
            }
            const currentEnh = die.faces[currentFace]
                ? Array.from(die.faces[currentFace].enhancements)
                : [];
            payload.enhancements = currentEnh.map((id) => {
                const def = window.EnhancementRegistry?.get?.(id);
                return {
                    id,
                    name: def?.displayName || this.getEnhancementDisplayName(id),
                    desc: die.getEnhancementDescription(id),
                    color: def?.ui?.chipColor || '',
                };
            });
        }

        if (die.tempModifier !== 0 && rolled) {
            payload.tempMod = die.tempModifier;
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
            const game = window.game;
            if (!game) return;
            const targeting = game.state.libationTargetingMode;
            if (targeting) {
                window.balatroEffects?.hideAllTooltips();
                const { libation } = targeting;
                const applied = window.uiManager?.applyLibationEnhancementToDie?.(
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
            window.game?.ensureLiveScore?.()?.onUnrolledDieHover?.(index);
        });
        dieEl.addEventListener('mouseleave', () => {
            window.game?.ensureLiveScore?.()?.onUnrolledDieLeave?.(index);
        });
    },

    _ensureDieShell(container, index) {
        let dieEl = container.querySelector(`.die[data-die-index="${index}"]`);
        if (dieEl) {
            this._bindUnrolledDieHint(dieEl, index);
            return dieEl;
        }
        dieEl = document.createElement('div');
        dieEl.className = 'die';
        dieEl.dataset.dieIndex = String(index);
        dieEl.style.position = 'relative';
        const dieIdBadge = document.createElement('div');
        dieIdBadge.className = 'die-id-badge';
        dieIdBadge.style.cssText = 'position:absolute;top:-5px;right:-5px;width:16px;height:16px;background:var(--stone-terracotta-dark);border-radius:50%;font-size:12px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;border:1px solid var(--statue-cream);z-index:5;opacity:0.8;';
        dieEl.appendChild(dieIdBadge);
        this._bindUnrolledDieHint(dieEl, index);
        container.appendChild(dieEl);
        return dieEl;
    },

    _syncBadges(dieEl, die, index, gameState, currentFace, hasModifiedValue, hasEnhancementsOnCurrentFace) {
        let modBadge = dieEl.querySelector('.modification-badge');
        if (hasModifiedValue) {
            if (!modBadge) {
                modBadge = document.createElement('div');
                modBadge.className = 'modification-badge';
                modBadge.style.cssText = 'position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:rgba(138,43,226,0.9);color:white;padding:2px 6px;border-radius:8px;font-size:12px;font-weight:bold;white-space:nowrap;z-index:10;border:1px solid white;';
                dieEl.appendChild(modBadge);
            }
            modBadge.textContent = `${die.faces[currentFace].value}→${die.faces[currentFace].modifiedValue}`;
        } else if (modBadge) {
            modBadge.remove();
        }

        let wildBadge = dieEl.querySelector('.wild-badge');
        const showWild = gameState.hasRolled && currentFace > 0 && die.hasEnhancementForCurrentFace('wild') && die.wildValue !== undefined;
        const wildModifier = showWild ? die.wildValue - currentFace : 0;
        if (showWild && wildModifier !== 0) {
            if (!wildBadge) {
                wildBadge = document.createElement('div');
                wildBadge.className = 'wild-badge';
                wildBadge.style.cssText = 'position:absolute;top:-8px;right:-8px;background:rgba(147,51,234,0.95);color:white;padding:3px 7px;border-radius:50%;font-size:12px;font-weight:bold;z-index:10;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);';
                dieEl.appendChild(wildBadge);
            }
            wildBadge.textContent = wildModifier > 0 ? `+${wildModifier}` : `${wildModifier}`;
        } else if (wildBadge) {
            wildBadge.remove();
        }

        const dieIdBadge = dieEl.querySelector('.die-id-badge');
        if (dieIdBadge) dieIdBadge.textContent = die.dieId || (index + 1);

        dieEl.querySelectorAll('.die-enhancement-overlay').forEach((n) => n.remove());
        const showEnhOnDie = gameState.hasRolled && hasEnhancementsOnCurrentFace && currentFace > 0 && die.faces[currentFace];
        if (showEnhOnDie) {
            const firstEnh = Array.from(die.faces[currentFace].enhancements)[0];
            if (firstEnh) this._syncEnhancementTexture(dieEl, firstEnh);
        } else {
            this._syncEnhancementTexture(dieEl, null);
        }
        if (currentFace > 0 && currentFace >= 7) {
            const faceOverlay = document.createElement('div');
            faceOverlay.className = `die-enhancement-overlay face-${currentFace}`;
            dieEl.appendChild(faceOverlay);
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
        const hasModifiedValue = gameState.hasRolled && currentFace > 0 && die.faces[currentFace]
            && die.faces[currentFace].modifiedValue
            && die.faces[currentFace].modifiedValue !== die.faces[currentFace].value;

        dieEl.style.boxShadow = '';
        dieEl.style.border = '';
        dieEl.removeAttribute('data-enhanced');
        dieEl.removeAttribute('data-modified');
        if (hasModifiedValue) {
            dieEl.style.boxShadow = '0 0 15px rgba(138, 43, 226, 0.8)';
            dieEl.style.border = '3px solid rgba(138, 43, 226, 1)';
            dieEl.setAttribute('data-modified', 'true');
        } else if (gameState.hasRolled && hasEnhancementsOnCurrentFace) {
            dieEl.setAttribute('data-enhanced', 'true');
        }

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

        const tooltipData = this.buildDieTooltipData(die, index, gameState, currentFace, hasModifiedValue);
        dieEl.setAttribute('data-tooltip', JSON.stringify(tooltipData));
        window.balatroEffects?.refreshHostTooltip?.(dieEl);
        this._syncBadges(dieEl, die, index, gameState, currentFace, hasModifiedValue, hasEnhancementsOnCurrentFace);
    },

    updateDiceUI(dom, gameState, gameEngine) {
        if (!dom.diceContainer) { Logger.warn('Dice container not found'); return; }
        const engine = gameEngine || window.game;
        const container = dom.diceContainer;

        this.bindDiceClick(container);

        const targetingMode = engine?.state?.libationTargetingMode;
        container.classList.toggle('libation-targeting', !!targetingMode);

        const count = gameState.dice.length;
        for (let index = 0; index < count; index += 1) {
            const dieEl = this._ensureDieShell(container, index);
            this._applyDieState(dieEl, gameState.dice[index], index, gameState);
        }
        container.querySelectorAll('.die').forEach((el) => {
            const idx = parseInt(el.dataset.dieIndex, 10);
            if (Number.isNaN(idx) || idx >= count) el.remove();
        });
    },
};

if (typeof window !== 'undefined') window.DiceRenderer = DiceRenderer;
