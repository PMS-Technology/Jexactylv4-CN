<script lang="ts">
    import { cn } from '$lib/utils/cn';

    /**
     * User avatar, ported from the legacy `elements/Avatar.tsx`. Shows the account's
     * custom avatar image when one is set, and otherwise the deterministic identicon
     * the `boring-avatars` "beam" variant generated from the account UUID (the React
     * package cannot be reused here, so its algorithm is ported verbatim).
     */
    type Props = {
        /** Avatar image URL; renders the generated identicon when unset. */
        src?: string | null;
        /** Seed for the generated identicon, normally the account UUID. */
        name?: string;
        size?: number;
        square?: boolean;
        class?: string;
    };

    let { src, name = 'system', size = 40, square = false, class: className }: Props = $props();

    // Unique per instance so several avatars on one page don't collide on the mask id.
    const uid = $props.id();
    const maskId = `avatar-mask-${uid}`;

    // The palette the legacy component hardcoded.
    const palette = ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#587291'];

    const getDigit = (n: number, d: number) => Math.floor((n / 10 ** d) % 10);
    const getBoolean = (n: number, d: number) => getDigit(n, d) % 2 === 0;
    const getUnit = (n: number, range: number, index?: number) => {
        const value = n % range;

        return index && getDigit(n, index) % 2 === 0 ? -value : value;
    };
    // The modulo keeps the index within the palette, so the element is always present.
    const getColor = (n: number) => palette[Math.abs(n) % palette.length]!;

    function hash(value: string): number {
        let result = 0;
        for (let i = 0; i < value.length; i++) {
            result = (result << 5) - result + value.charCodeAt(i);
            result &= result;
        }

        return Math.abs(result);
    }

    function luminance(hex: string): number {
        const value = hex.startsWith('#') ? hex.slice(1) : hex;

        return (
            (299 * parseInt(value.slice(0, 2), 16) +
                587 * parseInt(value.slice(2, 4), 16) +
                114 * parseInt(value.slice(4, 6), 16)) /
            1000
        );
    }

    const face = $derived.by(() => {
        const seed = hash(name ?? 'system');
        const rawX = getUnit(seed, 10, 1);
        const rawY = getUnit(seed, 10, 2);
        const wrapperTranslateX = rawX < 5 ? rawX + 4 : rawX;
        const wrapperTranslateY = rawY < 5 ? rawY + 4 : rawY;
        const wrapperColor = getColor(seed);

        return {
            backgroundColor: getColor(seed + 13),
            wrapperColor,
            // The face is drawn in black or white depending on the wrapper's brightness.
            faceColor: luminance(wrapperColor) >= 128 ? '#000000' : '#FFFFFF',
            wrapperTranslateX,
            wrapperTranslateY,
            wrapperRotate: getUnit(seed, 360),
            wrapperScale: 1 + getUnit(seed, 3) / 10,
            isMouthOpen: getBoolean(seed, 2),
            isCircle: getBoolean(seed, 1),
            eyeSpread: getUnit(seed, 5),
            mouthSpread: getUnit(seed, 3),
            faceRotate: getUnit(seed, 10, 3),
            faceTranslateX: wrapperTranslateX > 6 ? wrapperTranslateX / 2 : getUnit(seed, 8, 1),
            faceTranslateY: wrapperTranslateY > 6 ? wrapperTranslateY / 2 : getUnit(seed, 7, 2),
        };
    });
</script>

{#if src}
    <img
        src={src}
        alt={name}
        class={cn('rounded-full object-cover', className)}
        style="width: {size}px; height: {size}px"
    />
{:else}
    <svg
        viewBox="0 0 36 36"
        fill="none"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        class={className}
    >
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
            <rect width="36" height="36" rx={square ? undefined : 72} fill="#FFFFFF" />
        </mask>
        <g mask="url(#{maskId})">
            <rect width="36" height="36" fill={face.backgroundColor} />
            <rect
                x="0"
                y="0"
                width="36"
                height="36"
                rx={face.isCircle ? 36 : 6}
                fill={face.wrapperColor}
                transform="translate({face.wrapperTranslateX} {face.wrapperTranslateY}) rotate({face.wrapperRotate} 18 18) scale({face.wrapperScale})"
            />
            <g
                transform="translate({face.faceTranslateX} {face.faceTranslateY}) rotate({face.faceRotate} 18 18)"
            >
                {#if face.isMouthOpen}
                    <path
                        d="M15 {19 + face.mouthSpread} c2 1 4 1 6 0"
                        stroke={face.faceColor}
                        fill="none"
                        stroke-linecap="round"
                    />
                {:else}
                    <path d="M13,{19 + face.mouthSpread} a1,0.75 0 0,0 10,0" fill={face.faceColor} />
                {/if}
                <rect x={14 - face.eyeSpread} y="14" width="1.5" height="2" rx="1" fill={face.faceColor} />
                <rect x={20 + face.eyeSpread} y="14" width="1.5" height="2" rx="1" fill={face.faceColor} />
            </g>
        </g>
    </svg>
{/if}
