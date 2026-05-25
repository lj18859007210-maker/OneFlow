import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import MyRequirements from './views/MyRequirements.vue'
import Detail from './views/Detail.vue'
import Approval from './views/Approval.vue'
import ProjectTimeline from './views/ProjectTimeline.vue'
import Login from './views/Login.vue'
import NotificationCenter from './views/NotificationCenter.vue'
import DeveloperManagement from './views/DeveloperManagement.vue'
import PermissionManagement from './views/PermissionManagement.vue'

const routes = [
  { path: '/login', component: Login, meta: { requiresAuth: false } },
  { path: '/', component: Home, meta: { requiresAuth: true } },
  { path: '/my-requirements', component: MyRequirements, meta: { requiresAuth: true } },
  { path: '/detail/:id', component: Detail, meta: { requiresAuth: true } },
  { path: '/approval', component: Approval, meta: { requiresAuth: true } },
  { path: '/timeline', component: ProjectTimeline, meta: { requiresAuth: true } },
  { path: '/notifications', component: NotificationCenter, meta: { requiresAuth: true } },
  { path: '/developers', component: DeveloperManagement, meta: { requiresAuth: true } },
  { path: '/permissions', component: PermissionManagement, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const user = localStorage.getItem('currentUser')
  if (to.meta.requiresAuth !== false && !user) {
    next('/login')
  } else if (to.path === '/login' && user) {
    next('/')
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
