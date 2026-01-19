// ==============================================================================
// PiAI Embed Virtual Renderer v1.0
// ==============================================================================
// Maintains constant memory for pages with 50+ components
// Only renders components in viewport + 2 buffer zones
// Works with PiaiEmbed.renderLazy()
// ==============================================================================

(function (global) {
    'use strict';

    /**
     * VirtualRenderer - Only renders components visible in viewport
     * 
     * Usage:
     *   const vr = new VirtualRenderer('[id^="embed-"]', {
     *     bufferSize: 2,
     *     renderFn: (container) => PiaiEmbed.render({ container, ... })
     *   });
     */
    class VirtualRenderer {
        constructor(containerSelector, options = {}) {
            this.containerSelector = containerSelector;
            this.containers = [];
            this.rendered = new Set();
            this.observers = new Map();

            // Options
            this.bufferSize = options.bufferSize || 2;  // Render 2 components above/below viewport
            this.renderFn = options.renderFn || ((container) => {
                console.warn('[VirtualRenderer] No renderFn provided');
            });
            this.debug = options.debug || false;

            // Initialize
            this.init();
        }

        init() {
            // Find all containers
            this.containers = Array.from(document.querySelectorAll(this.containerSelector));

            if (this.containers.length === 0) {
                console.warn('[VirtualRenderer] No containers found:', this.containerSelector);
                return;
            }

            this.log(`Initialized with ${this.containers.length} containers`);

            // Set up scroll listener
            this.onScroll = this.onScroll.bind(this);
            window.addEventListener('scroll', this.onScroll, { passive: true });

            // Initial check
            this.update();
        }

        log(message, data) {
            if (this.debug) {
                console.log(`[VirtualRenderer] ${message}`, data || '');
            }
        }

        onScroll() {
            // Debounce scroll updates
            if (this.scrollTimer) return;

            this.scrollTimer = setTimeout(() => {
                this.update();
                this.scrollTimer = null;
            }, 100);
        }

        update() {
            const viewportTop = window.scrollY;
            const viewportBottom = viewportTop + window.innerHeight;

            this.containers.forEach((container, idx) => {
                const rect = container.getBoundingClientRect();
                const containerTop = rect.top + window.scrollY;
                const containerBottom = containerTop + rect.height;

                // Calculate buffer zone (in pixels)
                const bufferPx = this.bufferSize * window.innerHeight;

                // Check if container is in extended viewport (viewport + buffer)
                const inView = containerBottom > (viewportTop - bufferPx) &&
                    containerTop < (viewportBottom + bufferPx);

                if (inView && !this.rendered.has(idx)) {
                    // Container entered view - render it
                    this.log(`Rendering container ${idx}`);
                    this.renderContainer(container, idx);
                } else if (!inView && this.rendered.has(idx)) {
                    // Container left view - unload it
                    this.log(`Unloading container ${idx}`);
                    this.unloadContainer(container, idx);
                }
            });

            this.log(`Status: ${this.rendered.size}/${this.containers.length} rendered`);
        }

        renderContainer(container, idx) {
            // Mark as rendered
            this.rendered.add(idx);

            // Call render function
            try {
                this.renderFn(container, idx);
            } catch (err) {
                console.error('[VirtualRenderer] Render failed:', err);
                this.rendered.delete(idx);
            }
        }

        unloadContainer(container, idx) {
            // Cleanup existing render
            if (typeof container.__piaiCleanup === 'function') {
                try {
                    container.__piaiCleanup();
                } catch (err) {
                    console.warn('[VirtualRenderer] Cleanup failed:', err);
                }
            }

            // Clear content
            container.innerHTML = '';

            // Mark as unloaded
            this.rendered.delete(idx);
        }

        destroy() {
            // Stop scroll listener
            window.removeEventListener('scroll', this.onScroll);
            clearTimeout(this.scrollTimer);

            // Cleanup all rendered containers
            this.containers.forEach((container, idx) => {
                if (this.rendered.has(idx)) {
                    this.unloadContainer(container, idx);
                }
            });

            this.log('Virtual renderer destroyed');
        }

        // Manual refresh (call after DOM changes)
        refresh() {
            this.containers = Array.from(document.querySelectorAll(this.containerSelector));
            this.update();
        }
    }

    // ==============================================================================
    // GLOBAL EXPORT
    // ==============================================================================
    global.VirtualRenderer = VirtualRenderer;

})(window);

// ==============================================================================
// EXAMPLE USAGE
// ==============================================================================
/*
// Basic usage
const vr = new VirtualRenderer('[id^="embed-"]', {
  bufferSize: 2,
  debug: true,
  renderFn: (container) => {
    PiaiEmbed.render({
      container: container,
      html: container.dataset.html,
      // ... other config
    });
  }
});

// With lazy loading
const vr = new VirtualRenderer('[id^="embed-"]', {
  renderFn: (container) => {
    PiaiEmbed.renderLazy({
      container: container,
      lazyThreshold: 100,
      // ... other config
    });
  }
});

// Cleanup when done
vr.destroy();
*/
