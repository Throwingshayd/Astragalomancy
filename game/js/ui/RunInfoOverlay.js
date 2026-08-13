/* exported RunInfoOverlay */
/**
 * RunInfoOverlay - Balatro-style Run Info content for pause menu
 * Balatro: G.UIDEF.run_info() — tabs for Blinds, Hands, Vouchers
 * Dice of Dionysus: Trials & Blinds, Hands Played, Artifacts, Worship Levels
 */
class RunInfoOverlay {
    /**
     * Build tabbed Run Info content for the pause menu
     * @param {Object} gameState - GameEngine.state (or null if no game)
     * @returns {HTMLElement} Container with tabs and panels
     */
    static create(gameState) {
        const container = document.createElement('div');
        container.className = 'run-info-container';

        const tabs = [
            { id: 'antes', label: 'Trials & Blinds' },
            { id: 'hands', label: 'Hands Played' },
            { id: 'artifacts', label: 'Artifacts' },
            { id: 'worship', label: 'Worship' }
        ];

        const tabBar = document.createElement('div');
        tabBar.className = 'run-info-tabs';
        tabs.forEach((t, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'run-info-tab divine-button' + (i === 0 ? ' active' : '');
            btn.dataset.tab = t.id;
            btn.textContent = t.label;
            tabBar.appendChild(btn);
        });
        container.appendChild(tabBar);

        const panelsWrap = document.createElement('div');
        panelsWrap.className = 'run-info-panels';
        tabs.forEach((t, i) => {
            const panel = document.createElement('div');
            panel.className = 'run-info-panel' + (i === 0 ? ' active' : '');
            panel.id = 'runInfoPanel_' + t.id;
            panel.dataset.tab = t.id;
            panel.appendChild(RunInfoOverlay._buildPanelContent(t.id, gameState));
            panelsWrap.appendChild(panel);
        });
        container.appendChild(panelsWrap);

        tabBar.addEventListener('click', (e) => {
            const btn = e.target.closest('.run-info-tab');
            if (!btn) return;
            const tabId = btn.dataset.tab;
            tabBar.querySelectorAll('.run-info-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            panelsWrap.querySelectorAll('.run-info-panel').forEach(p => {
                p.classList.toggle('active', p.dataset.tab === tabId);
            });
        });

        return container;
    }

    /**
     * @param {string} tabId - 'antes' | 'hands' | 'artifacts' | 'worship'
     * @param {Object} state - GameEngine.state
     * @returns {HTMLElement}
     */
    static _buildPanelContent(tabId, state) {
        const wrap = document.createElement('div');
        wrap.className = 'run-info-panel-inner';

        if (!state) {
            wrap.innerHTML = '<p class="run-info-empty">No run in progress.</p>';
            return wrap;
        }

        switch (tabId) {
            case 'antes':
                RunInfoOverlay._renderAntes(wrap, state);
                break;
            case 'hands':
                RunInfoOverlay._renderHands(wrap, state);
                break;
            case 'artifacts':
                RunInfoOverlay._renderArtifacts(wrap, state);
                break;
            case 'worship':
                RunInfoOverlay._renderWorship(wrap, state);
                break;
        }
        return wrap;
    }

    static _renderAntes(wrap, state) {
        const ante = state.ante ?? 1;
        const anteIndex = Math.max(0, ante - 1);
        const anteData = typeof AnteData !== 'undefined' ? AnteData : [];
        const data = (typeof getAnteData === 'function' ? getAnteData(anteIndex) : null) ||
            (anteData[anteIndex] || anteData[anteData.length - 1]);

        if (!data) {
            wrap.innerHTML = '<p class="run-info-empty">Trial data unavailable.</p>';
            return;
        }

        // Blinds are rolled per run, so the catalog — not AnteData — names the current one.
        const blind = (typeof BlindDirector !== 'undefined')
            ? BlindDirector.getDef(state.activeBlind)
            : null;
        const current = document.createElement('div');
        current.className = 'run-info-ante-card run-info-ante-current';
        current.innerHTML = `
            <div class="run-info-ante-header">Current Trial ${ante}</div>
            <div class="run-info-ante-name">${data.name || 'Unknown'}</div>
            <div class="run-info-ante-blind">${blind?.blindName || 'No Blind'}</div>
            <div class="run-info-ante-effect">${blind?.blindEffect || 'No special effect'}</div>
            <div class="run-info-ante-threshold">Required: ${state.scoreThreshold ?? data.scoreThreshold ?? '?'}</div>
        `;
        wrap.appendChild(current);

        const upcoming = document.createElement('div');
        upcoming.className = 'run-info-ante-upcoming';
        upcoming.innerHTML = '<div class="run-info-ante-header">Upcoming Trials</div>';
        const maxAntes = 11;
        for (let i = ante; i < Math.min(ante + 3, maxAntes); i++) {
            const idx = Math.max(0, i);
            const nextData = (typeof getAnteData === 'function' ? getAnteData(idx) : null) ||
                (anteData[idx] || anteData[anteData.length - 1]);
            if (nextData) {
                const row = document.createElement('div');
                row.className = 'run-info-ante-row';
                row.innerHTML = `<span>Trial ${i + 1}:</span> <span>${nextData.name} — ${nextData.scoreThreshold}</span>`;
                upcoming.appendChild(row);
            }
        }
        wrap.appendChild(upcoming);
    }

    static _renderHands(wrap, state) {
        const scorecard = state.scorecard || {};
        // Use different name to avoid TDZ: local GOD_TO_CATEGORY would shadow global and fail before init
        const godToCategory = typeof GOD_TO_CATEGORY !== 'undefined' ? GOD_TO_CATEGORY : {};
        const entries = Object.entries(scorecard).filter(([, v]) => v !== undefined && typeof v === 'number');

        if (entries.length === 0) {
            wrap.innerHTML = '<p class="run-info-empty">No hands scored yet.</p>';
            return;
        }

        const list = document.createElement('div');
        list.className = 'run-info-hands-list';
        entries.forEach(([category, score]) => {
            const god = godToCategory[category] || '';
            const godPart = god ? ` (${god})` : '';
            const row = document.createElement('div');
            row.className = 'run-info-hand-row';
            row.innerHTML = `<span class="run-info-hand-cat">${category}${godPart}</span><span class="run-info-hand-score">${score}</span>`;
            list.appendChild(row);
        });
        wrap.appendChild(list);
    }

    /**
     * The chest is a shop drop target now, not an inventory, so this tab is the only
     * place the artifacts you own this run are shown — hence the card art, not just rows.
     */
    static _renderArtifacts(wrap, state) {
        const artifacts = state.artifacts || [];

        if (artifacts.length === 0) {
            wrap.innerHTML = '<p class="run-info-empty">No artifacts yet.</p>';
            return;
        }

        const list = document.createElement('div');
        list.className = 'run-info-artifacts-list';
        artifacts.forEach(a => {
            const data = (a && a.base) || a || {};
            const name = data.name || 'Unknown';
            const effect = data.effect || '';
            const row = document.createElement('div');
            row.className = 'run-info-artifact-row';
            if (typeof Artifact !== 'undefined') {
                const card = (a instanceof Artifact ? a : new Artifact(data)).render(false, false);
                card.classList.add('run-info-artifact-card');
                row.appendChild(card);
            }
            const text = document.createElement('div');
            text.className = 'run-info-artifact-text';
            text.innerHTML = `<div class="run-info-artifact-name">${name}</div><div class="run-info-artifact-effect">${effect}</div>`;
            row.appendChild(text);
            list.appendChild(row);
        });
        wrap.appendChild(list);
    }

    static _renderWorship(wrap, state) {
        const worshipLevels = state.worshipLevels || {};
        const godMeta = typeof GOD_METADATA !== 'undefined' ? GOD_METADATA : {};
        const gods = Object.keys(godMeta).length > 0 ? Object.keys(godMeta) : Object.keys(worshipLevels).filter(g => g);

        if (gods.length === 0) {
            wrap.innerHTML = '<p class="run-info-empty">No worship data.</p>';
            return;
        }

        const list = document.createElement('div');
        list.className = 'run-info-worship-list';
        gods.sort((a, b) => (worshipLevels[b] || 0) - (worshipLevels[a] || 0));
        gods.forEach(god => {
            const level = worshipLevels[god] || 0;
            const meta = godMeta[god];
            const category = meta?.category || '';
            const row = document.createElement('div');
            row.className = 'run-info-worship-row' + (level > 0 ? ' has-level' : '');
            row.innerHTML = `<span class="run-info-worship-god">${god}${category ? ` (${category})` : ''}</span><span class="run-info-worship-level">${level}</span>`;
            list.appendChild(row);
        });
        wrap.appendChild(list);
    }
}
