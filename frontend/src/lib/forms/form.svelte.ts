import type { ZodType } from 'zod';
import { httpErrorToHuman } from '$lib/api/http';

/**
 * Minimal form controller: Zod validation plus submit state.
 *
 * This replaces Formik + Yup from the legacy frontend. It stays deliberately small —
 * field values live in a plain object the component binds to, and validation runs on
 * submit, which is how the existing forms behaved.
 */
export class Form<T extends Record<string, unknown>> {
    values = $state({} as T);
    errors = $state<Partial<Record<keyof T | '_', string>>>({});
    submitting = $state(false);
    succeeded = $state(false);

    #schema: ZodType<T>;
    #initial: T;
    #onSubmit: (values: T) => Promise<void>;

    constructor(options: { schema: ZodType<T>; initial: T; onSubmit: (values: T) => Promise<void> }) {
        this.#schema = options.schema;
        this.#initial = options.initial;
        this.#onSubmit = options.onSubmit;
        this.values = { ...options.initial };
    }

    /** Runs the schema and populates per-field errors. Returns the parsed value or null. */
    validate(): T | null {
        const result = this.#schema.safeParse(this.values);

        if (result.success) {
            this.errors = {};

            return result.data;
        }

        const errors: Partial<Record<keyof T | '_', string>> = {};
        for (const issue of result.error.issues) {
            const key = (issue.path[0] ?? '_') as keyof T | '_';
            // Keep the first message per field; later ones are usually redundant.
            errors[key] ??= issue.message;
        }
        this.errors = errors;

        return null;
    }

    async submit(event?: SubmitEvent) {
        event?.preventDefault();

        if (this.submitting) return;

        this.succeeded = false;
        const parsed = this.validate();
        if (!parsed) return;

        this.submitting = true;
        try {
            await this.#onSubmit(parsed);
            this.succeeded = true;
        } catch (error) {
            // Surface the server's message rather than a generic failure, and keep it
            // under the `_` key so the form can render it above the fields.
            this.errors = { ...this.errors, _: httpErrorToHuman(error) };
        } finally {
            this.submitting = false;
        }
    }

    reset() {
        this.values = { ...this.#initial };
        this.errors = {};
        this.succeeded = false;
    }

    /** Clears a field's error, for use as the user edits it. */
    clearError(field: keyof T) {
        if (this.errors[field]) {
            this.errors = { ...this.errors, [field]: undefined };
        }
    }
}
