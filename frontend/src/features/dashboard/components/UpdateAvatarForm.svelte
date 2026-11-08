<script lang="ts">
    import { z } from 'zod';
    import { app } from '$lib/stores/app.svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { removeAccountAvatar, updateAccountAvatarUrl, uploadAccountAvatar } from '$lib/api/account';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button, Input, Label } from '$lib/ui';

    /**
     * Avatar management, ported from the legacy `UpdateAvatarForm.tsx`. The three
     * actions share one feedback area, matching the single flash key the old form used.
     */

    // The backend validates `avatar_url` as `url|max:500`; mirror both rules locally.
    const urlSchema = z.string().trim().min(1, '请输入头像链接。').url('请输入合法的头像链接。').max(500);

    type Action = 'url' | 'upload' | 'remove';

    let avatarUrl = $state('');
    let error = $state('');
    let success = $state('');
    let busyAction = $state<Action | null>(null);

    let fileInput = $state<HTMLInputElement>();

    async function run(action: Action, task: () => Promise<string | null>, message: string) {
        busyAction = action;
        error = '';
        success = '';
        try {
            // Keep the local user in step so the sidebar and this preview update at once.
            app.updateUser({ avatarUrl: await task() });
            success = message;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            busyAction = null;
        }
    }

    function submitUrl(event?: SubmitEvent) {
        event?.preventDefault();

        const parsed = urlSchema.safeParse(avatarUrl);
        if (!parsed.success) {
            error = parsed.error.issues[0]?.message ?? '请输入合法的头像链接。';
            return;
        }

        run('url', () => updateAccountAvatarUrl(parsed.data), '头像已更新。');
        avatarUrl = '';
    }

    function submitFile(change: Event) {
        const input = change.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        run('upload', () => uploadAccountAvatar(file), '头像已更新。');
        // Allow picking the same file again after a failure.
        input.value = '';
    }

    function remove() {
        run('remove', async () => {
            await removeAccountAvatar();
            return null;
        }, '已恢复默认头像。');
    }
</script>

<form onsubmit={submitUrl} class="space-y-4" novalidate>
    {#if error}
        <Alert variant="destructive">{error}</Alert>
    {:else if success}
        <Alert variant="success">{success}</Alert>
    {/if}

    <Avatar src={app.user?.avatarUrl} name={app.user?.uuid} size={64} />

    <div>
        <Label for="avatar_url">头像链接</Label>
        <Input
            id="avatar_url"
            type="url"
            placeholder="https://example.com/avatar.png"
            bind:value={avatarUrl}
            disabled={busyAction !== null}
        />
    </div>

    <div class="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!avatarUrl.trim() || busyAction !== null} loading={busyAction === 'url'}>
            使用链接
        </Button>
        <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busyAction !== null}
            loading={busyAction === 'upload'}
            onclick={() => fileInput?.click()}>上传图片</Button
        >
        <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busyAction !== null}
            loading={busyAction === 'remove'}
            onclick={remove}>移除头像</Button
        >
    </div>

    <input bind:this={fileInput} type="file" accept="image/*" onchange={submitFile} class="hidden" />
</form>
