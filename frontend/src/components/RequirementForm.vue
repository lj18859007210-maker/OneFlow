<template>
  <div class="requirement-form">
    <!-- 基本信息卡片 -->
    <div class="tech-detail-card full-width">
      <div class="tech-detail-title">基本信息</div>
      <form @submit.prevent="doSubmit" class="tech-form">
        <div class="tech-form-row">
          <div class="tech-form-group">
            <label class="tech-form-label"
              >需求标题<span class="required">*</span></label
            >
            <input
              v-model="form.title"
              class="tech-input"
              placeholder="请输入需求标题"
              required
            />
          </div>
          <div class="tech-form-group">
            <label class="tech-form-label">提交人</label>
            <input :value="getSubmitterName()" class="tech-input" disabled />
          </div>
        </div>
        <div class="tech-form-row">
          <div class="tech-form-group">
            <label class="tech-form-label"
              >选择开发人员<span class="required">*</span></label
            >
            <select v-model="form.developer" class="tech-select" required>
              <option value="">请选择开发人员</option>
              <option v-for="d in developers" :key="d.id" :value="d.name">
                {{ d.name }} · {{ d.department }}
              </option>
            </select>
          </div>
          <div class="tech-form-group">
            <label class="tech-form-label">对应平台</label>
            <select v-model="form.platform" class="tech-select">
              <option value="">请选择平台</option>
              <option value="CRM 系统">CRM 系统</option>
              <option value="BOSS 系统">BOSS 系统</option>
              <option value="OA 办公系统">OA 办公系统</option>
              <option value="网管支撑平台">网管支撑平台</option>
              <option value="大数据分析平台">大数据分析平台</option>
              <option value="掌上移动 APP">掌上移动 APP</option>
            </select>
          </div>
        </div>
        <div class="tech-form-row">
          <div class="tech-form-group">
            <label class="tech-form-label">能力</label>
            <select v-model="form.capability" class="tech-select">
              <option value="">请选择</option>
              <option value="内部支撑">内部支撑</option>
              <option value="一线支撑">一线支撑</option>
              <option value="集团迎检">集团迎检</option>
            </select>
          </div>
          <div class="tech-form-group">
            <label class="tech-form-label">期望日期</label>
            <input v-model="form.expectedDate" type="date" class="tech-input" />
          </div>
        </div>
        <div class="tech-form-row">
          <div class="tech-form-group">
            <label class="tech-form-label">开发前平均用时/次</label>
            <input
              v-model="form.avgDevTime"
              class="tech-input"
              placeholder="例：3 天"
            />
          </div>
          <div class="tech-form-group">
            <label class="tech-form-label">平均预估每月调用量/次</label>
            <input
              v-model="form.avgMonthlyCalls"
              class="tech-input"
              type="number"
              placeholder="例：500"
            />
          </div>
        </div>
        <div class="tech-form-row">
          <div class="tech-form-group">
            <label class="tech-form-label">开发后预计平均用时/次</label>
            <input
              v-model="form.postDevAvgTime"
              class="tech-input"
              placeholder="例：1 天"
            />
          </div>
          <div class="tech-form-group">
            <label class="tech-form-label">优先级</label>
            <select v-model="form.priority" class="tech-select">
              <option value="低">低</option>
              <option value="中">中</option>
              <option value="高">高</option>
            </select>
          </div>
        </div>
      </form>
    </div>

    <!-- AI 分步关卡 -->
    <div class="tech-detail-card full-width" style="margin-top: 10px">
      <div class="tech-detail-title">
        AI 需求引导（{{ completedSteps }}/{{ steps.length }} 步完成）
        <button class="reset-btn" @click="resetAll">重置所有内容</button>
      </div>

      <div class="gate-progress">
        <div
          v-for="(s, i) in steps"
          :key="i"
          class="gate-step-bar"
          :class="{ active: s.state === 'active', done: s.state === 'done' }"
        >
          <div class="gate-step-fill"></div>
        </div>
      </div>

      <div class="gate-cards">
        <div
          v-for="(s, i) in steps"
          :key="i"
          class="gate-card"
          :class="[s.state, { open: openStep === i }]"
        >
          <div class="gate-card-head" @click="toggleStep(i)">
            <span class="gate-card-num">{{
              s.state === "done" ? "✓" : i + 1
            }}</span>
            <span class="gate-card-label">{{ s.label }}</span>
            <span v-if="s.state === 'locked'" class="gate-card-lock">🔒</span>
            <button
              v-if="s.state !== 'locked' && s.answer.trim()"
              class="gate-skip-btn"
              :class="{ disabled: gateLoading || s.state === 'done' }"
              :disabled="gateLoading || s.state === 'done'"
              @click.stop="skipStep(i)"
              title="跳过 AI 检查，直接下一步"
            >
              跳过 AI →
            </button>
          </div>

          <!-- 已完成且未展开：折叠展示 -->
          <div
            v-if="s.state === 'done' && openStep !== i"
            class="gate-card-done"
            @click="toggleStep(i)"
          >
            <div class="gate-card-done-inner">
              <p>{{ s.answer }}</p>
              <div
                v-if="s.images && s.images.length"
                class="gate-card-done-imgs"
              >
                <img
                  v-for="(img, idx) in s.images"
                  :key="idx"
                  :src="img.url"
                  :alt="img.name"
                />
              </div>
            </div>
            <span class="gate-card-edit">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
              修改
            </span>
          </div>

          <!-- 展开状态：首次填写 或 编辑已完成的步骤 -->
          <div
            v-if="openStep === i && s.state !== 'locked'"
            class="gate-card-body"
          >
            <textarea
              v-model="s.answer"
              class="tech-textarea"
              :placeholder="s.placeholder"
              rows="3"
              @keydown.enter.ctrl="checkStep(i)"
            ></textarea>

            <!-- 备注类型：显示图片上传区域 -->
            <div v-if="s.type === 'note'" class="note-images">
              <div v-for="(img, idx) in s.images" :key="idx" class="note-img">
                <img :src="img.url" :alt="img.name" />
                <button class="note-img-del" @click="removeImage(i, idx)">
                  ×
                </button>
              </div>
              <label class="note-img-upload" v-if="s.images.length < 5">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  @change="uploadImages(i, $event)"
                />
                <span>+</span>
              </label>
            </div>

            <div v-if="s.nudge" class="gate-nudge">
              <div class="gate-nudge-ai">AI</div>
              <div class="gate-nudge-text">{{ s.nudge }}</div>
            </div>
            <div class="gate-card-actions">
              <span class="gate-hint">Ctrl+Enter 提交</span>
              <button
                v-if="s.type !== 'note'"
                class="tech-btn tech-btn-primary tech-btn-sm gate-next-btn"
                @click="checkStep(i)"
                :disabled="gateLoading || !s.answer.trim()"
              >
                <span v-if="gateLoading" class="gate-spinner"></span>
                {{ gateLoading ? "AI 思考中..." : "下一步 →" }}
              </button>
              <button
                v-else
                class="tech-btn tech-btn-primary tech-btn-sm gate-next-btn"
                @click="completeNote(i)"
              >
                完成 ✓
              </button>
            </div>
          </div>

          <!-- 未展开的活跃步骤提示 -->
          <div
            v-if="s.state === 'active' && openStep !== i"
            class="gate-card-pending"
            @click="toggleStep(i)"
          >
            <p>点击填写 →</p>
          </div>

          <!-- 锁定：不可操作 -->
          <div v-if="s.state === 'locked'" class="gate-card-locked">
            <p>请先完成上一关</p>
          </div>
        </div>
      </div>

      <!-- 全部通过后允许提交 -->
      <div v-if="completedSteps === steps.length" class="gate-final">
        <div class="tech-form-group">
          <label class="tech-form-label"
            >需求描述预览（AI 正在结构化整理...）</label
          >
          <textarea
            v-model="form.description"
            class="tech-textarea"
            readonly
            rows="10"
          ></textarea>
        </div>
        <div class="gate-final-actions">
          <button class="tech-btn" @click="$emit('close')">取消</button>
          <button
            class="tech-btn tech-btn-primary"
            @click="doSubmit"
            :disabled="submitting"
          >
            {{ submitting ? "提交中..." : "提交需求" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject, watch } from "vue";
import { requirementApi, emailApi, developerApi } from "../api";

const emit = defineEmits(["close", "submit-success"]);

const props = defineProps({
  draftData: {
    type: Object,
    default: null,
  },
});

const developers = ref([]);
const currentUser = inject("currentUser");
const saveDraftState = inject("saveDraftState", null);
const currentDraftId = ref(null); // 记录当前草稿的ID

const getSubmitterName = () => currentUser?.value?.name || "管理员";

const form = ref({
  title: "",
  submitter: getSubmitterName(),
  developer: "",
  platform: "",
  capability: "",
  expectedDate: "",
  avgDevTime: "",
  postDevAvgTime: "",
  avgMonthlyCalls: "",
  priority: "中",
  description: "",
});

const gateLoading = ref(false);
const submitting = ref(false);
const savingDraft = ref(false);
const openStep = ref(0);

const steps = ref([
  {
    label: "这个需求要解决什么问题？",
    placeholder:
      "请具体描述业务痛点，比如「客户投诉工单分派慢，客服需要手动从 3 个系统里查数据，每次耗时 5 分钟」",
    answer: "",
    nudge: "",
    state: "active",
  },
  {
    label: "目标用户是谁？使用场景是什么？",
    placeholder:
      "哪些部门、角色在什么情况下会使用？比如「一线客服在处理投诉时需要、分公司运营每月做报表时需要」",
    answer: "",
    nudge: "",
    state: "locked",
  },
  {
    label: "期望实现哪些核心功能？",
    placeholder:
      "列出 1-3 个核心功能点，具体到操作层面，比如「支持按投诉类型自动分派给对应部门，超时 1 小时自动升级至主管」",
    answer: "",
    nudge: "",
    state: "locked",
  },
  {
    label: "目前的替代方案是什么？",
    placeholder:
      "现在没有这个功能时，你们是怎么凑合解决的？比如「只能先把数据导出 Excel 手工算，每天浪费 2 小时」或者「目前没有替代方案，只能等」",
    answer: "",
    nudge: "",
    state: "locked",
  },
  {
    label: "备注",
    placeholder: "如有补充说明、参考截图请在此填写",
    answer: "",
    nudge: "",
    state: "locked",
    type: "note",
    images: [],
  },
]);

const completedSteps = computed(
  () => steps.value.filter((s) => s.state === "done").length,
);

function toggleStep(i) {
  if (steps.value[i].state === "locked") return;
  openStep.value = openStep.value === i ? -1 : i;
}

function skipStep(i) {
  const step = steps.value[i];
  if (!step.answer.trim()) return;
  step.state = "done";
  step.nudge = "";
  openStep.value = -1;
  if (i + 1 < steps.value.length && steps.value[i + 1].state === "locked") {
    steps.value[i + 1].state = "active";
    openStep.value = i + 1;
  }
  if (completedSteps.value >= steps.value.length) {
    finalSummary();
  }
}

function resetAll() {
  if (!confirm("确定要重置所有内容吗？")) return;
  form.value = {
    title: "",
    submitter: getSubmitterName(),
    developer: "",
    platform: "",
    capability: "",
    expectedDate: "",
    avgDevTime: "",
    postDevAvgTime: "",
    avgMonthlyCalls: "",
    priority: "中",
    description: "",
  };
  steps.value = [
    {
      label: "这个需求要解决什么问题？",
      placeholder:
        "请具体描述业务痛点，比如「客户投诉工单分派慢，客服需要手动从 3 个系统里查数据，每次耗时 5 分钟」",
      answer: "",
      nudge: "",
      state: "active",
    },
    {
      label: "目标用户是谁？使用场景是什么？",
      placeholder:
        "哪些部门、角色在什么情况下会使用？比如「一线客服在处理投诉时需要、分公司运营每月做报表时需要」",
      answer: "",
      nudge: "",
      state: "locked",
    },
    {
      label: "期望实现哪些核心功能？",
      placeholder:
        "列出 1-3 个核心功能点，具体到操作层面，比如「支持按投诉类型自动分派给对应部门，超时 1 小时自动升级至主管」",
      answer: "",
      nudge: "",
      state: "locked",
    },
    {
      label: "目前的替代方案是什么？",
      placeholder:
        "现在没有这个功能时，你们是怎么凑合解决的？比如「只能先把数据导出 Excel 手工算，每天浪费 2 小时」或者「目前没有替代方案，只能等」",
      answer: "",
      nudge: "",
      state: "locked",
    },
    {
      label: "备注",
      placeholder: "如有补充说明、参考截图请在此填写",
      answer: "",
      nudge: "",
      state: "locked",
      type: "note",
      images: [],
    },
  ];
  openStep.value = 0;
  gateLoading.value = false;
  showToast("已重置所有内容");
}

async function completeNote(i) {
  const step = steps.value[i];
  step.state = "done";
  step.nudge = "";
  openStep.value = -1;
  if (i + 1 < steps.value.length && steps.value[i + 1].state === "locked") {
    steps.value[i + 1].state = "active";
    openStep.value = i + 1;
  }
  if (completedSteps.value >= steps.value.length) await finalSummary();
}

async function checkStep(i) {
  const step = steps.value[i];
  if (!step.answer.trim()) return;

  // 如果步骤已完成且内容未改动，直接跳过AI检查，进入下一步
  if (step.state === "done") {
    step.state = "done";
    step.nudge = "";
    openStep.value = -1;
    if (i + 1 < steps.value.length && steps.value[i + 1].state === "locked") {
      steps.value[i + 1].state = "active";
      openStep.value = i + 1;
    }
    if (completedSteps.value >= steps.value.length) {
      await finalSummary();
    }
    return;
  }

  gateLoading.value = true;
  step.nudge = "";

  try {
    const qualityCheckPrompt = `你是一个耐心、专业的产品经理。用户正在填写需求表单的第${i + 1}个环节「${step.label}」，ta 的回答如下：

"${step.answer}"

请判断这个回答的质量：
- 如果回答太简短（少于 15 个字）、太情绪化（如"太卡了""不好看""很难用"）、没有具体场景或细节 → 返回 JSON: {"pass":false,"nudge":"你给出的启发式追问，要结合用户上下文，语气友好"}
- 如果回答够具体、包含实质内容（场景/痛点/数据） → 返回 JSON: {"pass":true,"nudge":""}

只返回 JSON，不要其他内容。`;

    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ prompt: qualityCheckPrompt }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    const result = JSON.parse(json.data);

    if (result.pass) {
      step.state = "done";
      step.nudge = "";
      openStep.value = -1;
      if (i + 1 < steps.value.length && steps.value[i + 1].state === "locked") {
        steps.value[i + 1].state = "active";
        openStep.value = i + 1;
      }
      if (completedSteps.value >= steps.value.length) {
        await finalSummary();
      }
    } else {
      step.nudge = result.nudge;
    }
  } catch (e) {
    step.state = "done";
    step.nudge = "";
    openStep.value = -1;
    if (i + 1 < steps.value.length && steps.value[i + 1].state === "locked") {
      steps.value[i + 1].state = "active";
      openStep.value = i + 1;
    }
    if (completedSteps.value >= steps.value.length) await finalSummary();
    showToast("AI 服务暂时不可用，已跳过检查");
  } finally {
    gateLoading.value = false;
  }
}

async function uploadImages(si, e) {
  const files = e.target.files;
  if (!files.length) return;
  const step = steps.value[si];
  const formData = new FormData();
  for (const f of files) formData.append("files", f);
  try {
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    json.data.forEach((url, idx) => {
      step.images.push({ name: files[idx].name, url: url });
    });
  } catch (err) {
    showToast("图片上传失败：" + err.message);
  }
  e.target.value = "";
}

function removeImage(si, idx) {
  steps.value[si].images.splice(idx, 1);
}

async function finalSummary() {
  try {
    const qa = steps.value
      .map((s, i) => `Q${i + 1}: ${s.label}\nA: ${s.answer}`)
      .join("\n\n");
    const prompt = `你是中国移动需求分析专家。请将以下需求问答整理成一份标准需求文档，格式如下：

【需求背景】
提取业务痛点

【目标人群】
明确用户角色和场景

【核心诉求】
列出具体功能需求

【当前现状】
（如果用户提到了现状）总结当前问题和期望

需求问答：
${qa}

请直接输出需求文档，不要多余说明。`;

    const noteStep = steps.value.find((s) => s.type === "note");
    const noteText =
      noteStep && noteStep.answer ? `\n\n【补充备注】\n${noteStep.answer}` : "";
    const imgInfo =
      noteStep && noteStep.images && noteStep.images.length
        ? `\n\n【附带图片】\n${noteStep.images.map((img) => `${img.url}`).join("\n")}`
        : "";

    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ prompt: prompt + noteText + imgInfo }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    form.value.description = json.data;
  } catch (e) {
    form.value.description = steps.value.map((s) => s.answer).join("\n\n");
  }
}

async function doSubmit() {
  submitting.value = true;
  try {
    if (!form.value.title || !form.value.developer) {
      showToast("请填写需求标题和选择开发人员");
      return;
    }

    const noteStep = steps.value.find((s) => s.type === "note");
    const noteImages = (noteStep && noteStep.images) || [];

    // 如果是编辑草稿，使用 update；否则使用 create
    if (currentDraftId.value) {
      await requirementApi.update(currentDraftId.value, {
        ...form.value,
        noteImages,
        isDraft: false,
      });
    } else {
      await requirementApi.create({ ...form.value, noteImages });
    }

    try {
      await emailApi.send({
        to: "admin@cmcc.cn",
        cc: [],
        subject: "新需求：" + form.value.title,
        body:
          form.value.description +
          (noteImages.length
            ? "\n\n图片附件:\n" +
              noteImages.map((img) => location.origin + img.url).join("\n")
            : ""),
      });
      showToast("需求提交成功，邮件已发送");
    } catch (emailErr) {
      console.warn("邮件发送失败，但需求已提交:", emailErr);
      showToast("需求提交成功，邮件发送失败");
    }

    currentDraftId.value = null; // 提交成功后清除草稿ID
    emit("submit-success");
  } catch (e) {
    console.error("提交失败:", e);
    showToast(
      "提交失败：" + (e.response?.data?.message || e.message || "未知错误"),
    );
  } finally {
    submitting.value = false;
  }
}

async function saveDraft() {
  savingDraft.value = true;
  try {
    const noteStep = steps.value.find((s) => s.type === "note");
    const draftData = {
      title: form.value.title,
      submitter: form.value.submitter,
      developer: form.value.developer,
      platform: form.value.platform,
      capability: form.value.capability,
      expectedDate: form.value.expectedDate,
      avgDevTime: form.value.avgDevTime,
      postDevAvgTime: form.value.postDevAvgTime,
      avgMonthlyCalls: form.value.avgMonthlyCalls,
      priority: form.value.priority,
      description: form.value.description,
      isDraft: true,
      steps: steps.value.map((s) => ({
        label: s.label,
        answer: s.answer,
        state: s.state,
        nudge: s.nudge,
        images: s.images || [],
        type: s.type,
      })),
    };

    // 如果是编辑草稿，使用 update；否则使用 create
    if (currentDraftId.value) {
      await requirementApi.update(currentDraftId.value, draftData);
    } else {
      const res = await requirementApi.create(draftData);
      // 保存新创建的草稿ID
      if (res.data.success && res.data.data) {
        currentDraftId.value = res.data.data.id;
      }
    }

    showToast("草稿已保存");
  } catch (e) {
    showToast("保存草稿失败");
  } finally {
    savingDraft.value = false;
  }
}

if (saveDraftState) {
  saveDraftState.setCallback(async () => {
    await saveDraft();
  });
}

async function loadLatestDraft() {
  try {
    const submitter = getSubmitterName();
    const res = await requirementApi.getLatestDraft(submitter);
    if (res.data.success && res.data.data) {
      const draft = res.data.data;
      currentDraftId.value = draft.id; // 记录草稿ID
      form.value = {
        title: draft.title || "",
        submitter: draft.submitter || form.value.submitter,
        developer: draft.developer || "",
        platform: draft.platform || "",
        capability: draft.capability || "",
        expectedDate: draft.expectedDate || "",
        avgDevTime: draft.avgDevTime || "",
        postDevAvgTime: draft.postDevAvgTime || "",
        avgMonthlyCalls: draft.avgMonthlyCalls || "",
        priority: draft.priority || "中",
        description: draft.description || "",
      };
      if (draft.steps && draft.steps.length) {
        draft.steps.forEach((stepData, idx) => {
          if (steps.value[idx]) {
            steps.value[idx].answer = stepData.answer || "";
            steps.value[idx].images = stepData.images || [];
            steps.value[idx].state = stepData.state || "locked";
            steps.value[idx].nudge = stepData.nudge || "";
            if (stepData.type) {
              steps.value[idx].type = stepData.type;
            }
          }
        });

        const firstActiveIndex = steps.value.findIndex(
          (s) => s.state === "active",
        );
        if (firstActiveIndex !== -1) {
          openStep.value = firstActiveIndex;
        }
      }
      showToast("已加载最新草稿");
    }
  } catch (e) {}
}

function showToast(msg) {
  const t = document.createElement("div");
  t.className = "tech-toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

onMounted(async () => {
  try {
    const r = await developerApi.getAssignable();
    developers.value = r.data.data;
  } catch (e) {}

  // 如果有草稿数据，加载它
  if (props.draftData) {
    currentDraftId.value = props.draftData.id; // 记录草稿ID
    loadDraftData(props.draftData);
  }
});

function loadDraftData(draft) {
  currentDraftId.value = draft.id; // 记录草稿ID
  form.value = {
    title: draft.title || "",
    submitter: draft.submitter || getSubmitterName(),
    developer: draft.developer || "",
    platform: draft.platform || "",
    capability: draft.capability || "",
    expectedDate: draft.expectedDate || "",
    avgDevTime: draft.avgDevTime || "",
    postDevAvgTime: draft.postDevAvgTime || "",
    avgMonthlyCalls: draft.avgMonthlyCalls || "",
    priority: draft.priority || "中",
    description: draft.description || "",
  };

  if (draft.steps && draft.steps.length) {
    draft.steps.forEach((stepData, idx) => {
      if (steps.value[idx]) {
        steps.value[idx].answer = stepData.answer || "";
        steps.value[idx].images = stepData.images || [];
        steps.value[idx].state = stepData.state || "locked";
        steps.value[idx].nudge = stepData.nudge || "";
        if (stepData.type) {
          steps.value[idx].type = stepData.type;
        }
      }
    });

    const firstActiveIndex = steps.value.findIndex((s) => s.state === "active");
    if (firstActiveIndex !== -1) {
      openStep.value = firstActiveIndex;
    }
  }
}

defineExpose({ saveDraft });

// 监听草稿数据变化
watch(
  () => props.draftData,
  (newDraft) => {
    if (newDraft) {
      currentDraftId.value = newDraft.id; // 记录草稿ID
      loadDraftData(newDraft);
    }
  },
  { immediate: false },
);

// 调试：确保 saveDraft 被正确暴露
if (import.meta.env.DEV) {
  console.log("RequirementForm saveDraft exposed:", typeof saveDraft);
}
</script>

<style scoped>
.gate-progress {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
}
.gate-step-bar {
  flex: 1;
  height: 4px;
  background: var(--tech-border);
  border-radius: 2px;
  overflow: hidden;
}
.gate-step-bar.active {
  background: var(--tech-blue);
}
.gate-step-bar.done {
  background: var(--tech-success);
}
.gate-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.gate-card {
  border: 2px solid var(--tech-border);
  border-radius: 14px;
  padding: 18px;
  transition: all 0.3s;
}
.gate-card.active {
  border-color: var(--tech-blue);
  box-shadow: 0 0 0 4px rgba(74, 144, 226, 0.1);
}
.gate-card.done {
  border-color: var(--tech-success);
  background: rgba(76, 175, 80, 0.03);
  cursor: pointer;
}
.gate-card.locked {
  opacity: 0.5;
}
.gate-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  position: relative;
}
.tech-detail-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.reset-btn {
  padding: 6px 14px;
  font-size: 13px;
  color: #ef5350;
  background: transparent;
  border: 1px solid #ef5350;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.reset-btn:hover {
  background: #ef5350;
  color: #fff;
}
.draft-save-btn {
  margin-left: 10px;
  border-color: #ffa726;
  color: #ffa726;
}
.draft-save-btn:hover:not(:disabled) {
  background: #ffa726;
  color: #fff;
}
.gate-skip-btn {
  margin-left: auto;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--tech-blue);
  background: transparent;
  border: 1px solid var(--tech-blue);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.gate-skip-btn:hover:not(:disabled) {
  background: var(--tech-blue);
  color: #fff;
}
.gate-skip-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.gate-card-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  background: var(--tech-border);
  color: var(--tech-text-secondary);
}
.gate-card.active .gate-card-num {
  background: var(--tech-blue);
  color: #fff;
}
.gate-card-head {
  cursor: pointer;
  user-select: none;
}
.gate-card.locked .gate-card-head {
  cursor: not-allowed;
}
.gate-card-pending {
  padding: 8px 0;
  cursor: pointer;
  color: var(--tech-blue);
  font-size: 14px;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.gate-card-pending:hover {
  opacity: 1;
}
.gate-card-pending p {
  margin: 0;
}
.note-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.note-img {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
}
.note-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.note-img-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background: rgba(239, 83, 80, 0.9);
  color: #fff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  line-height: 18px;
  text-align: center;
}
.note-img-upload {
  width: 80px;
  height: 80px;
  border: 2px dashed var(--tech-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 24px;
  color: var(--tech-text-secondary);
  transition: all 0.2s;
}
.note-img-upload:hover {
  border-color: var(--tech-blue);
  color: var(--tech-blue);
}
.gate-card-done-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gate-card-done-inner p {
  font-size: 14px;
  color: var(--tech-text-secondary);
  line-height: 1.6;
  margin: 0;
}
.gate-card-done-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.gate-card-done-imgs img {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
}
.gate-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  gap: 20px;
}
.gate-hint {
  font-size: 12px;
  color: var(--tech-text-secondary);
  white-space: nowrap;
}
.gate-nudge {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(255, 152, 0, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(255, 152, 0, 0.2);
}
.gate-nudge-ai {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.gate-nudge-text {
  flex: 1;
  font-size: 13px;
  color: var(--tech-text-primary);
  line-height: 1.5;
}
.gate-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 6px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.gate-final-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
</style>
