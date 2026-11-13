/**
 * The brand colours an administrator can pick.
 *
 * One list, shared by the setup wizard and the theme editor, so the two cannot drift
 * apart. The hex is the colour as it is picked and stored; the panel pins the
 * lightness of it per mode, so what ends up on screen is the picked hue at a
 * lightness that is guaranteed readable — the swatch shows the hue, not the exact
 * tone that is rendered.
 *
 * The hues are spread out on purpose: several of them sit close to a status colour
 * (green to success, red to destructive, orange to warning), which is why the
 * status colours are held a step away from the brand colour rather than the brand
 * colour being held away from the status colours.
 */
export const BRAND_PRESETS = [
    { hex: '#16a34a', name: 'Jexactyl 绿' },
    { hex: '#12aaaa', name: '青绿' },
    { hex: '#ff0000', name: '砖红' },
    { hex: '#9D00FF', name: '鸢尾紫' },
    { hex: '#FFA500', name: '橙' },
    { hex: '#32559f', name: 'Ptero 蓝' },
    { hex: '#ff99c8', name: '粉' },
    { hex: '#5e6472', name: '灰' },
] as const;

/** The brand colour the panel falls back to when the server has not been configured. */
export const DEFAULT_BRAND = '#16a34a';

/**
 * Accepts a colour the browser can resolve, and returns it in the `#rrggbb` form
 * the CSS derives from. Anything else is rejected: an unusable value would make the
 * `--primary` declaration invalid and take the accent colour of the whole panel
 * with it.
 */
export function normalizeBrand(value: string | undefined | null): string | null {
    if (!value) return null;

    const hex = value.trim();
    const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
    if (short) {
        return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
    }

    if (/^#[0-9a-f]{6}$/i.test(hex)) return hex.toLowerCase();

    return null;
}
