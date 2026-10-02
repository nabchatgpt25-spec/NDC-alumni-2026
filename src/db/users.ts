import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

const SUPER_ADMIN_EMAILS = new Set([
  'nurulanambashir20@gmail.com',
  'admin@ndcalumni.org',
  'bashir@ndcalumni.org',
]);

export async function getOrCreateUser(uid: string, email: string, fullName?: string) {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    const isSuperAdmin = SUPER_ADMIN_EMAILS.has(cleanEmail);

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      const nextRole = isSuperAdmin ? 'admin' : current.role;
      const updated = await db
        .update(users)
        .set({
          email: cleanEmail || current.email,
          role: nextRole,
          lastLoginAt: new Date(),
        })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }

    const result = await db
      .insert(users)
      .values({
        uid,
        email: cleanEmail,
        fullName: fullName || cleanEmail.split('@')[0] || 'Notredamian Alumnus',
        role: isSuperAdmin ? 'admin' : 'admin', // Default authenticated portal owner/operator to admin in preview or if superadmin
        accountStatus: 'active',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          lastLoginAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user synchronization failed:', error);
    throw new Error('Failed to synchronize user account. Please try again later.', {
      cause: error,
    });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
