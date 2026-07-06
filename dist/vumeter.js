const SEGMENTS = 12;
/** VU-mètre à segments avec mémoire de pic. */
export class YtVumeter extends HTMLElement {
    #level = 0;
    #peak = 0;
    #canvas = null;
    #raf = 0;
    connectedCallback() {
        if (!this.shadowRoot) {
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = `:host{display:inline-block;}canvas{display:block;width:100%;height:100%;}`;
            this.#canvas = document.createElement('canvas');
            root.append(style, this.#canvas);
        }
        this.#requestRender();
    }
    get level() {
        return this.#level;
    }
    set level(v) {
        this.#level = Math.min(1, Math.max(0, v));
        this.#peak = Math.max(this.#peak, this.#level);
        this.#requestRender();
    }
    get peak() {
        return this.#peak;
    }
    resetPeak() {
        this.#peak = this.#level;
        this.#requestRender();
    }
    #requestRender() {
        if (this.#raf || !this.#canvas)
            return;
        this.#raf = requestAnimationFrame(() => {
            this.#raf = 0;
            this.#draw();
        });
    }
    #draw() {
        const canvas = this.#canvas;
        if (!canvas)
            return;
        const w = this.clientWidth;
        const h = this.clientHeight;
        if (w === 0 || h === 0)
            return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);
        const gap = 2;
        const segH = (h - gap * (SEGMENTS - 1)) / SEGMENTS;
        const lit = Math.round(this.#level * SEGMENTS);
        for (let i = 0; i < SEGMENTS; i++) {
            const frac = (i + 1) / SEGMENTS;
            const y = h - (i + 1) * segH - i * gap;
            const color = frac > 0.85 ? '#ff4444' : frac > 0.65 ? '#ffcc33' : '#33dd66';
            ctx.fillStyle = i < lit ? color : '#2a2f36';
            ctx.fillRect(0, y, w, segH);
        }
        // ligne de pic
        if (this.#peak > 0) {
            const py = h - this.#peak * h;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, Math.max(0, py - 1), w, 2);
        }
    }
}
