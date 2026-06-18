import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, RenderDialogProps } from './';
import { Button } from '@/elements/button/index';

type ConfirmationProps = Omit<RenderDialogProps, 'description' | 'children'> & {
    children: React.ReactNode;
    confirm?: string | undefined;
    buttonType?: 'success' | 'info' | 'warning' | 'danger';
    onConfirmed: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
};

export default ({ confirm, children, onConfirmed, buttonType, ...props }: ConfirmationProps) => {
    const { t } = useTranslation('common');
    const confirmText = confirm || t('okay');

    return (
        <Dialog {...props} description={typeof children === 'string' ? children : undefined}>
            {typeof children !== 'string' && children}
            <Dialog.Footer>
                <Button.Text onClick={props.onClose}>{t('cancel')}</Button.Text>
                {(!buttonType || buttonType === 'info') && <Button.Info onClick={onConfirmed}>{confirmText}</Button.Info>}
                {buttonType === 'danger' && <Button.Danger onClick={onConfirmed}>{confirmText}</Button.Danger>}
                {buttonType === 'warning' && <Button.Warn onClick={onConfirmed}>{confirmText}</Button.Warn>}
                {buttonType === 'success' && <Button onClick={onConfirmed}>{confirmText}</Button>}
            </Dialog.Footer>
        </Dialog>
    );
};
