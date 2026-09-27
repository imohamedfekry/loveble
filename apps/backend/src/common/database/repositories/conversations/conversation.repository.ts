import { Injectable, Inject } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';

import { BaseRepository } from '../base.repository';
import { DRIZZLE_DB } from 'src/common/database/database.constants';
import type { DrizzleDatabase } from 'src/common/database/database.constants';
import {
  conversations,
  Conversation,
  NewConversation,
} from '../../schema/conversations/conversation.schema';

@Injectable()
export class ConversationRepository extends BaseRepository {
  constructor(@Inject(DRIZZLE_DB) db: DrizzleDatabase) {
    super(db);
  }

  async create(data: NewConversation): Promise<Conversation> {
    const [conversation] = await this.db
      .insert(conversations)
      .values(data)
      .returning();

    return conversation;
  }

  async findById(id: bigint): Promise<Conversation | null> {
    const result = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  async findByProject(projectId: bigint): Promise<Conversation[]> {
    return this.db
      .select()
      .from(conversations)
      .where(eq(conversations.projectId, projectId))
      .orderBy(desc(conversations.updatedAt));
  }

  async update(
    id: bigint,
    data: Partial<Omit<Conversation, 'id' | 'projectId'>>,
  ): Promise<Conversation | null> {
    const [conversation] = await this.db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();

    return conversation ?? null;
  }

  async delete(id: bigint): Promise<boolean> {
    const result = await this.db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning();

    return result.length > 0;
  }
}
