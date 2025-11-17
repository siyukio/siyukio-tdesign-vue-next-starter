<template>
  <t-form class="base-form" :data="formData" label-align="top" :label-width="100">
    <div class="form-basic-container">
      <div class="form-basic-item">
        <t-form-item :label="t('pages.formCode.json')" name="json">
          <code-input v-model="formData.json" format="json" />
        </t-form-item>
      </div>
      <div class="form-basic-item">
        <t-form-item :label="t('pages.formCode.markdown')" name="markdown">
          <code-input v-model="formData.markdown" format="markdown" />
        </t-form-item>
      </div>
    </div>
  </t-form>
</template>
<script setup lang="ts">
import { ref } from 'vue';

import CodeInput from '@/components/code-input/index.vue';
import { t } from '@/locales';

defineOptions({
  name: 'FormCode',
});

const inital_data = {
  json: `
{
  "name": "Siyukio Starter",
  "description": "A frontend starter template based on secondary development of Tencent TDesign's open-source project. Includes preserved TDesign source code but is not officially affiliated with Tencent.",
  "originalRepository": "tdesign-vue-next-starter",
  "features": [
    "Support for MCP WebSocket transport"
  ],
  "development": {
    "install": "pnpm install",
    "dev": "npm run dev"
  },
  "test": {
    "run": "npm run test"
  },
  "debugging": {
    "vscode": "Supports debugging through customized .vscode/launch.json"
  },
  "build": {
    "production": "npm run build",
    "testEnvironment": "npm run build:test"
  },
  "license": "MIT"
}
  `,
  markdown: `
### Development

# Install dependencies
pnpm install

# Start development server
npm run dev

### Test

# Start test
npm run test

### Debugging in VSCode

You can debug the project using VSCode with a custom [launch.json](./.vscode/launch.json).

### Build

# Build for production
npm run build

# Build for test environment
npm run build:test
  `,
};

const formData = ref({ ...inital_data });
</script>
<style lang="less" scoped></style>
