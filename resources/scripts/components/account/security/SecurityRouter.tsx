import type { ComponentType, ElementType } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import * as Icon from '@heroicons/react/outline';

import PageContentBlock from '@/elements/PageContentBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import MessageBox from '@/elements/MessageBox';
import { SubNavigation, SubNavigationLink } from '@/elements/SubNavigation';
import CredentialsContainer from '@account/security/CredentialsContainer';
import AccountApiContainer from '@account/AccountApiContainer';
import AccountSSHContainer from '@account/ssh/AccountSSHContainer';
import AccountPasskeyContainer from '@account/passkeys/AccountPasskeyContainer';
import { useTranslation } from 'react-i18next';

interface SecurityTab {
    path: string;
    key: 'credentials' | 'passkeys' | 'ssh' | 'api';
    icon: ElementType;
    component: ComponentType;
}

/**
 * Drives the sub-navigation, the nested routes, and the per-tab document title from one place.
 */
const tabs: SecurityTab[] = [
    {
        path: '',
        key: 'credentials',
        icon: Icon.LockClosedIcon,
        component: CredentialsContainer,
    },
    {
        path: 'passkeys',
        key: 'passkeys',
        icon: Icon.FingerPrintIcon,
        component: AccountPasskeyContainer,
    },
    {
        path: 'ssh',
        key: 'ssh',
        icon: Icon.TerminalIcon,
        component: AccountSSHContainer,
    },
    {
        path: 'api',
        key: 'api',
        icon: Icon.CodeIcon,
        component: AccountApiContainer,
    },
];

const SecurityRouter = () => {
    const { t } = useTranslation('dashboard');
    const { t: tCommon } = useTranslation('common');
    const { pathname, state } = useLocation();

    // The base tab is the fallback, so an unrecognised sub-path still renders sensible chrome.
    const active =
        tabs.find(tab => tab.path !== '' && pathname.startsWith(`/account/security/${tab.path}`)) ?? tabs[0]!;

    return (
        <PageContentBlock title={t(`account.securityTabs.${active.key}.title`)}>
            {state?.twoFactorRedirect && (
                <MessageBox title={t('account.twoFactorRequired')} type="error">
                    {t('account.twoFactorRequiredDescription')}
                </MessageBox>
            )}

            <div className={'text-3xl lg:text-5xl font-bold mt-8 mb-8'}>
                {tCommon('security')}
                <p className={'text-gray-400 font-normal text-sm mt-1'}>
                    {t(`account.securityTabs.${active.key}.description`)}
                </p>
            </div>

            <SubNavigation>
                {tabs.map(({ path, key, icon: TabIcon }) => (
                    <SubNavigationLink
                        key={path}
                        to={`/account/security${path && `/${path}`}`}
                        name={t(`account.securityTabs.${key}.name`)}
                        base={path === ''}
                    >
                        <TabIcon />
                    </SubNavigationLink>
                ))}
            </SubNavigation>

            <FlashMessageRender byKey={'account'} />

            <Routes>
                {tabs.map(({ path, component: Component }) => (
                    <Route key={path} path={`/${path}`} element={<Component />} />
                ))}
            </Routes>
        </PageContentBlock>
    );
};

export default SecurityRouter;
