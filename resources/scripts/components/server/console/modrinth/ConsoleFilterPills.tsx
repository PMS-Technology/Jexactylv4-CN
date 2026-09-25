import type { FilterValue, LogLevel } from '../consoleTypes';
import FilterPills from './FilterPills';

const ALWAYS_VISIBLE: Array<{ id: LogLevel; label: string }> = [
    { id: 'error', label: 'Error' },
    { id: 'warn', label: 'Warn' },
    { id: 'info', label: 'Info' },
];

const CONDITIONAL_OPTIONS: Array<{ id: 'debug' | 'trace'; label: string }> = [
    { id: 'debug', label: 'Debug' },
    { id: 'trace', label: 'Trace' },
];

interface Props {
    presentLevels: Set<'debug' | 'trace'>;
    value: Set<FilterValue>;
    onToggle: (value: FilterValue) => void;
}

export default ({ presentLevels, value, onToggle }: Props) => {
    const selected = value.has('all') ? [] : ([...value] as string[]);
    const options = [...ALWAYS_VISIBLE, ...CONDITIONAL_OPTIONS.filter(option => presentLevels.has(option.id))];

    return (
        <FilterPills
            options={options}
            value={selected}
            allLabel={'All'}
            onChange={ids => {
                if (ids.length === 0) {
                    onToggle('all');
                    return;
                }
                const added = ids.find(id => !selected.includes(id));
                const removed = selected.find(id => !ids.includes(id));
                if (added) onToggle(added as FilterValue);
                if (removed) onToggle(removed as FilterValue);
            }}
        />
    );
};
