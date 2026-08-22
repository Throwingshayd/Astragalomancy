/**
 * GameStateManager — high-level UI mode (MENU | ROUND | SHOP | BLIND_SELECT)
 * Authoritative run state lives in GameEngine.state, not here.
 * @module GameStateManager
 */

const GAME_STATES = {
    MENU: 'MENU',
    ROUND: 'ROUND',
    SHOP: 'SHOP',
    BLIND_SELECT: 'BLIND_SELECT'
};

const GameStateManager = {
    currentState: GAME_STATES.MENU,

    setState(newState) {
        if (!Object.values(GAME_STATES).includes(newState)) {
            Logger?.warn?.('GameStateManager: Invalid state', newState);
            return;
        }
        this.currentState = newState;
    }
};

if (typeof window !== 'undefined') {
    window.GAME_STATES = GAME_STATES;
    window.GameStateManager = GameStateManager;
}
