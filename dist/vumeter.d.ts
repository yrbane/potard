/** VU-mètre à segments avec mémoire de pic. */
export declare class YtVumeter extends HTMLElement {
    #private;
    connectedCallback(): void;
    get level(): number;
    set level(v: number);
    get peak(): number;
    resetPeak(): void;
}
