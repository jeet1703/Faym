'use strict';

class PayoutRepository {
  constructor(db) {
    this.db = db;
  }

  create({ userId, saleId = null, type, amount, status = 'SUCCESS' }) {
    const info = this.db
      .prepare(
        `INSERT INTO payouts (user_id, sale_id, type, amount, status)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(userId, saleId, type, amount, status);
    return this.findById(Number(info.lastInsertRowid));
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM payouts WHERE id = ?').get(id) || null;
  }

  findByUser(userId) {
    return this.db
      .prepare('SELECT * FROM payouts WHERE user_id = ? ORDER BY id')
      .all(userId);
  }
}

module.exports = PayoutRepository;
