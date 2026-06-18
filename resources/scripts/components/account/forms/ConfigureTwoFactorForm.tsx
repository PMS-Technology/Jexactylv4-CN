import { useEffect, useState } from 'react';
import { useStoreState } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import tw from 'twin.macro';
import { Button } from '@/elements/button/index';
import SetupTOTPDialog from '@account/forms/SetupTOTPDialog';
import RecoveryTokensDialog from '@account/forms/RecoveryTokensDialog';
import DisableTOTPDialog from '@account/forms/DisableTOTPDialog';
import { useFlashKey } from '@/plugins/useFlash';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('dashboard');
    const [tokens, setTokens] = useState<string[]>([]);
    const [visible, setVisible] = useState<'enable' | 'disable' | null>(null);
    const isEnabled = useStoreState((state: ApplicationStore) => state.user.data!.useTotp);
    const { clearAndAddHttpError } = useFlashKey('account:two-step');

    useEffect(() => {
        return () => {
            clearAndAddHttpError();
        };
    }, [visible]);

    const onTokens = (tokens: string[]) => {
        setTokens(tokens);
        setVisible(null);
    };

    return (
        <div>
            <SetupTOTPDialog open={visible === 'enable'} onClose={() => setVisible(null)} onTokens={onTokens} />
            <RecoveryTokensDialog tokens={tokens} open={tokens.length > 0} onClose={() => setTokens([])} />
            <DisableTOTPDialog open={visible === 'disable'} onClose={() => setVisible(null)} />
            <p css={tw`text-sm`}>
                {isEnabled
                    ? t('account.twoStepEnabled')
                    : t('account.twoStepDisabled')}
            </p>
            <div css={tw`mt-6`}>
                {isEnabled ? (
                    <Button.Danger onClick={() => setVisible('disable')}>{t('account.disableTwoStep')}</Button.Danger>
                ) : (
                    <Button onClick={() => setVisible('enable')}>{t('account.enableTwoStep')}</Button>
                )}
            </div>
        </div>
    );
};
