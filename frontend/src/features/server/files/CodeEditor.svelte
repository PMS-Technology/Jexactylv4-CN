<script lang="ts">
    import { onMount } from 'svelte';
    import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
    import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
    import {
        bracketMatching,
        defaultHighlightStyle,
        foldGutter,
        foldKeymap,
        indentOnInput,
        indentUnit,
        LanguageDescription,
        LanguageSupport,
        syntaxHighlighting,
    } from '@codemirror/language';
    import { languages } from '@codemirror/language-data';
    import { lintKeymap } from '@codemirror/lint';
    import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
    import { Compartment, EditorState, type Extension } from '@codemirror/state';
    import {
        crosshairCursor,
        drawSelection,
        dropCursor,
        EditorView,
        highlightActiveLine,
        highlightActiveLineGutter,
        highlightSpecialChars,
        keymap,
        lineNumbers,
        rectangularSelection,
    } from '@codemirror/view';
    import { ayuMirageTheme, ayuMirageHighlightStyle } from './editorTheme';

    type Props = {
        /** Initial document; changing it replaces the whole state, dropping undo history. */
        content: string;
        /** Used to pick a language when `language` is not set. */
        filename?: string;
        /** Overrides the filename-derived language. */
        language?: LanguageDescription;
        /** Registers a getter for the current document, the legacy `fetchContent` contract. */
        registerContent?: (get: () => string) => void;
        /** Fired for the Mod-s binding and the language auto-detection. */
        onSave?: () => void;
        onLanguageChanged?: (language: LanguageDescription | undefined) => void;
        class?: string;
    };

    let { content, filename = '', language, registerContent, onSave, onLanguageChanged, class: className }: Props =
        $props();

    let container: HTMLDivElement;
    let view: EditorView | null = null;

    const languageConfig = new Compartment();
    const saveKeymap = new Compartment();

    const defaultExtensions: Extension = [
        ayuMirageTheme,
        syntaxHighlighting(ayuMirageHighlightStyle),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap,
            indentWithTab,
        ]),
        EditorState.tabSize.of(4),
        indentUnit.of('\t'),
    ];

    function createState(doc: string, support?: LanguageSupport): EditorState {
        return EditorState.create({
            doc,
            extensions: [defaultExtensions, languageConfig.of(support ?? []), saveKeymap.of(keymap.of([]))],
        });
    }

    /** Resolves the language for a file, mirroring the legacy `findLanguageByFilename`. */
    function findLanguage(name: string): LanguageDescription | undefined {
        return LanguageDescription.matchFilename(languages, name) ?? undefined;
    }

    let support = $state<LanguageSupport>();

    $effect(() => {
        // Tracks `language` / `filename`; reloads the grammar when either changes.
        const target = language ?? findLanguage(filename);
        if (!target) return;

        void target.load().then(loaded => {
            support = loaded;
        });

        onLanguageChanged?.(target);
    });

    $effect(() => {
        if (!view) return;

        view.dispatch({
            effects: languageConfig.reconfigure(support ?? []),
        });
    });

    // Rebuild the whole state when the document (or route) changes; this is what the
    // legacy effect on `props.initialContent` did, preventing stale undo history.
    $effect(() => {
        const doc = content;

        let editor = view;
        if (!editor) {
            editor = view = new EditorView({
                state: createState(doc, support),
                parent: container,
            });
        } else {
            editor.setState(createState(doc, support));
        }

        registerContent?.(() => editor.state.doc.toString());

        return () => {
            editor.destroy();
            if (view === editor) view = null;
        };
    });

    $effect(() => {
        if (!view) return;

        // The binding is armed once `onSave` exists, mirroring the legacy `onContentSaved`
        // wiring through the keybindings compartment.
        view.dispatch({
            effects: saveKeymap.reconfigure(
                keymap.of([
                    {
                        key: 'Mod-s',
                        preventDefault: true,
                        run: () => {
                            onSave?.();
                            return true;
                        },
                    },
                ]),
            ),
        });
    });

    onMount(() => {
        return () => {
            view?.destroy();
            view = null;
        };
    });
</script>

<div bind:this={container} class={className}></div>

<style>
    :global(.cm-editor.cm-focused) {
        outline: none;
    }
</style>
