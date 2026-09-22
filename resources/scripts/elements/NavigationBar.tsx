import { useStoreState } from 'easy-peasy';
import SearchContainer from '@account/search/SearchContainer';
import tw from 'twin.macro';
import styled from 'styled-components';
import { SiteTheme } from '@/state/theme';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/outline';

const RightNavigation = styled.div<{ theme: SiteTheme }>`
    & > a,
    & > button,
    & > div,
    & > .navigation-link {
        ${tw`flex items-center h-full no-underline text-neutral-300 px-6 cursor-pointer transition-all duration-300 gap-x-2`};
        ${tw`text-gray-400 font-medium`};

        &:active,
        &:hover,
        &.active {
            box-shadow: inset 0 -1px ${({ theme }) => theme.colors.primary};
        }
    }
`;

const NavigationBar = () => {
    const location = useLocation();
    const theme = useStoreState(state => state.theme.data!);

    const pathnames = location.pathname.split('/').filter(Boolean);

    const renderBreadcrumbs = () => (
        <ol className="w-1/3 text-gray-400 text-sm inline-flex space-x-2">
            <Link to={'/'}>
                <HomeIcon className="w-4 h-4 my-auto brightness-150" />
            </Link>
            {pathnames.map((segment, index) => {
                const href = `/${pathnames.slice(0, index + 1).join('/')}`;
                return (
                    <li key={index} className="inline-flex">
                        <ChevronRightIcon className="mr-2 w-4 h-4 my-auto" />
                        {index === pathnames.length - 1 ? (
                            <span className="capitalize">{segment}</span>
                        ) : (
                            <Link to={href} className="capitalize brightness-150">
                                {segment}
                            </Link>
                        )}
                    </li>
                );
            })}
        </ol>
    );

    return (
        <div
            className="w-full overflow-x-auto shadow-md mb-8 backdrop-blur-md border-b border-white/5"
            style={{ backgroundColor: theme.colors.sidebar }}
        >
            <div className="px-8 flex h-[3.5rem] w-full items-center">
                {renderBreadcrumbs()}
                <RightNavigation className="flex h-full items-center justify-center ml-auto" theme={theme}>
                    <SearchContainer />
                </RightNavigation>
            </div>
        </div>
    );
};

export default NavigationBar;
