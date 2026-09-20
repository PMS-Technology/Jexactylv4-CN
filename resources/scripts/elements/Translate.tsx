import type { ComponentType, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

interface Props {
    children?: ReactNode;
    defaults?: string;
    i18nKey?: string | string[];
    ns?: string | string[];
    values?: Record<string, unknown>;
}

function Translate({ ns, children, ...props }: Props) {
    const { i18n } = useTranslation();
    const DynamicTrans = Trans as ComponentType<any>;

    return (
        <DynamicTrans i18n={i18n} ns={ns} {...props}>
            {children}
        </DynamicTrans>
    );
}

export default Translate;
