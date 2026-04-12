import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// 全局样式
import './styles/base.css';

// Font Awesome
import '@fortawesome/fontawesome-free/css/all.min.css';

// Iconify Web Component
import 'iconify-icon';

const app = createApp(App);
app.use(router);
app.mount('#app');
