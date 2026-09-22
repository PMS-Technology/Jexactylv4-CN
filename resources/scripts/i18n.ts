import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enServer from './locales/en/server.json';
import enActivity from './locales/en/activity.json';
import enAdmin from './locales/en/admin.json';
import zhCNCommon from './locales/zh_CN/common.json';
import zhCNAuth from './locales/zh_CN/auth.json';
import zhCNDashboard from './locales/zh_CN/dashboard.json';
import zhCNServer from './locales/zh_CN/server.json';
import zhCNActivity from './locales/zh_CN/activity.json';
import zhCNAdmin from './locales/zh_CN/admin.json';

function normalizeLanguage(language: string): string {
    return /^(?:zh|zh[-_](?:cn|hans))$/i.test(language) ? 'zh_CN' : language;
}

function getInitialLanguage(): string {
    const user = (window as any).PterodactylUser;
    if (user?.language) return normalizeLanguage(user.language);
    const settings = (window as any).SiteConfiguration;
    if (settings?.locale) return normalizeLanguage(settings.locale);
    return 'en';
}

i18n.use(initReactI18next)
    .init({
        resources: {
            en: {
                common: enCommon,
                auth: enAuth,
                dashboard: enDashboard,
                server: enServer,
                activity: enActivity,
                admin: enAdmin,
            },
            zh_CN: {
                common: zhCNCommon,
                auth: zhCNAuth,
                dashboard: zhCNDashboard,
                server: zhCNServer,
                activity: zhCNActivity,
                admin: zhCNAdmin,
            },
        },
        lng: getInitialLanguage(),
        fallbackLng: 'en',
        ns: ['common', 'auth', 'dashboard', 'server', 'activity', 'admin'],
        defaultNS: 'common',
        interpolation: {
            escapeValue: false,
        },
        returnNull: false,
        returnEmptyString: true,
    })
    .then(() => {
        document.documentElement.lang = i18n.language.replace(/_/g, '-');
    });

export default i18n;
