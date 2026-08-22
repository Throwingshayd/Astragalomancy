/**
 * SettingsOverlay — built when opened, removed when closed.
 */
class SettingsOverlay {
    constructor() {
        this.overlay = null;
        this.onClose = null;
    }

    /** Show settings overlay — create and append to body (Balatro: overlay_menu) */
    show(onClose) {
        this.onClose = onClose;
        if (this.overlay) {
            this.overlay.remove();
        }
        this.overlay = this._createOverlay();
        document.body.appendChild(this.overlay);
    }

    /** Hide and remove overlay (Balatro: exit_overlay_menu) */
    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.onClose) {
            this.onClose();
            this.onClose = null;
        }
    }

    _toggleRow(id, label, hint, checked) {
        return `
            <div class="settings-row settings-row-toggle">
                <div class="settings-row-text">
                    <label for="${id}">${label}</label>
                    ${hint ? `<p class="settings-hint">${hint}</p>` : ''}
                </div>
                <label class="settings-switch" aria-label="${label}">
                    <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
                    <span class="settings-switch-track" aria-hidden="true"></span>
                </label>
            </div>
        `;
    }

    _sliderRow(id, label, hint, value) {
        return `
            <div class="settings-row settings-row-slider">
                <div class="settings-row-text">
                    <label for="${id}">${label}</label>
                    ${hint ? `<p class="settings-hint">${hint}</p>` : ''}
                </div>
                <div class="slider-with-value">
                    <input type="range" id="${id}" min="0" max="100" value="${value}">
                    <span class="slider-value" id="${id}Value">${value}%</span>
                </div>
            </div>
        `;
    }

    _selectRow(id, label, hint, optionsHtml) {
        return `
            <div class="settings-row settings-row-select">
                <div class="settings-row-text">
                    <label for="${id}">${label}</label>
                    ${hint ? `<p class="settings-hint">${hint}</p>` : ''}
                </div>
                <select id="${id}">${optionsHtml}</select>
            </div>
        `;
    }

    _createOverlay() {
        const s = (window.dataManager?.getSettings?.()) || {};
        const preset = ['small', 'default', 'large'].includes(s.displayScalePreset) ? s.displayScalePreset : 'default';
        const musicPct = Math.round((s.musicVolume ?? 0.6) * 100);
        const sfxPct = Math.round((s.sfxVolume ?? 0.8) * 100);
        const overlay = document.createElement('div');
        overlay.className = 'overlay settings-overlay-created';
        overlay.id = 'settingsOverlayDynamic';
        overlay.style.cssText = 'z-index: 10002;';
        overlay.innerHTML = `
            <div class="modal-content settings-modal">
                <header class="settings-header">
                    <p class="settings-kicker">Options</p>
                    <h2 class="shop-title settings-title">Settings</h2>
                </header>
                <div class="settings-content">
                    <section class="settings-section" aria-labelledby="settingsAudioHeading">
                        <h3 id="settingsAudioHeading" class="settings-section-title">Audio</h3>
                        ${this._toggleRow('settingSound', 'Sound', null, s.soundEnabled !== false)}
                        ${this._sliderRow('settingMusicVolume', 'Music', null, musicPct)}
                        ${this._sliderRow('settingSfxVolume', 'Sound effects', null, sfxPct)}
                    </section>

                    <section class="settings-section" aria-labelledby="settingsPlayHeading">
                        <h3 id="settingsPlayHeading" class="settings-section-title">Gameplay</h3>
                        ${this._selectRow(
                            'settingGameSpeed',
                            'Pace',
                            null,
                            `
                            <option value="0.5" ${s.gameSpeed === 0.5 ? 'selected' : ''}>Slow</option>
                            <option value="1" ${s.gameSpeed === 1 ? 'selected' : ''}>Normal</option>
                            <option value="2" ${(s.gameSpeed === 2 || s.gameSpeed == null) ? 'selected' : ''}>Fast</option>
                            <option value="4" ${s.gameSpeed === 4 ? 'selected' : ''}>Very fast</option>
                            `
                        )}
                        ${this._toggleRow('settingAutoSave', 'Auto-save', 'Shop, score, and menu checkpoints', s.autoSave !== false)}
                        ${this._toggleRow('settingTutorial', 'Tutorial tips', 'Quick-start overlay for new players', s.showTutorial !== false)}
                    </section>

                    <section class="settings-section" aria-labelledby="settingsDisplayHeading">
                        <h3 id="settingsDisplayHeading" class="settings-section-title">Display</h3>
                        ${this._selectRow(
                            'settingDisplayPreset',
                            'UI size',
                            null,
                            `
                            <option value="small" ${preset === 'small' ? 'selected' : ''}>Compact</option>
                            <option value="default" ${preset === 'default' ? 'selected' : ''}>Fit window</option>
                            <option value="large" ${preset === 'large' ? 'selected' : ''}>Larger</option>
                            `
                        )}
                    </section>
                </div>
                <button type="button" class="divine-button settings-close-btn" id="settingsCloseBtn">Done</button>
            </div>
        `;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.hide();
        });

        const closeBtn = overlay.querySelector('#settingsCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

        ['settingSound', 'settingAutoSave', 'settingTutorial', 'settingGameSpeed', 'settingDisplayPreset'].forEach(id => {
            const el = overlay.querySelector(`#${id}`);
            if (el) el.addEventListener('change', () => this._applySettings(overlay));
        });

        // When Sound is toggled, enable/disable volume sliders
        const soundCheck = overlay.querySelector('#settingSound');
        const updateSliderState = () => {
            const enabled = soundCheck?.checked ?? true;
            overlay.querySelector('#settingMusicVolume')?.toggleAttribute('disabled', !enabled);
            overlay.querySelector('#settingSfxVolume')?.toggleAttribute('disabled', !enabled);
        };
        if (soundCheck) soundCheck.addEventListener('change', updateSliderState);
        updateSliderState();

        // Sliders: 'input' for live feedback, 'change' to persist
        ['settingMusicVolume', 'settingSfxVolume'].forEach(id => {
            const el = overlay.querySelector(`#${id}`);
            if (el) {
                el.addEventListener('input', () => {
                    const valEl = overlay.querySelector(`#${id}Value`);
                    if (valEl) valEl.textContent = el.value + '%';
                    this._applySettings(overlay);
                });
                el.addEventListener('change', () => this._applySettings(overlay));
            }
        });

        return overlay;
    }

    _applySettings(overlay) {
        const prev = window.dataManager?.getSettings?.() || {};
        const musicVal = parseInt(overlay.querySelector('#settingMusicVolume')?.value || '60', 10);
        const sfxVal = parseInt(overlay.querySelector('#settingSfxVolume')?.value || '80', 10);
        let displayScalePreset = overlay.querySelector('#settingDisplayPreset')?.value || 'default';
        if (!['small', 'default', 'large'].includes(displayScalePreset)) displayScalePreset = 'default';
        const settings = {
            ...prev,
            soundEnabled: overlay.querySelector('#settingSound')?.checked ?? true,
            musicVolume: Math.max(0, Math.min(1, musicVal / 100)),
            sfxVolume: Math.max(0, Math.min(1, sfxVal / 100)),
            animationsEnabled: prev.animationsEnabled !== false,
            autoSave: overlay.querySelector('#settingAutoSave')?.checked ?? true,
            showTutorial: overlay.querySelector('#settingTutorial')?.checked ?? true,
            theme: prev.theme || 'default',
            gameSpeed: parseFloat(overlay.querySelector('#settingGameSpeed')?.value || '2'),
            displayScalePreset,
            // Keep legacy display knobs if already stored; no longer exposed in UI
            displayMaxScale: prev.displayMaxScale ?? null,
            displayIntegerScale: !!prev.displayIntegerScale
        };
        if (![0.5, 1, 2, 4].includes(settings.gameSpeed)) settings.gameSpeed = 2;
        window.dataManager?.saveSettings?.(settings);
        if (typeof window.DisplayScale?.refresh === 'function') window.DisplayScale.refresh();
        if (window.app) {
            window.app.applySoundSetting?.(settings.soundEnabled, settings.musicVolume, settings.sfxVolume);
            window.app.applyAutoSaveSetting?.(settings.autoSave);
        }
    }

    isVisible() {
        return !!this.overlay && document.body.contains(this.overlay);
    }
}

window.settingsOverlay = window.settingsOverlay || new SettingsOverlay();
