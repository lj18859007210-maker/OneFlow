<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">
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
        <h1 class="login-title">需求一体化支撑平台</h1>
        <p class="login-subtitle">One Flow</p>
      </div>
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">账号</label>
          <input
            v-model="username"
            type="text"
            class="form-input"
            placeholder="请输入账号"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            required
          />
        </div>
        <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? "登录中..." : "登 录" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { authApi } from "../api";
import { JSEncrypt } from "jsencrypt";

const router = useRouter();
const username = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

async function handleLogin() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const keyRes = await authApi.getPublicKey();
    if (keyRes.data.code !== 0) {
      errorMsg.value = "获取加密密钥失败";
      return;
    }
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(keyRes.data.data);
    const encryptedPassword = encrypt.encrypt(password.value);

    const res = await authApi.login(username.value, encryptedPassword);
    if (res.data.code === 0) {
      const { user, token } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
        }),
      );
      router.push("/");
    } else {
      errorMsg.value = res.data.data;
    }
  } catch (error) {
    errorMsg.value = "登录失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8f4f8 0%, #d4e8f0 50%, #c8e0ec 100%);
  position: relative;
  overflow: hidden;
}

.login-container::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background:
    radial-gradient(
      circle at 25% 35%,
      rgba(91, 155, 213, 0.12) 0%,
      transparent 45%
    ),
    radial-gradient(
      circle at 75% 65%,
      rgba(184, 212, 227, 0.15) 0%,
      transparent 45%
    ),
    radial-gradient(
      circle at 50% 50%,
      rgba(232, 244, 248, 0.2) 0%,
      transparent 55%
    );
  animation: bgFloat 28s ease-in-out infinite;
}

@keyframes bgFloat {
  0%,
  100% {
    transform: translate(0, 0) rotate(0deg);
  }
  33% {
    transform: translate(-2%, 3%) rotate(1.5deg);
  }
  66% {
    transform: translate(2%, -2%) rotate(-1.5deg);
  }
}

.login-card {
  position: relative;
  width: 440px;
  padding: 52px 46px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(184, 212, 227, 0.6);
  border-radius: 22px;
  box-shadow:
    0 18px 55px rgba(44, 82, 130, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.9) inset;
}

.login-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 36px;
  right: 36px;
  height: 4px;
  background: linear-gradient(90deg, #b8d4e3 0%, #5b9bd5 50%, #2c5282 100%);
  border-radius: 0 0 4px 4px;
}

.login-header {
  text-align: center;
  margin-bottom: 46px;
}

.login-logo {
  width: 70px;
  height: 70px;
  margin: 0 auto 18px;
  background: linear-gradient(135deg, #b8d4e3 0%, #5b9bd5 100%);
  border-radius: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 7px 22px rgba(91, 155, 213, 0.28);
  color: #ffffff;
}

.login-logo svg {
  width: 42px;
  height: 42px;
}

.login-title {
  font-size: 23px;
  font-weight: 700;
  color: #2c5282;
  letter-spacing: 1.5px;
  margin: 0 0 7px;
}

.login-subtitle {
  font-size: 13px;
  color: #5b9bd5;
  margin: 0;
  letter-spacing: 2.5px;
  font-weight: 500;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.form-label {
  font-size: 14px;
  color: #2c5282;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.form-input {
  padding: 13px 17px;
  background: #ffffff;
  border: 2px solid #d4e8f0;
  border-radius: 11px;
  color: #2c5282;
  font-size: 15px;
  transition: all 0.25s;
  outline: none;
}

.form-input:focus {
  border-color: #5b9bd5;
  box-shadow: 0 0 0 4px rgba(91, 155, 213, 0.1);
  background: #f8fbfd;
}

.form-input::placeholder {
  color: #a8c8dc;
}

.form-error {
  padding: 11px 15px;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 9px;
  color: #dc2626;
  font-size: 14px;
  text-align: center;
  font-weight: 500;
}

.login-btn {
  padding: 15px;
  background: linear-gradient(135deg, #b8d4e3 0%, #5b9bd5 50%, #2c5282 100%);
  border: none;
  border-radius: 11px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 5px;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 7px;
  box-shadow: 0 5px 18px rgba(91, 155, 213, 0.32);
  position: relative;
  overflow: hidden;
}

.login-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.25),
    transparent
  );
  transition: left 0.5s;
}

.login-btn:hover:not(:disabled)::before {
  left: 100%;
}

.login-btn:hover:not(:disabled) {
  box-shadow: 0 7px 25px rgba(91, 155, 213, 0.42);
  transform: translateY(-2px);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
