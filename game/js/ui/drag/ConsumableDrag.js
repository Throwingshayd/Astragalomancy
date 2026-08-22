/**
 * Consumable bar drag: worship → pantheon, libation → die/chalice, sell → gold.
 * @module ConsumableDrag
 */

const ConsumableDrag = {
    bind(container, ui, gameEngine) {
        if (!container) return;
        if (gameEngine) container._gameEngine = gameEngine;
        if (container._consumableHorizonDragBound) return;
        container._consumableHorizonDragBound = true;
        const currentEngine = () => container._gameEngine || ui._gameEngine;
        const DRAG_THRESHOLD = 16;
        const getZones = () => ({
            worship: document.getElementById('consumableZoneWorship'),
            libation: document.getElementById('consumableZoneLibation'),
            sellStone: document.getElementById('goldStone'),
            main: container.closest('.main-game'),
        });
        const pointIn = (px, py, el) => {
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
        };
        const pointInRect = (px, py, r) => (
            r && px >= r.left && px <= r.right && py >= r.top && py <= r.bottom
        );
        const findCardModel = (id, gameState) => (gameState.consumables || []).find(c => c.id === id);
        const shopOpen = () => {
            const shopStage = document.getElementById('shopStage');
            return !!(shopStage && !shopStage.classList.contains('hidden'));
        };
        const findDieUnderPointer = (px, py, ignoreEl) => {
            const diceContainer = document.getElementById('diceContainer');
            if (!diceContainer || shopOpen()) return null;
            const stack = document.elementsFromPoint(px, py);
            for (const el of stack) {
                if (ignoreEl && (el === ignoreEl || ignoreEl.contains(el))) continue;
                if (el.closest?.('.drag-ghost, .consumable-zone')) continue;
                if (!diceContainer.contains(el)) continue;
                const die = el.closest?.('.die');
                if (die && diceContainer.contains(die)) return die;
            }
            return null;
        };
        const pointInDicePlayArea = (px, py) => {
            if (shopOpen()) return false;
            const playStage = document.getElementById('playStage');
            const diceContainer = document.getElementById('diceContainer');
            const diceRollZone = document.getElementById('diceRollZone');
            return pointIn(px, py, playStage) || pointIn(px, py, diceContainer) || pointIn(px, py, diceRollZone);
        };
        const findScoreRowUnderPointer = (px, py, ignoreEl) => {
            const scorecard = document.getElementById('scorecard');
            if (!scorecard || shopOpen()) return null;
            const stack = document.elementsFromPoint(px, py);
            for (const el of stack) {
                if (ignoreEl && (el === ignoreEl || ignoreEl.contains(el))) continue;
                if (el.closest?.('.drag-ghost, .consumable-zone')) continue;
                if (!scorecard.contains(el)) continue;
                const row = el.closest?.('.pantheon-chip');
                if (row && scorecard.contains(row)) return row;
            }
            return null;
        };
        // Shared with the shop-shelf drag so both agree on what a card may be offered to.
        const worshipCategoryUnlocked = (category, state) => WorshipDrop.categoryUnlocked(category, state);
        const getWorshipCategory = (card) => WorshipDrop.cardCategory(card);
        const worshipMatchesCategory = (card, category, state) => WorshipDrop.matches(card, category, state);
        const markAllPantheonTargets = (state) => {
            clearWorshipTargetChips();
            document.querySelectorAll('#scorecard .pantheon-chip').forEach((chip) => {
                const cat = chip.getAttribute('data-category');
                if (!cat || !worshipCategoryUnlocked(cat, state)) return;
                chip.classList.add('pantheon-worship-target');
            });
        };
        const clearWorshipTargetChips = () => {
            document.querySelectorAll('.pantheon-worship-target').forEach((chip) => {
                chip.classList.remove('pantheon-worship-target');
            });
        };
        const markWorshipTargetChips = (category) => {
            clearWorshipTargetChips();
            if (!category) return;
            document.querySelectorAll('#scorecard .pantheon-chip').forEach((chip) => {
                if (chip.getAttribute('data-category') === category) {
                    chip.classList.add('pantheon-worship-target');
                }
            });
        };
        const pointInExpandedRect = (px, py, el, pad = 16) => {
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return px >= r.left - pad && px <= r.right + pad && py >= r.top - pad && py <= r.bottom + pad;
        };
        const findWorshipChipUnderPointer = (px, py, card, gameState, ignoreEl) => {
            if (!card?.canUse?.()) return null;
            const fromStack = findScoreRowUnderPointer(px, py, ignoreEl);
            const stackCat = fromStack?.getAttribute('data-category');
            if (fromStack && worshipMatchesCategory(card, stackCat, gameState)) return fromStack;
            for (const chip of document.querySelectorAll('#scorecard .pantheon-worship-target')) {
                if (pointInExpandedRect(px, py, chip)) return chip;
            }
            const targetCat = getWorshipCategory(card);
            if (targetCat) {
                const targetChip = [...document.querySelectorAll('#scorecard .pantheon-chip')]
                    .find((chip) => chip.getAttribute('data-category') === targetCat);
                if (targetChip && worshipMatchesCategory(card, targetCat, gameState)
                    && pointInExpandedRect(px, py, targetChip)) {
                    return targetChip;
                }
            }
            return null;
        };
        const resolveWorshipDropChip = (px, py, st, card, gameState) => {
            const fromPointer = findWorshipChipUnderPointer(px, py, card, gameState, st.cardEl);
            if (fromPointer) return fromPointer;
            const fromHot = st.lastPantheonHotEl;
            const hotCat = fromHot?.getAttribute('data-category');
            if (fromHot && worshipMatchesCategory(card, hotCat, gameState)) return fromHot;
            return null;
        };

        // The rail this container belongs to — dragging inside it reorders rather than drops.
        const getConsumableBar = () => container.closest('.inventory-panel-consumables');
        const worshipBlockedNow = (state) => (
            typeof BlindDirector !== 'undefined' && BlindDirector.blocksWorship(state)
        );

        const activateDropMode = (st, clientX, clientY) => {
            if (st.ghostMode === 'drop') return;
            st.ghost?.end();
            st.ghost = null;
            const card = st.card;
            const isWorship = typeof WorshipCard !== 'undefined' && card instanceof WorshipCard;
            const isLibation = typeof LibationCard !== 'undefined' && card instanceof LibationCard;
            st.main = getZones().main;
            st.main?.classList.add('consumable-drag-active');
            if (isWorship) {
                st.main?.classList.add('drag-type-worship');
                if (!worshipBlockedNow(currentEngine()?.state)) {
                    if (card.devotionAscended) {
                        markAllPantheonTargets(currentEngine()?.state);
                    } else {
                        markWorshipTargetChips(getWorshipCategory(card));
                    }
                }
            } else if (isLibation) {
                st.main?.classList.add('drag-type-libation');
                const dieEnhancer = typeof LibationCard !== 'undefined'
                    && LibationCard.isDieFaceEnhancer(card);
                st.isDieEnhancerLibation = dieEnhancer;
                st.main?.classList.add(
                    dieEnhancer ? 'drag-type-libation-enhancer' : 'drag-type-libation-drink'
                );
            }
            if (typeof PointerDragGhost !== 'undefined') {
                let ghostOpts;
                if (isLibation) {
                    ghostOpts = { appearance: 'libation-drop' };
                } else if (isWorship) {
                    ghostOpts = { appearance: 'worship-drop' };
                }
                st.ghost = PointerDragGhost.attach(st.cardEl, 'drag-ghost', ghostOpts);
                st.ghost.start(clientX, clientY);
            }
            const zones = getZones();
            st.zoneRects = {
                sell: zones.sellStone?.getBoundingClientRect() || null,
                libation: zones.libation?.getBoundingClientRect() || null,
            };
            st.dropEls = zones;
            st.ghostMode = 'drop';
        };

        const activateCardMode = (st, clientX, clientY) => {
            if (st.ghostMode === 'card') return;
            clearDieLibationHot(st.lastDieHotEl);
            st.lastDieHotEl = null;
            clearPantheonWorshipHot(st.lastPantheonHotEl);
            st.lastPantheonHotEl = null;
            st.ghost?.setDragTargetHot?.(false);
            clearWorshipTargetChips();
            clearDragChrome(st.main);
            document.getElementById('goldStone')?.classList.remove('drop-target-sell');
            const zones = getZones();
            zones.libation?.classList.remove('zone-hot');
            st.main = getZones().main;
            st.main?.classList.add('consumable-drag-active');
            st.ghost?.end();
            st.ghost = null;
            if (typeof PointerDragGhost !== 'undefined') {
                st.ghost = PointerDragGhost.attach(st.cardEl, 'drag-ghost');
                st.ghost.start(clientX, clientY);
            }
            st.ghostMode = 'card';
        };

        const tryReorderInBar = (st, px, py, gameState, gameEngine) => {
            const bar = getConsumableBar();
            if (!pointIn(px, py, bar)) return false;
            const stack = document.elementsFromPoint(px, py);
            let targetEl = null;
            for (const node of stack) {
                const c = node.closest?.('.card');
                if (c && container.contains(c) && c !== st.cardEl && c.dataset.id) {
                    targetEl = c;
                    break;
                }
            }
            if (!targetEl) return false;
            const consumables = gameState.consumables;
            const fromIndex = consumables.findIndex((c) => c.id === st.card.id);
            const toIndex = consumables.findIndex((c) => c.id === targetEl.dataset.id);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return false;
            const [moved] = consumables.splice(fromIndex, 1);
            consumables.splice(fromIndex < toIndex ? toIndex - 1 : toIndex, 0, moved);
            if (window.soundManager) window.soundManager.play('button', { volume: 0.4 });
            gameEngine?.updateAllUI?.();
            return true;
        };

        const clearDragChrome = (main) => {
            if (main) {
                main.classList.remove(
                    'consumable-drag-active',
                    'drag-type-worship',
                    'drag-type-libation',
                    'drag-type-libation-enhancer',
                    'drag-type-libation-drink'
                );
            }
            const z = getZones();
            z.worship?.classList.remove('zone-hot');
            z.libation?.classList.remove('zone-hot');
        };

        const clearDieLibationHot = (dieEl) => {
            dieEl?.classList.remove('die-libation-drag-hot');
        };
        const clearPantheonWorshipHot = (chipEl) => {
            chipEl?.classList.remove('pantheon-worship-drag-hot');
        };

        const detachDocDragListeners = () => {
            if (!container._consumableDocDragListening) return;
            container._consumableDocDragListening = false;
            document.removeEventListener('pointermove', handleDocPointerMove);
            document.removeEventListener('pointerup', handleDocPointerFinish);
            document.removeEventListener('pointercancel', handleDocPointerFinish);
        };

        const endDrag = (state, cancelled) => {
            if (!state) return;
            detachDocDragListeners();
            clearWorshipTargetChips();
            const { cardEl, main, pointerId } = state;
            clearDieLibationHot(state.lastDieHotEl);
            state.lastDieHotEl = null;
            clearPantheonWorshipHot(state.lastPantheonHotEl);
            state.lastPantheonHotEl = null;
            state.ghost?.setDragTargetHot?.(false);
            if (cardEl) {
                cardEl.classList.remove('consumable-card-dragging');
                if (pointerId != null) {
                    try { cardEl.releasePointerCapture(pointerId); } catch (_) { /* already released */ }
                }
            }
            clearDragChrome(main);
            document.getElementById('goldStone')?.classList.remove('drop-target-sell');
            if (cancelled && cardEl) {
                if (state.ghost) {
                    state.ghost.end();
                    state.ghost = null;
                }
                cardEl.style.removeProperty('transform');
                cardEl.style.removeProperty('will-change');
            }
        };

        const runCloneFx = (cardEl, className, onDone) => {
            const clone = cardEl.cloneNode(true);
            clone.classList.remove('sell-label-visible', 'consumable-card-dragging');
            clone.classList.add(className);
            const r = cardEl.getBoundingClientRect();
            if (typeof CardDragSurface !== 'undefined' && clone.classList.contains('card')) {
                CardDragSurface.pinToScreenRect(clone, r);
            } else {
                clone.querySelectorAll('.buy-sell-label').forEach((n) => n.remove());
                clone.style.position = 'fixed';
                clone.style.left = `${r.left}px`;
                clone.style.top = `${r.top}px`;
                clone.style.width = `${r.width}px`;
                clone.style.height = `${r.height}px`;
            }
            clone.style.zIndex = '10050';
            clone.style.pointerEvents = 'none';
            document.body.appendChild(clone);
            let finished = false;
            const done = () => {
                if (finished) return;
                finished = true;
                clone.remove();
                if (onDone) onDone();
            };
            clone.addEventListener('animationend', done, { once: true });
            setTimeout(done, 700);
        };

        const attachDocDragListeners = () => {
            if (container._consumableDocDragListening) return;
            container._consumableDocDragListening = true;
            document.addEventListener('pointermove', handleDocPointerMove);
            document.addEventListener('pointerup', handleDocPointerFinish);
            document.addEventListener('pointercancel', handleDocPointerFinish);
        };

        const handleDocPointerMove = (e) => {
            const st = container._consumableDrag;
            if (!st || e.pointerId !== st.pointerId) return;
            const dx = e.clientX - st.startX;
            const dy = e.clientY - st.startY;
            if (!st.dragging && (dx * dx + dy * dy) >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
                st.dragging = true;
                st.ghostMode = null;
                st.cardEl.classList.add('consumable-card-dragging');
                const bar = getConsumableBar();
                const insideBar = pointIn(e.clientX, e.clientY, bar);
                if (insideBar) {
                    activateCardMode(st, e.clientX, e.clientY);
                } else {
                    activateDropMode(st, e.clientX, e.clientY);
                }
            }
            if (!st.dragging) return;
            st.pendingX = e.clientX;
            st.pendingY = e.clientY;
            if (st.rafId) return;
            st.rafId = requestAnimationFrame(() => {
                st.rafId = 0;
                const live = container._consumableDrag;
                if (!live || !live.dragging) return;
                const bar = getConsumableBar();
                const insideBar = pointIn(live.pendingX, live.pendingY, bar);
                if (insideBar) {
                    activateCardMode(live, live.pendingX, live.pendingY);
                } else {
                    activateDropMode(live, live.pendingX, live.pendingY);
                }
                const pdx = live.pendingX - live.startX;
                const pdy = live.pendingY - live.startY;
                if (live.ghost?.moveAt) live.ghost.moveAt(live.pendingX, live.pendingY);
                else if (live.ghost) live.ghost.move(pdx, pdy);
                else live.cardEl.style.transform = `translate3d(${pdx}px, ${pdy}px, 0)`;
                if (live.ghostMode !== 'drop') return;
                const rects = live.zoneRects;
                const els = live.dropEls;
                if (els?.sellStone) {
                    els.sellStone.classList.toggle(
                        'drop-target-sell',
                        pointInRect(live.pendingX, live.pendingY, rects?.sell)
                    );
                }
                if (els?.libation && live.isDieEnhancerLibation === false) {
                    els.libation.classList.toggle(
                        'zone-hot',
                        pointInRect(live.pendingX, live.pendingY, rects?.libation)
                    );
                } else if (els?.libation) {
                    els.libation.classList.remove('zone-hot');
                }
                if (live.isDieEnhancerLibation) {
                    const gameState = currentEngine()?.state;
                    const dieEl = findDieUnderPointer(live.pendingX, live.pendingY, live.cardEl);
                    const overValidDie = !!(
                        dieEl
                        && gameState?.hasRolled
                        && live.card?.canUse?.()
                    );
                    if (live.lastDieHotEl && live.lastDieHotEl !== dieEl) {
                        clearDieLibationHot(live.lastDieHotEl);
                    }
                    if (overValidDie && dieEl) {
                        dieEl.classList.add('die-libation-drag-hot');
                        live.lastDieHotEl = dieEl;
                    } else {
                        clearDieLibationHot(live.lastDieHotEl);
                        live.lastDieHotEl = null;
                    }
                    live.ghost?.setDragTargetHot?.(overValidDie);
                }
                const isWorshipCard = typeof WorshipCard !== 'undefined'
                    && live.card instanceof WorshipCard;
                if (isWorshipCard) {
                    const gameState = currentEngine()?.state;
                    const chipEl = findWorshipChipUnderPointer(
                        live.pendingX, live.pendingY, live.card, gameState, live.cardEl
                    );
                    const overValidChip = !!chipEl;
                    if (live.lastPantheonHotEl && live.lastPantheonHotEl !== chipEl) {
                        clearPantheonWorshipHot(live.lastPantheonHotEl);
                    }
                    if (overValidChip && chipEl) {
                        chipEl.classList.add('pantheon-worship-drag-hot');
                        live.lastPantheonHotEl = chipEl;
                    } else {
                        clearPantheonWorshipHot(live.lastPantheonHotEl);
                        live.lastPantheonHotEl = null;
                    }
                    live.ghost?.setDragTargetHot?.(overValidChip);
                }
            });
        };

        const handleDocPointerFinish = (e) => finish(e);

        container.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            const cardEl = e.target.closest('.card');
            if (!cardEl || !container.contains(cardEl)) return;
            const id = cardEl.dataset.id;
            if (!id) return;
            const game = currentEngine();
            const gameState = game?.state;
            if (!game || !gameState) return;
            const card = findCardModel(id, gameState);
            if (!card) return;
            container._consumableDrag = {
                pointerId: e.pointerId,
                cardEl,
                card,
                startX: e.clientX,
                startY: e.clientY,
                dragging: false,
                ghostMode: null,
                main: null,
                ghost: null,
                finishHandled: false,
            };
            attachDocDragListeners();
            cardEl.setPointerCapture(e.pointerId);
        });

        const finish = (e) => {
            const st = container._consumableDrag;
            if (!st || e.pointerId !== st.pointerId || st.finishHandled) return;
            st.finishHandled = true;
            detachDocDragListeners();
            if (st.rafId) {
                cancelAnimationFrame(st.rafId);
                st.rafId = 0;
            }
            container._consumableDrag = null;
            const game = currentEngine();
            const gameState = game?.state;
            const gameEngine = game;
            if (!st.dragging) {
                endDrag(st, false);
                return;
            }
            st.cardEl.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopImmediatePropagation();
            }, { capture: true, once: true });
            if (st.ghost) {
                st.ghost.end();
                st.ghost = null;
            } else {
                st.cardEl.style.removeProperty('transform');
            }
            const px = st.pendingX ?? e.clientX;
            const py = st.pendingY ?? e.clientY;
            const z = getZones();
            const card = st.card;
            const isWorship = typeof WorshipCard !== 'undefined' && card instanceof WorshipCard;
            const isLibation = typeof LibationCard !== 'undefined' && card instanceof LibationCard;

            const doSell = () => {
                endDrag(st, false);
                runCloneFx(st.cardEl, 'consumable-fx-sell-gold', () => {
                    ui.sellCard(card, gameState, gameEngine);
                });
            };
            const doUse = (fxClass) => {
                endDrag(st, false);
                runCloneFx(st.cardEl, fxClass, () => {
                    ui.useConsumable(card, gameState, gameEngine);
                });
            };
            const useWorshipNow = (highlightEl) => {
                if (!card.canUse()) {
                    endDrag(st, false);
                    gameEngine?.showMessage?.('Cannot use this consumable right now.');
                    return;
                }
                endDrag(st, false);
                if (highlightEl) {
                    highlightEl.classList.add('worship-drag-applied-flash');
                    setTimeout(() => highlightEl.classList.remove('worship-drag-applied-flash'), 450);
                }
                ui.useConsumable(card, gameState, gameEngine);
            };

            const isAwaitingPickSameCard = () => (
                pendingLib?.libation === card || pendingEuch?.libation === card
            );
            const applyLibationToDie = (dieEl, enhancementType) => {
                if (!dieEl || !gameState.hasRolled) return false;
                const dieIndex = parseInt(dieEl.dataset.dieIndex, 10);
                if (Number.isNaN(dieIndex)) return false;
                endDrag(st, false);
                runCloneFx(st.cardEl, 'consumable-fx-libation-dice', () => {
                    ui.applyLibationEnhancementToDieFromDrag(card, dieIndex, gameState, gameEngine, enhancementType);
                });
                return true;
            };
            const isDieEnhancerLibation = isLibation && typeof LibationCard !== 'undefined'
                && LibationCard.isDieFaceEnhancer(card);

            const handleLibationZoneDrop = () => {
                if (isLibation && !isDieEnhancerLibation) {
                    if (isAwaitingPickSameCard()) {
                        endDrag(st, true);
                        return;
                    }
                    doUse('consumable-fx-libation-drink');
                } else if (isDieEnhancerLibation) {
                    endDrag(st, false);
                    gameEngine?.showMessage?.('Apply this libation to a die on the table.');
                } else if (isWorship) {
                    endDrag(st, false);
                    gameEngine?.showMessage?.('Drag worship to its matching pantheon tile.');
                } else {
                    endDrag(st, false);
                }
            };

            if (pointIn(px, py, z.sellStone)) {
                doSell();
                return;
            }

            if (pointIn(px, py, getConsumableBar())) {
                if (tryReorderInBar(st, px, py, gameState, gameEngine)) {
                    endDrag(st, false);
                    return;
                }
                endDrag(st, true);
                return;
            }

            const pendingLib = gameEngine?.state?.libationTargetingMode;
            const pendingEuch = gameEngine?.state?.eucharistTargetingMode;
            const scoreRowUnder = findScoreRowUnderPointer(px, py, st.cardEl);
            const worshipRowCategory = scoreRowUnder?.getAttribute?.('data-category') || null;

            if (isWorship) {
                if (worshipBlockedNow(gameState)) {
                    endDrag(st, false);
                    gameEngine?.showMessage?.('Sacred Silence: Worship cannot be used this trial.');
                    return;
                }
                if (card.devotionAscended) {
                    const chip = findScoreRowUnderPointer(px, py, st.cardEl);
                    const targetCat = chip?.getAttribute?.('data-category');
                    if (chip && targetCat && worshipCategoryUnlocked(targetCat, gameState)) {
                        endDrag(st, false);
                        runCloneFx(st.cardEl, 'consumable-fx-worship-pantheon', () => {
                            ui.applyAscendedDevotion(card, targetCat, gameState, gameEngine);
                        });
                        return;
                    }
                    endDrag(st, false);
                    gameEngine?.showMessage?.('Drag ascended worship to a pantheon row to consecrate it.');
                    return;
                }
                const dropChip = resolveWorshipDropChip(px, py, st, card, gameState);
                if (dropChip) {
                    useWorshipNow(dropChip);
                    return;
                }
                if (scoreRowUnder && worshipRowCategory) {
                    endDrag(st, false);
                    gameEngine?.showMessage?.(`Offer this worship at ${getWorshipCategory(card) || 'its pantheon tile'}.`);
                    return;
                }
                endDrag(st, false);
                gameEngine?.showMessage?.('Drag worship to its matching pantheon tile.');
                return;
            }

            const eucharistRowCategory = worshipRowCategory;

            const tryEucharistOnScoreRow = () => {
                if (!eucharistRowCategory || !gameEngine || card.id !== 'the_eucharist' || !isLibation) return false;
                const god = typeof GOD_TO_CATEGORY !== 'undefined' ? GOD_TO_CATEGORY[eucharistRowCategory] : null;
                if (!god) {
                    endDrag(st, false);
                    gameEngine.showMessage?.('The Eucharist: Choose a scoring row tied to a god.');
                    return true;
                }
                if (god === "Pandora's Box" && !gameState.unlockedCategories?.["Pandora's Box"]) {
                    endDrag(st, false);
                    gameEngine.showMessage?.("The Eucharist: Pandora's Box is not unlocked.");
                    return true;
                }
                const finishingPending = pendingEuch?.libation === card;
                if (!finishingPending && !card.canUse()) {
                    endDrag(st, false);
                    gameEngine.showMessage?.('Cannot use this consumable right now.');
                    return true;
                }
                if (!finishingPending) {
                    const godsAvail = Object.keys(gameState.worshipLevels || {}).filter((g) => g !== "Pandora's Box");
                    if (godsAvail.length === 0) {
                        endDrag(st, false);
                        gameEngine.showMessage?.('The Eucharist: No gods available to worship!');
                        return true;
                    }
                }
                endDrag(st, false);
                const cat = eucharistRowCategory;
                runCloneFx(st.cardEl, 'consumable-fx-worship-pantheon', () => {
                    if (!gameEngine.state.eucharistTargetingMode?.libation) {
                        gameEngine.state.eucharistTargetingMode = { libation: card };
                    }
                    gameEngine.handleEucharistSelect(cat);
                });
                return true;
            };

            if (pendingEuch?.libation === card && isLibation && tryEucharistOnScoreRow()) {
                return;
            }
            if (!pendingEuch && isLibation && card.id === 'the_eucharist' && tryEucharistOnScoreRow()) {
                return;
            }

            const dieElTargeting = findDieUnderPointer(px, py, st.cardEl);
            const enhType = isDieEnhancerLibation && typeof LibationCard !== 'undefined'
                ? LibationCard.getDieFaceEnhancementType(card)
                : null;

            /* Die enhancers: resolve die before zone geometry (drink oval overlaps dice tray). */
            if (pendingLib?.libation === card && isLibation
                && applyLibationToDie(dieElTargeting, pendingLib.enhancementType)) {
                return;
            }
            if (isDieEnhancerLibation && enhType && applyLibationToDie(dieElTargeting, enhType)) {
                return;
            }

            if (!isDieEnhancerLibation && pointIn(px, py, z.libation)) {
                handleLibationZoneDrop();
                return;
            }

            if (isDieEnhancerLibation && pointInDicePlayArea(px, py)) {
                if (isAwaitingPickSameCard()) {
                    endDrag(st, true);
                    return;
                }
                doUse('consumable-fx-libation-dice');
                return;
            }

            endDrag(st, true);
        };
    },
};

if (typeof window !== 'undefined') window.ConsumableDrag = ConsumableDrag;
