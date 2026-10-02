import { db, isDbConfigured } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

const SUPER_ADMIN_EMAILS = new Set([
  'nurulanambashir20@gmail.com',
  'admin@ndcalumni.org',
  'bashir@ndcalumni.org',
]);

const inMemoryUsers: Array<any> = [
  {
    id: 1,
    uid: 'admin-notredame-master',
    email: 'admin@ndcalumni.org',
    fullName: 'Central Admin',
    role: 'admin',
    accountStatus: 'active',
    createdAt: new Date(),
    lastLoginAt: new Date(),
  },
  {
    id: 2,
    uid: 'alumnus-bashir',
    email: 'nurulanambashir20@gmail.com',
    fullName: 'Nurul Anam Bashir',
    role: 'admin',
    accountStatus: 'active',
    createdAt: new Date(),
    lastLoginAt: new Date(),
  },
];

export async function getOrCreateUser(uid: string, email: string, fullName?: string) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const isSuperAdmin = SUPER_ADMIN_EMAILS.has(cleanEmail);

  if (isDbConfigured) {
    try {
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
          role: isSuperAdmin ? 'admin' : 'admin',
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
      console.warn('Database user query failed, falling back to in-memory user registry:', error);
    }
  }

  // In-memory fallback
  const existingIndex = inMemoryUsers.findIndex(
    (u) => u.uid === uid || (cleanEmail && u.email?.toLowerCase() === cleanEmail)
  );

  if (existingIndex >= 0) {
    const current = inMemoryUsers[existingIndex];
    current.email = cleanEmail || current.email;
    current.role = isSuperAdmin ? 'admin' : current.role;
    current.lastLoginAt = new Date();
    return current;
  }

  const newUser = {
    id: inMemoryUsers.length + 1,
    uid,
    email: cleanEmail,
    fullName: fullName || cleanEmail.split('@')[0] || 'Notredamian Alumnus',
    role: isSuperAdmin ? 'admin' : 'member',
    accountStatus: 'active',
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };
  inMemoryUsers.push(newUser);
  return newUser;
}

export async function getUsers() {
  if (isDbConfigured) {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.warn('Database query failed, returning in-memory user store:', error);
    }
  }
  return inMemoryUsers;
}

