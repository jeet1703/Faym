'use strict';

class WithdrawalRepository {
  constructor(db) {
    this.db = db;
  }

  create({ userId, amount, status = 'PENDING' }) {
    const info = this.db
      .prepare('INSERT INTO withdrawals (user_id, amount, status) VALUES (?, ?, ?)')
      .run(userId, amount, status);
    return this.findById(Number(info.lastInsertRowid));
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id) || null;
  }

  findByUser(userId) {
    return this.db
      .prepare('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id')
      .all(userId);
  }

  findLastSuccessful(userId) {
    return (
      this.db
        .prepare(
          `SELECT * FROM withdrawals
           WHERE user_id = ? AND status = 'SUCCESS'
           ORDER BY created_at DESC, id DESC
           LIMIT 1`
        )
        .get(userId) || null
    );
  }

  updateStatus(id, status) {
    this.db
      .prepare(
        `UPDATE withdrawals SET status = ?, updated_at = datetime('now') WHERE id = ?`
      )
      .run(status, id);
    return this.findById(id);
  }
}

module.exports = WithdrawalRepository;
