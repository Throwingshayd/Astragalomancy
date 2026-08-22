/**
 * ScorecardRenderer - Pantheon scorecard and bonus Yahtzee indicator
 * @module ui/renderers/ScorecardRenderer
 */

const ScorecardRenderer = {
    _pantheonLabels(slotCategory, gameState) {
        const godMapping = {
            'Ones': 'Artemis', 'Twos': 'Aphrodite', 'Threes': 'Hecate', 'Fours': 'Hera',
            'Fives': 'Athena', 'Sixes': 'Demeter', 'Three of a Kind': 'Hephaestus',
            'Four of a Kind': 'Ares', 'Full House': 'Dionysus', 'Small Straight': 'Hermes',
            'Large Straight': 'Apollo', 'Extra Long Straight': 'Iris', 'Yahtzee': 'Hades',
            'Heureka': 'Zeus', 'Chance': 'Nyx',
            'Sevens': 'The Pleiades', 'Eights': 'Poseidon', 'Nines': 'The Nine Muses',
        };
        const evalCat = typeof DevotionUtils !== 'undefined'
            ? DevotionUtils.getEvalCategory(gameState, slotCategory)
            : slotCategory;
        const consecrated = typeof DevotionUtils !== 'undefined'
            && DevotionUtils.isConsecratedSlot(gameState, slotCategory);
        const displayCategory = evalCat === 'Yahtzee' ? 'Five of a Kind' : evalCat;
        const god = (consecrated && gameState.categoryGodBinding?.[slotCategory])
            || gameState.categoryGodBinding?.[slotCategory]
            || godMapping[slotCategory];
        const worshipLevel = god ? (gameState.worshipLevels?.[god] || 0) : 0;
        const displayLevel = worshipLevel + 1;
        const deityText = god
            ? (worshipLevel > 0 ? `${god} Lv.${displayLevel}` : god)
            : '';
        return { displayCategory, deityText, consecrated };
    },

    _clearDevotionMark(row) {
        row.querySelector(':scope > .pantheon-devotion-mark')?.remove();
        row.querySelector('.score-details .pantheon-devotion-mark')?.remove();
        row.classList.remove('has-devotion-mark');
    },

    updateBonusYahtzeeIndicator(gameState) {
        const indicator = document.getElementById('bonusYahtzeeIndicator');
        const countDisplay = document.getElementById('bonusCount');
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
        const engine = gameEngine;
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
            const gated = typeof UNLOCKABLE_SCORE_ROWS !== 'undefined'
                ? UNLOCKABLE_SCORE_ROWS
                : ['Sevens', 'Eights', 'Nines', 'Heureka', 'Extra Long Straight'];
            if (gated.includes(category)) {
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
                row.classList.toggle('pantheon-scored', combined > 0);
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
                const { displayCategory, deityText, consecrated } = this._pantheonLabels(category, gameState);
                categorySpan.innerHTML = `<span class="pantheon-cat">${displayCategory}</span><span class="pantheon-deity">${deityText}</span>`;
                this._clearDevotionMark(row);
                row.classList.toggle('pantheon-consecrated', !!consecrated);
            }
            const scoreDisplay = row.querySelector('.potential-score');
            const scored = typeof DevotionUtils !== 'undefined'
                ? DevotionUtils.hasBeenScored(gameState, category)
                : gameState.scorecard[category] !== undefined;
            const canRescore = typeof DevotionUtils !== 'undefined'
                && DevotionUtils.canRescore(gameState, category);
            if (scored) {
                row.classList.add('used');
                row.classList.add('pantheon-scored');
                row.classList.toggle('devotion-rescorable', canRescore);
                row.classList.remove('available-category');
                row.classList.remove('category-available-highlight');
                const rounded = Math.round(gameState.scorecard[category] || 0);
                scoreDisplay.textContent = rounded === 0 ? 'X' : String(rounded);
            } else {
                row.classList.remove('used', 'devotion-rescorable', 'pantheon-scored');
                scoreDisplay.textContent = '';
                if (gameState.hasRolled && engine && (canRescore || !scored)) {
                    let showGreen;
                    if (highlightCache[category] !== undefined) showGreen = highlightCache[category];
                    else {
                        const evalCategory = typeof DevotionUtils !== 'undefined'
                            ? DevotionUtils.getEvalCategory(gameState, category)
                            : category;
                        const { pips, favour, isValid } = engine.calculateScore(category);
                        const hasPoints = isValid && (pips || 0) * (favour || 0) > 0;
                        const faceValue = typeof CATEGORY_TO_NUMBER !== 'undefined'
                            ? CATEGORY_TO_NUMBER[evalCategory]
                            : null;
                        const isUpperCategory = faceValue != null;
                        const counts = {};
                        (gameState.dice || []).forEach(d => {
                            const f = d.getEffectiveFace?.() ?? d.currentFace ?? 0;
                            if (f > 0) counts[f] = (counts[f] || 0) + 1;
                        });
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
