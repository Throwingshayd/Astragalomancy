/**
 * The desktop shell opens fullscreen, so players need a way back out; there it owns a
 * real OS window. On web the document Fullscreen API is all that's available.
 */
async function toggleFullscreen() {
    const tauriWindow = window.__TAURI__?.window;
    if (tauriWindow?.getCurrentWindow) {
        const win = tauriWindow.getCurrentWindow();
        await win.setFullscreen(!(await win.isFullscreen()));
        return;
    }

    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
}

/**
 * App keyboard shortcuts (classic script; receives App instance).
 */
function bindAppKeyboardShortcuts(app) {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key.toLowerCase()) {
            case 'f11':
                e.preventDefault();
                toggleFullscreen().catch((err) => Logger.warn('Fullscreen toggle failed', err));
                break;

            case 'p':
                if (app.currentScreen === 'game') {
                    e.preventDefault();
                    if (app._pauseOverlay) {
                        // Real pause menu owns the screen — don't layer soft pause.
                        break;
                    }
                    if (window.settingsOverlay?.isVisible?.()) break;
                    app.softPause?.toggle();
                }
                break;

            case 'r':
                if (app.game && app.currentScreen === 'game' && !app.softPause?.isActive()) {
                    e.preventDefault();
                    app.game.rollDice();
                }
                break;

            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
                if (app.game && app.currentScreen === 'game' && !app.softPause?.isActive()) {
                    e.preventDefault();
                    const index = parseInt(e.key, 10) - 1;
                    app.game.toggleHold(index);
                }
                break;

            case 'escape':
                e.preventDefault();
                if (app.currentScreen === 'game') {
                    if (app.softPause?.isActive()) {
                        app.softPause.resume();
                        break;
                    }
                    if (window.settingsOverlay?.isVisible?.()) {
                        app.hideSettings();
                    } else if (app._pauseOverlay) {
                        app.hidePauseMenu();
                    } else {
                        app.showPauseMenu();
                    }
                } else if (app.currentScreen === 'collection') {
                    app.showStartScreen();
                } else if (app.currentScreen === 'start') {
                    if (window.settingsOverlay?.isVisible?.()) app.hideSettings();
                }
                break;

            case 'c':
                if (app.currentScreen === 'start') {
                    e.preventDefault();
                    app.showCollection();
                }
                break;

            case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (app.game) {
                        const saved = app.game.saveGame({ force: true, silent: false });
                        if (saved) {
                            app.showMessage('Game saved!');
                            app.showSaveIndicator();
                        } else {
                            app.showMessage('Cannot save right now', 2000);
                        }
                    }
                }
                break;
        }
    });
}

window.bindAppKeyboardShortcuts = bindAppKeyboardShortcuts;
