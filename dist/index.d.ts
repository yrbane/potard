import { PtKnob } from './knob.js';
import { PtFader } from './fader.js';
import { PtCrossfader } from './crossfader.js';
import { PtButton } from './button.js';
import { PtVumeter } from './vumeter.js';
import { PtSwitch } from './switch.js';
import { PtXY } from './xy.js';
import { PtStepper } from './stepper.js';
import { PtLed } from './led.js';
export { PtKnob, PtFader, PtCrossfader, PtButton, PtVumeter, PtSwitch, PtXY, PtStepper, PtLed };
export { ContinuousControl, type ControlCurve } from './base-control.js';
export { crossfadeGains, type CrossfadeCurve } from './crossfade.js';
/** Enregistre tous les contrôles (idempotent). */
export declare function defineControls(): void;
