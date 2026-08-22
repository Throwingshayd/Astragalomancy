/* exported RunInfoOverlay */
/**
 * RunInfoOverlay - Balatro-style Run Info for the pause menu.
 * Short tabs + compact panels so the pause menu fits without a scrollbar.
 */
class RunInfoOverlay {
    static create(gameState) {
        const container = document.createElement('div');
        container.className = 'run-info-container';

        const tabs = [
            { id: 'dice', label: 'Dice' },
            { id: 'antes', label: 'Trials' },
            { id: 'hands', label: 'Hands' },
            { id: 'artifacts', label: 'Artifacts' },
            { id: 'worship', label: 'Worship' }
        ];

        const tabBar = document.createElement('div');
        tabBar.className = 'run-info-tabs';
        tabs.forEach((t, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'run-info-tab' + (i === 0 ? ' active' : '');
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
            tabBar.querySelectorAll('.run-info-tab').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            panelsWrap.querySelectorAll('.run-info-panel').forEach((p) => {
                p.classList.toggle('active', p.dataset.tab === tabId);
            });
        });

        return container;
    }

    static _buildPanelContent(tabId, state) {
        const wrap = document.createElement('div');
        wrap.className = 'run-info-panel-inner';

        if (!state) {
            wrap.innerHTML = '<p class="run-info-empty">No run in progress.</p>';
            return wrap;
        }

        switch (tabId) {
            case 'dice':
                RunInfoOverlay._renderDice(wrap, state);
                break;
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

    static _renderDice(wrap, state) {
        if (typeof DiceInspectOverlay === 'undefined') {
            wrap.innerHTML = '<p class="run-info-empty">Dice info unavailable.</p>';
            return;
        }
        wrap.classList.add('dice-inspect-shell', 'run-info-dice');
        wrap.innerHTML = DiceInspectOverlay.renderBody(state) + DiceInspectOverlay.renderAside(state);
    }

    static _renderAntes(wrap, state) {
        const ante = state.ante ?? 1;
        const anteIndex = Math.max(0, ante - 1);
        const anteData = typeof AnteData !== 'undefined' ? AnteData : [];
        const data = (typeof getAnteData === 'function' ? getAnteData(anteIndex) : null)
            || (anteData[anteIndex] || anteData[anteData.length - 1]);

        if (!data) {
            wrap.innerHTML = '<p class="run-info-empty">Trial data unavailable.</p>';
            return;
        }

        const blind = (typeof BlindDirector !== 'undefined')
            ? BlindDirector.getDef(state.activeBlind)
            : null;

        const current = document.createElement('div');
        current.className = 'run-info-ante-card run-info-ante-current';
        current.innerHTML = `
            <div class="run-info-ante-header">Trial ${ante}</div>
            <div class="run-info-ante-name">${data.name || 'Unknown'}</div>
            <div class="run-info-ante-blind">${blind?.blindName || 'No Blind'}</div>
            <div class="run-info-ante-effect">${blind?.blindEffect || 'No special effect'}</div>
            <div class="run-info-ante-threshold">Need ${state.scoreThreshold ?? data.scoreThreshold ?? '?'}</div>
        `;
        wrap.appendChild(current);

        const upcoming = document.createElement('div');
        upcoming.className = 'run-info-ante-upcoming';
        upcoming.innerHTML = '<div class="run-info-ante-header">Coming up</div>';
        const maxAntes = 11;
        for (let i = ante; i < Math.min(ante + 2, maxAntes); i++) {
            const nextData = (typeof getAnteData === 'function' ? getAnteData(i) : null)
                || (anteData[i] || anteData[anteData.length - 1]);
            if (!nextData) continue;
            const row = document.createElement('div');
            row.className = 'run-info-ante-row';
            row.innerHTML = `<span>Trial ${i + 1}</span><span>${nextData.name}</span>`;
            upcoming.appendChild(row);
        }
        if (upcoming.children.length > 1) wrap.appendChild(upcoming);
    }

    static _renderHands(wrap, state) {
        const scorecard = state.scorecard || {};
        const godByCategory = typeof GOD_TO_CATEGORY !== 'undefined' ? GOD_TO_CATEGORY : {};
        // Only scored hands — zero rows made a long useless scroll list
        const entries = Object.entries(scorecard)
            .filter(([, v]) => typeof v === 'number' && v > 0)
            .sort((a, b) => b[1] - a[1]);

        if (entries.length === 0) {
            wrap.innerHTML = '<p class="run-info-empty">No hands scored yet.</p>';
            return;
        }

        const list = document.createElement('div');
        list.className = 'run-info-compact-grid';
        entries.forEach(([category, score]) => {
            const god = godByCategory[category] || '';
            const row = document.createElement('div');
            row.className = 'run-info-stat-chip';
            row.title = category;
            row.innerHTML = `<span class="run-info-stat-label">${god || category}</span><span class="run-info-stat-value">${score}</span>`;
            list.appendChild(row);
        });
        wrap.appendChild(list);
    }

    static _renderArtifacts(wrap, state) {
        const artifacts = state.artifacts || [];
        if (artifacts.length === 0) {
            wrap.innerHTML = '<p class="run-info-empty">No artifacts yet.</p>';
            return;
        }

        const list = document.createElement('div');
        list.className = 'run-info-artifacts-list';
        artifacts.forEach((a) => {
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
        const leveled = Object.keys({ ...godMeta, ...worshipLevels })
            .filter((g) => (worshipLevels[g] || 0) > 0)
            .sort((a, b) => (worshipLevels[b] || 0) - (worshipLevels[a] || 0));

        if (leveled.length === 0) {
            wrap.innerHTML = '<p class="run-info-empty">No worship levels yet.</p>';
            return;
        }

        const list = document.createElement('div');
        list.className = 'run-info-compact-grid';
        leveled.forEach((god) => {
            const level = worshipLevels[god] || 0;
            const category = godMeta[god]?.category || '';
            const row = document.createElement('div');
            row.className = 'run-info-stat-chip has-level';
            if (category) row.title = category;
            row.innerHTML = `<span class="run-info-stat-label">${god}</span><span class="run-info-stat-value">Lv ${level}</span>`;
            list.appendChild(row);
        });
        wrap.appendChild(list);
    }
}
