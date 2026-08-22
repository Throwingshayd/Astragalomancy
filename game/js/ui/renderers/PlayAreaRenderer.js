/**
 * PlayAreaRenderer - Boon bar, left bar (libations + worship), drag-and-drop
 * Artifacts are not drawn here: the chest is a shop drop target (ui/drag/ChestDrop.js)
 * and owned artifacts are listed in the pause menu's Run Info tab.
 * @module ui/renderers/PlayAreaRenderer
 * `consumables` in state = technical group for LibationCard + WorshipCard (see docs/GAME_TERMINOLOGY.md)
 */

const PlayAreaRenderer = {
    updatePlayAreaSlots(dom, gameState, gameEngine, uiManager) {
        const boonKey = (gameState.boons || []).map(j => j.id).join(',');
        const consumableKey = (gameState.consumables || []).map(c => c.id).join(',');
        const hereticKey = gameState.hereticStacks ?? 0;
        const capacityKey = `${gameState.boonSlots ?? 5}|${gameState.worshipSlots ?? 2}|${gameState.libationSlots ?? 3}`;
        const slotsKey = `${boonKey}|${consumableKey}|${capacityKey}|${hereticKey}`;
        if (uiManager._playAreaSlotsKey === slotsKey) return;
        uiManager._playAreaSlotsKey = slotsKey;

        this.updateBoonUI(dom, gameState, gameEngine, uiManager);
        this.updateConsumableUI(dom, gameState, gameEngine, uiManager);

        const boonCount = (gameState.boons || []).length;
        const boonMax = gameState.boonSlots || (window.GAME_BALANCE?.STARTING_BOON_SLOTS ?? 5);
        if (dom.boonSlotCounter) dom.boonSlotCounter.textContent = `${boonCount}/${boonMax}`;
        this.updateRailCounter(dom.worshipSlotCounter, gameState, 'worship');
        this.updateRailCounter(dom.libationSlotCounter, gameState, 'libation');
    },

    updateRailCounter(el, gameState, kind) {
        if (!el) return;
        const held = ConsumableSlots.held(gameState, kind).length;
        el.textContent = `${held}/${ConsumableSlots.capacity(gameState, kind)}`;
    },

    updateBoonUI(dom, gameState, gameEngine, uiManager) {
        const container = dom.boonSlots;
        const boonsPanel = container?.closest('.inventory-panel-boons');
        if (!container) { Logger.warn('boonSlots element not found'); return; }
        container.innerHTML = '';
        const boons = gameState.boons || [];
        if (boons.length === 0) {
            if (boonsPanel) boonsPanel.classList.remove('has-multiple-boons');
            uiManager.bindBoonSlotDrag(container, gameState, gameEngine);
            return;
        }
        if (boonsPanel) boonsPanel.classList.toggle('has-multiple-boons', boons.length >= 2);

        boons.forEach((boon) => {
            uiManager.appendInventoryCard(boon, container, { gameState });
        });
        uiManager.bindBoonSlotDrag(container, gameState, gameEngine);
    },

    updateConsumableUI(dom, gameState, gameEngine, uiManager) {
        this.renderConsumableRail(dom.worshipSlots, gameState, 'worship', uiManager, gameEngine);
        this.renderConsumableRail(dom.libationSlots, gameState, 'libation', uiManager, gameEngine);
    },

    /**
     * Blessings and libations live in one `state.consumables` array but hold
     * separate rails, so each container draws only its own kind.
     */
    renderConsumableRail(container, gameState, kind, uiManager, gameEngine) {
        if (!container) { Logger.warn(`${kind} slots element not found`); return; }
        container.innerHTML = '';
        ConsumableSlots.held(gameState, kind).forEach((card) => {
            uiManager.appendInventoryCard(card, container, { gameState });
        });
        uiManager.bindConsumableHorizonDrag(container, gameEngine);
    }
};

if (typeof window !== 'undefined') window.PlayAreaRenderer = PlayAreaRenderer;
