<template>
  <t-space direction="vertical" style="overflow: hidden" size="1px">
    <t-space style="margin-top: 4px" size="1px">
      <t-button size="small" theme="primary" variant="text" @click="handleClickFullscreen">{{
        t('components.fullscreen')
      }}</t-button>
      <t-button size="small" theme="primary" variant="text" @click="handleClickCopyToClipboard">{{
        t('components.copy')
      }}</t-button>
    </t-space>
    <codemirror
      :model-value="modelValue"
      :style="{ height: props.height, width: props.width }"
      :extensions="extensions"
      style="display: contents"
      @change="onChange"
    />
  </t-space>
</template>
<script setup lang="ts">
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { linter } from '@codemirror/lint';
import { search } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { h, ref } from 'vue';
import { Codemirror } from 'vue-codemirror';

import { t } from '@/locales';

const props = defineProps({
  header: {
    type: String,
    default: '',
  },
  modelValue: {
    type: String,
    required: true,
  },
  height: {
    type: String,
    default: '300px',
  },
  width: {
    type: String,
    default: '100%',
  },
  format: {
    type: String as () => 'json' | 'markdown',
    default: 'json',
    validator: (v: string) => ['json', 'markdown'].includes(v),
  },
});

const emit = defineEmits(['update:modelValue']);

const extensions = ref([]);
if (props.format === 'json') {
  extensions.value = [oneDark, search(), json(), linter(jsonParseLinter(), { autoPanel: true })];
} else {
  extensions.value = [oneDark, markdown({ base: markdownLanguage })];
}

const onChange = (newValue: any) => {
  emit('update:modelValue', newValue);
};

const handleClickCopyToClipboard = () => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(props.modelValue);
  }
  MessagePlugin.success(t('components.copySuccess'));
};

const handleClickFullscreen = () => {
  const confirmDia = DialogPlugin({
    header: props.header,
    body: () => {
      return h(Codemirror, {
        modelValue: props.modelValue,
        extensions: extensions.value,
        style: { height: '790px', width: '100%' },
      });
    },
    showOverlay: true,
    footer: false,
    mode: 'full-screen',
    onClose: () => {
      confirmDia.hide();
    },
  });
};
</script>
<style lang="less" scoped></style>
