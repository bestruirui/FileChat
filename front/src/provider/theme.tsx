"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { useSettingStore } from "@/stores/setting"

function ThemeColorUpdater() {
    const { resolvedTheme } = useTheme()

    React.useEffect(() => {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]')
        if (metaThemeColor) {
            metaThemeColor.setAttribute(
                'content',
                resolvedTheme === 'dark' ? '#413a2c' : '#eae9e3'
            )
        }
    }, [resolvedTheme])

    return null
}

/**
 * 同步 setting store 中的主题到 next-themes
 */
function ThemeSyncer() {
    const theme = useSettingStore((state) => state.settings.theme)
    const { setTheme } = useTheme()

    React.useEffect(() => {
        setTheme(theme)
    }, [theme, setTheme])

    return null
}

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider {...props}>
            <ThemeColorUpdater />
            <ThemeSyncer />
            {children}
        </NextThemesProvider>
    )
}