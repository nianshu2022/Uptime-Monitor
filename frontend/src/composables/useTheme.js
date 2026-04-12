import { ref } from 'vue';

export function useTheme(storageKey = 'theme') {
    const isDark = ref(true);

    const initTheme = () => {
        const saved = localStorage.getItem(storageKey);
        isDark.value = saved !== 'light';
        document.documentElement.classList.toggle('dark', isDark.value);
    };

    const toggleTheme = () => {
        isDark.value = !isDark.value;
        document.documentElement.classList.toggle('dark', isDark.value);
        localStorage.setItem(storageKey, isDark.value ? 'dark' : 'light');
    };

    // 立即初始化
    initTheme();

    return { isDark, toggleTheme, initTheme };
}
