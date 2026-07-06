import { YtKnob } from './knob.js';
import { YtFader } from './fader.js';
import { YtCrossfader } from './crossfader.js';
import { YtButton } from './button.js';
import { YtVumeter } from './vumeter.js';
export { YtKnob, YtFader, YtCrossfader, YtButton, YtVumeter };
export { ContinuousControl } from './base-control.js';
export { crossfadeGains, type CrossfadeCurve } from './crossfade.js';
/** Enregistre tous les contrôles (idempotent). */
export declare function defineControls(): void;
