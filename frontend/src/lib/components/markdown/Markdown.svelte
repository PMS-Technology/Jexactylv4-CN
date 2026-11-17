<script lang="ts">
    import { marked } from 'marked';
    import DOMPurify from 'dompurify';
    import { cn } from '$lib/utils/cn';

    /**
     * Renders Markdown written by the AI.
     *
     * The text comes from a language model, so it is treated as untrusted: the
     * HTML is sanitised before it is injected, and links open in a new tab
     * without handing over the referrer. The styling lives here rather than in a
     * prose plugin so the block spacing and the type scale stay in step with
     * the rest of the panel.
     */
    type Props = {
        content?: string;
        class?: string;
    };

    let { content = '', class: className }: Props = $props();

    marked.setOptions({
        gfm: true,
        breaks: true,
    });

    const html = $derived(
        DOMPurify.sanitize(marked.parse(content ?? '', { async: false }) as string, {
            ADD_ATTR: ['target', 'rel'],
        }),
    );
</script>

<div class={cn('markdown-body text-sm leading-relaxed', className)}>
    <!-- The HTML is sanitised above; the model cannot inject scripts or styles. -->
    {@html html}
</div>

<style>
    :global(.markdown-body > *:first-child) {
        margin-top: 0;
    }

    :global(.markdown-body > *:last-child) {
        margin-bottom: 0;
    }

    :global(.markdown-body p) {
        margin: 0.5rem 0;
    }

    :global(.markdown-body h1),
    :global(.markdown-body h2),
    :global(.markdown-body h3),
    :global(.markdown-body h4) {
        margin: 1rem 0 0.5rem;
        font-weight: 600;
        line-height: 1.4;
        color: var(--foreground);
    }

    :global(.markdown-body h1) {
        font-size: 1.125rem;
    }

    :global(.markdown-body h2) {
        font-size: 1rem;
    }

    :global(.markdown-body h3) {
        font-size: 0.9375rem;
    }

    :global(.markdown-body h4) {
        font-size: 0.875rem;
    }

    :global(.markdown-body ul),
    :global(.markdown-body ol) {
        margin: 0.5rem 0;
        padding-left: 1.25rem;
    }

    :global(.markdown-body ul) {
        list-style: disc;
    }

    :global(.markdown-body ol) {
        list-style: decimal;
    }

    :global(.markdown-body li) {
        margin: 0.25rem 0;
    }

    :global(.markdown-body li > ul),
    :global(.markdown-body li > ol) {
        margin: 0.25rem 0;
    }

    :global(.markdown-body a) {
        color: var(--primary);
        text-decoration: underline;
        text-underline-offset: 2px;
    }

    :global(.markdown-body code) {
        border-radius: 0.25rem;
        background-color: var(--muted);
        padding: 0.1rem 0.3rem;
        font-family: var(--font-mono);
        font-size: 0.8125em;
    }

    :global(.markdown-body pre) {
        margin: 0.5rem 0;
        overflow-x: auto;
        border-radius: 0.5rem;
        border: 1px solid var(--border);
        background-color: var(--muted);
        padding: 0.75rem;
    }

    :global(.markdown-body pre code) {
        background: none;
        padding: 0;
        font-size: 0.8125rem;
        line-height: 1.5;
    }

    :global(.markdown-body blockquote) {
        margin: 0.5rem 0;
        border-left: 3px solid var(--border);
        padding-left: 0.75rem;
        color: var(--muted-foreground);
    }

    :global(.markdown-body table) {
        margin: 0.5rem 0;
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
    }

    :global(.markdown-body th),
    :global(.markdown-body td) {
        border: 1px solid var(--border);
        padding: 0.35rem 0.5rem;
        text-align: left;
    }

    :global(.markdown-body th) {
        background-color: var(--muted);
        font-weight: 600;
    }

    :global(.markdown-body hr) {
        margin: 0.75rem 0;
        border: 0;
        border-top: 1px solid var(--border);
    }
</style>
