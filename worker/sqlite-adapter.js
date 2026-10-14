/**
 * Adapt Cloudflare SQLite-backed Durable Object storage to the subset of the
 * better-sqlite3 API used by BLACK X. Cloudflare's SQL cursor API is
 * synchronous, which lets the existing synchronous data-access layer keep
 * working while persisting data in the Durable Object.
 */
function splitStatements(input) {
  const sql = String(input || '');
  const statements = [];
  let current = '';
  let quote = '';
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];
    current += ch;

    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        current += next;
        i += 1;
        blockComment = false;
      }
      continue;
    }
    if (quote) {
      if (ch === quote) {
        if (next === quote && quote !== ']') {
          current += next;
          i += 1;
        } else {
          quote = '';
        }
      }
      continue;
    }

    if (ch === '-' && next === '-') {
      current += next;
      i += 1;
      lineComment = true;
      continue;
    }
    if (ch === '/' && next === '*') {
      current += next;
      i += 1;
      blockComment = true;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '[') {
      quote = ']';
      continue;
    }
    if (ch === ';') {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = '';
    }
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

function normalizeValue(value) {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return Number(value);
  return value;
}

function bindStatement(sql, args) {
  if (
    args.length === 1 && args[0] && typeof args[0] === 'object' &&
    !Array.isArray(args[0]) && !(args[0] instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(args[0]) && !(args[0] instanceof Date)
  ) {
    const named = args[0];
    const values = [];
    const positionalSql = String(sql).replace(/[@:$]([A-Za-z_][A-Za-z0-9_]*)/g, (_match, key) => {
      values.push(normalizeValue(named[key]));
      return '?';
    });
    return { sql: positionalSql, values };
  }

  const values = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return { sql: String(sql), values: values.map(normalizeValue) };
}

export function createCloudflareSqliteAdapter(storage) {
  const sqlStorage = storage.sql;

  const execute = (sql, args = []) => {
    const bound = bindStatement(sql, args);
    return sqlStorage.exec(bound.sql, ...bound.values);
  };

  return {
    pragma: () => undefined,

    exec(sql) {
      let result;
      for (const statement of splitStatements(sql)) {
        result = sqlStorage.exec(statement);
      }
      return result;
    },

    prepare(sql) {
      const text = String(sql);
      return {
        get: (...args) => execute(text, args).toArray()[0],
        all: (...args) => execute(text, args).toArray(),
        run: (...args) => {
          const cursor = execute(text, args);
          const row = sqlStorage.exec('SELECT last_insert_rowid() AS id').toArray()[0];
          return {
            changes: Number(cursor.rowsWritten || 0),
            lastInsertRowid: Number(row?.id || 0)
          };
        }
      };
    },

    transaction(fn) {
      return (...args) => storage.transactionSync(() => {
        const result = fn(...args);
        if (result && typeof result.then === 'function') {
          throw new TypeError('BLACK X Durable Object transactions must be synchronous');
        }
        return result;
      });
    }
  };
}
