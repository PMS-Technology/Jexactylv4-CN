import { Egg, searchEggs } from '@/api/routes/admin/egg';
import { Nest, searchNests } from '@/api/routes/admin/nest';
import Label from '@/elements/Label';
import Select from '@/elements/Select';
import { NameSelectProps } from '@admin/management/servers/presets/ServerPresetDialog';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const NestSelect = ({ form, update }: NameSelectProps) => {
    const { t } = useTranslation('admin');
    const [nests, setNests] = useState<Nest[] | null>(null);

    useEffect(() => {
        searchNests({})
            .then(setNests)
            .catch(error => console.error(error));
    }, []);

    return (
        <div>
            <Label>{t('servers.nest') as string}</Label>
            <Select
                value={form.nest_id?.toString() ?? ''}
                onChange={e => update('nest_id', e.target.value === 'none' ? null : Number(e.target.value))}
            >
                {!nests ? (
                    <option disabled>{t('servers.loading') as string}</option>
                ) : (
                    <>
                        <option key={'none'} value={'none'}>
                            {t('servers.none') as string}
                        </option>
                        {nests?.map(v => (
                            <option key={v.uuid} value={v.id.toString()}>
                                {v.name}
                            </option>
                        ))}
                    </>
                )}
            </Select>
            <p className={'text-xs text-gray-400'}>{t('servers.selectNestForPreset') as string}</p>
        </div>
    );
};

const EggSelect = ({ form, update }: NameSelectProps) => {
    const { t } = useTranslation('admin');
    const [eggs, setEggs] = useState<Egg[] | null>(null);

    useEffect(() => {
        if (!form.nest_id) return;

        searchEggs(form.nest_id, {})
            .then(setEggs)
            .catch(error => console.error(error));
    }, [form.nest_id]);

    useEffect(() => {
        if (form.nest_id === null) {
            setEggs([]);
            update('egg_id', null);
        }
    }, [form.nest_id]);

    return (
        <div>
            <Label>{t('servers.egg') as string}</Label>
            <Select
                value={form.egg_id?.toString() ?? ''}
                onChange={e => update('egg_id', Number(e.currentTarget.value))}
            >
                {!eggs ? (
                    <option disabled>{t('servers.loading') as string}</option>
                ) : (
                    eggs?.map(v => (
                        <option key={v.uuid} value={v.id.toString()}>
                            {v.name}
                        </option>
                    ))
                )}
            </Select>
            <p className={'text-xs text-gray-400'}>{t('servers.selectEggForPreset') as string}</p>
        </div>
    );
};

export default ({ form, update }: NameSelectProps) => (
    <div className="mb-8 space-y-2">
        <div className={'grid lg:grid-cols-2 gap-4'}>
            <NestSelect form={form} update={update} />
            <EggSelect form={form} update={update} />
        </div>
    </div>
);
