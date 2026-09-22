import Tooltip from '@/elements/tooltip/Tooltip';
import { ExclamationIcon } from '@heroicons/react/solid';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('common');

    return (
        <Tooltip content={t('requiredFieldDescription')}>
            <span className={'inline-flex align-middle ml-1'}>
                <ExclamationIcon className={'w-4 h-4 text-yellow-500 hover:text-yellow-300 duration-300'} />
            </span>
        </Tooltip>
    );
};
