import { Dialog, DialogProps } from '@/elements/dialog';
import { Button } from '@/elements/button/index';
import CopyOnClick from '@/elements/CopyOnClick';
import { Alert } from '@/elements/alert';
import { useTranslation } from 'react-i18next';

interface RecoveryTokenDialogProps extends DialogProps {
    tokens: string[];
}

export default ({ tokens, open, onClose }: RecoveryTokenDialogProps) => {
    const { t } = useTranslation('dashboard');
    const grouped = [] as [string, string][];
    tokens.forEach((token, index) => {
        if (index % 2 === 0) {
            grouped.push([token, tokens[index + 1] || '']);
        }
    });

    return (
        <Dialog
            open={open}
            onClose={onClose}
            title={t('account.twoStepEnabledTitle')}
            description={t('account.recoveryTokensDescription')}
            hideCloseIcon
            preventExternalClose
        >
            <Dialog.Icon position={'container'} type={'success'} />
            <CopyOnClick text={tokens.join('\n')} showInNotification={false}>
                <pre className={'mt-6 rounded bg-slate-800 p-2'}>
                    {grouped.map(value => (
                        <span key={value.join('_')} className={'block'}>
                            {value[0]}
                            <span className={'mx-2 selection:bg-slate-800'}>&nbsp;</span>
                            {value[1]}
                            <span className={'selection:bg-slate-800'}>&nbsp;</span>
                        </span>
                    ))}
                </pre>
            </CopyOnClick>
            <Alert type={'danger'} className={'mt-3'}>
                {t('account.recoveryTokensWarning')}
            </Alert>
            <Dialog.Footer>
                <Button.Text onClick={onClose}>{t('account.done')}</Button.Text>
            </Dialog.Footer>
        </Dialog>
    );
};
