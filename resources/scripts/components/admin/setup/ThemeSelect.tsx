import { updateColors } from '@/api/routes/admin/theme';
import useStatus from '@/plugins/useStatus';
import { useStoreActions, useStoreState } from '@/state/hooks';
import AdminBox from '@/elements/AdminBox';
import { faCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CheckCircleIcon } from '@heroicons/react/outline';
import { useTranslation } from 'react-i18next';

const colorOptions = [
    { hex: '#16a34a', name: 'jexpanelGreen' },
    { hex: '#12aaaa', name: 'microsoftTeal' },
    { hex: '#ff0000', name: 'brickRed' },
    { hex: '#9D00FF', name: 'irisPurple' },
    { hex: '#FFA500', name: 'orangeOrange' },
    { hex: '#32559f', name: 'pteroBlue' },
    { hex: '#ff99c8', name: 'prettyPink' },
    { hex: '#5e6472', name: 'plainGrey' },
] as const;

export default ({ defaultColor }: { defaultColor: string }) => {
    const { t } = useTranslation('admin');
    const { status, setStatus } = useStatus();
    const theme = useStoreState(state => state.theme.data!);
    const setTheme = useStoreActions(actions => actions.theme.setTheme);

    const changeColor = (hex: string) => {
        setStatus('loading');

        updateColors('primary', hex).then(() => {
            setStatus('success');
            setTheme({
                ...theme,
                colors: {
                    ...theme.colors,
                    primary: hex,
                },
            });
        });
    };

    return (
        <div>
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>
                        {t('setup.themePreferences')}
                    </h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('setup.themePreferencesDescription')}
                    </p>
                </div>
            </div>
            <AdminBox status={status} title={t('setup.setPrimaryColor') as string}>
                <div className={'grid grid-cols-4 lg:grid-cols-8 gap-4 lg:gap-8'}>
                    {colorOptions.map(option => (
                        <div
                            className={'text-center relative'}
                            key={option.hex}
                            onClick={() => changeColor(option.hex)}
                        >
                            <FontAwesomeIcon
                                icon={faCircle}
                                style={{ color: option.hex }}
                                size={'3x'}
                                className={'hover:brightness-125 transition duration-300'}
                            />
                            {defaultColor === option.hex && (
                                <div className={'absolute top-[10px] right-[27px]'}>
                                    <CheckCircleIcon className={'w-7'} />
                                </div>
                            )}
                            <p className={'italic text-xs mt-1 text-gray-400'}>{t(`setup.colors.${option.name}`)}</p>
                        </div>
                    ))}
                </div>
            </AdminBox>
            <p className={'text-gray-400 mt-2 text-right'}>{t('setup.selectColorDescription')}</p>
        </div>
    );
};
