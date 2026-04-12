import { ref, computed } from 'vue';

const storedPassword = ref(sessionStorage.getItem('uptime_admin_password') || '');
const isAuthenticated = computed(() => !!storedPassword.value && storedPassword.value.length > 0);

export function useAuth() {
    const inputPassword = ref('');

    const login = (onSuccess) => {
        if (!inputPassword.value) return;
        storedPassword.value = inputPassword.value;
        sessionStorage.setItem('uptime_admin_password', inputPassword.value);
        onSuccess?.();
    };

    const logout = () => {
        sessionStorage.removeItem('uptime_admin_password');
        storedPassword.value = '';
        window.location.href = '/';
    };

    return {
        inputPassword,
        storedPassword,
        isAuthenticated,
        login,
        logout,
    };
}
