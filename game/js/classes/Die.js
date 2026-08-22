/* exported Die */
/**
 * Die class - Represents a single six-sided die with face-specific enhancements
 * Each die has 6 independent faces that can be enhanced individually
 * @class
 * @example
 * const die = new Die(1);
 * die.roll(prng);
 * die.addFaceEnhancement(6, 'gold'); // Enhance the 6-face with gold
 */
class Die {
    /**
     * Creates a new die instance
     * @param {number|null} [dieId=null] - Unique identifier for this die
     */
    constructor(dieId = null) {
        /** @type {number} Which face is currently showing (0 = not rolled, 1-6 = face value) */
        this.currentFace = 0;
        /** @type {boolean} Whether this die is held/locked from rolling */
        this.isLocked = false;
        /** @type {number} Temporary modifier for current roll */
        this.tempModifier = 0;
        /** @type {number|null} Unique identifier for this die */
        this.dieId = dieId;
        /** @type {number|undefined} Wild enhancement chosen value (set by player) */
        this.wildValue = undefined;
        /** @type {number|undefined} Mother of pearl bonus from adjacent die (set randomly) */
        this.motherOfPearlBonus = undefined;
        
        // Each face is an independent entity with its own properties
        this.faces = {
            1: { value: 1, enhancements: new Set(), modifiedValue: 1 },
            2: { value: 2, enhancements: new Set(), modifiedValue: 2 },
            3: { value: 3, enhancements: new Set(), modifiedValue: 3 },
            4: { value: 4, enhancements: new Set(), modifiedValue: 4 },
            5: { value: 5, enhancements: new Set(), modifiedValue: 5 },
            6: { value: 6, enhancements: new Set(), modifiedValue: 6 }
        };
    }

    /**
     * Roll the die to generate a random face value
     * @param {Object} prng - Seeded random number generator
     * @param {Function} prng.random - Returns random number 0-1
     * @param {number} [maxFace] - Max face value (1-maxFace). Default GAME_BALANCE.MAX_DIE_FACE. Use 7/8/9 after bonus Yahtzees.
     */
    roll(prng, maxFace = GAME_BALANCE.MAX_DIE_FACE) {
        if (!this.isLocked) {
            // Clear wild value when rolling to new face
            this.wildValue = undefined;
            this.motherOfPearlBonus = undefined;
            
            this.currentFace = Math.floor(prng.random() * maxFace) + GAME_BALANCE.MIN_DIE_FACE;
            this._ensureFaceExists(this.currentFace);
            
            // If the rolled face has wild enhancement, automatically randomize the value
            if (this.hasEnhancementForCurrentFace('wild')) {
                // Randomly choose -1, 0, or +1 modifier
                const wildModifier = Math.floor(prng.random() * 3) - 1; // Generates -1, 0, or 1
                const baseValue = this.currentFace;
                // Clamp to valid range (1-maxFace)
                this.wildValue = Math.max(1, Math.min(maxFace, baseValue + wildModifier));
                Logger.trace(`Wild die: face ${baseValue} → ${this.wildValue}`);
            }
            
            // Add Balatro-style rolling effect if effects system is available
            if (window.balatroEffects && this.dieElement) {
                window.balatroEffects.addDiceRollEffect(this.dieElement);
            }
        }
    }

    /**
     * Reset the die for a new turn
     * Note: Face enhancements persist across turns
     */
    reset() {
        this.currentFace = 0;
        this.isLocked = false;
        this.tempModifier = 0;
        // Don't reset wildValue and motherOfPearlBonus - they should persist until die is rolled to new face
        // Face enhancements persist across turns
    }

    /**
     * Completely reset the die, including all enhancements
     */
    fullReset() {
        this.currentFace = 0;
        this.isLocked = false;
        this.tempModifier = 0;
        this.wildValue = undefined;
        this.motherOfPearlBonus = undefined;
        // Reset all face enhancements (including virtual faces 7-9)
        Object.values(this.faces).forEach(face => {
            face.enhancements.clear();
            face.modifiedValue = face.value;
        });
    }

    /**
     * Validate if a face value is in valid range (1-9 for enhancements)
     * @param {number|string} faceValue - Face value to validate
     * @returns {boolean} True if valid, false otherwise
     */
    isValidFace(faceValue) {
        const parsedFace = parseInt(faceValue, 10);
        return !isNaN(parsedFace) &&
               parsedFace >= GAME_BALANCE.MIN_DIE_FACE &&
               parsedFace <= GAME_BALANCE.MAX_DIE_FACE_WITH_ENHANCEMENTS;
    }

    /**
     * Get validated face key (1-9) or null if invalid
     * @param {number|string} faceValue - Face value to validate
     * @returns {number|null} Validated face number or null
     */
    getValidatedFaceKey(faceValue) {
        if (!this.isValidFace(faceValue)) {
            Logger.warn('Invalid face value', { faceValue, max: GAME_BALANCE.MAX_DIE_FACE_WITH_ENHANCEMENTS });
            return null;
        }
        return parseInt(faceValue, 10);
    }

    /**
     * Ensure faces 7-9 exist (lazy init for high-category enhancements)
     * @param {number} faceKey - Face to ensure exists
     */
    _ensureFaceExists(faceKey) {
        if (faceKey >= 7 && faceKey <= 9 && !this.faces[faceKey]) {
            this.faces[faceKey] = { value: faceKey, enhancements: new Set(), modifiedValue: faceKey };
        }
    }

    /**
     * Add an enhancement to a specific die face
     * @param {number|string} faceValue - Face to enhance (1-6)
     * @param {string} enhancement - Enhancement type (parchment/iron/gold/mirror/wild)
     * @returns {boolean} True if enhancement was added successfully
     * @example
     * die.addFaceEnhancement(6, 'gold'); // 6-face now gives +1 gold when scored
     */
    addFaceEnhancement(faceValue, enhancement) {
        const faceKey = this.getValidatedFaceKey(faceValue);
        if (faceKey === null) {
            Logger.error('Cannot add enhancement to invalid face', { faceValue });
            return false;
        }
        
        this._ensureFaceExists(faceKey);
        if (!this.faces[faceKey]) {
            Logger.error('Face does not exist in die structure', { faceKey });
            return false;
        }
        
        this.faces[faceKey].enhancements.add(enhancement);
        return true;
    }

    /**
     * Remove an enhancement from a specific die face
     * @param {number|string} faceValue - Face to modify (1-6)
     * @param {string} enhancement - Enhancement type to remove
     * @returns {boolean} True if removed successfully
     */
    removeFaceEnhancement(faceValue, enhancement) {
        const faceKey = this.getValidatedFaceKey(faceValue);
        if (faceKey && this.faces[faceKey]) {
            this.faces[faceKey].enhancements.delete(enhancement);
            return true;
        }
        return false;
    }

    /**
     * Permanently modify a face's value (e.g., Elixir of Lethe, Chalice of Helios)
     * @param {number|string} faceValue - Face to modify (1-6)
     * @param {number} delta - Amount to change (+1 or -1)
     * @returns {boolean} True if modification was successful
     */
    modifyFaceValue(faceValue, delta) {
        const targetKey = this.getValidatedFaceKey(faceValue);
        if (targetKey === null) {
            Logger.error('Cannot modify invalid face', { faceValue });
            return false;
        }
        
        // For faces 7-9, find the physical face (1-6) that has this modifiedValue
        let faceKey = targetKey;
        if (targetKey >= 7) {
            faceKey = Object.keys(this.faces).find(k => {
                const kNum = parseInt(k, 10);
                return kNum <= 6 && (this.faces[k].modifiedValue || this.faces[k].value) === targetKey;
            });
            faceKey = faceKey ? parseInt(faceKey, 10) : this.currentFace;
        }
        
        if (!this.faces[faceKey]) {
            Logger.error('Face does not exist in die structure', { faceKey });
            return false;
        }
        
        const currentValue = this.faces[faceKey].modifiedValue || this.faces[faceKey].value;
        let newValue = currentValue + delta;
        // Wrapping: 9+1=1, 1-1=9 (faces loop)
        if (newValue > GAME_BALANCE.MAX_DIE_FACE_WITH_ENHANCEMENTS) {
            newValue = GAME_BALANCE.MIN_DIE_FACE;
        } else if (newValue < GAME_BALANCE.MIN_DIE_FACE) {
            newValue = GAME_BALANCE.MAX_DIE_FACE_WITH_ENHANCEMENTS;
        }
        this.faces[faceKey].modifiedValue = newValue;
        
        return true;
    }

    /**
     * Set every physical face's modifiedValue (Sixth Astragalus starts as all 1s).
     * Leaves enhancements and base `value` alone so Lethe/Helios still hit the showing face.
     * @param {number} pipValue
     * @returns {boolean}
     */
    setAllModifiedFaces(pipValue) {
        const pips = parseInt(pipValue, 10);
        if (Number.isNaN(pips)) return false;
        const maxFace = typeof GAME_BALANCE !== 'undefined' ? GAME_BALANCE.MAX_DIE_FACE : 6;
        for (let face = 1; face <= maxFace; face += 1) {
            this._ensureFaceExists(face);
            if (this.faces[face]) this.faces[face].modifiedValue = pips;
        }
        return true;
    }

    // Clear all enhancements from all faces
    clearAllEnhancements() {
        Object.values(this.faces).forEach(face => {
            face.enhancements.clear();
            face.modifiedValue = face.value;
        });
    }

    /**
     * Get the effective face value (including all modifications and enhancements)
     * @returns {number} Effective face value (1-9, clamped)
     */
    getEffectiveFace() {
        if (this.currentFace === 0) return 0;
        
        const currentFaceData = this.faces[this.currentFace];
        if (!currentFaceData) return this.currentFace;
        
        // Start with the face's modified value, ensuring it's never below 1
        let effectiveFace = Math.max(1, currentFaceData.modifiedValue || currentFaceData.value);
        
        // Apply wild enhancement if set (check face directly to avoid circular call with hasEnhancementForCurrentFace)
        const baseFace = effectiveFace;
        const faceToCheckForWild = (baseFace >= 7 && this.faces[baseFace]) ? baseFace : this.currentFace;
        const hasWild = this.faces[faceToCheckForWild]?.enhancements.has('wild') ?? false;
        if (this.wildValue !== undefined && hasWild) {
            effectiveFace = this.wildValue;
        }
        
        // Apply temporary modifiers
        effectiveFace += this.tempModifier;
        
        // Clamp between min and max (with enhancements)
        return Math.max(GAME_BALANCE.MIN_DIE_FACE, Math.min(GAME_BALANCE.MAX_DIE_FACE_WITH_ENHANCEMENTS, effectiveFace));
    }

    // Add a temporary modifier (for libations like increase/decrease)
    addTempModifier(modifier) {
        this.tempModifier += modifier;
    }

    // Reset temporary modifiers
    resetTempModifier() {
        this.tempModifier = 0;
    }


    /**
     * Get the value to display on screen
     * @returns {string|number} '?' if not rolled, otherwise the effective face value
     */
    getDisplayFace() {
        if (this.currentFace === 0) return '?';
        
        const effectiveFace = this.getEffectiveFace();
        // Ensure we never display 0 or negative values
        return Math.max(GAME_BALANCE.MIN_DIE_FACE, effectiveFace);
    }

    // Get a list of active enhancements for the current face
    getActiveEnhancements() {
        if (this.currentFace === 0) return [];
        const currentFaceData = this.faces[this.currentFace];
        return currentFaceData ? Array.from(currentFaceData.enhancements) : [];
    }

    // Check if this die has a specific enhancement on any face
    hasEnhancement(enhancement) {
        return Object.values(this.faces).some(face => face.enhancements.has(enhancement));
    }

    /**
     * Check if the currently rolled face has a specific enhancement
     * @param {string} enhancement - Enhancement type to check for
     * @returns {boolean} True if current face has this enhancement
     */
    hasEnhancementForCurrentFace(enhancement) {
        if (this.currentFace === 0) return false;
        
        const effectiveFace = this.getEffectiveFace();
        // For faces 7-9, check the virtual face; otherwise check physical face
        const faceToCheck = (effectiveFace >= 7 && this.faces[effectiveFace]) ? effectiveFace : this.currentFace;
        const faceData = this.faces[faceToCheck];
        if (!faceData) return false;
        
        return faceData.enhancements.has(enhancement);
    }

    // Summary string for tooltips: face-specific enhancements
    getFaceEnhancementSummary() {
        const enhancedFaces = [];
        Object.entries(this.faces).forEach(([faceNum, faceData]) => {
            if (faceData.enhancements.size > 0) {
                enhancedFaces.push(`${faceNum}: ${Array.from(faceData.enhancements).join(', ')}`);
            }
        });
        
        if (enhancedFaces.length === 0) return '';
        return `Face Enhancements → ${enhancedFaces.join(' | ')}`;
    }

    // Get enhancements for the current face only (includes virtual faces 7-9)
    getCurrentFaceEnhancements() {
        if (this.currentFace === 0) return [];
        const effectiveFace = this.getEffectiveFace();
        const faceToCheck = (effectiveFace >= 7 && this.faces[effectiveFace]) ? effectiveFace : this.currentFace;
        const faceData = this.faces[faceToCheck];
        return faceData ? Array.from(faceData.enhancements) : [];
    }

    // Check if current face has any enhancements
    hasCurrentFaceEnhancements() {
        return this.getCurrentFaceEnhancements().length > 0;
    }

    // Get enhancement description (Balatro-style: used in nested tooltips)
    getEnhancementDescription(enhancement) {
        const reg = (typeof EnhancementRegistry !== 'undefined') ? EnhancementRegistry : null;
        const def = reg?.get?.(enhancement);
        if (!def) return 'Unknown enhancement';
        return def.tooltipDesc || [def.oneLiner, def.triggerLine].filter(Boolean).join(' — ');
    }

    // Lock/unlock the die
    lock() {
        this.isLocked = true;
    }

    unlock() {
        this.isLocked = false;
    }

    /**
     * Set the current face value
     * @param {number} value - Face to show (1-9 when bonus categories unlocked)
     * @param {number} [maxFace] - Max allowed face. Default MAX_DIE_FACE_WITH_ENHANCEMENTS (9).
     */
    setFace(value, maxFace = GAME_BALANCE.MAX_DIE_FACE_WITH_ENHANCEMENTS) {
        const clamped = Math.max(GAME_BALANCE.MIN_DIE_FACE, Math.min(maxFace, value));
        this._ensureFaceExists(clamped);
        this.currentFace = clamped;
    }

    /**
     * Canonical face value for scoring/boons (per rules: use getEffectiveFace).
     * Getter: returns effective face (includes enhancements). Setter: updates currentFace.
     */
    get face() {
        return this.getEffectiveFace();
    }
    set face(value) {
        this.setFace(value);
    }

    /**
     * Set wild enhancement value manually (override auto-random from roll).
     * Used when UI allows player to choose; auto-set in roll() by default.
     * @param {number} value - The chosen value (+1 or -1 from rolled face)
     * @param {number} [maxFace] - Max allowed face. Default MAX_DIE_FACE_WITH_ENHANCEMENTS (9).
     */
    setWildValue(value, maxFace = GAME_BALANCE.MAX_DIE_FACE_WITH_ENHANCEMENTS) {
        if (this.hasEnhancementForCurrentFace('wild')) {
            const baseFace = this.currentFace;
            const newValue = Math.max(1, Math.min(maxFace, baseFace + value));
            this.wildValue = newValue;
            Logger.debug(`Wild die ${this.dieId}: face ${baseFace} → ${newValue}`);
        }
    }

    /**
     * Process mother of pearl enhancement - choose left or right die at 50/50
     * @param {Die[]} allDice - Array of all dice
     * @param {number} dieIndex - Index of this die in the array
     * @param {Object} prng - Seeded random number generator
     */
    processMotherOfPearl(allDice, dieIndex, prng) {
        if (!this.hasEnhancementForCurrentFace('mother_of_pearl')) {
            return;
        }

        // Determine left and right dice
        const leftDie = dieIndex > 0 ? allDice[dieIndex - 1] : null;
        const rightDie = dieIndex < allDice.length - 1 ? allDice[dieIndex + 1] : null;

        let selectedDie = null;
        
        // If both neighbors exist, choose at 50/50 using seeded RNG
        if (leftDie && rightDie) {
            selectedDie = prng.random() < 0.5 ? leftDie : rightDie;
        } else if (leftDie) {
            selectedDie = leftDie; // Only left exists
        } else if (rightDie) {
            selectedDie = rightDie; // Only right exists
        }

        if (selectedDie) {
            // Take the base effective face value of the selected die
            this.motherOfPearlBonus = selectedDie.getEffectiveFace();
            Logger.debug(`Mother of Pearl die ${this.dieId}: selected ${selectedDie === leftDie ? 'left' : 'right'} die ${selectedDie.dieId} (value: ${this.motherOfPearlBonus})`);
        }
    }

    // Get a copy of this die
    clone() {
        const newDie = new Die(this.dieId);
        newDie.currentFace = this.currentFace;
        newDie.isLocked = this.isLocked;
        newDie.tempModifier = this.tempModifier;
        newDie.wildValue = this.wildValue;
        newDie.motherOfPearlBonus = this.motherOfPearlBonus;
        
        // Clone all face data (including virtual faces 7-9)
        Object.entries(this.faces).forEach(([faceNum, faceData]) => {
            newDie._ensureFaceExists(parseInt(faceNum, 10));
            if (newDie.faces[faceNum]) {
                newDie.faces[faceNum].enhancements = new Set(faceData.enhancements);
                newDie.faces[faceNum].modifiedValue = faceData.modifiedValue;
            }
        });
        
        return newDie;
    }

    // Serialize for saving
    toJSON() {
        const facesData = {};
        Object.entries(this.faces).forEach(([faceNum, faceData]) => {
            facesData[faceNum] = {
                value: faceData.value,
                enhancements: Array.from(faceData.enhancements),
                modifiedValue: faceData.modifiedValue
            };
        });
        
        return {
            currentFace: this.currentFace,
            faces: facesData,
            isLocked: this.isLocked,
            tempModifier: this.tempModifier,
            dieId: this.dieId,
            wildValue: this.wildValue,
            motherOfPearlBonus: this.motherOfPearlBonus
        };
    }

    // Load from saved data
    fromJSON(data) {
        this.currentFace = data.currentFace || 0;
        this.isLocked = data.isLocked || false;
        this.tempModifier = data.tempModifier || 0;
        this.dieId = data.dieId || null;
        this.wildValue = data.wildValue;
        this.motherOfPearlBonus = data.motherOfPearlBonus;
        
        if (data.faces) {
            Object.entries(data.faces).forEach(([faceNum, faceData]) => {
                this._ensureFaceExists(parseInt(faceNum, 10));
                if (this.faces[faceNum]) {
                    this.faces[faceNum].enhancements = new Set(faceData.enhancements || []);
                    this.faces[faceNum].modifiedValue = faceData.modifiedValue ?? faceData.value;
                }
            });
        }
    }
}