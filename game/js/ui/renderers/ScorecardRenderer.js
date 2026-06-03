/**
 * ScorecardRenderer - Pantheon scorecard and bonus Yahtzee indicator
 * @module ui/renderers/ScorecardRenderer
 */

const ScorecardRenderer = {
    updateBonusYahtzeeIndicator(gameState) {
        const indicator = document.getElementById('bonusYahtzeeIndicator');
        const countDisplay = document.getElementById('bonusYahtzeeCount');
        const progressItems = document.querySelectorAll('.progress-item');
        if (indicator && countDisplay) {
            countDisplay.textContent = gameState.bonusYahtzees;
            progressItems.forEach(item => {
                const category = item.dataset.category;
                if (gameState.unlockedCategories?.[category]) item.classList.add('unlocked');
                else item.classList.remove('unlocked');
            });
        }
    },

    updateScorecardUI(dom, gameState, gameEngine, uiManager) {
        const engine = gameEngine || window.game;
        const scorecardEl = document.getElementById('scorecard');
        if (engine?.state?.eucharistTargetingMode && scorecardEl) scorecardEl.classList.add('eucharist-targeting');
        else if (scorecardEl) scorecardEl.classList.remove('eucharist-targeting');

        const diceKey = (gameState.dice || []).map(d => (d.getEffectiveFace?.() ?? d.currentFace ?? 0)).join(',');
        if (!uiManager._scorecardHighlightCache || uiManager._scorecardHighlightCache.diceKey !== diceKey) {
            uiManager._scorecardHighlightCache = { diceKey, results: {} };
        }
        const highlightCache = uiManager._scorecardHighlightCache.results;

        dom.scorecardRows.forEach(row => {
            const category = row.dataset.category;
            if (!category) return;
            if (['Sevens', 'Eights', 'Nines'].includes(category)) {
                if (!gameState.unlockedCategories?.[category]) {
                    row.style.display = 'none';
                    return;
                }
                row.style.removeProperty('display');
            }
            if (category === "Pandora's Box") {
                const isUnlocked = gameState.unlockedCategories?.["Pandora's Box"];
                if (isUnlocked) row.classList.add('pandora-unlocked');
                else row.classList.remove('pandora-unlocked');
                const upperSum = ['Ones','Twos','Threes','Fours','Fives','Sixes'].reduce((sum, c) => sum + (gameState.scorecard[c] || 0), 0);
                const upperBonus = (Math.round(upperSum) >= 63) ? 35 : 0;
                const lowerCats = ['Three of a Kind','Small Straight','Full House','Four of a Kind','Large Straight','Yahtzee','Chance'];
                const lowerComplete = lowerCats.every(c => {
                    const v = gameState.scorecard[c];
                    return v !== undefined && (typeof v === 'number' ? v > 0 : true);
                });
                const lowerBonus = lowerComplete ? 35 : 0;
                const combined = upperBonus + lowerBonus;
                row.classList.remove('used');
                const worshipLevel = gameState.worshipLevels?.["Pandora's Box"] || 0;
                const categorySpan = row.querySelector('span');
                if (categorySpan) {
                    let deityText = 'Pandora';
                    if (isUnlocked && worshipLevel > 0) {
                        const displayLevel = worshipLevel + 1;
                        deityText = `Pandora Lv.${displayLevel}`;
                    }
                    categorySpan.innerHTML = `<span class="pantheon-cat">Pandora's Box</span><span class="pantheon-deity">${deityText}</span>`;
                }
                row.querySelector('.potential-score').textContent = combined > 0 ? String(combined) : '';
                row.style.cursor = isUnlocked ? 'pointer' : 'default';
                return;
            }
            const categorySpan = row.querySelector('span');
            if (categorySpan) {
                const godMapping = { 'Ones': 'Artemis', 'Twos': 'Aphrodite', 'Threes': 'Morpheus', 'Fours': 'Hera', 'Fives': 'Athena', 'Sixes': 'Heracles', 'Three of a Kind': 'Hephaestus', 'Four of a Kind': 'Ares', 'Full House': 'Dionysus', 'Small Straight': 'Hermes', 'Large Straight': 'Apollo', 'Yahtzee': 'Zeus', 'Chance': 'Nyx', 'Sevens': 'The Pleiades', 'Eights': 'Poseidon', 'Nines': 'The Nine Muses' };
                const displayCategory = category === 'Yahtzee' ? 'Heureka' : category;
                const god = godMapping[category];
                const worshipLevel = gameState.worshipLevels?.[god] || 0;
                const displayLevel = worshipLevel + 1;
                const deityText = worshipLevel > 0 ? `${god} Lv.${displayLevel}` : god;
                categorySpan.innerHTML = `<span class="pantheon-cat">${displayCategory}</span><span class="pantheon-deity">${deityText}</span>`;
            }
            const scoreDisplay = row.querySelector('.potential-score');
            if (gameState.scorecard[category] !== undefined) {
                row.classList.add('used');
                row.classList.remove('available-category');
                row.classList.remove('category-available-highlight');
                const rounded = Math.round(gameState.scorecard[category]);
                scoreDisplay.textContent = rounded === 0 ? 'X' : String(rounded);
            } else {
                row.classList.remove('used');
                scoreDisplay.textContent = '';
                if (gameState.hasRolled && window.game) {
                    let showGreen;
                    if (highlightCache[category] !== undefined) showGreen = highlightCache[category];
                    else {
                        const { pips, favour, isValid } = window.game.calculateScore(category);
                        const hasPoints = isValid && (pips || 0) * (favour || 0) > 0;
                        const faceValue = typeof CATEGORY_TO_NUMBER !== 'undefined' ? CATEGORY_TO_NUMBER[category] : null;
                        const isUpperCategory = faceValue != null;
                        const counts = {};
                        (gameState.dice || []).forEach(d => { const f = d.getEffectiveFace?.() ?? d.currentFace ?? 0; if (f > 0) counts[f] = (counts[f] || 0) + 1; });
                        const hasThreeOrMore = isUpperCategory && (counts[faceValue] || 0) >= 3;
                        showGreen = hasPoints && (!isUpperCategory || hasThreeOrMore);
                        highlightCache[category] = showGreen;
                    }
                    if (showGreen) { row.classList.add('available-category'); row.classList.add('category-available-highlight'); }
                    else { row.classList.remove('available-category'); row.classList.remove('category-available-highlight'); }
                } else { row.classList.remove('available-category'); row.classList.remove('category-available-highlight'); }
            }
        });
        this.updateBonusYahtzeeIndicator(gameState);
    }
};

if (typeof window !== 'undefined') window.ScorecardRenderer = ScorecardRenderer;
