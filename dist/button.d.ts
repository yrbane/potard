/**
 * Bouton style Ableton : `toggle` pour un état verrouillé (SYNC, kill),
 * momentané sinon (nudge). LED via --ctl-accent.
 */
export declare class PtButton extends HTMLElement {
    #private;
    static observedAttributes: string[];
    constructor();
    connectedCallback(): void;
    get active(): boolean;
    set active(v: boolean);
}
