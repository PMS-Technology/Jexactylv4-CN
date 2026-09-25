import { ContractIcon, ExpandIcon, ShareIcon, XIcon } from './icons';

interface Props {
    showClear?: boolean;
    hasLogs?: boolean;
    shareDisabled?: boolean;
    sharing?: boolean;
    fullscreen?: boolean;
    clearDisabled?: boolean;
    onClear: () => void;
    onShare: () => void;
    onToggleFullscreen: () => void;
}

export default ({
    showClear,
    hasLogs,
    shareDisabled,
    sharing,
    fullscreen,
    clearDisabled,
    onClear,
    onShare,
    onToggleFullscreen,
}: Props) => (
    <div className={'flex items-center gap-1'}>
        {showClear && hasLogs && (
            <button type={'button'} className={'mc-quiet'} disabled={clearDisabled} onClick={onClear}>
                <XIcon aria-hidden={'true'} />
                Clear
            </button>
        )}
        {hasLogs && (
            <button type={'button'} className={'mc-quiet'} disabled={shareDisabled || sharing} onClick={onShare}>
                <ShareIcon aria-hidden={'true'} />
                Share
            </button>
        )}
        <button type={'button'} className={'mc-quiet'} onClick={onToggleFullscreen}>
            {fullscreen ? <ContractIcon aria-hidden={'true'} /> : <ExpandIcon aria-hidden={'true'} />}
            {fullscreen ? 'Collapse' : 'Expand'}
        </button>
    </div>
);
