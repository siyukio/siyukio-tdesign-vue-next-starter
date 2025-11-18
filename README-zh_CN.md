简体中文 | [English](./README.md) 

### 项目简介

Siyukio Starter 是基于 Tencent TDesign 开源项目进行二次开发的前端项目模板。

本项目包含并保留来自 TDesign 的开源代码，原项目地址：
[tdesign-vue-next-starter](https://github.com/TDesign/tdesign-vue-next-starter)。

> ⚠️ 本项目与 Tencent 或 TDesign 无任何官方关联，仅基于其 MIT 协议公开代码进行二次开发。

### 组件

- code-input:支持codemirror展示json、markdown

### 特性

- 支持mcp websocket transport
- 支持水印

### 开发

``` bash
## 安装依赖
pnpm install

## 启动项目
npm run dev
```

### 测试

``` bash
## 启动测试
npm run test
```

### VSCode 调试

你可以使用 VSCode 并通过自定义的 [launch.json](./.vscode/launch.json) 文件来调试这个项目。

### 构建

```bash
## 构建正式环境
npm run build

## 构建测试环境
npm run build:test
```

### 开源协议

本项目基于 MIT 开源协议。

遵循 [MIT 协议](./LICENSE)。
