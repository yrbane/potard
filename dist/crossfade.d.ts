export type CrossfadeCurve = 'constant-power' | 'sharp';
/**
 * Gains des côtés A et B pour une position de crossfader x ∈ [-1, 1].
 * constant-power : équi-puissance (cos/sin) ; sharp : cut DJ (pleins gaz au centre).
 */
export declare function crossfadeGains(x: number, curve: CrossfadeCurve): {
    a: number;
    b: number;
};
