import tw, { css, styled } from 'twin.macro';

import { SiteTheme } from '@/state/theme';
import { useStoreState } from '@/state/hooks';
import React from 'react';
import { withSubComponents } from '@/lib/helpers';

const Icon: React.FC<{ icon: React.ElementType }> = ({ icon: Icon }) => {
    const theme = useStoreState(s => s.theme.data!);

    return <Icon color={theme.colors.primary} />;
};

const Wrapper = styled.div<{ theme: SiteTheme; $admin?: boolean }>`
    ${tw`w-full flex flex-col px-4`};
    /* The nav list is the part that can genuinely run out of room, so it is the part that
       scrolls when a short viewport cannot fit every entry. */
    ${tw`min-h-0 overflow-y-auto`};

    & > a {
        ${tw`w-full flex flex-row items-center text-neutral-300 cursor-pointer select-none px-4 rounded-lg`};
        ${tw`hover:text-neutral-50 hover:bg-white/5`};
        height: ${({ $admin }) => ($admin ? '2.5rem' : 'var(--sidebar-link-h)')};
        ${tw`transition-all duration-200`};

        & > svg {
            ${tw`h-6 w-6 flex flex-shrink-0 transition-transform duration-200`};
        }

        & > span {
            ${tw`font-header font-medium whitespace-nowrap leading-none ml-3`};
            font-size: var(--sidebar-link-font, 1.125rem);
        }

        &:hover > svg {
            ${tw`scale-110`};
        }

        &:active,
        &.active {
            ${tw`bg-black/30 shadow-inner ring-1 ring-white/5`};
            color: ${({ theme }) => theme.colors.primary};
            filter: brightness(150%);
        }
    }
`;

const Section = styled.div`
    ${tw`h-[18px] font-header font-medium text-xs text-neutral-300 whitespace-nowrap uppercase ml-4 mb-1 select-none`};
    ${tw`flex-shrink-0`};

    &:not(:first-of-type) {
        ${tw`mt-3`};
    }
`;

const User = styled.div`
    ${tw`w-full flex items-center bg-black/25 justify-center border-b border-white/5 flex-shrink-0`};
    height: var(--sidebar-user-h);
`;

const Sidebar = styled.div<{ $collapsed?: boolean; theme: SiteTheme }>`
    ${tw`hidden md:flex h-screen flex-col items-center flex-shrink-0 overflow-x-hidden ease-linear`};
    ${tw`transition-all duration-500 border-r border-white/5 shadow-xl`};
    ${tw`w-[15rem]`};

    /* Every nav link, the logo block and the account block are sized from here, so the whole
       column can be tightened as one on shorter viewports instead of overflowing off the
       bottom of the screen. */
    --sidebar-link-h: 4rem;
    --sidebar-link-font: 1.125rem;
    --sidebar-header-h: 4rem;
    --sidebar-user-h: 4rem;

    @media (max-height: 960px) {
        --sidebar-link-h: 3.25rem;
        --sidebar-link-font: 1rem;
        --sidebar-header-h: 3.5rem;
        --sidebar-user-h: 3.5rem;
    }

    @media (max-height: 800px) {
        --sidebar-link-h: 2.75rem;
        --sidebar-link-font: 0.9375rem;
        --sidebar-header-h: 3rem;
        --sidebar-user-h: 3rem;
    }

    @media (max-height: 740px) {
        --sidebar-link-h: 2.25rem;
        --sidebar-link-font: 0.875rem;
        --sidebar-header-h: 2.5rem;
        --sidebar-user-h: 2.75rem;
    }

    background-color: ${({ theme }) => theme.colors.sidebar};

    & > a,
    & > span > a {
        ${tw`w-full flex flex-row items-center text-neutral-300 cursor-pointer select-none px-8`};
        ${tw`hover:text-neutral-50`};
        height: var(--sidebar-link-h);

        & > svg {
            ${tw`transition-none h-6 w-6 flex flex-shrink-0`};
        }

        & > span {
            ${tw`font-header font-medium whitespace-nowrap leading-none ml-3`};
            font-size: var(--sidebar-link-font);
        }
    }

    ${props =>
        props.$collapsed &&
        css`
            ${tw`w-20`};

            ${Section} {
                ${tw`invisible`};
            }

            ${Wrapper} {
                ${tw`px-5`};

                & > a {
                    ${tw`justify-center w-10 h-10 mx-auto px-0 rounded-full`};
                }
            }

            & > a,
            & > span > a {
                ${tw`justify-center w-10 h-10 mx-auto px-0 rounded-full`};
            }

            & > a > span,
            ${User} > div,
            ${User} > a,
            ${Wrapper} > a > span {
                ${tw`hidden`};
            }
        `};
`;

export default withSubComponents(Sidebar, { Section, Wrapper, User, Icon });
