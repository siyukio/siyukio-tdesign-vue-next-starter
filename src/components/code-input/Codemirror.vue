<template>
  <div ref="editorRef" :style="styleProps" class="cm-editor-wrapper" />
</template>
<script setup lang="ts">
import { java } from '@codemirror/lang-java';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { linter } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup, EditorView } from 'codemirror';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string;
  language?: 'json' | 'markdown' | 'groovy' | 'ts';
  extensions?: any[];
  style?: Record<string, string>;
}>();

const emit = defineEmits<{
  (e: 'change', value: string): void;
  (e: 'update:modelValue', value: string): void;
}>();

// Build language-specific extensions
const languageExtensions = computed(() => {
  switch (props.language) {
    case 'json':
      return [json(), linter(jsonParseLinter(), { autoPanel: true })];
    case 'groovy':
      return [java()];
    case 'markdown':
    default:
      return [markdown({ base: markdownLanguage })];
  }
});

const editorRef = ref<HTMLElement | null>(null);
let editorView: EditorView | null = null;

const styleProps = computed(() => props.style || {});

onMounted(() => {
  if (!editorRef.value) return;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const value = update.state.doc.toString();
      emit('update:modelValue', value);
      emit('change', value);
    }
  });

  editorView = new EditorView({
    doc: props.modelValue || '',
    parent: editorRef.value,
    extensions: [basicSetup, updateListener, oneDark, ...(props.extensions || []), ...languageExtensions.value],
  });
});

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy();
    editorView = null;
  }
});

// Sync external modelValue changes to editor
watch(
  () => props.modelValue,
  (newValue) => {
    if (editorView && newValue !== editorView.state.doc.toString()) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: newValue || '',
        },
      });
    }
  },
);
</script>
<style scoped>
.cm-editor-wrapper {
  overflow: auto;
}

.cm-editor-wrapper :deep(.cm-editor) {
  height: 100%;
}

.cm-editor-wrapper :deep(.cm-scroller) {
  overflow: auto;
}
</style>
