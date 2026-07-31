import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ThemeColors {
  id: string;
  name: string;
  emoji: string;
  // 背景色系
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  borderColor: string;
  // 文字色系
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  // 强调色（macaron 系列）
  accentPink: string;
  accentRose: string;
  accentBlush: string;
  accentPeach: string;
  accentMint: string;
  accentLavender: string;
  // 统一版块主色（所有版块共用）
  themePrimary: string;
  themeSecondary: string;
  themeBg: string;
  themeAccent: string;
  themeLight: string;
  // 阴影
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
}

export const themes: ThemeColors[] = [
  {
    id: 'sakura',
    name: '樱花奶冻',
    emoji: '🌸',
    bgPrimary: '#FFF5F6', bgSecondary: '#FFFBFC', bgCard: '#FFFFFF',
    borderColor: '#F8E8EC',
    textPrimary: '#5C4A50', textSecondary: '#A08890', textTertiary: '#C8B4BA',
    accentPink: '#FADADD', accentRose: '#F7C2CC', accentBlush: '#FCE4EC',
    accentPeach: '#FDE4CF', accentMint: '#C5EAD9', accentLavender: '#E8DCF0',
    themePrimary: '#FADADD', themeSecondary: '#FCE4EC', themeBg: '#FFF5F6',
    themeAccent: '#E8A0B0', themeLight: '#FFEEF1',
    shadowSm: '0 1px 3px rgba(200,160,170,0.06)',
    shadowMd: '0 4px 12px rgba(200,160,170,0.08)',
    shadowLg: '0 8px 24px rgba(200,160,170,0.12)',
  },
  {
    id: 'cream',
    name: '奶油拿铁',
    emoji: '🥛',
    bgPrimary: '#FFFBF5', bgSecondary: '#FFFEFA', bgCard: '#FFFFFF',
    borderColor: '#F2EBE0',
    textPrimary: '#5C5040', textSecondary: '#9B8E7A', textTertiary: '#C4B8A5',
    accentPink: '#F0D8D0', accentRose: '#E8C8B8', accentBlush: '#F8ECE5',
    accentPeach: '#FAE4CC', accentMint: '#D0E0D0', accentLavender: '#E4DCF0',
    themePrimary: '#F0D8C8', themeSecondary: '#F8ECE5', themeBg: '#FFFBF5',
    themeAccent: '#D4A88C', themeLight: '#FDF3EB',
    shadowSm: '0 1px 3px rgba(160,140,110,0.05)',
    shadowMd: '0 4px 12px rgba(160,140,110,0.07)',
    shadowLg: '0 8px 24px rgba(160,140,110,0.10)',
  },
  {
    id: 'matcha',
    name: '抹茶奶盖',
    emoji: '🍵',
    bgPrimary: '#F6FAF5', bgSecondary: '#FCFEFB', bgCard: '#FFFFFF',
    borderColor: '#E8F0E4',
    textPrimary: '#455840', textSecondary: '#7A9070', textTertiary: '#A8BFA0',
    accentPink: '#F0D0D8', accentRose: '#E8C0C8', accentBlush: '#F5E8EC',
    accentPeach: '#F5E4D0', accentMint: '#C8E8D0', accentLavender: '#E0D8F0',
    themePrimary: '#C8E0CC', themeSecondary: '#E4F4E8', themeBg: '#F6FAF5',
    themeAccent: '#80B088', themeLight: '#EDF7EF',
    shadowSm: '0 1px 3px rgba(100,120,90,0.05)',
    shadowMd: '0 4px 12px rgba(100,120,90,0.07)',
    shadowLg: '0 8px 24px rgba(100,120,90,0.10)',
  },
  {
    id: 'milky-purple',
    name: '芋泥啵啵',
    emoji: '🍠',
    bgPrimary: '#F8F5FA', bgSecondary: '#FDFBFE', bgCard: '#FFFFFF',
    borderColor: '#F0E8F4',
    textPrimary: '#504860', textSecondary: '#8A7C9B', textTertiary: '#B8AEC4',
    accentPink: '#E8D8F0', accentRose: '#E0C8E8', accentBlush: '#F2E8F6',
    accentPeach: '#F0E0D8', accentMint: '#D0E4D8', accentLavender: '#DED4F0',
    themePrimary: '#E0D4F0', themeSecondary: '#F0E8F6', themeBg: '#F8F5FA',
    themeAccent: '#B098C8', themeLight: '#F5EFFA',
    shadowSm: '0 1px 3px rgba(120,100,150,0.05)',
    shadowMd: '0 4px 12px rgba(120,100,150,0.07)',
    shadowLg: '0 8px 24px rgba(120,100,150,0.10)',
  },
  {
    id: 'milk-tea',
    name: '奶茶啵啵',
    emoji: '🧋',
    bgPrimary: '#FFF9F4', bgSecondary: '#FFFDFA', bgCard: '#FFFFFF',
    borderColor: '#F2E8DC',
    textPrimary: '#5C4838', textSecondary: '#9B8670', textTertiary: '#C4B09A',
    accentPink: '#F0D4C8', accentRose: '#E8C4B4', accentBlush: '#F8EAE0',
    accentPeach: '#F8DCC4', accentMint: '#D0DCD0', accentLavender: '#E4D8EC',
    themePrimary: '#E8D4C0', themeSecondary: '#F4E8DC', themeBg: '#FFF9F4',
    themeAccent: '#C49A78', themeLight: '#FCF2E8',
    shadowSm: '0 1px 3px rgba(150,120,90,0.05)',
    shadowMd: '0 4px 12px rgba(150,120,90,0.07)',
    shadowLg: '0 8px 24px rgba(150,120,90,0.10)',
  },
  {
    id: 'blueberry',
    name: '蓝莓奶昔',
    emoji: '🫐',
    bgPrimary: '#F5F6FB', bgSecondary: '#FBFCFE', bgCard: '#FFFFFF',
    borderColor: '#E8EAF4',
    textPrimary: '#404860', textSecondary: '#7A809B', textTertiary: '#AEB4C4',
    accentPink: '#E0D8EC', accentRose: '#D8CCE4', accentBlush: '#F0EAF6',
    accentPeach: '#F0E4D8', accentMint: '#D0DCE4', accentLavender: '#DCDCF0',
    themePrimary: '#D4D8EC', themeSecondary: '#E8EAF6', themeBg: '#F5F6FB',
    themeAccent: '#8898C0', themeLight: '#EEF0F8',
    shadowSm: '0 1px 3px rgba(80,90,130,0.05)',
    shadowMd: '0 4px 12px rgba(80,90,130,0.07)',
    shadowLg: '0 8px 24px rgba(80,90,130,0.10)',
  },
];

interface ThemeContextType {
  theme: ThemeColors;
  setThemeId: (id: string) => void;
  allThemes: ThemeColors[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes[0],
  setThemeId: () => {},
  allThemes: themes,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(() => {
    try { return localStorage.getItem('workbench_theme') || 'sakura'; }
    catch { return 'sakura'; }
  });

  const theme = themes.find(t => t.id === themeId) || themes[0];

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    try { localStorage.setItem('workbench_theme', id); } catch {}
  }, []);

  // 应用所有 CSS 变量到 document
  useEffect(() => {
    const root = document.documentElement;

    // 背景
    root.style.setProperty('--bg-primary', theme.bgPrimary);
    root.style.setProperty('--bg-secondary', theme.bgSecondary);
    root.style.setProperty('--bg-card', theme.bgCard);
    root.style.setProperty('--border-color', theme.borderColor);

    // 文字
    root.style.setProperty('--text-primary', theme.textPrimary);
    root.style.setProperty('--text-secondary', theme.textSecondary);
    root.style.setProperty('--text-tertiary', theme.textTertiary);

    // macaron 系列
    root.style.setProperty('--macaron-pink', theme.accentPink);
    root.style.setProperty('--macaron-rose', theme.accentRose);
    root.style.setProperty('--macaron-blush', theme.accentBlush);
    root.style.setProperty('--macaron-peach', theme.accentPeach);
    root.style.setProperty('--macaron-mint', theme.accentMint);
    root.style.setProperty('--macaron-lavender', theme.accentLavender);

    // 统一版块色（所有版块共用）
    root.style.setProperty('--theme-primary', theme.themePrimary);
    root.style.setProperty('--theme-secondary', theme.themeSecondary);
    root.style.setProperty('--theme-bg', theme.themeBg);
    root.style.setProperty('--theme-accent', theme.themeAccent);
    root.style.setProperty('--theme-light', theme.themeLight);

    // 兼容旧变量名
    root.style.setProperty('--theme-fund-primary', theme.themePrimary);
    root.style.setProperty('--theme-fund-secondary', theme.themeSecondary);
    root.style.setProperty('--theme-fund-bg', theme.themeBg);
    root.style.setProperty('--theme-fund-accent', theme.themeAccent);
    root.style.setProperty('--theme-fund-light', theme.themeLight);

    root.style.setProperty('--theme-exam-primary', theme.themePrimary);
    root.style.setProperty('--theme-exam-secondary', theme.themeSecondary);
    root.style.setProperty('--theme-exam-bg', theme.themeBg);
    root.style.setProperty('--theme-exam-accent', theme.themeAccent);
    root.style.setProperty('--theme-exam-light', theme.themeLight);

    root.style.setProperty('--theme-resume-primary', theme.themePrimary);
    root.style.setProperty('--theme-resume-secondary', theme.themeSecondary);
    root.style.setProperty('--theme-resume-bg', theme.themeBg);
    root.style.setProperty('--theme-resume-accent', theme.themeAccent);
    root.style.setProperty('--theme-resume-light', theme.themeLight);

    root.style.setProperty('--theme-job-primary', theme.themePrimary);
    root.style.setProperty('--theme-job-secondary', theme.themeSecondary);
    root.style.setProperty('--theme-job-bg', theme.themeBg);
    root.style.setProperty('--theme-job-accent', theme.themeAccent);
    root.style.setProperty('--theme-job-light', theme.themeLight);

    // 阴影
    root.style.setProperty('--shadow-sm', theme.shadowSm);
    root.style.setProperty('--shadow-md', theme.shadowMd);
    root.style.setProperty('--shadow-lg', theme.shadowLg);

    // 涨跌色适配
    root.style.setProperty('--color-profit', theme.themeAccent);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, allThemes: themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
