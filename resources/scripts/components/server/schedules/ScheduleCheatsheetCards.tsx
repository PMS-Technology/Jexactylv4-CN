import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';

export default () => {
    const { t } = useTranslation('server');
    return (
        <>
            <div css={tw`md:w-1/2 h-full bg-neutral-600`}>
                <div css={tw`flex flex-col`}>
                    <h2 css={tw`py-4 px-6 font-bold`}>{t('schedulesPage.examples') as string}</h2>
                    <div css={tw`flex py-4 px-6 bg-neutral-500`}>
                        <div css={tw`w-1/2`}>*/5 * * * *</div>
                        <div css={tw`w-1/2`}>{t('schedulesPage.every5Minutes') as string}</div>
                    </div>
                    <div css={tw`flex py-4 px-6`}>
                        <div css={tw`w-1/2`}>0 */1 * * *</div>
                        <div css={tw`w-1/2`}>{t('schedulesPage.everyHour') as string}</div>
                    </div>
                    <div css={tw`flex py-4 px-6 bg-neutral-500`}>
                        <div css={tw`w-1/2`}>0 8-12 * * *</div>
                        <div css={tw`w-1/2`}>{t('schedulesPage.hourRange') as string}</div>
                    </div>
                    <div css={tw`flex py-4 px-6`}>
                        <div css={tw`w-1/2`}>0 0 * * *</div>
                        <div css={tw`w-1/2`}>{t('schedulesPage.onceADay') as string}</div>
                    </div>
                    <div css={tw`flex py-4 px-6 bg-neutral-500`}>
                        <div css={tw`w-1/2`}>0 0 * * MON</div>
                        <div css={tw`w-1/2`}>{t('schedulesPage.everyMonday') as string}</div>
                    </div>
                </div>
            </div>
            <div css={tw`md:w-1/2 h-full bg-neutral-600`}>
                <h2 css={tw`py-4 px-6 font-bold`}>{t('schedulesPage.specialCharacters') as string}</h2>
                <div css={tw`flex flex-col`}>
                    <div css={tw`flex py-4 px-6 bg-neutral-500`}>
                        <div css={tw`w-1/2`}>*</div>
                        <div css={tw`w-1/2`}>{t('schedulesPage.anyValue') as string}</div>
                    </div>
                    <div css={tw`flex py-4 px-6`}>
                        <div css={tw`w-1/2`}>{','}</div>
                        <div css={tw`w-1/2`}>{t('schedulesPage.valueListSeparator') as string}</div>
                    </div>
                    <div css={tw`flex py-4 px-6 bg-neutral-500`}>
                        <div css={tw`w-1/2`}>-</div>
                        <div css={tw`w-1/2`}>{t('schedulesPage.rangeValues') as string}</div>
                    </div>
                    <div css={tw`flex py-4 px-6`}>
                        <div css={tw`w-1/2`}>/</div>
                        <div css={tw`w-1/2`}>{t('schedulesPage.stepValues') as string}</div>
                    </div>
                </div>
            </div>
        </>
    );
};
