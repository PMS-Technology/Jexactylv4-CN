/** One entry in a select's option list. */
export type SelectOption = {
    /** The value carried by the option; this is what the select's `value` holds. */
    value: string;
    /** The text shown for the option, both in the list and in the trigger. */
    label: string;
    disabled?: boolean;
};
