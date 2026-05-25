export function createToastLifecycle(onChange, defaultDuration = 2500) {
  const state = {
    visible: false,
    message: '',
    type: 'success',
    title: '提示'
  };

  let timer = null;

  const emit = () => {
    if (typeof onChange === 'function') {
      onChange({ ...state });
    }
  };

  const hide = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    state.visible = false;
    state.message = '';
    state.title = '提示';
    emit();
  };

  const show = (message, options = {}) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    state.visible = true;
    state.message = message;
    state.type = options.type || 'success';
    state.title = options.title || state.title || '提示';
    emit();

    const duration = options.duration ?? defaultDuration;
    timer = setTimeout(() => {
      hide();
    }, duration);
  };

  return {
    state,
    show,
    hide
  };
}
