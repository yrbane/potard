/**
 * Bouton style Ableton : `toggle` pour un état verrouillé (SYNC, kill),
 * momentané sinon (nudge). LED via --ctl-accent.
 */
export class YtButton extends HTMLElement {
  static observedAttributes = ['toggle', 'active'];

  #active = false;

  constructor() {
    super();
    this.addEventListener('click', () => {
      if (!this.hasAttribute('toggle')) {
        this.dispatchEvent(new CustomEvent('press', { bubbles: true }));
        return;
      }
      this.active = !this.active;
      this.dispatchEvent(new CustomEvent('change', { detail: this.active, bubbles: true }));
    });
  }

  connectedCallback(): void {
    this.setAttribute('role', 'button');
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    if (this.hasAttribute('toggle')) this.setAttribute('aria-pressed', String(this.#active));
  }

  get active(): boolean {
    return this.#active;
  }

  set active(v: boolean) {
    this.#active = v;
    if (this.hasAttribute('toggle')) this.setAttribute('aria-pressed', String(v));
    this.classList.toggle('active', v);
  }
}
