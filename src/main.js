import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import route from "./router"
import { createManager } from '@vue-youtube/core';

const app = createApp(App);

app.use(route)
app.use(createManager())
app.mount('#app');
