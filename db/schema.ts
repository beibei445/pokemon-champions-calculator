import {sqliteTable,text,integer,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const teams=sqliteTable('teams',{
 userId:text('user_id').notNull(),
 id:text('id').notNull(),
 name:text('name').notNull(),
 payload:text('payload').notNull(),
 updatedAt:integer('updated_at').notNull(),
 revision:integer('revision').notNull().default(1),
},table=>[primaryKey({columns:[table.userId,table.id]}),index('idx_teams_user_updated').on(table.userId,table.updatedAt)]);
