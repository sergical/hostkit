import { setThemeServerFn } from '@/lib/theme'
import { useRouter } from '@tanstack/react-router'
import {
  createContext,
  PropsWithChildren,
  use,
  useEffect,
  useState,
} from 'react'

export type Theme = 'light' | 'dark' | 'system'

type ThemeContextVal = { theme: Theme; setTheme: (val: Theme) => void }
type Props = PropsWithChildren<{ theme: Theme }>

const ThemeContext = createContext<ThemeContextVal | null>(null)

export function ThemeProvider({ children, theme: initialTheme }: Props) {
  const router = useRouter()
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const root = window.document.documentElement

    // Update theme class when theme changes
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        // Only update if we're still in system mode
        if (theme === 'system') {
          root.classList.remove('light', 'dark')
          const newSystemTheme = mediaQuery.matches ? 'dark' : 'light'
          root.classList.add(newSystemTheme)
        }
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  function setTheme(val: Theme) {
    setThemeState(val)
    setThemeServerFn({ data: val })
    router.invalidate()
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

export function useTheme() {
  const val = use(ThemeContext)
  if (!val) throw new Error('useTheme called outside of ThemeProvider!')
  return val
}
