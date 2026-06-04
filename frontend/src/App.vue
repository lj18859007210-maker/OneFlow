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
        <router-link v-if="hasPermission(currentUser, 'requirement:view')" to="/" class="tech-nav-item" active-class="active">
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
          v-if="hasPermission(currentUser, 'requirement:view')"
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
        <router-link v-if="hasPermission(currentUser, 'requirement:approve')" to="/approval" class="tech-nav-item" active-class="active">
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
        <router-link v-if="hasPermission(currentUser, 'project:timeline:view')" to="/timeline" class="tech-nav-item" active-class="active">
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
        <router-link v-if="hasPermission(currentUser, 'notification:view')" to="/notifications" class="tech-nav-item" active-class="active">
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
        <router-link v-if="hasPermission(currentUser, 'audit:view')" to="/audit-logs" class="tech-nav-item" active-class="active">
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
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <span>审计日志</span>
        </router-link>
        <router-link v-if="hasPermission(currentUser, 'developer:view')" to="/developers" class="tech-nav-item" active-class="active">
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
        <router-link v-if="hasPermission(currentUser, 'permission:manage')" to="/permissions" class="tech-nav-item" active-class="active">
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
        <router-link v-if="hasPermission(currentUser, 'user:role:manage')" to="/user-roles" class="tech-nav-item" active-class="active">
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6" />
              <path d="M23 11h-6" />
            </svg>
          </span>
          <span>用户角色管理</span>
        </router-link>
        <router-link v-if="hasPermission(currentUser, 'workflow:manage')" to="/workflow" class="tech-nav-item" active-class="active">
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
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </span>
          <span>流程配置</span>
        </router-link>
        <router-link v-if="hasPermission(currentUser, 'platform:manage')" to="/platforms" class="tech-nav-item" active-class="active">
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
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M7 8h10" />
              <path d="M7 12h6" />
              <path d="M7 16h8" />
            </svg>
          </span>
          <span>平台配置</span>
        </router-link>
        <router-link v-if="hasPermission(currentUser, 'email:settings:manage')" to="/email-settings" class="tech-nav-item" active-class="active">
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </span>
          <span>邮件设置</span>
        </router-link>
      </nav>
    </aside>
    <main class="tech-main">
      <header class="tech-header">
        <div class="tech-header-title">{{ pageTitle }}</div>
        <div class="tech-header-actions">
          <NotificationBell />
          <button
            class="tech-header-user"
            type="button"
            title="修改邮箱"
            @click="openEmailDialog"
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span class="tech-user-name">{{ currentUser.name }}</span>
            <span class="tech-user-meta">{{ currentRoleLabel }} | {{ permissionCount }}项权限</span>
          </button>
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
    <div v-if="showEmailDialog" class="tech-dialog-overlay" @click="closeEmailDialog">
      <form class="tech-dialog profile-email-dialog" @submit.prevent="saveEmail" @click.stop>
        <div class="tech-dialog-header">
          <div class="tech-dialog-title">修改邮箱</div>
          <button class="tech-dialog-close" type="button" @click="closeEmailDialog">×</button>
        </div>
        <div class="tech-dialog-body profile-email-body">
          <label class="profile-email-field">
            <span>邮箱地址</span>
            <input
              v-model.trim="emailDraft"
              class="profile-email-input"
              type="email"
              placeholder="name@example.com"
              autocomplete="email"
              :disabled="savingEmail"
            />
          </label>
          <p v-if="emailError" class="profile-email-error">{{ emailError }}</p>
        </div>
        <div class="tech-dialog-footer">
          <button class="tech-btn tech-btn-outline tech-btn-sm" type="button" :disabled="savingEmail" @click="closeEmailDialog">
            取消
          </button>
          <button class="tech-btn tech-btn-primary tech-btn-sm" type="submit" :disabled="savingEmail">
            {{ savingEmail ? "保存中..." : "保存" }}
          </button>
        </div>
      </form>
    </div>
    <TechToast
      :visible="toastState.visible.value"
      :message="toastState.message.value"
      :type="toastState.type.value"
      :title="toastState.title.value"
    />
  </div>
</template>

<script setup>
import { computed, provide, ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authApi } from "./api";
import AIChat from "./components/AIChat.vue";
import NotificationBell from "./components/NotificationBell.vue";
import TechToast from "./components/TechToast.vue";
import { hasPermission } from "./utils/access";
import { setStoredCurrentUser } from "./utils/session";
import { validateEmail } from "./utils/security";
import { showToast, toastState } from "./utils/toastService";

const route = useRoute();
const router = useRouter();

const isLoginPage = computed(() => route.path === "/login");

const currentUser = ref({ name: "未登录", email: "", role: "user", permissions: [] });
const showEmailDialog = ref(false);
const emailDraft = ref("");
const emailError = ref("");
const savingEmail = ref(false);
const roleLabelMap = {
  admin: "管理员",
  user: "普通用户",
  developer: "开发人员",
  "role-admin": "管理员",
  "role-user": "普通用户",
  "role-developer": "开发人员"
};

function getDefaultUser() {
  return { name: "未登录", email: "", role: "user", permissions: [] };
}

function parseCurrentUser(stored) {
  if (!stored) return getDefaultUser();

  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object") {
      return {
        ...getDefaultUser(),
        ...parsed,
      };
    }
  } catch (error) {
    console.warn("Invalid currentUser in localStorage, resetting.", error);
  }

  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  return getDefaultUser();
}

function syncCurrentUser() {
  const stored = localStorage.getItem("currentUser");
  currentUser.value = parseCurrentUser(stored);
}
syncCurrentUser();

watch(() => route.path, syncCurrentUser);

function handleCurrentUserUpdated() {
  syncCurrentUser();
}

onMounted(async () => {
  if (!isLoginPage.value && !localStorage.getItem("token")) {
    router.push("/login");
    return;
  }
  window.addEventListener('current-user-updated', handleCurrentUserUpdated);
});

onBeforeUnmount(() => {
  window.removeEventListener('current-user-updated', handleCurrentUserUpdated);
});

provide("currentUser", currentUser);

function handleLogout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  router.push("/login");
}

function openEmailDialog() {
  if (!currentUser.value?.id) return;
  emailDraft.value = currentUser.value.email || "";
  emailError.value = "";
  showEmailDialog.value = true;
}

function closeEmailDialog() {
  if (savingEmail.value) return;
  showEmailDialog.value = false;
  emailError.value = "";
}

async function saveEmail() {
  const nextEmail = emailDraft.value.trim();
  if (!nextEmail) {
    emailError.value = "请输入邮箱地址";
    return;
  }
  if (!validateEmail(nextEmail)) {
    emailError.value = "请输入有效的邮箱地址";
    return;
  }

  try {
    savingEmail.value = true;
    emailError.value = "";
    const res = await authApi.updateEmail(nextEmail);
    if (!res.data?.success) {
      throw new Error(res.data?.message || "邮箱更新失败");
    }
    const updatedUser = {
      ...res.data.data,
      permissions: res.data.data?.permissions || []
    };
    setStoredCurrentUser(updatedUser);
    showEmailDialog.value = false;
    showToast("邮箱已更新", { type: "success", title: "更新成功" });
  } catch (error) {
    emailError.value = error.response?.data?.message || error.message || "邮箱更新失败";
  } finally {
    savingEmail.value = false;
  }
}

const pageTitle = computed(() => {
  const map = {
    "/": "需求列表",
    "/my-requirements": "我的需求",
    "/approval": "审批中心",
    "/timeline": "项目进度",
    "/notifications": "通知中心",
    "/audit-logs": "审计日志",
    "/developers": "开发人员管理",
    "/permissions": "权限管理",
    "/user-roles": "用户角色管理",
    "/workflow": "流程配置",
    "/email-settings": "邮件设置",
    "/platforms": "平台配置",
  };
  if (route.path.startsWith("/detail")) return "需求详情";
  return map[route.path] || "需求管理平台";
});

const currentRoleLabel = computed(() => roleLabelMap[currentUser.value?.role] || String(currentUser.value?.role || "未知角色"));
const permissionCount = computed(() => Array.isArray(currentUser.value?.permissions) ? currentUser.value.permissions.length : 0);
</script>

<style scoped>
.tech-user-meta {
  margin-left: 8px;
  font-size: 12px;
  color: var(--tech-text-secondary);
}

.tech-header-user {
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
}

.tech-header-user:hover {
  border-color: rgba(74, 144, 226, 0.24);
  background: rgba(74, 144, 226, 0.14);
  box-shadow: 0 8px 22px rgba(74, 144, 226, 0.12);
}

.tech-user-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-email-dialog {
  width: 460px;
}

.profile-email-body {
  padding-bottom: 10px;
}

.profile-email-field {
  display: grid;
  gap: 10px;
  color: var(--tech-text);
  font-size: 14px;
  font-weight: 600;
}

.profile-email-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 14px;
  border: 2px solid var(--tech-border);
  border-radius: 8px;
  background: var(--tech-card);
  color: var(--tech-text);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.profile-email-input:focus {
  border-color: var(--tech-blue);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
}

.profile-email-error {
  margin: 10px 0 0;
  color: var(--tech-danger);
  font-size: 13px;
}
</style>

