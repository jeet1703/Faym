'use strict';

class SaleRepository {
  constructor(db) {
    this.db = db;
  }

  create({ userId, brandId, earning }) {
    const info = this.db
      .prepare('INSERT INTO sales (user_id, brand_id, earning) VALUES (?, ?, ?)')
      .run(userId, brandId, earning);
    return this.findById(Number(info.lastInsertRowid));
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM sales WHERE id = ?').get(id) || null;
  }

  findByUser(userId) {
    return this.db
      .prepare('SELECT * FROM sales WHERE user_id = ? ORDER BY id')
      .all(userId);
  }

  findPendingWithoutAdvance(userId) {
    return this.db
      .prepare(
        `SELECT * FROM sales
         WHERE user_id = ? AND status = 'pending' AND advance_payout_id IS NULL`
      )
      .all(userId);
  }

  markAdvancePaid(saleId, advanceAmount, payoutId) {
    this.db
      .prepare(
        `UPDATE sales
         SET advance_paid = ?, advance_payout_id = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(advanceAmount, payoutId, saleId);
    return this.findById(saleId);
  }

  reconcile(saleId, newStatus) {
    this.db
      .prepare(
        `UPDATE sales
         SET status = ?, reconciled_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(newStatus, saleId);
    return this.findById(saleId);
  }
}

module.exports = SaleRepository;
