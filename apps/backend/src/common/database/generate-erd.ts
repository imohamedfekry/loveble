import { pgGenerate } from 'drizzle-dbml-generator';
import { conversations } from './schema/conversations/conversation.schema';
import { messages } from './schema/conversations/message.schema';
import { projects } from './schema/projects/project.schema';
import { files } from './schema/projects/file.schema';
import { users } from './schema/user/user.schema';
import { conversationsRelations } from './schema/conversations/conversation.relations';
import { messagesRelations } from './schema/conversations/message.relations';
import { projectsRelations } from './schema/projects/project.relations';
import { filesRelations } from './schema/projects/file.relations';
import { userRelations } from './schema/user/user.relations';
import { messageStatusEnum } from './schema/conversations/message.schema';
import { exportStatusEnum, importStatusEnum } from './schema/projects/project.schema';
import { fileTypeEnum } from './schema/projects/file.schema';

const schema = {
  conversations,
  messages,
  projects,
  files,
  users,
  conversationsRelations,
  messagesRelations,
  projectsRelations,
  filesRelations,
  userRelations,
  messageStatusEnum,
  exportStatusEnum,
  importStatusEnum,
  fileTypeEnum,
};

const dbml = pgGenerate({ schema, out: './docs/schema.dbml', relational: true });
console.log('DBML generated successfully at ./docs/schema.dbml');
