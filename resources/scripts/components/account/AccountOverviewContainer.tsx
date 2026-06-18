import ContentBox from '@/elements/ContentBox';
import UpdatePasswordForm from '@account/forms/UpdatePasswordForm';
import UpdateEmailAddressForm from '@account/forms/UpdateEmailAddressForm';
import ConfigureTwoFactorForm from '@account/forms/ConfigureTwoFactorForm';
import PageContentBlock from '@/elements/PageContentBlock';
import tw from 'twin.macro';
import { breakpoint } from '@/assets/theme';
import styled from 'styled-components';
import MessageBox from '@/elements/MessageBox';
import { useLocation } from 'react-router-dom';
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

export default () => {
    const { state } = useLocation();
    const { t } = useTranslation('dashboard');

    return (
        <PageContentBlock title={t('account.overviewTitle')} header description={t('account.overviewDescription')}>
            {state?.twoFactorRedirect && (
                <MessageBox title={t('account.twoFactorRequired')} type="error">
                    {t('account.twoFactorRequiredDescription')}
                </MessageBox>
            )}

            <Container css={[tw`lg:grid lg:grid-cols-3 mb-10`, state?.twoFactorRedirect ? tw`mt-4` : tw`mt-10`]}>
                <ContentBox title={t('account.updatePassword')} showFlashes="account:password">
                    <UpdatePasswordForm />
                </ContentBox>

                <ContentBox css={tw`mt-8 sm:mt-0 sm:ml-8`} title={t('account.updateEmail')} showFlashes="account:email">
                    <UpdateEmailAddressForm />
                </ContentBox>

                <ContentBox css={tw`md:ml-8 mt-8 md:mt-0`} title={t('account.twoStepVerification')}>
                    <ConfigureTwoFactorForm />
                </ContentBox>
            </Container>
        </PageContentBlock>
    );
};
