<script lang="ts">
    import type { EggVariable } from '$lib/api/definitions/server';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { updateStartupVariable } from '$lib/api/startup';
    import { httpErrorToHuman } from '$lib/api/http';
    import Select from '$lib/ui/select/Select.svelte';
    import Spinner from '$lib/ui/Spinner.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { cn } from '$lib/utils/cn';
    import { untrack } from 'svelte';

    /**
     * One startup variable, ported from VariableBox.tsx: a switch for boolean rules, a
     * select for `in:` rules, otherwise a text field. Every change is saved after a 500 ms
     * debounce, as the legacy `debounce(…, 500)` did.
     */
    type Props = {
        variable: EggVariable;
        store: ServerStore;
        onUpdate: (variable: EggVariable, invocation: string) => void;
    };

    let { variable, store, onUpdate }: Props = $props();

    let saving = $state(false);
    let error = $state('');
    let timer: ReturnType<typeof setTimeout> | undefined;

    const canEdit = $derived(store.can('startup.update') && variable.isEditable);

    // Rule detection is verbatim from the legacy component, including its quirk of only
    // treating the switch as "true"/"false" when the variable also has the `string` rule.
    const useSwitch = $derived(
        variable.rules.some(
            v => v === 'boolean' || v === 'in:0,1' || v === 'in:1,0' || v === 'in:true,false' || v === 'in:false,true',
        ),
    );
    const isStringSwitch = $derived(variable.rules.some(v => v === 'string'));
    const selectValues = $derived(
        (variable.rules.find(v => v.startsWith('in:'))?.split(',') ?? []).map(v => v.replace('in:', '')),
    );
    const selectOptions = $derived(selectValues.map(option => ({ value: option, label: option })));

    // Read once: later saves must not overwrite what the user is still typing.
    const initialText = untrack(() => variable.serverValue ?? '');

    const checked = $derived(isStringSwitch ? variable.serverValue === 'true' : variable.serverValue === '1');

    function save(value: string) {
        if (!canEdit) return;

        clearTimeout(timer);
        timer = setTimeout(async () => {
            saving = true;
            error = '';
            try {
                const [updated, invocation] = await updateStartupVariable(store.server!.id, variable.envVariable, value);
                onUpdate(updated, invocation);
            } catch (e) {
                console.error(e);
                error = httpErrorToHuman(e);
            } finally {
                saving = false;
            }
        }, 500);
    }

    function toggle() {
        if (isStringSwitch) {
            save(variable.serverValue === 'true' ? 'false' : 'true');
        } else {
            save(variable.serverValue === '1' ? '0' : '1');
        }
    }

    $effect(() => () => clearTimeout(timer));
</script>

<div class="rounded-lg border border-border bg-card p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
        <h3 class="flex min-w-0 items-center gap-2 text-sm font-semibold">
            {#if !variable.isEditable}
                <span class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    只读
                </span>
            {/if}
            <span class="truncate">{variable.name}</span>
        </h3>
        {#if saving}
            <Spinner size="sm" />
        {/if}
    </div>

    {#if error}
        <Alert variant="destructive" class="mb-3">{error}</Alert>
    {/if}

    {#if useSwitch}
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={variable.name}
            disabled={!canEdit}
            onclick={toggle}
            class={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-primary' : 'bg-muted',
            )}
        >
            <span
                class={cn(
                    'inline-block size-4 rounded-full bg-background shadow transition-transform',
                    checked ? 'translate-x-4.5' : 'translate-x-0.5',
                )}
            ></span>
        </button>
    {:else if selectValues.length > 0}
        <Select
            aria-label={variable.name}
            items={selectOptions}
            disabled={!canEdit}
            value={variable.serverValue ?? variable.defaultValue ?? ''}
            onValueChange={save}
        />
    {:else}
        <!-- Uncontrolled like the legacy defaultValue input, so a save never resets the caret. Listens
             to `input` (legacy used keyup), which also catches paste from the context menu. -->
        <input
            aria-label={variable.name}
            readonly={!canEdit}
            value={initialText}
            placeholder={variable.defaultValue}
            oninput={e => save(e.currentTarget.value)}
            class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 font-mono text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none read-only:bg-muted/40 read-only:text-muted-foreground"
        />
    {/if}

    <p class="mt-2 text-xs text-muted-foreground">{variable.description}</p>
    <code class="mt-2 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
        {variable.envVariable}
    </code>
</div>
