import { FilterIcon } from './icons';

export interface FilterPillOption {
    id: string;
    label: string;
}

interface Props {
    options: FilterPillOption[];
    value: string[];
    onChange: (value: string[]) => void;
    allLabel: string;
}

export default ({ options, value, onChange, allLabel }: Props) => {
    const toggle = (id: string) => {
        onChange(value.includes(id) ? value.filter(item => item !== id) : [...value, id]);
    };

    return (
        <div className={'flex items-center gap-2'}>
            <FilterIcon className={'h-5 w-5 shrink-0'} style={{ color: 'var(--color-secondary)' }} />
            <div className={'flex flex-wrap items-center gap-1.5'}>
                <button type={'button'} className={'mc-pill'} aria-pressed={value.length === 0} onClick={() => onChange([])}>
                    {allLabel}
                </button>
                {options.map(option => (
                    <button
                        key={option.id}
                        type={'button'}
                        className={'mc-pill'}
                        aria-pressed={value.includes(option.id)}
                        onClick={() => toggle(option.id)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
