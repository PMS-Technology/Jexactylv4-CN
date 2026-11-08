<script lang="ts">
    import { Spinner } from '$lib/ui';

    /**
     * The file manager's CodeMirror editor, loaded on first use so the egg pages do not pull
     * it into the admin bundle. `content` is the initial document; read edits through
     * `registerContent`, as the editor does not report changes.
     */
    let {
        content,
        filename,
        registerContent,
        class: className = 'h-64',
    }: { content: string; filename: string; registerContent: (get: () => string) => void; class?: string } = $props();

    const editor = import('../../server/files/CodeEditor.svelte');
</script>

{#await editor}
    <div class="flex items-center justify-center rounded-md border border-border {className}"><Spinner /></div>
{:then { default: CodeEditor }}
    <CodeEditor {content} {filename} {registerContent} class="overflow-hidden rounded-md border border-border {className}" />
{/await}
