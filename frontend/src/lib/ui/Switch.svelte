<script lang="ts">
    import { Switch } from 'bits-ui';
    import { cn } from '$lib/utils/cn';

    type Props = {
        checked?: boolean;
        disabled?: boolean;
        id?: string;
        'aria-label'?: string;
        onCheckedChange?: (checked: boolean) => void;
        class?: string;
    };

    let { checked = $bindable(false), class: className, ...rest }: Props = $props();
</script>

<Switch.Root
    bind:checked
    {...rest}
    class={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
        // `input` rather than `muted` for the off track: muted is the card colour in
        // light mode, which left an unchecked switch nearly invisible on a card.
        'disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        className,
    )}
>
    <Switch.Thumb
        class="pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-1 ring-black/5 transition-transform data-[state=checked]:translate-x-4.5 data-[state=unchecked]:translate-x-0.5"
    />
</Switch.Root>
