<template>
  <div class="login-page">
    <section class="login-intro" aria-label="平台介绍">
      <div class="brand-row">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="7" width="14" height="14" rx="3" fill="currentColor" opacity="0.95" />
            <rect x="28" y="7" width="14" height="14" rx="3" fill="currentColor" opacity="0.58" />
            <rect x="6" y="29" width="14" height="14" rx="3" fill="currentColor" opacity="0.72" />
            <rect x="28" y="29" width="14" height="14" rx="3" fill="currentColor" opacity="0.44" />
          </svg>
        </div>
        <div>
          <div class="brand-name">需求一体化支撑平台</div>
          <div class="brand-subtitle">ONE FLOW</div>
        </div>
      </div>

      <div class="intro-copy">
        <h1>统一登录后进入<br />需求流转工作台</h1>
        <p>
          系统聚合需求列表、审批中心、项目进度、人员管理、通知与审计日志。
          本次新增本地图形验证码，强化登录入口防护。
        </p>
      </div>

      <div class="module-panel">
        <h2>登录后可访问的核心模块</h2>
        <div class="module-grid">
          <div
            v-for="module in modules"
            :key="module.title"
            class="module-item"
            :style="{ '--module-color': module.color }"
          >
            <span class="module-dot"></span>
            <div>
              <strong>{{ module.title }}</strong>
              <span>{{ module.desc }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="login-shell" aria-label="登录表单">
      <form class="login-card" @submit.prevent="handleLogin">
        <div class="login-card-bar"></div>
        <div class="card-status">
          <span>账号登录</span>
          <span class="captcha-state">本地验证</span>
        </div>

        <h2>登录 One Flow</h2>
        <p class="card-copy">请输入账号、密码和图形验证码。</p>

        <label class="field">
          <span class="field-label">账号</span>
          <span class="input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <input
              v-model.trim="username"
              type="text"
              placeholder="请输入账号"
              autocomplete="username"
              required
            />
          </span>
        </label>

        <label class="field">
          <span class="field-label">密码</span>
          <span class="input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V8a5 5 0 0 1 10 0v3" />
            </svg>
            <input
              v-model="password"
              type="password"
              placeholder="请输入密码"
              autocomplete="current-password"
              required
            />
          </span>
        </label>

        <div class="field">
          <div class="captcha-label-row">
            <span class="field-label">验证码</span>
            <button class="captcha-text-btn" type="button" @click="loadCaptcha" :disabled="captchaLoading">
              点击图片刷新
            </button>
          </div>
          <div class="captcha-row">
            <input
              v-model.trim="captchaCode"
              class="captcha-input"
              type="text"
              placeholder="输入验证码"
              autocomplete="off"
              maxlength="8"
              required
            />
            <button
              class="captcha-image-btn"
              type="button"
              title="刷新验证码"
              @click="loadCaptcha"
              :disabled="captchaLoading"
            >
              <span v-if="captchaSvg" v-html="captchaSvg"></span>
              <span v-else class="captcha-placeholder">{{ captchaLoading ? '加载中' : '刷新' }}</span>
            </button>
            <button
              class="captcha-refresh-btn"
              type="button"
              title="刷新验证码"
              @click="loadCaptcha"
              :disabled="captchaLoading"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 0 1-15.3 6.4" />
                <path d="M3 12A9 9 0 0 1 18.3 5.6" />
                <path d="M3 18v-6h6" />
                <path d="M21 6v6h-6" />
              </svg>
            </button>
          </div>
          <p class="captcha-hint">验证码 60 秒有效，登录后立即失效。</p>
        </div>

        <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>

        <button type="submit" class="login-btn" :disabled="loading || captchaLoading">
          {{ ssoChecking ? "正在统一登录..." : loading ? "登录中..." : "登 录" }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authApi } from "../api";
import { clearStoredSession, setStoredCurrentUser } from "../utils/session";

const route = useRoute();
const router = useRouter();
const username = ref("");
const password = ref("");
const captchaCode = ref("");
const captchaId = ref("");
const captchaSvg = ref("");
const loading = ref(false);
const captchaLoading = ref(false);
const errorMsg = ref("");
const ssoChecking = ref(false);

const modules = [
  { title: "需求列表", desc: "提交、跟踪、查看需求", color: "#2f75d1" },
  { title: "审批中心", desc: "处理待审与驳回", color: "#22a66b" },
  { title: "项目进度", desc: "甘特与节点跟踪", color: "#d99a2b" },
  { title: "通知中心", desc: "未读提醒与邮件", color: "#19afc2" },
  { title: "审计日志", desc: "登录与操作留痕", color: "#1e4d86" },
  { title: "权限配置", desc: "角色与访问控制", color: "#5968c9" },
];

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function encryptPasswordByPublicKey(plainText, publicKeyPem) {
  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    new TextEncoder().encode(plainText),
  );
  return arrayBufferToBase64(encrypted);
}

async function loadCaptcha() {
  if (captchaLoading.value) {
    return;
  }

  captchaLoading.value = true;
  try {
    const res = await authApi.getCaptcha();
    if (res.data?.code !== 0) {
      throw new Error(res.data?.data || "验证码获取失败");
    }
    captchaId.value = res.data.data.id;
    captchaSvg.value = res.data.data.svg;
    captchaCode.value = "";
  } catch (error) {
    captchaId.value = "";
    captchaSvg.value = "";
    errorMsg.value = error.message || "验证码获取失败，请刷新页面重试";
  } finally {
    captchaLoading.value = false;
  }
}

function storeLoginSession(user, token) {
  localStorage.setItem("token", token);
  setStoredCurrentUser({
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
  });
}

function getQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
}

function getCookieValue(name) {
  const prefix = `${name}=`;
  const cookies = (document.cookie || "").split(";");
  for (const cookie of cookies) {
    const item = cookie.trim();
    if (item.startsWith(prefix)) {
      const value = item.slice(prefix.length);
      try {
        return decodeURIComponent(value);
      } catch (error) {
        return value;
      }
    }
  }
  return "";
}

function getSsoPayloadFromRoute() {
  const params = new URLSearchParams(window.location.search || "");
  return {
    jkToken:
      getQueryValue(route.query.jkToken) ||
      params.get("jkToken") ||
      params.get("token") ||
      getCookieValue("token") ||
      "",
    jkUsername:
      getQueryValue(route.query.jkUsername) ||
      params.get("jkUsername") ||
      params.get("username") ||
      getCookieValue("username") ||
      "",
    forceSso: getQueryValue(route.query.forceSso) || params.get("forceSso") || "",
    manualLogout: getQueryValue(route.query.manualLogout) || params.get("manualLogout") || "",
  };
}

function stripSsoQueryFromLoginUrl(payload) {
  if (payload.jkToken || payload.jkUsername || payload.forceSso || payload.manualLogout) {
    window.history.replaceState(window.history.state, "", "/login");
  }
}

async function trySsoLogin() {
  try {
    const payload = getSsoPayloadFromRoute();
    if (payload.manualLogout === "1") {
      clearStoredSession();
      stripSsoQueryFromLoginUrl(payload);
      return false;
    }

    ssoChecking.value = true;
    clearStoredSession();
    stripSsoQueryFromLoginUrl(payload);

    const res = await authApi.sso(payload);
    const data = res.data?.data;
    if (res.data?.code === 0 && data?.token && data?.user) {
      storeLoginSession(data.user, data.token);
      router.replace("/");
      return true;
    }
  } catch (error) {
    // 主平台登录态不可用时，保留账号密码登录入口。
  } finally {
    ssoChecking.value = false;
  }

  return false;
}

async function handleLogin() {
  if (!captchaId.value || !captchaCode.value) {
    errorMsg.value = "请输入验证码";
    return;
  }

  loading.value = true;
  errorMsg.value = "";
  try {
    const keyRes = await authApi.getPublicKey();
    if (keyRes.data.code !== 0) {
      errorMsg.value = "获取加密密钥失败";
      return;
    }
    const encryptedPassword = await encryptPasswordByPublicKey(password.value, keyRes.data.data);

    const res = await authApi.login(
      username.value,
      encryptedPassword,
      captchaId.value,
      captchaCode.value,
    );

    if (res.data.code === 0) {
      const { user, token } = res.data.data;
      storeLoginSession(user, token);
      router.push("/");
    } else {
      errorMsg.value = res.data.data || "登录失败";
      await loadCaptcha();
    }
  } catch (error) {
    errorMsg.value =
      error.response?.data?.data ||
      error.response?.data?.message ||
      error.message ||
      "登录失败，请稍后重试";
    await loadCaptcha();
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const loggedIn = await trySsoLogin();
  if (!loggedIn) {
    await loadCaptcha();
  }
});
</script>

<style scoped>
.login-page {
  --login-ink: #18314f;
  --login-muted: #63758b;
  --login-line: #d7e4f0;
  --login-blue: #2f75d1;
  --login-blue-dark: #1e4d86;
  --login-cyan: #19afc2;
  --login-green: #22a66b;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 560px;
  gap: 56px;
  padding: 64px clamp(34px, 6vw, 130px);
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(105deg, #e8f4fa 0%, #f6fafd 53%, #fbfdff 100%),
    #f6fafd;
  color: var(--login-ink);
}

.login-page::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(60, 105, 155, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(60, 105, 155, 0.08) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.52), rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.42));
  pointer-events: none;
}

.login-page::after {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 60%;
  background: linear-gradient(100deg, rgba(232, 244, 250, 0.88), rgba(246, 250, 253, 0.48));
  clip-path: polygon(0 0, 100% 0, 86% 100%, 0 100%);
  pointer-events: none;
}

.login-intro,
.login-shell {
  position: relative;
  z-index: 1;
}

.login-intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 22px;
}

.brand-mark {
  width: 58px;
  height: 58px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, #245da7 0%, var(--login-cyan) 100%);
  box-shadow: 0 18px 36px rgba(47, 117, 209, 0.24);
}

.brand-mark svg {
  width: 38px;
  height: 38px;
}

.brand-name {
  font-size: 24px;
  line-height: 1.2;
  font-weight: 800;
}

.brand-subtitle {
  margin-top: 5px;
  color: var(--login-muted);
  font-size: 13px;
  letter-spacing: 0.08em;
}

.intro-copy {
  margin-top: clamp(52px, 8vh, 86px);
}

.intro-copy h1 {
  margin: 0;
  max-width: 680px;
  font-size: clamp(40px, 4.2vw, 56px);
  line-height: 1.14;
  letter-spacing: 0;
}

.intro-copy p {
  max-width: 710px;
  margin: 26px 0 0;
  color: var(--login-muted);
  font-size: 18px;
  line-height: 1.7;
}

.module-panel {
  width: min(720px, 100%);
  margin-top: clamp(54px, 9vh, 98px);
  padding: 28px 30px 30px;
  border: 1px solid rgba(215, 228, 240, 0.92);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 48px rgba(37, 70, 112, 0.08);
  backdrop-filter: blur(14px);
}

.module-panel h2 {
  margin: 0 0 24px;
  font-size: 17px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px 34px;
}

.module-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.module-dot {
  width: 10px;
  height: 10px;
  margin-top: 8px;
  border-radius: 50%;
  background: var(--module-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--module-color) 14%, transparent);
}

.module-item strong {
  display: block;
  font-size: 15px;
  line-height: 1.4;
}

.module-item span:not(.module-dot) {
  display: block;
  margin-top: 5px;
  color: var(--login-muted);
  font-size: 13px;
  line-height: 1.45;
}

.login-shell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: min(456px, 100%);
  position: relative;
  padding: 46px 42px 42px;
  border: 1px solid rgba(215, 228, 240, 0.95);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    18px 18px 0 rgba(31, 77, 134, 0.1),
    0 26px 70px rgba(31, 77, 134, 0.16);
  overflow: hidden;
}

.login-card-bar {
  position: absolute;
  inset: 0 0 auto;
  height: 6px;
  background: linear-gradient(90deg, var(--login-blue-dark), var(--login-cyan));
}

.card-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 34px;
  color: var(--login-muted);
  font-size: 13px;
  font-weight: 700;
}

.captcha-state {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--login-green);
}

.captcha-state::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.login-card h2 {
  margin: 0;
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: 0;
}

.card-copy {
  margin: 10px 0 31px;
  color: var(--login-muted);
  font-size: 14px;
}

.field {
  display: block;
  margin-bottom: 20px;
}

.field-label {
  display: block;
  margin-bottom: 9px;
  color: var(--login-ink);
  font-size: 14px;
  font-weight: 800;
}

.input-wrap {
  position: relative;
  display: block;
}

.input-wrap svg {
  position: absolute;
  left: 16px;
  top: 50%;
  width: 20px;
  height: 20px;
  transform: translateY(-50%);
  color: #8397ad;
  pointer-events: none;
}

.input-wrap input,
.captcha-input {
  width: 100%;
  height: 50px;
  border: 1px solid #c9d8e8;
  border-radius: 8px;
  background: #fff;
  color: var(--login-ink);
  font: inherit;
  font-size: 15px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.input-wrap input {
  padding: 0 16px 0 46px;
}

.captcha-input {
  padding: 0 16px;
  letter-spacing: 0.04em;
}

.input-wrap input::placeholder,
.captcha-input::placeholder {
  color: #9aabbd;
}

.input-wrap input:focus,
.captcha-input:focus {
  border-color: var(--login-blue);
  background: #fbfdff;
  box-shadow: 0 0 0 4px rgba(47, 117, 209, 0.12);
}

.captcha-label-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.captcha-text-btn {
  margin-top: 1px;
  border: 0;
  background: transparent;
  color: var(--login-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.captcha-text-btn:hover:not(:disabled) {
  color: var(--login-blue);
}

.captcha-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 126px 42px;
  gap: 12px;
  align-items: center;
}

.captcha-image-btn,
.captcha-refresh-btn {
  border: 1px solid #c9d8e8;
  border-radius: 8px;
  background: #fff;
  color: var(--login-blue);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.captcha-image-btn:hover:not(:disabled),
.captcha-refresh-btn:hover:not(:disabled) {
  border-color: var(--login-blue);
  box-shadow: 0 8px 18px rgba(47, 117, 209, 0.12);
}

.captcha-image-btn:active:not(:disabled),
.captcha-refresh-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.captcha-image-btn {
  height: 50px;
  padding: 0;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(220, 241, 248, 0.62)),
    repeating-linear-gradient(135deg, rgba(25, 175, 194, 0.14) 0 1px, transparent 1px 10px);
}

.captcha-image-btn :deep(svg) {
  display: block;
  width: 126px;
  height: 50px;
}

.captcha-placeholder {
  display: grid;
  place-items: center;
  height: 100%;
  color: var(--login-muted);
  font-size: 13px;
}

.captcha-refresh-btn {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
}

.captcha-refresh-btn svg {
  width: 20px;
  height: 20px;
}

.captcha-image-btn:disabled,
.captcha-refresh-btn:disabled,
.captcha-text-btn:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.captcha-hint {
  margin: 9px 0 0;
  color: var(--login-muted);
  font-size: 12px;
}

.form-error {
  margin: 2px 0 20px;
  padding: 11px 13px;
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: 8px;
  background: rgba(220, 38, 38, 0.06);
  color: #dc2626;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.login-btn {
  width: 100%;
  height: 52px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--login-blue), var(--login-blue-dark));
  color: #fff;
  font: inherit;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.14em;
  cursor: pointer;
  box-shadow: 0 16px 30px rgba(47, 117, 209, 0.25);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 20px 36px rgba(47, 117, 209, 0.32);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

@media (max-width: 1120px) {
  .login-page {
    grid-template-columns: 1fr;
    gap: 34px;
    padding: 34px 24px;
    overflow: auto;
  }

  .login-page::after {
    width: 100%;
    clip-path: none;
  }

  .login-intro {
    justify-content: flex-start;
  }

  .intro-copy {
    margin-top: 40px;
  }

  .module-panel {
    margin-top: 34px;
  }

  .login-shell {
    align-items: flex-start;
  }
}

@media (max-width: 680px) {
  .login-page {
    padding: 24px 16px;
  }

  .brand-row {
    gap: 14px;
  }

  .brand-mark {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .brand-mark svg {
    width: 32px;
    height: 32px;
  }

  .brand-name {
    font-size: 18px;
  }

  .intro-copy h1 {
    font-size: 34px;
  }

  .intro-copy p {
    font-size: 15px;
  }

  .module-panel {
    display: none;
  }

  .login-card {
    padding: 36px 22px 26px;
    box-shadow: 0 18px 42px rgba(31, 77, 134, 0.14);
  }

  .captcha-row {
    grid-template-columns: minmax(0, 1fr) 118px 42px;
    gap: 8px;
  }

  .captcha-image-btn :deep(svg) {
    width: 118px;
  }
}
</style>
