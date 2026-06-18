import tw from 'twin.macro';
import { Field as FormikField } from 'formik';
import { useTranslation } from 'react-i18next';
import Label from '@/elements/Label';

interface Props {
    id: string;
    name: string;
}

export default ({ id, name }: Props) => {
    const { t } = useTranslation('admin');

    return (
        <div css={tw`mb-3 bg-zinc-900 rounded-lg p-3`}>
            <Label htmlFor={`permissions.${id}`}>{name}</Label>
            <div className={'space-x-6'}>
                <label css={tw`inline-flex items-center mr-2`}>
                    <FormikField id={id} name={`permissions.${id}`} type={'radio'} value={'0'} />
                    <span css={tw`text-neutral-300 ml-2`}>{t('api.noAccess') as string}</span>
                </label>

                <label css={tw`inline-flex items-center ml-2`}>
                    <FormikField id={id} name={`permissions.${id}`} type={'radio'} value={'1'} />
                    <span css={tw`text-neutral-300 ml-2`}>{t('api.readOnly') as string}</span>
                </label>

                <label css={tw`inline-flex items-center ml-2`}>
                    <FormikField id={id} name={`permissions.${id}`} type={'radio'} value={'2'} />
                    <span css={tw`text-neutral-300 ml-2`}>{t('api.readWrite') as string}</span>
                </label>
            </div>
        </div>
    );
};
