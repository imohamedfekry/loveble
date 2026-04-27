# AI Builder Platform — Complete AI Instructions
> هذا الملف هو المرجع الكامل للـ AI لبناء المنصة. اقرأه كاملاً قبل أي خطوة.

---

## 🧠 ما هي المنصة بالظبط؟

منصة ويب تعمل كـ **AI Software Engineer**. المستخدم يدخل فكرة مشروع SaaS بالنص العادي، والمنصة:
1. تحلل الفكرة وتفهمها
2. تختار الـ Tech Stack المناسب بناءً على rules محددة (مش عشوائي)
3. تصمم الـ System Architecture
4. تولد كود backend + frontend حقيقي وشغال
5. تعرض الكود في editor داخل المتصفح مع live preview

**المنصة ليست code generator عادي — هي AI يفكر ويقرر ويبرر.**

---

## ✅ ما تم إنجازه بالفعل (لا تعيد بناءه)

```
backend/src/common/
├── bootstrap/          ✅ app bootstrap + config
├── core/               ✅ core.module.ts
├── database/           ✅ Drizzle ORM + PostgreSQL
│   ├── migrations/     ✅ 2 migrations جاهزين
│   ├── repositories/   ✅ BaseRepository + UserRepository + TempUserRepository
│   └── schema/         ✅ users table + temp_users table
├── decorator/          ✅ @AuthUser() decorator
├── filters/            ✅ catchAll + customHttpException
├── Global/
│   ├── config/         ✅ env.validation + jwt.config + redis.config
│   └── security/       ✅ AuthGuard + JWT services (access/refresh/temp) + OTP + Hash + Cryption
├── helpers/            ✅ api-response.helper
├── interceptors/       ✅ response.interceptor + BigInt.interceptor
├── redis/              ✅ redis.module + redis.service
└── utils/              ✅ snowflake IDs + types + response utils

backend/src/Modules/
├── auth/               ✅ كامل (register + login + OTP verification)
├── user/               ✅ كامل (CRUD)
└── default/            ✅ health check
```

**الـ Database Schema الموجود:**
```sql
users       → id (bigint/snowflake), username, email, password, mobile, country, timestamps
temp_users  → id, email, otp_hash, otp_expiry, timestamps
```

**الـ Tech Stack المستخدم (لا تغيره):**
- Runtime: **NestJS v11** + **Fastify v5** + **TypeScript**
- ORM: **Drizzle ORM** (مش Prisma)
- Database الرئيسي: **PostgreSQL**
- Cache/Queue: **Redis** (ioredis)
- IDs: **Snowflake IDs** (@sapphire/snowflake)
- Password: **Argon2**
- Validation: **class-validator** + **valibot** للـ env
- Package Manager: **pnpm**
- Frontend: **Angular** (مش React)

---

## 🏗️ Architecture الكاملة للمنصة

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Angular)                       │
│  Dashboard → New Project → Generation Progress → Editor      │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                  API GATEWAY (NestJS/Fastify)                 │
│              Auth Guard + Rate Limiting + CORS               │
└──────┬────────────┬────────────┬──────────────┬─────────────┘
       │            │            │              │
  ┌────▼────┐  ┌────▼────┐  ┌───▼────┐  ┌─────▼──────┐
  │Projects │  │  Files  │  │AI Chat │  │ WebSocket  │
  │ Module  │  │ Module  │  │Module  │  │  Gateway   │
  └────┬────┘  └────┬────┘  └───┬────┘  └─────┬──────┘
       │            │            │              │
  ┌────▼────────────▼────────────▼──────────────▼──────┐
  │              AI ORCHESTRATOR (LangGraph)             │
  │  Planner → Decision → Architect → CodeGen → Reviewer│
  └──────────────────────┬──────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
    ┌────▼────┐    ┌─────▼─────┐   ┌────▼────┐
    │PostgreSQL│    │  MongoDB  │   │  Redis  │
    │ (main)  │    │  (files)  │   │ (queue) │
    └─────────┘    └───────────┘   └─────────┘
                         │
                   ┌─────▼─────┐
                   │   Local   │
                   │  Storage  │
                   │(dev only) │
                   └───────────┘
```

---

## 🗄️ قرارات الـ Databases

### 1. PostgreSQL — البيانات الرئيسية ✅ موجود

**ليه؟** relational data واضح، ACID transactions مطلوب، foreign keys بين users و projects.

**الجداول الجديدة المطلوب إضافتها:**
```sql
projects      → id, user_id, name, description, status, stack(jsonb), created_at, updated_at
project_logs  → id, project_id, stage, message, created_at
```

### 2. MongoDB — الملفات والـ AI Output

**ليه MongoDB وليس PostgreSQL؟**
- كل مشروع هيكل ملفات مختلف تماماً — مش schema ثابت
- محتوى الملفات text كبير جداً (آلاف الأسطر) — مش مناسب في Postgres columns
- بنعمل queries بالـ `project_id` و `path` فقط — مش محتاجين joins معقدة
- MongoDB أسرع في read/write لـ large documents
- الـ AI output (JSON كبير) أسهل يتخزن كـ document

**الـ Collections:**
```javascript
// generated_files collection
{
  _id: ObjectId,
  projectId: string,        // reference للـ project في Postgres
  path: string,             // "src/modules/auth/auth.service.ts"
  content: string,          // الكود كاملاً
  language: string,         // "typescript" | "json" | "html" etc.
  size: number,             // bytes
  updatedAt: Date
}
// indexes: { projectId: 1 }, { projectId: 1, path: 1 } unique

// ai_results collection
{
  _id: ObjectId,
  projectId: string,
  stage: string,            // "planner" | "decision" | "architect" | "codegen" | "reviewer"
  input: object,
  output: object,
  tokensUsed: number,
  durationMs: number,
  createdAt: Date
}
// indexes: { projectId: 1 }, { projectId: 1, stage: 1 }
```

**الـ ORM لـ MongoDB: Mongoose**
```bash
pnpm add @nestjs/mongoose mongoose
pnpm add -D @types/mongoose
```

**ليه Mongoose وليس Drizzle لـ Mongo؟**
- Drizzle مش بيدعم MongoDB (Postgres + SQLite + MySQL فقط)
- Mongoose هو الـ standard لـ NestJS + MongoDB
- Schema validation جوا Mongoose محتاجه للـ files collection

### 3. Redis ✅ موجود — BullMQ Queue

**إضافة BullMQ:**
```bash
pnpm add @nestjs/bull bull
pnpm add -D @types/bull
```

**ليه Queue للـ AI Generation؟**
- الـ AI generation بياخد 30-60 ثانية
- مش ممكن نـ block الـ HTTP request
- BullMQ بيضمن إن الـ job هيكمل حتى لو الـ connection اتقطع
- SSE هتستعمله بدل الريست مع ال ai عشان يظهر الشات او كلام ال ai كل مايتم انجازة مش مره واحدة

### 4. Local File Storage (للـ Development فقط)

**بدل S3/R2 في الـ dev:**
```
backend/
└── uploads/
    └── projects/
        └── {project_id}/
            └── {filename}
```

**متى نحول لـ S3/R2؟** لما نطلع production. الـ service interface هيفضل نفسه — بس implementation بيتغير.

---

## 📦 الـ Modules الجديدة المطلوب بناؤها

### ترتيب البناء (مهم — لا تغيره)

```
1. ProjectsModule      ← الأساس، كل حاجة بتعتمد عليه
2. MongooseModule      ← لازم قبل FilesModule
3. FilesModule         ← بيخزن الـ generated code
4. QueueModule         ← BullMQ للـ AI jobs
5. AiModule            ← OpenAI service or gemini service or nvidia service
6. AgentsModule        ← الـ 5 agents
7. OrchestratorModule  ← LangGraph workflow
8. WebSocketGateway    ← real-time updates للـ frontend
9. ChatModule          ← AI chat مع context
```

---

## 🤖 AI Orchestrator — LangGraph Workflow

### ليه LangGraph؟
- بيدير الـ workflow بشكل graph — كل agent هو node
- بيدعم conditional edges (لو الـ reviewer لقى مشكلة يرجع للـ codegen)
- error handling + retry منيح
- state management بين الـ agents

### Installation
```bash
pnpm add @langchain/langgraph @langchain/core @langchain/openai langchain
```

### الـ State (اللي بيتنقل بين الـ agents)
```typescript
// src/Modules/ai-orchestrator/types/graph-state.type.ts
interface GraphState {
  projectId: string;
  description: string;
  
  // Planner output
  requirements?: {
    projectType: 'saas' | 'api' | 'dashboard' | 'ecommerce';
    domain: string;
    scale: 'small' | 'medium' | 'large';
    entities: string[];
    features: string[];
    realTime: boolean;
    multiTenant: boolean;
    requiresSEO: boolean;
    estimatedComplexity: 'low' | 'medium' | 'high';
  };
  
  // Decision output
  techDecisions?: {
    backend: string;
    frontend: string;
    databases: string[];
    cache: boolean;
    queue: boolean;
    reasoning: string;
  };
  
  // Architect output
  architecture?: {
    folderStructure: FolderNode[];
    apiEndpoints: ApiEndpoint[];
    dbSchema: DbTable[];
  };
  
  // CodeGen output
  generatedFiles?: GeneratedFile[];
  
  // Reviewer output
  reviewResult?: {
    passed: boolean;
    issues: ReviewIssue[];
    fixedFiles?: GeneratedFile[];
  };
  
  // Metadata
  currentStage: string;
  errors: string[];
  retryCount: number;
}
```

### الـ LangGraph Workflow
```typescript
// src/Modules/ai-orchestrator/orchestrator.graph.ts
import { StateGraph, END } from '@langchain/langgraph';

const workflow = new StateGraph<GraphState>({
  channels: graphStateChannels,
});

// إضافة الـ nodes
workflow.addNode('planner',    plannerNode);
workflow.addNode('decision',   decisionNode);
workflow.addNode('architect',  architectNode);
workflow.addNode('codegen',    codegenNode);
workflow.addNode('reviewer',   reviewerNode);
workflow.addNode('save',       saveFilesNode);

// الـ edges (الترتيب)
workflow.setEntryPoint('planner');
workflow.addEdge('planner',   'decision');
workflow.addEdge('decision',  'architect');
workflow.addEdge('architect', 'codegen');
workflow.addEdge('codegen',   'reviewer');

// Conditional edge: لو reviewer لقى مشكلة → رجع codegen (max 2 retries)
workflow.addConditionalEdges('reviewer', reviewerRouter, {
  retry:  'codegen',
  pass:   'save',
});
workflow.addEdge('save', END);

export const generationGraph = workflow.compile();
```

### الـ 5 Agents — System Prompts والـ Logic

#### Agent 1: Planner
```typescript
// دوره: يحول النص لـ structured requirements JSON
const PLANNER_PROMPT = `
أنت محلل متطلبات خبير. مهمتك تحليل وصف المشروع واستخراج requirements محددة.

قواعد مهمة:
- استخرج المعلومات الموجودة فعلاً، لا تفترض
- لو المعلومة مش واضحة، استخدم القيمة الافتراضية
- الـ output لازم يكون JSON فقط بدون أي نص إضافي

الـ output المطلوب (JSON فقط):
{
  "projectType": "saas|api|dashboard|ecommerce",
  "domain": "string (e.g. invoicing, crm, ecommerce)",
  "scale": "small|medium|large",
  "entities": ["string"],
  "features": ["auth", "crud", "email", "dashboard", "payments", "realtime", ...],
  "realTime": boolean,
  "multiTenant": boolean,
  "requiresSEO": boolean,
  "estimatedComplexity": "low|medium|high"
}

تعريفات:
- small: < 5 entities, < 10 features, solo developer
- medium: 5-15 entities, 10-20 features, small team  
- large: > 15 entities, > 20 features, multiple teams
`;

// Input: description (string)
// Output: requirements (object) — يتـ validate بـ zod قبل ما يتبعت للـ decision
```

#### Agent 2: Decision
```typescript
// دوره: يختار الـ tech stack بناءً على rules ثابتة
// مهم: الـ rules في الكود مش في الـ prompt

const TECH_RULES = {
  backend: [
    { condition: (r) => r.scale === 'small' || r.scale === 'medium', choice: 'nestjs-monolith' },
    { condition: (r) => r.scale === 'large' && r.estimatedComplexity === 'high', choice: 'nestjs-microservices' },
  ],
  frontend: [
    { condition: (r) => r.requiresSEO || r.projectType === 'ecommerce', choice: 'nextjs' },
    { condition: (r) => !r.requiresSEO && r.projectType === 'dashboard', choice: 'angular' },
    { condition: (r) => !r.requiresSEO, choice: 'react-vite' },
  ],
  databases: [
    { condition: (r) => true, include: 'postgresql' },  // دايمًا
    { condition: (r) => r.features.includes('files') || r.estimatedComplexity !== 'low', include: 'mongodb' },
    { condition: (r) => r.realTime || r.features.includes('notifications'), include: 'redis' },
  ],
};

const DECISION_PROMPT = `
أنت architect خبير. بناءً على الـ requirements دي والـ rules المعطاة، اختر الـ tech stack.

اشرح قرارك في جملة واحدة لكل اختيار.

الـ output (JSON فقط):
{
  "backend": "nestjs-monolith|nestjs-microservices",
  "frontend": "angular|nextjs|react-vite",
  "databases": ["postgresql", "mongodb", "redis"],
  "cache": boolean,
  "queue": boolean,
  "reasoning": {
    "backend": "string",
    "frontend": "string",
    "databases": "string"
  }
}
`;
```

#### Agent 3: Architect
```typescript
// دوره: يصمم folder structure + API endpoints + DB schema
const ARCHITECT_PROMPT = `
أنت senior software architect. صمم الـ architecture الكامل للمشروع.

المدخلات: requirements + techDecisions

الـ output (JSON فقط):
{
  "folderStructure": [
    {
      "path": "src/modules/auth",
      "type": "directory",
      "children": [...]
    }
  ],
  "apiEndpoints": [
    {
      "method": "POST",
      "path": "/auth/login",
      "description": "string",
      "requestBody": {},
      "response": {}
    }
  ],
  "dbSchema": [
    {
      "table": "string",
      "columns": [
        { "name": "string", "type": "string", "constraints": ["PK", "NOT NULL", "UNIQUE"] }
      ],
      "foreignKeys": [...]
    }
  ]
}

قواعد:
- NestJS: module per feature (auth, users, projects, etc.)
- Angular: feature modules + shared module + core module
- كل endpoint له DTO واضح
- كل table له timestamps (created_at, updated_at)
- استخدم snowflake IDs (bigint) مش UUID
`;
```

#### Agent 4: Code Generator
```typescript
// دوره: يكتب الكود الفعلي ملف ملف
// مهم: يولد الملفات بالترتيب عشان الـ imports تكون صح

const FILE_GENERATION_ORDER = [
  // Backend أولاً
  'package.json',
  'src/common/database/schema/*.ts',    // DB schemas أول حاجة
  'src/common/database/migrations/',    // Drizzle migrations
  'src/modules/*/entities/*.ts',        // Mongoose schemas
  'src/modules/*/dto/*.ts',             // DTOs
  'src/modules/*/repositories/*.ts',   // Repositories
  'src/modules/*/*.service.ts',         // Services
  'src/modules/*/*.controller.ts',      // Controllers
  'src/modules/*/*.module.ts',          // Modules
  'src/app.module.ts',                  // Root module آخر حاجة
  
  // Frontend ثانياً
  'angular.json',
  'src/environments/',
  'src/app/core/',                       // Core module أول
  'src/app/shared/',                     // Shared module
  'src/app/features/*/models/',         // Interfaces أول
  'src/app/features/*/services/',       // Services
  'src/app/features/*/components/',     // Components
  'src/app/features/*/*.module.ts',     // Feature modules
  'src/app/app.module.ts',              // Root module آخر
];

const CODEGEN_PROMPT = `
أنت senior developer. اكتب كود احترافي وشغال فعلاً.

الـ context المتاح:
- project requirements: {requirements}
- tech decisions: {techDecisions}
- architecture: {architecture}
- الملفات اللي اتولدت خلاص: {existingFiles}
- الملف المطلوب دلوقتي: {targetFile}

قواعد صارمة:
1. الكود لازم يـ compile من غير errors
2. كل import لازم يكون صح ويشاور على ملف موجود
3. استخدم نفس patterns الموجودة في الـ existing files
4. NestJS: استخدم decorators صح (@Injectable, @Controller, @Module)
5. Angular: standalone components + OnPush change detection
6. لا تكتب TODO أو placeholder — اكتب كود حقيقي
7. Drizzle schemas لازم تتطابق مع الـ dbSchema في الـ architecture

الـ output (JSON فقط):
{
  "path": "string",
  "content": "string (الكود كاملاً)",
  "language": "typescript|json|html|css|...",
  "dependencies": ["package names لو في dependencies جديدة"]
}
`;
```

#### Agent 5: Reviewer
```typescript
// دوره: يراجع الكود ويتأكد من consistency
const REVIEWER_PROMPT = `
أنت code reviewer خبير. راجع الملفات دي وابحث عن:

1. Import errors: imports بتشاور على ملفات مش موجودة
2. Type mismatches: DTOs مش متطابقة مع الـ DB schema
3. Missing dependencies: services/modules مش محطوطة في الـ module imports
4. Angular-specific: missing providers, wrong import paths
5. NestJS-specific: missing @Module decorators, wrong injection

الـ output (JSON فقط):
{
  "passed": boolean,
  "issues": [
    {
      "file": "string",
      "line": number,
      "type": "import_error|type_mismatch|missing_dep|...",
      "description": "string",
      "fix": "string"
    }
  ]
}

لو passed = false → سيتم إرسال الملفات دي للـ code generator للإصلاح
لو retryCount > 2 → passed = true عشان ما ندخلش في loop لا نهائية
`;
```

---

## 📁 الـ Modules Structure التفصيلية

### ProjectsModule
```
src/Modules/projects/
├── dto/
│   ├── create-project.dto.ts
│   └── project-response.dto.ts
├── schema/                         ← Drizzle schemas جديدة
│   ├── project.schema.ts
│   └── project-log.schema.ts
├── repositories/
│   ├── project.repository.ts
│   └── project-log.repository.ts
├── projects.controller.ts
├── projects.service.ts
└── projects.module.ts
```

**Drizzle Schema:**
```typescript
// project.schema.ts
import { pgTable, bigint, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { users } from '../user';

export const projectStatusEnum = pgEnum('project_status', [
  'pending', 'analyzing', 'generating', 'ready', 'failed'
]);

export const projects = pgTable('projects', {
  id:          bigint('id', { mode: 'bigint' }).primaryKey(),
  userId:      bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:        varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 2000 }).notNull(),
  status:      projectStatusEnum('status').default('pending').notNull(),
  stack:       jsonb('stack'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
});

export const projectLogs = pgTable('project_logs', {
  id:        bigint('id', { mode: 'bigint' }).primaryKey(),
  projectId: bigint('project_id', { mode: 'bigint' }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  stage:     varchar('stage', { length: 50 }).notNull(),
  message:   varchar('message', { length: 1000 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**الـ Endpoints:**
```
POST   /projects              → ينشئ project (auth required)
GET    /projects              → projects بتاعت الـ logged in user
GET    /projects/:id          → project details + stack + status
DELETE /projects/:id          → يحذف (owner only)
POST   /projects/:id/generate → يبدأ الـ AI generation pipeline
GET    /projects/:id/logs     → generation logs
```

---

### FilesModule (MongoDB)
```
src/Modules/files/
├── schemas/                    ← Mongoose schemas
│   ├── generated-file.schema.ts
│   └── ai-result.schema.ts
├── dto/
│   ├── update-file.dto.ts
│   └── file-tree.dto.ts
├── files.repository.ts
├── files.controller.ts
├── files.service.ts
└── files.module.ts
```

**Mongoose Schemas:**
```typescript
// generated-file.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'generated_files', timestamps: { createdAt: false, updatedAt: 'updatedAt' } })
export class GeneratedFile extends Document {
  @Prop({ required: true, index: true })
  projectId: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  language: string;

  @Prop({ default: 0 })
  size: number;

  @Prop()
  updatedAt: Date;
}

export const GeneratedFileSchema = SchemaFactory.createForClass(GeneratedFile);
GeneratedFileSchema.index({ projectId: 1, path: 1 }, { unique: true });
```

**الـ Endpoints:**
```
GET  /projects/:id/files          → file tree (paths فقط, مش content)
GET  /projects/:id/files/*path    → محتوى ملف واحد
PUT  /projects/:id/files/*path    → يعدل محتوى ملف (من الـ editor)
```

---

### AI Orchestrator Module
```
src/Modules/ai-orchestrator/
├── agents/
│   ├── planner.agent.ts
│   ├── decision.agent.ts
│   ├── architect.agent.ts
│   ├── codegen.agent.ts
│   └── reviewer.agent.ts
├── nodes/                      ← LangGraph nodes
│   ├── planner.node.ts
│   ├── decision.node.ts
│   ├── architect.node.ts
│   ├── codegen.node.ts
│   ├── reviewer.node.ts
│   └── save-files.node.ts
├── types/
│   ├── graph-state.type.ts
│   └── agent-output.types.ts
├── orchestrator.graph.ts       ← LangGraph workflow definition
├── orchestrator.service.ts     ← بيشغل الـ graph
├── orchestrator.processor.ts  ← BullMQ processor
└── orchestrator.module.ts
```

---

### WebSocket Gateway
```
src/Modules/websocket/
├── websocket.gateway.ts
├── websocket.service.ts        ← helper لإرسال events
└── websocket.module.ts
```

**Events:**
```typescript
// من السيرفر للـ client
'generation:started'    → { projectId }
'generation:stage'      → { projectId, stage: string, status: 'running'|'done'|'error' }
'generation:file'       → { projectId, path: string, language: string }
'generation:complete'   → { projectId, filesCount: number }
'generation:error'      → { projectId, message: string }
```

---

### Chat Module
```
src/Modules/chat/
├── dto/
│   └── chat-message.dto.ts
├── chat.controller.ts          ← POST /projects/:id/chat
├── chat.service.ts             ← بيبني الـ context ويبعته للـ AI
└── chat.module.ts
```

**الـ Context Strategy:**
```typescript
// chat.service.ts - ازاي بنبني الـ context
async buildContext(projectId: string, currentFilePath: string) {
  const project = await this.projectsService.findOne(projectId);
  const currentFile = await this.filesService.getFile(projectId, currentFilePath);
  
  // بنجيب الـ types + interfaces فقط (مش كل الكود)
  const typeFiles = await this.filesService.getFilesByPattern(projectId, '**/*.type.ts');
  const interfaceFiles = await this.filesService.getFilesByPattern(projectId, '**/interfaces/*.ts');
  
  // الـ file tree كـ paths فقط (مش content)
  const fileTree = await this.filesService.getFileTree(projectId);
  
  return {
    projectDescription: project.description,
    techStack: project.stack,
    fileTree: fileTree.map(f => f.path),        // paths فقط
    currentFile: { path: currentFilePath, content: currentFile.content },
    supportingFiles: [...typeFiles, ...interfaceFiles],  // types للـ context
  };
}
```

---

## 🗂️ الـ Database Module Setup (Mongoose + Drizzle معاً)

```typescript
// src/common/database/database.module.ts (محدّث)
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // الموجود: Drizzle/PostgreSQL connection
    // ...existing postgres setup...
    
    // جديد: MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [/* existing exports + MongooseModule */],
})
export class DatabaseModule {}
```

**إضافة env variables:**
```env
# .env
MONGODB_URL=mongodb://localhost:27017/aibuilder
```

**إضافة للـ env validation (valibot):**
```typescript
// src/common/Global/config/env.validation.ts
// أضف:
MONGODB_URL: v.pipe(v.string(), v.url()),
```

---

## 📦 الـ Packages الجديدة المطلوبة

```bash
# AI + LangGraph
pnpm add @langchain/langgraph @langchain/core @langchain/openai langchain

# MongoDB
pnpm add @nestjs/mongoose mongoose

# Queue
pnpm add @nestjs/bull bull
pnpm add -D @types/bull

# Validation زيادة
pnpm add zod                # للـ agent outputs validation

# Local file storage (dev only)
pnpm add multer @fastify/multipart
pnpm add -D @types/multer
```

**ليه الـ packages دي بالذات؟**

| Package | السبب |
|---|---|
| `@langchain/langgraph` | الـ workflow engine الأقوى للـ multi-agent systems |
| `@langchain/openai` | OpenAI integration مع streaming جاهز |
| `@nestjs/mongoose` | الـ standard لـ MongoDB في NestJS |
| `@nestjs/bull` | BullMQ integration مع NestJS lifecycle |
| `zod` | validate الـ AI outputs عشان مش دايمًا بيرجع JSON نظيف |

---

## 🔑 الـ Environment Variables الكاملة

```env
# Existing
DATABASE_URL=postgresql://user:pass@localhost:5432/aibuilder
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_TEMP_SECRET=...

# New
MONGODB_URL=mongodb://localhost:27017/aibuilder
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Local Storage (dev)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760    # 10MB

# Production (S3/R2) - غير مفعل في dev
# R2_ACCOUNT_ID=
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET_NAME=
```

---

## 🗓️ خطة التنفيذ المرحلية

### المرحلة الحالية — ابدأ هنا

**الخطوة 1: Drizzle Migration للـ Projects**
```bash
# بعد كتابة الـ schemas
pnpm db:generate
pnpm db:migrate
```

**الخطوة 2: ProjectsModule**
- `project.schema.ts` + `project-log.schema.ts`
- `project.repository.ts` (نفس pattern الـ UserRepository)
- `projects.service.ts` + `projects.controller.ts`
- `projects.module.ts`
- اتأكد إن `GET /projects` بيرجع projects للـ user الـ logged in بس

**الخطوة 3: MongoDB Setup**
- ركب `@nestjs/mongoose`
- عدّل `DatabaseModule` تضيف Mongoose connection
- أضف `MONGODB_URL` للـ env validation

**الخطوة 4: FilesModule**
- Mongoose schemas (`GeneratedFile` + `AiResult`)
- `files.repository.ts` + `files.service.ts`
- Endpoints (tree + get + update)

**الخطوة 5: BullMQ Queue**
- ركب `@nestjs/bull`
- اعمل `generation.queue.ts`
- `POST /projects/:id/generate` يضيف job (processor فارغ دلوقتي)
- اتأكد إن الـ job بيتضاف وبيشتغل

**الخطوة 6: AI Service**
- اعمل `AiService` مع `chat()` + `streamChat()` methods
- retry logic (3 attempts)
- اتأكد إنه شغال مع OpenAI API

**الخطوة 7: الـ 5 Agents**
- ابدأ بـ Planner → test عليه → Decision → test → إلخ
- كل agent اتأكد إن الـ output valid JSON قبل ما تكمل

**الخطوة 8: LangGraph Orchestrator**
- اعمل الـ graph
- اربط الـ nodes
- اتأكد من الـ conditional edge في الـ reviewer

**الخطوة 9: WebSocket Gateway**
- اعمل الـ gateway
- ارسل events من الـ nodes أثناء الـ generation

**الخطوة 10: Chat Module**
- `POST /projects/:id/chat`
- streaming response
- context building

---

## ⚠️ قواعد مهمة لا تخالفها

1. **لا تغير الـ common layer** — الـ filters + interceptors + guards + JWT services شغالة ومحتاجة تفضل كما هي.

2. **استخدم Snowflake IDs** في كل Postgres table جديدة — مش UUID.

3. **اتبع نفس Repository Pattern** — كل service بيتكلم مع الـ DB عن طريق repository، مش مباشرة.

4. **الـ response format ثابت** — كل response بيمر على `api-response.helper.ts` — لا تكسر الـ format.

5. **MongoDB للـ files فقط** — كل حاجة تانية في Postgres.

6. **Zod validation على كل AI output** — الـ AI ممكن يرجع JSON غلط أو ناقص. Validate دايمًا قبل ما تبعته للـ agent الجاي.

7. **اكتب migration بعد كل schema جديد** — `pnpm db:generate && pnpm db:migrate`.

8. **الـ WebSocket يبعت events أثناء كل stage** — المستخدم لازم يعرف إيه اللي بيحصل في real-time.

---

## 🔍 الـ Frontend (Angular) — نظرة عامة

الـ frontend هيتعمل **بعد** ما الـ backend خلص. الـ structure:

```
frontend/ (Angular 18+)
├── src/app/
│   ├── core/                     ← singleton services + guards + interceptors
│   │   ├── auth/
│   │   ├── api/                  ← HTTP service base
│   │   └── store/                ← NgRx or simple signals store
│   ├── shared/                   ← reusable components + pipes + directives
│   ├── features/
│   │   ├── auth/                 ← ✅ موجود
│   │   ├── dashboard/            ← قايمة المشاريع
│   │   ├── new-project/          ← إدخال الفكرة
│   │   ├── generation/           ← progress + real-time logs
│   │   └── editor/               ← Monaco + FileTree + Preview + Chat
│   └── app.routes.ts             ← standalone routing
```

**الـ Editor Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Navbar: [ProjectName] [Status Badge] [Deploy]       │
├──────────┬──────────────────────┬───────────────────┤
│ FileTree │   Monaco Editor      │  AI Chat Panel    │
│          │                      │                   │
│  (20%)   │       (50%)          │     (30%)         │
│          ├──────────────────────┤                   │
│          │  Live Preview        │                   │
│          │  (WebContainers)     │                   │
└──────────┴──────────────────────┴───────────────────┘
```

**Angular packages للـ editor:**
```bash
npm install monaco-editor @monaco-editor/loader
npm install @webcontainer/api         # live preview
npm install socket.io-client          # WebSocket
npm install @ngrx/signals             # state management (Angular 18+)
```

---

## 📝 ملاحظات على الـ Production (للمستقبل)

**S3/R2 Migration:**
- اعمل `StorageService` interface من البداية
- `LocalStorageService implements StorageService` للـ dev
- `R2StorageService implements StorageService` للـ production
- النقل: غير الـ injection في `StorageModule` بس، الـ code التاني ما بيتغيرش

**Scaling:**
- لو المشاريع كتيرت → الـ BullMQ queue هيـ handle الضغط
- لو الـ AI generation بطأ → زود workers في الـ BullMQ
- لو الـ MongoDB كبرت → add compound index على `{ projectId, path }`

---

*آخر تحديث: بعد إنجاز Auth + User modules*
