import { ref } from 'vue'
import { createToastLifecycle } from './toastLifecycle.js'

const toastState = {
  visible: ref(false),
  message: ref(''),
  type: ref('success'),
  title: ref('提示')
}

const toast = createToastLifecycle((state) => {
  toastState.visible.value = state.visible
  toastState.message.value = state.message
  toastState.type.value = state.type
  toastState.title.value = state.title || '提示'
}, 2600)

function showToast(message, options = {}) {
  if (options.title) {
    toastState.title.value = options.title
  } else if (options.type === 'success') {
    toastState.title.value = '成功'
  } else if (options.type === 'error') {
    toastState.title.value = '错误'
  } else {
    toastState.title.value = '提示'
  }

  toast.show(message, options)
}

function hideToast() {
  toast.hide()
}

function resetToast() {
  toastState.title.value = '提示'
  hideToast()
}

export {
  toastState,
  showToast,
  hideToast,
  resetToast
}
