'use strict';

class WalletRepository {
  constructor(db) {
    this.db = db;
  }

  recordEntry({ userId, amount, reason, refType = null, refId = null, balanceAfter }) {
    const info = this.db
      .prepare(
        `INSERT INTO wallet_transactions (user_id, amount, reason, ref_type, ref_id, balance_after)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(userId, amount, reason, refType, refId, balanceAfter);
    return this.db
      .prepare('SELECT * FROM wallet_transactions WHERE id = ?')
      .get(Number(info.lastInsertRowid));
  }

  findByUser(userId) {
    return this.db
      .prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id')
      .all(userId);
  }
}

module.exports = WalletRepository;
