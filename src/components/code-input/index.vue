<template>
  <codemirror
    :model-value="modelValue"
    :style="{ height: props.height, width: props.width }"
    :extensions="extensions"
    @change="onChange"
  />
</template>
<script setup lang="ts">
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { linter } from '@codemirror/lint';
import { search } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { ref } from 'vue';
import { Codemirror } from 'vue-codemirror';

const props = defineProps({
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
</script>
<style lang="less" scoped></style>
