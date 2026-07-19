'use strict';

class UserRepository {
  constructor(db) {
    this.db = db;
  }

  create({ id, name }) {
    this.db
      .prepare('INSERT INTO users (id, name, wallet_balance) VALUES (?, ?, 0)')
      .run(id, name);
    return this.findById(id);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) || null;
  }

  adjustBalance(userId, delta) {
    this.db
      .prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?')
      .run(delta, userId);
    return this.findById(userId).wallet_balance;
  }
}

module.exports = UserRepository;
