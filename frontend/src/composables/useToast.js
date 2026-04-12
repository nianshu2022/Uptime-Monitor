import { ref } from 'vue';

const toasts = ref([]);
let toastId = 0;

export function useToast() {
    const addToast = (message, type = 'info') => {
        const id = ++toastId;
        toasts.value.push({ id, message, type });
        setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id);
        }, 3500);
    };

    return { toasts, addToast };
}
