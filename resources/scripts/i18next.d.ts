import 'i18next';

import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import dashboardEn from './locales/en/dashboard.json';
import serverEn from './locales/en/server.json';
import activityEn from './locales/en/activity.json';
import adminEn from './locales/en/admin.json';

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'common';
        resources: {
            common: typeof commonEn;
            auth: typeof authEn;
            dashboard: typeof dashboardEn;
            server: typeof serverEn;
            activity: typeof activityEn;
            admin: typeof adminEn;
        };
        returnNull: false;
    }
}
