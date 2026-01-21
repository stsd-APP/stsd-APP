# 叁通速达 (Three Links Express) - 全栈开发手册 v1.0

## 1. 项目愿景
打造集**跨境物流（集运/搬家）**与**家具电商**于一体的综合服务平台。

## 2. 核心架构
本项目采用 Monorepo 架构。
- **Apps**: 
  - `apps/web`: 客户端 H5
  - `apps/admin`: 管理后台
  - `apps/api`: NestJS 后端
- **Packages**:
  - `packages/database`: Prisma 模型
  - `packages/ui`: 共享组件库

## 3. 快速开始
1. 安装依赖: `pnpm install`
2. 启动服务: `pnpm dev`
