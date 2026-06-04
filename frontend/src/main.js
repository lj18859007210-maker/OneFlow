import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import MyRequirements from './views/MyRequirements.vue'
import Detail from './views/Detail.vue'
import Approval from './views/Approval.vue'
import ProjectTimeline from './views/ProjectTimeline.vue'
import AuditLogs from './views/AuditLogs.vue'
import Login from './views/Login.vue'
import NotificationCenter from './views/NotificationCenter.vue'
import DeveloperManagement from './views/DeveloperManagement.vue'
import PermissionManagement from './views/PermissionManagement.vue'
import UserRoleManagement from './views/UserRoleManagement.vue'
import WorkflowManagement from './views/WorkflowManagement.vue'
import EmailSettings from './views/EmailSettings.vue'
import PlatformSettings from './views/PlatformSettings.vue'
import { hasPermission } from './utils/access'
import { clearStoredSession, refreshCurrentUserIfStale, getStoredCurrentUser } from './utils/session'

const routes = [
  { path: '/login', component: Login, meta: { requiresAuth: false } },
  { path: '/', component: Home, meta: { requiresAuth: true, permission: 'requirement:view' } },
  { path: '/my-requirements', component: MyRequirements, meta: { requiresAuth: true, permission: 'requirement:view' } },
  { path: '/detail/:id', component: Detail, meta: { requiresAuth: true, permission: 'requirement:view' } },
  { path: '/approval', component: Approval, meta: { requiresAuth: true, permission: 'requirement:approve' } },
  { path: '/timeline', component: ProjectTimeline, meta: { requiresAuth: true, permission: 'project:timeline:view' } },
  { path: '/notifications', component: NotificationCenter, meta: { requiresAuth: true, permission: 'notification:view' } },
  { path: '/developers', component: DeveloperManagement, meta: { requiresAuth: true, permission: 'developer:view' } },
  { path: '/audit-logs', component: AuditLogs, meta: { requiresAuth: true, permission: 'audit:view' } },
  { path: '/user-roles', component: UserRoleManagement, meta: { requiresAuth: true, permission: 'user:role:manage' } },
  { path: '/permissions', component: PermissionManagement, meta: { requiresAuth: true, permission: 'permission:manage' } },
  { path: '/workflow', component: WorkflowManagement, meta: { requiresAuth: true, permission: 'workflow:manage' } },
  { path: '/email-settings', component: EmailSettings, meta: { requiresAuth: true, permission: 'email:settings:manage' } },
  { path: '/platforms', component: PlatformSettings, meta: { requiresAuth: true, permission: 'platform:manage' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('token')
  const currentUser = getStoredCurrentUser()
  const hasSession = Boolean(token && currentUser)

  if (to.meta.requiresAuth !== false && !hasSession) {
    next('/login')
  } else if (to.path === '/login' && hasSession) {
    next('/')
  } else if (to.meta.permission && hasSession) {
    try {
      let refreshedUser = currentUser
      if (to.meta.requiresAuth !== false) {
        refreshedUser = await refreshCurrentUserIfStale()
      }
      if (!hasPermission(refreshedUser, to.meta.permission)) {
        next('/')
        return
      }
    } catch (error) {
      clearStoredSession()
      next('/login')
      return
    }
    next()
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
