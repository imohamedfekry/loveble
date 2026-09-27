import { Injectable, Inject } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import { BaseRepository } from '../base.repository';
import { DRIZZLE_DB } from 'src/common/database/database.constants';
import type { DrizzleDatabase } from 'src/common/database/database.constants';
import {
  messages,
  Message,
  NewMessage,
} from '../../schema/conversations/message.schema';

@Injectable()
export class MessageRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) db: DrizzleDatabase) {
    super(db);
  }

  async create(data: NewMessage): Promise<Message> {
    const [message] = await this.db.insert(messages).values(data).returning();

    return message;
  }

  async findById(id: bigint): Promise<Message | null> {
    const result = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  async findByConversation(conversationId: bigint): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  async findByProject(projectId: bigint): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.projectId, projectId))
      .orderBy(asc(messages.createdAt));
  }

  async update(
    id: bigint,
    data: Partial<Omit<Message, 'id' | 'projectId' | 'conversationId'>>,
  ): Promise<Message | null> {
    const [message] = await this.db
      .update(messages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();

    return message ?? null;
  }

  async delete(id: bigint): Promise<boolean> {
    const result = await this.db
      .delete(messages)
      .where(eq(messages.id, id))
      .returning();

    return result.length > 0;
  }
}
