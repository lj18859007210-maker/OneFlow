const requiredFields = [
  { key: "title", label: "需求标题" },
  { key: "submitter", label: "提交人" },
  { key: "developer", label: "选择开发人员" },
  { key: "platform", label: "对应平台" },
  { key: "capability", label: "能力" },
  { key: "expectedDate", label: "期望日期" },
  { key: "avgDevTime", label: "开发前平均用时" },
  { key: "avgMonthlyCalls", label: "平均预估每月调用量" },
  { key: "postDevAvgTime", label: "开发后预计平均用时" },
  { key: "priority", label: "优先级" },
];

const normalizeText = (value) => String(value ?? "").trim();

export function isDecimalNumberText(value) {
  return /^\d+(?:\.\d+)?$/.test(normalizeText(value));
}

export function isIntegerNumberText(value) {
  return /^\d+$/.test(normalizeText(value));
}

export function sanitizeDecimalNumberText(value) {
  const source = normalizeText(value);
  let result = "";
  let hasDot = false;

  for (const char of source) {
    if (/\d/.test(char)) {
      result += char;
    } else if (char === "." && !hasDot) {
      result += char;
      hasDot = true;
    }
  }

  return result;
}

export function sanitizeIntegerNumberText(value) {
  return normalizeText(value).replace(/\D/g, "");
}

export function allowDecimalNumberInput(event) {
  if (!event.data) return;
  const input = event.target;
  let start = input.value.length;
  let end = input.value.length;

  try {
    start = input.selectionStart ?? input.value.length;
    end = input.selectionEnd ?? input.value.length;
  } catch (error) {
    start = input.value.length;
    end = input.value.length;
  }

  const nextValue =
    input.value.slice(0, start) + event.data + input.value.slice(end);

  if (!/^\d*(?:\.\d*)?$/.test(nextValue)) {
    event.preventDefault();
  }
}

export function allowIntegerNumberInput(event) {
  if (event.data && !/^\d+$/.test(event.data)) {
    event.preventDefault();
  }
}

export function validateRequirementForm(form = {}) {
  const missing = requiredFields
    .filter((field) => !normalizeText(form[field.key]))
    .map((field) => field.label);

  if (missing.length) {
    return `请填写${missing.join("、")}`;
  }

  if (
    !isDecimalNumberText(form.avgDevTime) ||
    !isDecimalNumberText(form.postDevAvgTime)
  ) {
    return "开发前后平均用时只能填写数字";
  }

  if (!isIntegerNumberText(form.avgMonthlyCalls)) {
    return "平均预估每月调用量只能填写数字";
  }

  return "";
}
