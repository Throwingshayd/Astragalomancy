// Balatro-style Visual Effects Manager
// Inspired by Balatro's polished UI and animation system
// Tooltip body HTML lives in TooltipContent.js; this file owns placement + lifecycle.
/* global TooltipContent */

class BalatroEffects {
    constructor() {
        this.tooltips = new Map();
        this.pinnedTooltips = new Set();
        this.hoverTooltipHost = null;
        this.dicePopups = new Map(); // Boon-hover: popups over affected dice
        this.particles = [];
        this.notifications = [];
        this.animationQueue = [];
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;
        
        this.setupTooltipSystem();
        this.setupParticleSystem();
        this.setupNotificationSystem();
        this.setupAnimationQueue();
        
        this.isInitialized = true;
        Logger.info('Balatro Effects initialized');
    }

    /**
     * Screen shake effect for impactful moments (Balatro-inspired)
     * @param {number} intensity - Shake intensity in pixels
     * @param {number} duration - Duration in milliseconds
     */
    screenShake(intensity = 10, duration = 500) {
        const body = document.body;
        const startTime = Date.now();
        
        const shake = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > duration) {
                body.style.transform = '';
                return;
            }
            
            const progress = elapsed / duration;
            const currentIntensity = intensity * (1 - progress);
            
            const x = (Math.random() - 0.5) * currentIntensity * 2;
            const y = (Math.random() - 0.5) * currentIntensity * 2;
            
            body.style.transform = `translate(${x}px, ${y}px)`;
            requestAnimationFrame(shake);
        };
        
        shake();
    }

    ensureTooltipRoot() {
        if (this._tooltipRoot?.isConnected) return this._tooltipRoot;
        let root = document.getElementById('tooltip-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'tooltip-root';
            root.setAttribute('aria-live', 'polite');
            document.body.appendChild(root);
        }
        this._tooltipRoot = root;
        return root;
    }

    hideUnpinnedTooltips() {
        [...this.tooltips.keys()].forEach((host) => {
            if (!this.pinnedTooltips.has(host)) this.hideTooltip(host);
        });
    }

    _tooltipHostFromEvent(relatedTarget) {
        if (!(relatedTarget instanceof Node)) return null;
        return relatedTarget.closest?.('[data-tooltip]') ?? null;
    }

    // Tooltip System — one hover popover at a time, fixed anchor positioning
    setupTooltipSystem() {
        this.ensureTooltipRoot();

        document.addEventListener('mouseover', (e) => {
            const element = e.target.closest('[data-tooltip]');
            if (!element || element.closest('#tooltip-root')) return;

            // Ignore bubbled mouseover when still inside the same host (child → child).
            if (this._tooltipHostFromEvent(e.relatedTarget) === element) return;

            if (this.hoverTooltipHost !== element) {
                this.hideUnpinnedTooltips();
                this.hoverTooltipHost = element;
            }
            this.showTooltip(element, e);
        });

        document.addEventListener('mouseout', (e) => {
            const element = e.target.closest('[data-tooltip]');
            if (!element || this.pinnedTooltips.has(element)) return;

            if (this._tooltipHostFromEvent(e.relatedTarget) === element) return;

            const tooltipEl = this.tooltips.get(element);
            const movingToOurTooltip = tooltipEl && e.relatedTarget instanceof Node && tooltipEl.contains(e.relatedTarget);
            if (movingToOurTooltip) return;

            if (this.hoverTooltipHost === element) this.hoverTooltipHost = null;
            this.hideTooltip(element);
        });

        // Click-to-pin on cards only — never intercept dice (hold / libation targeting).
        document.addEventListener('click', (e) => {
            const element = e.target.closest('[data-tooltip]');
            if (!element) return;
            if (element.classList.contains('die') || element.closest('.die')) return;
            const isCard = !!element.closest('.card');
            if (!isCard) return;

            e.stopPropagation();
            const currentlyPinned = this.pinnedTooltips.has(element);
            if (currentlyPinned) {
                this.pinnedTooltips.delete(element);
                const tip = this.tooltips.get(element);
                tip?.classList.remove('pinned');
                this.hideTooltip(element);
            } else {
                this.pinnedTooltips.add(element);
                this.showTooltip(element, e, { forceImmediate: true, pinned: true });
            }
        }, { capture: true });

        // Also hide tooltips when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('[data-tooltip]')) {
                this.hideAllTooltips();
            }
        });

        // Hide tooltips when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllTooltips();
            }
        });
    }

    /**
     * Card tooltips use one style/placement everywhere (shop, pack, owned sidebars).
     * @param {HTMLElement} element
     * @returns {{ isDie: boolean, isCard: boolean, isPackShelf: boolean, isInShopStage: boolean, cardEl: HTMLElement | null }}
     */
    _tooltipHostMeta(element) {
        const isDie = element.classList.contains('die');
        const cardEl = element.closest?.('.card') ?? null;
        const isCard = !!cardEl;
        const isPackShelf = element.classList.contains('pack-card');
        const isInShopStage = !!element.closest?.('#shopStage');
        return { isDie, isCard, isPackShelf, isInShopStage, cardEl };
    }

    showTooltip(element, _event, opts = {}) {
        if (!this.isInitialized) this.initialize();

        const tooltipData = element.getAttribute('data-tooltip');
        if (!tooltipData) return;

        if (!opts.forceImmediate && !opts.pinned) {
            const existing = this.tooltips.get(element);
            if (existing?.classList.contains('show')) return;
        }

        if (this.tooltipTimeouts?.has(element)) {
            clearTimeout(this.tooltipTimeouts.get(element));
        }

        const { isDie, isCard, isPackShelf, isInShopStage } = this._tooltipHostMeta(element);
        const dieDelay = typeof TIMING !== 'undefined' ? TIMING.TOOLTIP_DELAY_DIE : 200;
        const cardDelay = typeof TIMING !== 'undefined' ? TIMING.TOOLTIP_DELAY_CARD : 100;
        const delayMs = opts.forceImmediate ? 0 : (isDie ? dieDelay : (isCard ? cardDelay : 110));

        const timeoutId = setTimeout(() => {
            this.tooltipTimeouts?.delete(element);
            if (!element.isConnected) return;
            if (!opts.pinned && this.hoverTooltipHost !== element) return;

            const stale = this.tooltips.get(element);
            if (stale?.parentNode) stale.parentNode.removeChild(stale);
            this.tooltips.delete(element);

            const meta = this._tooltipHostMeta(element);
            const { isDie, isCard, isPackShelf, isInShopStage, cardEl } = meta;

            let parsed;
            try {
                parsed = JSON.parse(tooltipData);
            } catch (_e) {
                parsed = null;
            }
            const isDieTooltip = parsed?.tooltipType === 'die';
            // Shelf packs are .card products — same dark tooltip as wares (never tooltip-shop)
            const useShopChrome = isInShopStage && !isCard && !isDieTooltip && !isPackShelf;

            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip'
                + (useShopChrome ? ' tooltip-shop' : '')
                + (isDieTooltip ? ' tooltip-die-popup' : '')
                + (isCard ? ' tooltip-card' : '');
            if (opts.pinned || this.pinnedTooltips.has(element)) tooltip.classList.add('pinned');

            const caret = document.createElement('div');
            caret.className = 'tip-caret';
            const inner = document.createElement('div');
            inner.className = 'tooltip-inner';
            inner.innerHTML = TooltipContent.render(tooltipData);
            tooltip.append(caret, inner);

            const root = this.ensureTooltipRoot();
            root.appendChild(tooltip);

            if (isDie) {
                const dieW = Math.round(element.getBoundingClientRect().width);
                const extra = typeof TIMING !== 'undefined' ? TIMING.TOOLTIP_DIE_EXTRA_W : 14;
                const w = dieW > 0 ? dieW + extra : 0;
                if (w > 0) {
                    tooltip.style.width = `${w}px`;
                    tooltip.style.minWidth = `${w}px`;
                    tooltip.style.maxWidth = `${w}px`;
                }
            }

            if (isCard && cardEl) {
                const cardW = Math.round(cardEl.getBoundingClientRect().width);
                const minW = typeof TIMING !== 'undefined' ? TIMING.TOOLTIP_CARD_MIN_W : 148;
                const maxW = typeof TIMING !== 'undefined' ? TIMING.TOOLTIP_CARD_MAX_W : 220;
                const w = Math.min(Math.max(cardW, minW), maxW);
                if (w > 0) {
                    tooltip.style.width = `${w}px`;
                    tooltip.style.minWidth = `${w}px`;
                    tooltip.style.maxWidth = `${w}px`;
                }
            }

            const preferBelow = isCard || useShopChrome;
            tooltip.classList.add('is-measuring');
            this.positionPopover(tooltip, element, { preferBelow, gap: 10 });
            requestAnimationFrame(() => {
                if (!tooltip.isConnected) return;
                this.positionPopover(tooltip, element, { preferBelow, gap: 10 });
                tooltip.classList.remove('is-measuring');
                tooltip.classList.add('show');
            });

            this.tooltips.set(element, tooltip);

            const boonId = element.dataset?.cardId;
            const isBoonCard = element.dataset?.cardType === 'boon';
            const isPlayArea = !element.closest('#shopStage');
            if (isBoonCard && boonId && isPlayArea && window.game?.getBoonDicePreview) {
                const preview = window.game.getBoonDicePreview(boonId);
                if (preview.length > 0) {
                    this.showBoonDicePopups(preview);
                    this.dicePopups.set(element, preview);
                }
            }
        }, delayMs);

        if (!this.tooltipTimeouts) this.tooltipTimeouts = new Map();
        this.tooltipTimeouts.set(element, timeoutId);
    }

    positionPopover(tooltip, anchorEl, { preferBelow = false, gap = 10 } = {}) {
        if (!anchorEl?.isConnected || !tooltip) return;

        const pad = 12;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const anchor = anchorEl.getBoundingClientRect();
        const isPackShelf = anchorEl.classList.contains('pack-card');

        tooltip.classList.remove('below');

        let placement = preferBelow ? 'below' : 'above';
        let top;
        let left;

        const measure = () => tooltip.getBoundingClientRect();

        let tip = measure();
        left = anchor.left + anchor.width / 2 - tip.width / 2;
        left = Math.max(pad, Math.min(left, vw - tip.width - pad));

        if (placement === 'above') {
            top = anchor.top - tip.height - gap;
            if (top < pad) {
                placement = 'below';
                top = anchor.bottom + gap;
            }
        } else {
            top = anchor.bottom + gap;
            if (top + tip.height > vh - pad) {
                if (isPackShelf) {
                    // Shelf packs sit low — keep tooltip below; clip at viewport bottom instead of jumping above
                    placement = 'below';
                    top = anchor.bottom + gap;
                } else {
                    placement = 'above';
                    top = anchor.top - tip.height - gap;
                }
            }
        }

        if (placement === 'below') {
            top = Math.max(pad, top);
        } else {
            top = Math.max(pad, Math.min(top, vh - tip.height - pad));
        }
        tip = measure();

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.dataset.placement = placement;
        if (placement === 'below') tooltip.classList.add('below');

        const arrowX = anchor.left + anchor.width / 2 - left;
        tooltip.style.setProperty('--tip-arrow-x', `${Math.max(18, Math.min(arrowX, tip.width - 18))}px`);
    }

    /**
     * Update a visible tooltip when its host data-tooltip changed (e.g. hold toggle).
     */
    refreshHostTooltip(element) {
        if (!element?.isConnected) return;
        const tooltip = this.tooltips.get(element);
        if (!tooltip?.classList.contains('show')) return;

        const tooltipData = element.getAttribute('data-tooltip');
        if (!tooltipData) return;

        const inner = tooltip.querySelector('.tooltip-inner');
        if (inner) inner.innerHTML = TooltipContent.render(tooltipData);

        const meta = this._tooltipHostMeta(element);
        const { isDie, isCard, isPackShelf, isInShopStage, cardEl } = meta;

        if (isDie) {
            const dieW = Math.round(element.getBoundingClientRect().width);
            const extra = typeof TIMING !== 'undefined' ? TIMING.TOOLTIP_DIE_EXTRA_W : 14;
            const w = dieW > 0 ? dieW + extra : 0;
            if (w > 0) {
                tooltip.style.width = `${w}px`;
                tooltip.style.minWidth = `${w}px`;
                tooltip.style.maxWidth = `${w}px`;
            }
        } else if (isCard && cardEl) {
            const cardW = Math.round(cardEl.getBoundingClientRect().width);
            const minW = typeof TIMING !== 'undefined' ? TIMING.TOOLTIP_CARD_MIN_W : 148;
            const maxW = typeof TIMING !== 'undefined' ? TIMING.TOOLTIP_CARD_MAX_W : 220;
            const w = Math.min(Math.max(cardW, minW), maxW);
            if (w > 0) {
                tooltip.style.width = `${w}px`;
                tooltip.style.minWidth = `${w}px`;
                tooltip.style.maxWidth = `${w}px`;
            }
        }

        const preferBelow = isCard || isPackShelf;
        this.positionPopover(tooltip, element, { preferBelow, gap: 10 });
    }

    hideTooltip(element) {
        if (this.tooltipTimeouts?.has(element)) {
            clearTimeout(this.tooltipTimeouts.get(element));
            this.tooltipTimeouts.delete(element);
        }

        // Remove dice popups from boon hover
        if (this.dicePopups?.has(element)) {
            this.hideBoonDicePopups(element);
        }

        const tooltip = this.tooltips.get(element);
        if (tooltip) {
            tooltip.classList.remove('show');
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 200);
            this.tooltips.delete(element);
        }
    }

    hideAllTooltips() {
        this.pinnedTooltips.clear();
        this.hoverTooltipHost = null;
        // Clear all pending timeouts
        if (this.tooltipTimeouts) {
            this.tooltipTimeouts.forEach((timeoutId) => {
                clearTimeout(timeoutId);
            });
            this.tooltipTimeouts.clear();
        }

        // Hide all tooltips and remove orphans (elements no longer in DOM)
        const elementsToHide = [...this.tooltips.keys()];
        elementsToHide.forEach((element) => {
            this.hideTooltip(element);
        });
    }

    /**
     * Show popups over dice affected by the hovered boon (Pegasus Flight, Cerberus Watch, etc.)
     * @param {Array<{dieIndex: number, label: string}>} preview - From GameEngine.getBoonDicePreview
     */
    showBoonDicePopups(preview) {
        if (!preview || preview.length === 0) return;
        const dieElements = document.querySelectorAll('.die');
        const popups = [];
        preview.forEach(({ dieIndex, label }) => {
            const dieEl = dieElements[dieIndex];
            if (!dieEl) return;
            const rect = dieEl.getBoundingClientRect();
            const popup = document.createElement('div');
            popup.className = 'die-pip-popup boon-dice-preview';
            popup.textContent = label;
            popup.style.position = 'fixed';
            popup.style.left = `${rect.left + rect.width / 2}px`;
            popup.style.top = `${rect.top - 8}px`;
            popup.style.transform = 'translate(-50%, 0)';
            popup.style.zIndex = '10001';
            popup.style.pointerEvents = 'none';
            document.body.appendChild(popup);
            popups.push(popup);
        });
        this._boonDicePopupEls = this._boonDicePopupEls || [];
        this._boonDicePopupEls.push(...popups);
    }

    /**
     * Remove dice popups shown for boon hover
     */
    hideBoonDicePopups(element) {
        const preview = this.dicePopups.get(element);
        if (!preview) return;
        this.dicePopups.delete(element);
        if (this._boonDicePopupEls) {
            this._boonDicePopupEls.forEach(el => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
            this._boonDicePopupEls = [];
        }
    }

    updateTooltipPosition(_event) {
        this.tooltips.forEach((tooltip, host) => {
            if (!host?.isConnected) return;
            const { isCard, isPackShelf, isInShopStage } = this._tooltipHostMeta(host);
            const preferBelow = isCard || isPackShelf || isInShopStage;
            this.positionPopover(tooltip, host, { preferBelow, gap: 10 });
        });
    }

    getRarityColor(rarity) {
        const colors = {
            'rustic': '#8B7355',
            'vibrant': '#4A90E2',
            'epic': '#9B59B6',
            'worship': '#F39C12',
            'libation': '#E74C3C',
            'artifact': '#2ECC71'
        };
        return colors[rarity] || '#95A5A6';
    }

    // Particle System
    setupParticleSystem() {
        // Particle system will be updated in animation loop
    }

    createParticle(x, y, type = 'default', options = {}) {
        const particle = {
            x: x,
            y: y,
            vx: (options.vx || 0) + (Math.random() - 0.5) * 2,
            vy: (options.vy || -2) + (Math.random() - 0.5) * 2,
            life: options.life || 60,
            maxLife: options.life || 60,
            type: type,
            element: null,
            ...options
        };

        // Create visual element
        const element = document.createElement('div');
        element.className = 'particle';
        
        switch (type) {
            case 'gold':
                element.innerHTML = '💰';
                element.style.color = '#ffd700';
                break;
            case 'score':
                element.innerHTML = '+' + (options.value || '1');
                element.style.color = '#4CAF50';
                element.style.fontWeight = 'bold';
                break;
            case 'damage':
                element.innerHTML = '-' + (options.value || '1');
                element.style.color = '#f44336';
                element.style.fontWeight = 'bold';
                break;
            case 'sparkle':
                element.innerHTML = '✨';
                element.style.color = '#ffd700';
                break;
            default:
                element.innerHTML = '•';
                element.style.color = '#ffffff';
        }

        element.style.position = 'absolute';
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        element.style.fontSize = (options.size || 16) + 'px';
        element.style.pointerEvents = 'none';
        element.style.zIndex = '1000';

        document.body.appendChild(element);
        particle.element = element;

        this.particles.push(particle);
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Update life
            particle.life--;
            
            // Update visual
            if (particle.element) {
                particle.element.style.left = particle.x + 'px';
                particle.element.style.top = particle.y + 'px';
                particle.element.style.opacity = particle.life / particle.maxLife;
            }
            
            // Remove dead particles
            if (particle.life <= 0) {
                if (particle.element && particle.element.parentNode) {
                    particle.element.parentNode.removeChild(particle.element);
                }
                this.particles.splice(i, 1);
            }
        }
    }

    // Notification System
    setupNotificationSystem() {
        // Create notification container
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const container = document.getElementById('notification-container');
        if (container) {
            container.appendChild(notification);
            
            // Show animation
            requestAnimationFrame(() => {
                notification.classList.add('show');
            });
            
            // Auto remove
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, duration);
        }
    }

    // Animation Queue System
    setupAnimationQueue() {
        this.animationId = null;
        this.startAnimationLoop();
    }

    startAnimationLoop() {
        const animate = () => {
            this.updateParticles();
            this.updateAnimationQueue();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    updateAnimationQueue() {
        for (let i = this.animationQueue.length - 1; i >= 0; i--) {
            const animation = this.animationQueue[i];
            
            if (animation.update()) {
                this.animationQueue.splice(i, 1);
            }
        }
    }

    // Dice Rolling Effects
    addDiceRollEffect(dieElement) {
        if (!dieElement) return;
        
        // Add rolling class
        dieElement.classList.add('rolling');
        
        // Remove after animation
        setTimeout(() => {
            dieElement.classList.remove('rolling');
        }, 600);
    }

    addDiceJiggleEffect(dieElement) {
        if (!dieElement) return;
        
        dieElement.classList.add('jiggle');
        
        setTimeout(() => {
            dieElement.classList.remove('jiggle');
        }, 400);
    }

    addDiceBounceEffect(dieElement) {
        if (!dieElement) return;
        
        dieElement.classList.add('bounce');
        
        setTimeout(() => {
            dieElement.classList.remove('bounce');
        }, 500);
    }

    // Physics dice archived to physics-dice-attempt-1/ — use original non-physics roll

    // Card Effects
    addCardHoverEffect(cardElement) {
        if (!cardElement) return;
        
        // Card hover effects are handled by CSS
        // This method can be used for additional JavaScript effects
    }

    addCardPurchaseEffect(cardElement) {
        if (!cardElement) return;
        
        cardElement.classList.add('purchased');
        
        // Create purchase particles
        const rect = cardElement.getBoundingClientRect();
        for (let i = 0; i < 5; i++) {
            this.createParticle(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                'sparkle',
                { life: 90, size: 20 }
            );
        }
        
        setTimeout(() => {
            cardElement.classList.remove('purchased');
        }, 600);
    }

    // Score Update Effects
    addScoreUpdateEffect(scoreElement, newValue) {
        if (!scoreElement) return;
        
        scoreElement.classList.add('updated');
        
        // Create score particle
        const rect = scoreElement.getBoundingClientRect();
        this.createParticle(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            'score',
            { value: newValue, life: 120, size: 18 }
        );
        
        setTimeout(() => {
            scoreElement.classList.remove('updated');
        }, 400);
    }

    // Enhanced Button Effects
    addButtonPressEffect(buttonElement) {
        if (!buttonElement) return;
        
        // Button press effects are handled by CSS
        // This method can be used for additional effects
    }

    // Utility Methods
    createShimmerEffect(element) {
        if (!element) return;
        
        const shimmer = document.createElement('div');
        shimmer.style.cssText = `
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            animation: shimmer 1.5s ease-in-out infinite;
            pointer-events: none;
            z-index: 1;
        `;
        
        element.style.position = 'relative';
        element.appendChild(shimmer);
        
        setTimeout(() => {
            if (shimmer.parentNode) {
                shimmer.parentNode.removeChild(shimmer);
            }
        }, 1500);
    }

    // Cleanup
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Remove all tooltips
        this.tooltips.forEach((tooltip) => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
        this.tooltips.clear();
        
        // Remove all particles
        this.particles.forEach((particle) => {
            if (particle.element && particle.element.parentNode) {
                particle.element.parentNode.removeChild(particle.element);
            }
        });
        this.particles = [];
        
        this.isInitialized = false;
    }
}

// Global instance
window.balatroEffects = new BalatroEffects();
