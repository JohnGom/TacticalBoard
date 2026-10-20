import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { AuthUser } from "@tactical-board/contracts";

const SCRYPT_KEY_BYTES = 64;
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const DUMMY_SALT = Buffer.alloc(16, 1);

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  created_at: Date | string;
}

interface PasswordIdentityRow extends UserRow {
  password_salt: string | null;
  password_hash: string | null;
}

export interface VerifiedGoogleProfile {
  subject: string;
  email: string;
  displayName: string;
  emailVerified: true;
}

export class DuplicateAccountError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "DuplicateAccountError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email or password is incorrect.");
    this.name = "InvalidCredentialsError";
  }
}

export class IdentityConflictError extends Error {
  constructor() {
    super("This Google account is already linked to another user.");
    this.name = "IdentityConflictError";
  }
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_BYTES, {
      N: 32_768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

async function verifyPassword(password: string, saltHex: string | null, hashHex: string | null): Promise<boolean> {
  if (!saltHex || !hashHex) {
    await deriveKey(password, DUMMY_SALT);
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    await deriveKey(password, DUMMY_SALT);
    return false;
  }
  if (salt.length !== 16 || expected.length !== SCRYPT_KEY_BYTES) {
    await deriveKey(password, DUMMY_SALT);
    return false;
  }

  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}

async function insertGoogleIdentity(client: PoolClient, userId: string, subject: string): Promise<void> {
  await client.query(
    `INSERT INTO auth_identities (id, user_id, provider, provider_subject)
     VALUES ($1, $2, 'google', $3)`,
    [randomUUID(), userId, subject],
  );
}

export class AuthService {
  constructor(private readonly pool: Pool) {}

  async register(input: { displayName: string; email: string; password: string }): Promise<AuthUser> {
    const email = normalizeEmail(input.email);
    const credentials = await hashPassword(input.password);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const created = await client.query<UserRow>(
        `INSERT INTO app_users (id, email, email_normalized, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, display_name, created_at`,
        [randomUUID(), email, email, input.displayName.trim()],
      );
      const user = created.rows[0];
      if (!user) throw new Error("User insert returned no row.");
      await client.query(
        `INSERT INTO auth_identities (id, user_id, provider, provider_subject, password_salt, password_hash)
         VALUES ($1, $2, 'password', $3, $4, $5)`,
        [randomUUID(), user.id, email, credentials.salt, credentials.hash],
      );
      await client.query("COMMIT");
      return toAuthUser(user);
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) throw new DuplicateAccountError();
      throw error;
    } finally {
      client.release();
    }
  }

  async login(emailInput: string, password: string): Promise<AuthUser> {
    const email = normalizeEmail(emailInput);
    const result = await this.pool.query<PasswordIdentityRow>(
      `SELECT u.id, u.email, u.display_name, u.created_at, i.password_salt, i.password_hash
       FROM app_users u
       JOIN auth_identities i ON i.user_id = u.id
       WHERE u.email_normalized = $1 AND i.provider = 'password'`,
      [email],
    );
    const row = result.rows[0];
    const valid = await verifyPassword(password, row?.password_salt ?? null, row?.password_hash ?? null);
    if (!row || !valid) throw new InvalidCredentialsError();
    return toAuthUser(row);
  }

  async getOrCreateGoogleUser(profile: VerifiedGoogleProfile): Promise<AuthUser> {
    if (!profile.emailVerified) throw new InvalidCredentialsError();
    const email = normalizeEmail(profile.email);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || profile.subject.length > 255) {
      throw new InvalidCredentialsError();
    }
    const displayName = (profile.displayName.trim() || email.split("@")[0] || "Coach").slice(0, 120);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existingIdentity = await client.query<UserRow>(
        `SELECT u.id, u.email, u.display_name, u.created_at
         FROM auth_identities i JOIN app_users u ON u.id = i.user_id
         WHERE i.provider = 'google' AND i.provider_subject = $1`,
        [profile.subject],
      );
      if (existingIdentity.rows[0]) {
        await client.query("COMMIT");
        return toAuthUser(existingIdentity.rows[0]);
      }

      const existingUser = await client.query<UserRow>(
        `SELECT id, email, display_name, created_at
         FROM app_users WHERE email_normalized = $1 FOR UPDATE`,
        [email],
      );
      const user = existingUser.rows[0] ?? (await client.query<UserRow>(
        `INSERT INTO app_users (id, email, email_normalized, display_name)
         VALUES ($1, $2, $2, $3)
         RETURNING id, email, display_name, created_at`,
        [randomUUID(), email, displayName],
      )).rows[0];
      if (!user) throw new Error("Google account creation returned no user.");

      await insertGoogleIdentity(client, user.id, profile.subject);
      await client.query("COMMIT");
      return toAuthUser(user);
    } catch (error) {
      await client.query("ROLLBACK");
      if (isUniqueViolation(error)) throw new IdentityConflictError();
      throw error;
    } finally {
      client.release();
    }
  }

  async createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await this.pool.query("DELETE FROM user_sessions WHERE expires_at <= NOW()");
    await this.pool.query(
      "INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [tokenHash, userId, expiresAt],
    );
    return { token, expiresAt };
  }

  async getSessionUser(token: string): Promise<AuthUser | null> {
    const tokenHash = hashSessionToken(token);
    const result = await this.pool.query<UserRow>(
      `SELECT u.id, u.email, u.display_name, u.created_at
       FROM user_sessions s JOIN app_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] ? toAuthUser(result.rows[0]) : null;
  }

  async deleteSession(token: string): Promise<void> {
    await this.pool.query("DELETE FROM user_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
