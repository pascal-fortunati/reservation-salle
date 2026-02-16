import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import { pool } from "./pool";

// Helper transactionnel :
// - BEGIN
// - exécute fn(conn)
// - COMMIT si OK, ROLLBACK si erreur
// - release() dans tous les cas
export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // ignore
    }
    throw err;
  } finally {
    conn.release();
  }
}

// Verrou applicatif MySQL.
// Utilisé pour sérialiser les opérations concurrentes sur une même "ressource"
// (ici : une journée de réservation) afin d'éviter les doubles insertions.
export async function getLock(
  conn: PoolConnection,
  lockName: string,
  timeoutSeconds = 10
) {
  const [rows] = await conn.execute<(RowDataPacket & { ok: 0 | 1 | null })[]>(
    "SELECT GET_LOCK(:lockName, :timeoutSeconds) AS ok",
    { lockName, timeoutSeconds }
  );
  return rows[0]?.ok === 1;
}

// Libère le lock même si l'opération a échoué.
export async function releaseLock(conn: PoolConnection, lockName: string) {
  await conn.execute("SELECT RELEASE_LOCK(:lockName)", { lockName });
}
