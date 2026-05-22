import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useConfigStore } from './stores/config'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

const configStore = useConfigStore()
configStore.fetchConfig().then(() => {
  document.title = configStore.siteConfig.title
  app.mount('#app')
})
