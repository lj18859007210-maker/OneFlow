<template>
  <router-view v-if="isLoginPage" />
  <div v-else class="tech-layout">
    <aside class="tech-sidebar">
      <div class="tech-logo-wrap">
        <div class="tech-logo-icon">
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="4"
              y="4"
              width="16"
              height="16"
              rx="3"
              fill="currentColor"
              opacity="0.9"
            />
            <rect
              x="24"
              y="4"
              width="16"
              height="16"
              rx="3"
              fill="currentColor"
              opacity="0.6"
            />
            <rect
              x="4"
              y="24"
              width="16"
              height="16"
              rx="3"
              fill="currentColor"
              opacity="0.75"
            />
            <rect
              x="24"
              y="24"
              width="16"
              height="16"
              rx="3"
              fill="currentColor"
              opacity="0.45"
            />
          </svg>
        </div>
        <div>
          <div class="tech-logo-text">需求一体化支撑平台</div>
          <div class="tech-logo-sub">One Flow</div>
        </div>
      </div>
      <nav class="tech-nav">
        <router-link to="/" class="tech-nav-item" active-class="active">
          <span class="tech-nav-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </span>
          <span>需求列表</span>
        </router-link>
        <router-link
          to="/my-requirements"
          class="tech-nav-item"
          active-class="active"
        >
          <span class="tech-nav-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span>我的需求</span>
        </router-link>
        <router-link to="/approval" class="tech-nav-item" active-class="active">
          <span class="tech-nav-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path
                d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
              />
            </svg>
          </span>
          <span>审批中心</span>
        </router-link>
        <router-link to="/timeline" class="tech-nav-item" active-class="active">
          <span class="tech-nav-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="14" x2="8" y2="18" />
              <line x1="12" y1="14" x2="12" y2="18" />
              <line x1="16" y1="14" x2="16" y2="18" />
            </svg>
          </span>
          <span>项目进度</span>
        </router-link>
        <router-link to="/notifications" class="tech-nav-item" active-class="active">
          <span class="tech-nav-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </span>
          <span>通知中心</span>
        </router-link>
        <router-link v-if="currentUser.role === 'admin'" to="/developers" class="tech-nav-item" active-class="active">
          <span class="tech-nav-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <span>人员管理</span>
        </router-link>
        <router-link v-if="currentUser.role === 'admin'" to="/permissions" class="tech-nav-item" active-class="active">
          <span class="tech-nav-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </span>
          <span>权限管理</span>
        </router-link>
      </nav>
    </aside>
    <main class="tech-main">
      <header class="tech-header">
        <div class="tech-header-title">{{ pageTitle }}</div>
        <div class="tech-header-actions">
          <NotificationBell />
          <div class="tech-header-user">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{{ currentUser.name }}</span>
          </div>
          <button
            class="tech-logout-btn"
            @click="handleLogout"
            title="退出登录"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>
      <div class="tech-content">
        <router-view />
      </div>
    </main>
    <AIChat v-if="!isLoginPage" />
  </div>
</template>

<script setup>
import { computed, provide, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "./api";
import AIChat from "./components/AIChat.vue";
import NotificationBell from "./components/NotificationBell.vue";

const route = useRoute();
const router = useRouter();

const isLoginPage = computed(() => route.path === "/login");

const currentUser = ref({ name: "未登录", email: "", role: "user" });

function syncCurrentUser() {
  const stored = localStorage.getItem("currentUser");
  currentUser.value = stored
    ? JSON.parse(stored)
    : { name: "未登录", email: "", role: "user" };
}
syncCurrentUser();

watch(() => route.path, syncCurrentUser);

onMounted(async () => {
  if (!isLoginPage.value && !localStorage.getItem("token")) {
    router.push("/login");
  }
});

provide("currentUser", currentUser);

function handleLogout() {
  localStorage.removeItem("currentUser");
  router.push("/login");
}

const pageTitle = computed(() => {
  const map = {
    "/": "需求列表",
    "/my-requirements": "我的需求",
    "/approval": "审批中心",
    "/timeline": "项目进度",
    "/notifications": "通知中心",
    "/developers": "开发人员管理",
    "/permissions": "权限管理",
  };
  if (route.path.startsWith("/detail")) return "需求详情";
  return map[route.path] || "需求管理平台";
});
</script>
