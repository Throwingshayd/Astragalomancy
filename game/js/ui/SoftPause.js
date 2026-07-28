/**
 * Soft pause — freezes in-run input with a simple overlay. Does not open the pause menu.
 * Toggle with P (wired from KeyboardShortcuts).
 */
class SoftPause {
    constructor(app) {
        this.app = app;
        this.active = false;
        this._el = null;
    }

    isActive() {
        return this.active;
    }

    toggle() {
        if (this.active) this.resume();
        else this.pause();
    }

    pause() {
        if (this.active || this.app?.currentScreen !== 'game') return;
        if (this.app._pauseOverlay || window.settingsOverlay?.isVisible?.()) return;

        this.active = true;
        if (!this._el) {
            this._el = document.createElement('div');
            this._el.id = 'softPauseOverlay';
            this._el.className = 'soft-pause-overlay';
            this._el.setAttribute('role', 'dialog');
            this._el.setAttribute('aria-label', 'Game paused');
            this._el.innerHTML =
                '<div class="soft-pause-card">' +
                '<div class="soft-pause-title">Paused</div>' +
                '<div class="soft-pause-hint">Press P to resume</div>' +
                '</div>';
        }
        const host = document.getElementById('gameViewport') || document.body;
        host.appendChild(this._el);
        document.body.classList.add('soft-pause-active');
    }

    resume() {
        if (!this.active) return;
        this.active = false;
        this._el?.remove();
        document.body.classList.remove('soft-pause-active');
    }
}

window.SoftPause = SoftPause;
