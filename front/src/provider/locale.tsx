'use client';

import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useSettingStore } from '@/stores/setting';

import zhMessages from '../../public/locale/zh.json';
import enMessages from '../../public/locale/en.json';

const messages: Record<string, typeof zhMessages> = {
    zh: zhMessages,
    en: enMessages,
};

export function LocaleProvider({ children }: { children: ReactNode }) {
    const locale = useSettingStore((state) => state.settings.language);

    return (
        <NextIntlClientProvider
            locale={locale}
            messages={messages[locale] || messages.zh}
            timeZone="Asia/Shanghai"
        >
            {children}
        </NextIntlClientProvider>
    );
}
