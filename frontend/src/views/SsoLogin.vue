<template>
  <main class="sso-page">
    <section class="sso-panel">
      <div class="sso-mark" aria-hidden="true"></div>
      <h1>正在自动登录</h1>
      <p>{{ message }}</p>
      <button v-if="failed" type="button" class="sso-btn" @click="goLogin">返回登录页</button>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api'
import { clearStoredSession, setStoredCurrentUser } from '../utils/session'

const route = useRoute()
const router = useRouter()
const message = ref('正在读取主平台登录态...')
const failed = ref(false)

function getQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return value || ''
}

function goLogin() {
  router.replace('/login')
}

onMounted(async () => {
  clearStoredSession()

  try {
    const payload = {
      jkToken: getQueryValue(route.query.jkToken),
      jkUsername: getQueryValue(route.query.jkUsername)
    }
    if (payload.jkToken || payload.jkUsername) {
      window.history.replaceState(window.history.state, '', '/sso')
    }

    const res = await authApi.sso(payload)
    if (res.data?.code !== 0 || !res.data?.data?.token || !res.data?.data?.user) {
      throw new Error(res.data?.message || '自动登录失败')
    }

    const { token, user } = res.data.data
    localStorage.setItem('token', token)
    setStoredCurrentUser({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions || []
    })
    message.value = '登录成功，正在进入平台...'
    router.replace('/')
  } catch (error) {
    failed.value = true
    message.value = error.response?.data?.message || error.message || '自动登录失败，请重新登录'
  }
})
</script>

<style scoped>
.sso-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #eef6fb;
  color: #18314f;
}

.sso-panel {
  width: min(420px, 100%);
  border: 1px solid #d7e4f0;
  border-radius: 8px;
  background: #fff;
  padding: 34px 28px;
  text-align: center;
  box-shadow: 0 18px 50px rgba(24, 49, 79, 0.12);
}

.sso-mark {
  width: 46px;
  height: 46px;
  margin: 0 auto 16px;
  border: 4px solid #d7e4f0;
  border-top-color: #2f75d1;
  border-radius: 50%;
  animation: sso-spin 0.9s linear infinite;
}

.sso-panel h1 {
  margin: 0;
  font-size: 22px;
  line-height: 1.4;
}

.sso-panel p {
  margin: 10px 0 0;
  color: #63758b;
  line-height: 1.7;
}

.sso-btn {
  margin-top: 22px;
  border: 0;
  border-radius: 6px;
  background: #2f75d1;
  color: #fff;
  padding: 10px 18px;
  cursor: pointer;
}

@keyframes sso-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
