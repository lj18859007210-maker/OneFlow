<template>
  <div class="email-settings-page">
    <header class="settings-hero">
      <div class="hero-copy">
        <div class="eyebrow">MAIL DELIVERY</div>
        <h1>邮件设置</h1>
        <p>统一维护 SMTP 账号和自动邮件汇总策略，流转、评论、附件动态会按配置间隔合并发送。</p>
      </div>
      <div class="hero-actions">
        <button class="icon-btn" type="button" @click="loadSettings" :disabled="loading" title="刷新配置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 0 1-15.5 6.2" />
            <path d="M3 12A9 9 0 0 1 18.5 5.8" />
            <path d="M18 2v4h4" />
            <path d="M6 22v-4H2" />
          </svg>
        </button>
      </div>
    </header>

    <section class="status-strip">
      <div class="status-item">
        <span class="status-label">SMTP 主机</span>
        <strong>{{ form.smtpHost || '未配置' }}</strong>
      </div>
      <div class="status-item">
        <span class="status-label">安全连接</span>
        <strong>{{ form.smtpSecure ? 'SSL/TLS' : '未启用' }}</strong>
      </div>
      <div class="status-item">
        <span class="status-label">发送间隔</span>
        <strong>{{ form.sendIntervalMinutes }} 分钟</strong>
      </div>
      <div class="status-item" :class="{ muted: !form.passwordConfigured }">
        <span class="status-label">密码状态</span>
        <strong>{{ form.passwordConfigured ? '已保存' : '未配置' }}</strong>
      </div>
    </section>

    <form class="settings-layout" @submit.prevent="saveSettings">
      <section class="panel account-panel">
        <div class="panel-head">
          <div>
            <h2>账号连接</h2>
            <p>配置用于发送邮件的 SMTP 服务和发件人身份。</p>
          </div>
          <span class="panel-mark">SMTP</span>
        </div>

        <div class="field-grid">
          <label class="field span-2">
            <span class="field-label">SMTP 主机</span>
            <input v-model.trim="form.smtpHost" class="field-input" placeholder="smtp.example.com" autocomplete="off" />
          </label>

          <label class="field">
            <span class="field-label">端口</span>
            <input v-model.number="form.smtpPort" class="field-input" type="number" min="1" max="65535" />
          </label>

          <label class="toggle-card">
            <input v-model="form.smtpSecure" type="checkbox" />
            <span class="toggle-visual"></span>
            <span>
              <strong>SSL/TLS</strong>
              <small>{{ form.smtpSecure ? '已启用安全连接' : '未启用安全连接' }}</small>
            </span>
          </label>

          <label class="field span-2">
            <span class="field-label">SMTP 账号</span>
            <input v-model.trim="form.smtpUser" class="field-input" autocomplete="username" placeholder="mail@example.com" />
          </label>

          <label class="field span-2">
            <span class="field-label">SMTP 密码</span>
            <div class="password-row">
              <input
                v-model="form.smtpPassword"
                class="field-input"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="留空则不修改当前密码"
              />
              <button class="mini-btn" type="button" @click="showPassword = !showPassword">
                {{ showPassword ? '隐藏' : '显示' }}
              </button>
            </div>
            <span class="field-hint">{{ form.passwordConfigured ? '已保存密码，填写新密码才会覆盖。' : '当前还没有保存密码。' }}</span>
          </label>

          <label class="field">
            <span class="field-label">发件人邮箱</span>
            <input v-model.trim="form.fromEmail" class="field-input" type="email" placeholder="notice@example.com" />
          </label>

          <label class="field">
            <span class="field-label">发件人名称</span>
            <input v-model.trim="form.fromName" class="field-input" placeholder="OneFlow" />
          </label>
        </div>
      </section>

      <aside class="side-column">
        <section class="panel compact-panel">
          <div class="panel-head tight">
            <div>
              <h2>发送策略</h2>
              <p>控制自动邮件的防抖汇总窗口。</p>
            </div>
          </div>

          <div class="interval-display">
            <span>{{ form.sendIntervalMinutes }}</span>
            <small>分钟</small>
          </div>

          <label class="field">
            <span class="field-label">汇总间隔</span>
            <input
              v-model.number="form.sendIntervalMinutes"
              class="field-input"
              type="number"
              min="1"
              max="60"
              step="1"
              @input="clampInterval"
            />
          </label>

          <input
            v-model.number="form.sendIntervalMinutes"
            class="interval-range"
            type="range"
            min="1"
            max="60"
            step="1"
          />

          <div class="range-scale">
            <span>1 分钟</span>
            <span>60 分钟</span>
          </div>
        </section>

        <section class="panel note-panel">
          <h2>自动汇总范围</h2>
          <ul>
            <li>需求状态流转更新</li>
            <li>需求详情中发布评论</li>
            <li>附件中心上传、版本上传和归档</li>
          </ul>
        </section>

        <section class="panel test-panel">
          <div class="panel-head tight">
            <div>
              <h2>测试发送</h2>
              <p>使用已保存的 SMTP 配置发送一封测试邮件。</p>
            </div>
          </div>

          <label class="field">
            <span class="field-label">测试收件人</span>
            <input
              v-model.trim="testEmail.to"
              class="field-input"
              type="email"
              placeholder="recipient@example.com"
              autocomplete="off"
            />
          </label>

          <button class="secondary-btn full-btn" type="button" :disabled="testing || loading" @click="sendTestEmail">
            {{ testing ? '发送中...' : '发送测试邮件' }}
          </button>
        </section>
      </aside>

      <div class="save-bar">
        <div>
          <strong>配置保存后立即生效</strong>
          <span>已在发送队列中的邮件会继续按入队时的窗口发送。</span>
        </div>
        <button class="primary-btn" type="submit" :disabled="saving || loading">
          {{ saving ? '保存中...' : '保存配置' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { emailApi } from '../api'
import { showToast } from '../utils/toastService'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const showPassword = ref(false)
const form = reactive({
  sendIntervalMinutes: 10,
  smtpHost: '',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPassword: '',
  fromEmail: '',
  fromName: 'OneFlow',
  passwordConfigured: false
})
const testEmail = reactive({
  to: ''
})

function normalizeInterval(value) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  if (parsed < 1 || parsed > 60) return null
  return parsed
}

function clampInterval() {
  const parsed = Number(form.sendIntervalMinutes)
  if (!Number.isFinite(parsed)) return
  form.sendIntervalMinutes = Math.min(60, Math.max(1, Math.trunc(parsed)))
}

async function loadSettings() {
  loading.value = true
  try {
    const res = await emailApi.getSettings()
    const settings = res.data.data || {}
    form.sendIntervalMinutes = settings.sendIntervalMinutes || 10
    form.smtpHost = settings.smtpHost || ''
    form.smtpPort = settings.smtpPort || 465
    form.smtpSecure = settings.smtpSecure !== false
    form.smtpUser = settings.smtpUser || ''
    form.smtpPassword = ''
    form.fromEmail = settings.fromEmail || ''
    form.fromName = settings.fromName || 'OneFlow'
    form.passwordConfigured = !!settings.passwordConfigured
  } catch (error) {
    showToast(error.response?.data?.message || error.message, { type: 'error', title: '加载失败' })
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  const sendIntervalMinutes = normalizeInterval(form.sendIntervalMinutes)
  if (!sendIntervalMinutes) {
    showToast('发送间隔必须是 1 到 60 之间的整数', { type: 'warning', title: '校验失败' })
    return
  }
  if (!form.smtpHost || !form.smtpPort) {
    showToast('请填写 SMTP 主机和端口', { type: 'warning', title: '校验失败' })
    return
  }
  if (form.smtpPort < 1 || form.smtpPort > 65535) {
    showToast('SMTP 端口必须是 1 到 65535 之间的整数', { type: 'warning', title: '校验失败' })
    return
  }

  saving.value = true
  try {
    const payload = {
      sendIntervalMinutes,
      smtpHost: form.smtpHost,
      smtpPort: form.smtpPort,
      smtpSecure: form.smtpSecure,
      smtpUser: form.smtpUser,
      fromEmail: form.fromEmail,
      fromName: form.fromName
    }
    if (form.smtpPassword) {
      payload.smtpPassword = form.smtpPassword
    }
    const res = await emailApi.updateSettings(payload)
    form.sendIntervalMinutes = res.data.data?.sendIntervalMinutes || sendIntervalMinutes
    form.smtpPassword = ''
    form.passwordConfigured = !!res.data.data?.passwordConfigured
    showPassword.value = false
    showToast('邮件设置已保存', { type: 'success' })
  } catch (error) {
    showToast(error.response?.data?.message || error.message, { type: 'error', title: '保存失败' })
  } finally {
    saving.value = false
  }
}

async function sendTestEmail() {
  if (!testEmail.to) {
    showToast('请填写测试收件人', { type: 'warning', title: '校验失败' })
    return
  }

  testing.value = true
  try {
    await emailApi.send({
      to: testEmail.to,
      cc: [],
      subject: 'OneFlow 测试邮件',
      body: `这是一封来自 OneFlow 邮件设置页的测试邮件。\n发送时间：${new Date().toLocaleString('zh-CN')}`
    })
    showToast('测试邮件发送成功', { type: 'success' })
  } catch (error) {
    showToast(error.response?.data?.message || error.message, { type: 'error', title: '测试发送失败' })
  } finally {
    testing.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.email-settings-page {
  display: grid;
  gap: 18px;
  color: var(--tech-text);
}

.settings-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  padding: 4px 0 2px;
}

.hero-copy {
  max-width: 820px;
}

.eyebrow {
  margin-bottom: 8px;
  color: #2f8f7b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.settings-hero h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.15;
  color: var(--tech-text);
}

.settings-hero p {
  margin-top: 8px;
  color: var(--tech-text-secondary);
  font-size: 14px;
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.icon-btn {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--tech-border);
  border-radius: 10px;
  background: #fff;
  color: var(--tech-blue-dark);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn svg {
  width: 18px;
  height: 18px;
}

.icon-btn:hover {
  border-color: rgba(47, 143, 123, 0.45);
  box-shadow: 0 8px 20px rgba(47, 143, 123, 0.12);
}

.status-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.status-item {
  min-height: 76px;
  padding: 16px;
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(38, 84, 128, 0.06);
}

.status-item.muted strong {
  color: var(--tech-warning);
}

.status-label {
  display: block;
  margin-bottom: 7px;
  color: var(--tech-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.status-item strong {
  display: block;
  overflow: hidden;
  color: var(--tech-text);
  font-size: 17px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.8fr);
  gap: 18px;
  align-items: start;
}

.panel {
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 28px rgba(38, 84, 128, 0.07);
}

.account-panel {
  padding: 22px;
}

.side-column {
  display: grid;
  gap: 18px;
}

.compact-panel,
.note-panel,
.test-panel {
  padding: 20px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(212, 228, 247, 0.75);
}

.panel-head.tight {
  margin-bottom: 16px;
}

.panel-head h2,
.note-panel h2 {
  margin: 0;
  color: var(--tech-text);
  font-size: 20px;
  line-height: 1.2;
}

.panel-head p {
  margin-top: 7px;
  color: var(--tech-text-secondary);
  font-size: 13px;
}

.panel-mark {
  min-width: 56px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(47, 143, 123, 0.1);
  color: #247363;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.span-2 {
  grid-column: 1 / -1;
}

.field {
  display: grid;
  gap: 8px;
}

.field-label {
  color: var(--tech-text);
  font-size: 13px;
  font-weight: 700;
}

.field-input {
  width: 100%;
  min-height: 42px;
  padding: 10px 12px;
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: #fff;
  color: var(--tech-text);
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.field-input:focus {
  outline: none;
  border-color: #2f8f7b;
  box-shadow: 0 0 0 3px rgba(47, 143, 123, 0.14);
}

.field-hint {
  color: var(--tech-text-secondary);
  font-size: 12px;
}

.password-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 72px;
  gap: 10px;
}

.mini-btn {
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: #f8fbff;
  color: var(--tech-blue-dark);
  font-weight: 700;
  cursor: pointer;
}

.toggle-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 42px;
  padding: 10px;
  border: 1px solid var(--tech-border);
  border-radius: 8px;
  background: #fbfdff;
  cursor: pointer;
}

.toggle-card input {
  display: none;
}

.toggle-visual {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: #c9d7e8;
  transition: background 0.2s ease;
}

.toggle-visual::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(30, 58, 95, 0.18);
  transition: transform 0.2s ease;
}

.toggle-card input:checked + .toggle-visual {
  background: #2f8f7b;
}

.toggle-card input:checked + .toggle-visual::after {
  transform: translateX(16px);
}

.toggle-card strong {
  display: block;
  color: var(--tech-text);
  font-size: 13px;
}

.toggle-card small {
  display: block;
  color: var(--tech-text-secondary);
  font-size: 12px;
}

.interval-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 8px 0 16px;
  color: #247363;
}

.interval-display span {
  font-size: 54px;
  font-weight: 800;
  line-height: 1;
}

.interval-display small {
  font-size: 14px;
  font-weight: 700;
}

.interval-range {
  width: 100%;
  margin-top: 14px;
  accent-color: #2f8f7b;
}

.range-scale {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  color: var(--tech-text-secondary);
  font-size: 12px;
}

.note-panel {
  border-color: rgba(255, 167, 38, 0.32);
  background: linear-gradient(180deg, #fff, #fffaf1);
}

.note-panel ul {
  display: grid;
  gap: 10px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.note-panel li {
  padding-left: 18px;
  position: relative;
  color: var(--tech-text);
  font-size: 13px;
}

.note-panel li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--tech-warning);
}

.save-bar {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid rgba(47, 143, 123, 0.22);
  border-radius: 8px;
  background: #f8fffc;
}

.save-bar strong,
.save-bar span {
  display: block;
}

.save-bar strong {
  color: var(--tech-text);
  font-size: 14px;
}

.save-bar span {
  margin-top: 3px;
  color: var(--tech-text-secondary);
  font-size: 12px;
}

.primary-btn {
  min-width: 116px;
  min-height: 42px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: linear-gradient(135deg, #2f8f7b 0%, #247363 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(47, 143, 123, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.secondary-btn {
  min-height: 42px;
  border: 1px solid rgba(47, 143, 123, 0.34);
  border-radius: 8px;
  background: #f7fcfa;
  color: #247363;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-btn:hover {
  border-color: #2f8f7b;
  background: #eef8f5;
}

.secondary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.full-btn {
  width: 100%;
  margin-top: 14px;
}

.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(47, 143, 123, 0.26);
}

.primary-btn:disabled,
.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.58;
  transform: none;
}

@media (max-width: 1180px) {
  .status-strip,
  .settings-layout {
    grid-template-columns: 1fr 1fr;
  }

  .account-panel,
  .save-bar {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .settings-hero,
  .save-bar {
    display: grid;
  }

  .status-strip,
  .settings-layout,
  .field-grid {
    grid-template-columns: 1fr;
  }

  .account-panel {
    padding: 18px;
  }

  .settings-hero h1 {
    font-size: 30px;
  }
}
</style>
