
import { createApp } from 'vue'
import 'virtual:uno.css'
import 'vant/lib/index.css'
import { Tabbar, TabbarItem, Button, Card, Tag, Icon } from 'vant'
import App from './App.vue'

const app = createApp(App)
// 注册常用组件
app.use(Tabbar).use(TabbarItem).use(Button).use(Card).use(Tag).use(Icon)
app.mount('#app')
