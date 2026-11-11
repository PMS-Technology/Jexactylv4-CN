<script lang="ts">
    import type { PanelPermissions } from '$lib/api/subusers';
    import Checkbox from '$lib/ui/checkbox/Checkbox.svelte';
    import Label from '$lib/ui/Label.svelte';


    /** Permission matrix, ported from PermissionTitleBox.tsx and PermissionRow.tsx. */
    type Props = {
        permissions: PanelPermissions;
        editablePermissions: string[];
        selectedPermissions?: string[];
        disabled?: boolean;
    };

    let { permissions, editablePermissions, selectedPermissions = $bindable([]), disabled = false }: Props =
        $props();

    function toggleGroup(groupPerms: string[], checked: boolean) {
        if (checked) {
            selectedPermissions = [
                ...selectedPermissions,
                ...groupPerms.filter(p => !selectedPermissions.includes(p)),
            ];
        } else {
            selectedPermissions = selectedPermissions.filter(p => !groupPerms.includes(p));
        }
    }

    function togglePermission(perm: string) {
        if (selectedPermissions.includes(perm)) {
            selectedPermissions = selectedPermissions.filter(p => p !== perm);
        } else {
            selectedPermissions = [...selectedPermissions, perm];
        }
    }
</script>

{#each Object.entries(permissions) as [groupKey, group], groupIndex}
    {#if groupKey !== 'websocket'}
        {@const groupPerms = Object.keys(group.keys).map(pkey => `${groupKey}.${pkey}`)}
        {@const editable = groupPerms.filter(p => editablePermissions.includes(p))}
        {@const isChecked = editable.length > 0 && editable.every(p => selectedPermissions.includes(p))}

        <div class={groupIndex > 0 ? 'mt-4' : ''}>
            <div class="rounded-lg border border-border bg-card p-4">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <Label class="text-sm font-semibold capitalize">
                            {groupKey}
                        </Label>
                        {#if group.description}
                            <p class="mt-1 text-xs text-muted-foreground">
                                {group.description}
                            </p>
                        {/if}
                    </div>
                    {#if disabled || editable.length === 0}
                        <Checkbox disabled />
                    {:else}
                        <Checkbox
                            checked={isChecked}
                            onCheckedChange={checked => toggleGroup(editable, checked)}
                        />
                    {/if}
                </div>

                <div class="mt-4 grid gap-4 sm:grid-cols-2">
                    {#each Object.entries(group.keys) as [pkey, desc]}
                        {@const perm = `${groupKey}.${pkey}`}
                        {@const isEditable = editablePermissions.includes(perm)}
                        {@const checked = selectedPermissions.includes(perm)}

                        <Checkbox
                            checked={checked}
                            disabled={!isEditable || disabled}
                            onCheckedChange={() => {
                                if (isEditable && !disabled) togglePermission(perm);
                            }}
                            wrapperClass={isEditable && !disabled
                                ? 'flex items-start gap-3 rounded border border-transparent p-2 transition-colors cursor-pointer hover:border-border hover:bg-accent/5'
                                : 'flex items-start gap-3 rounded border border-transparent p-2 transition-colors cursor-not-allowed opacity-50'}
                        >
                            {#snippet children({ id })}
                                <div id={id} class="min-w-0 flex-1">
                                    <p class="text-sm font-medium">{pkey}</p>
                                    {#if desc}
                                        <p class="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                                    {/if}
                                </div>
                            {/snippet}
                        </Checkbox>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
{/each}
