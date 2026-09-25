import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export const SearchIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} width={'24'} height={'24'} viewBox={'0 0 24 24'} fill={'none'} {...props}>
        <path
            d={'M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z'}
            stroke={'currentColor'}
            strokeWidth={'2'}
            strokeLinecap={'round'}
            strokeLinejoin={'round'}
        />
    </svg>
);

export const FilterIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} width={'24'} height={'24'} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={'2'} strokeLinecap={'round'} strokeLinejoin={'round'} {...props}>
        <polygon points={'22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3'} />
    </svg>
);

export const XIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} viewBox={'0 0 20 20'} fill={'currentColor'} {...props}>
        <path
            fillRule={'evenodd'}
            d={'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'}
            clipRule={'evenodd'}
        />
    </svg>
);

export const ExpandIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} fill={'none'} viewBox={'0 0 24 24'} stroke={'currentColor'} strokeWidth={'2'} {...props}>
        <path strokeLinecap={'round'} strokeLinejoin={'round'} d={'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4'} />
    </svg>
);

export const ContractIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={'2'} strokeLinecap={'round'} strokeLinejoin={'round'} {...props}>
        <path d={'M9 5v4m0 0H5m4 0L4 4m11 1v4m0 0h4m-4 0 5-5M9 19v-4m0 0H5m4 0-5 5m11-5 5 5m-5-5v4m0-4h4'} />
    </svg>
);

export const ShareIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} width={'24'} height={'24'} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={'2'} strokeLinecap={'round'} strokeLinejoin={'round'} {...props}>
        <circle cx={'18'} cy={'5'} r={'3'} />
        <circle cx={'6'} cy={'12'} r={'3'} />
        <circle cx={'18'} cy={'19'} r={'3'} />
        <line x1={'8.59'} x2={'15.42'} y1={'13.51'} y2={'17.49'} />
        <line x1={'15.41'} x2={'8.59'} y1={'6.51'} y2={'10.49'} />
    </svg>
);

export const TerminalSquareIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} width={'24'} height={'24'} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={'2'} strokeLinecap={'round'} strokeLinejoin={'round'} {...props}>
        <path d={'m7 11 2-2-2-2'} />
        <path d={'M11 13h4'} />
        <rect width={'18'} height={'18'} x={'3'} y={'3'} rx={'2'} ry={'2'} />
    </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={'2'} strokeLinecap={'round'} strokeLinejoin={'round'} {...props}>
        <path d={'m6 9 6 6 6-6'} />
    </svg>
);

export const ClipboardCopyIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} width={'24'} height={'24'} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={'2'} strokeLinecap={'round'} strokeLinejoin={'round'} {...props}>
        <rect width={'8'} height={'4'} x={'8'} y={'2'} rx={'1'} ry={'1'} />
        <path d={'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'} />
    </svg>
);

export const ExternalIcon = (props: IconProps) => (
    <svg xmlns={'http://www.w3.org/2000/svg'} width={'24'} height={'24'} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={'2'} strokeLinecap={'round'} strokeLinejoin={'round'} {...props}>
        <path d={'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'} />
        <polyline points={'15 3 21 3 21 9'} />
        <line x1={'10'} x2={'21'} y1={'14'} y2={'3'} />
    </svg>
);
