<template>
  <common-drawer
    v-model:visible="drawerVisible"
    :title="title"
    :size="size"
    :confirm-text="confirmText"
    :cancel-text="cancelText"
    :show-confirm-btn="showConfirmBtn"
    :show-cancel-btn="showCancelBtn"
    :show-close-btn="showCloseBtn"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <t-form ref="formRef" :data="formData" :rules="formRules">
      <slot />
    </t-form>
  </common-drawer>
</template>
<script setup lang="ts">
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';
import { computed, ref } from 'vue';

import CommonDrawer from '@/components/common-drawer/index.vue';

interface Props {
  visible: boolean;
  title?: string;
  size?: string;

  confirmText?: string;
  cancelText?: string;
  showConfirmBtn?: boolean;
  showCancelBtn?: boolean;
  showCloseBtn?: boolean;
  formData: any;
  formRules: Record<string, FormRule[]>;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'validate-success', data: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  showConfirmBtn: true,
  showCancelBtn: true,
  showCloseBtn: true,
});

const emit = defineEmits<Emits>();

const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const formRef = ref<FormInstanceFunctions>();

const handleConfirm = async (params: any) => {
  const { resolve, reject } = params;
  const valid = await formRef.value?.validate();
  if (valid === true) {
    emit('validate-success', { resolve, reject });
  } else {
    resolve();
  }
};

const handleCancel = () => {
  formRef.value.reset();
};
</script>
