import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import tw from 'twin.macro';
import styled from 'styled-components';

import ContentBox from '@/elements/ContentBox';
import PageContentBlock from '@/elements/PageContentBlock';
import CopyOnClick from '@/elements/CopyOnClick';
import UpdateAvatarForm from '@account/forms/UpdateAvatarForm';
import { breakpoint } from '@/assets/theme';
import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';

const Container = styled.div`
    ${tw`flex flex-wrap`};

    & > div {
        ${tw`w-full`};

        ${breakpoint('sm')`
      width: calc(50% - 1rem);
    `}

        ${breakpoint('md')`
      ${tw`w-auto flex-1`};
    `}
    }
`;

const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
    <div css={tw`flex justify-between items-baseline gap-4 py-3 border-b border-neutral-700 last:border-b-0`}>
        <p css={tw`text-xs text-gray-400 uppercase whitespace-nowrap`}>{label}</p>
        <div css={tw`text-sm text-right break-words min-w-0`}>{children}</div>
    </div>
);

export default () => {
    const { t, i18n } = useTranslation('dashboard');
    const { t: tCommon } = useTranslation('common');
    const user = useStoreState(state => state.user.data!);

    return (
        <PageContentBlock
            title={t('account.overviewPageTitle')}
            header
            description={t('account.overviewPageDescription')}
        >
            <Container css={tw`lg:grid lg:grid-cols-2 mb-10 mt-10`}>
                <ContentBox title={t('account.avatar')} showFlashes="account:avatar">
                    <UpdateAvatarForm />
                </ContentBox>

                <ContentBox css={tw`mt-8 lg:mt-0 lg:ml-8`} title={t('account.accountInformation')}>
                    <Detail label={tCommon('username')}>{user.username}</Detail>
                    <Detail label={tCommon('emailAddress')}>{user.email}</Detail>
                    <Detail label={t('account.accountId')}>
                        <CopyOnClick text={user.uuid}>
                            <code css={tw`font-mono text-xs`}>{user.uuid}</code>
                        </CopyOnClick>
                    </Detail>
                    {user.roleName && <Detail label={t('account.role')}>{user.roleName}</Detail>}
                    <Detail label={t('account.memberSince')}>
                        {format(user.createdAt, i18n.language === 'zh_CN' ? 'yyyy年M月d日' : 'MMMM do, yyyy', {
                            locale: i18n.language === 'zh_CN' ? zhCN : undefined,
                        })}
                    </Detail>
                    <p css={tw`text-xs text-gray-400 mt-6`}>
                        <Link to={'/account/security'} css={tw`text-green-400 hover:text-green-200 duration-300`}>
                            {t('account.securityManagement', { security: tCommon('security') })}
                        </Link>
                    </p>
                </ContentBox>
            </Container>
        </PageContentBlock>
    );
};
