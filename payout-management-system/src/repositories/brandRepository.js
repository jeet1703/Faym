'use strict';

class BrandRepository {
  constructor(db) {
    this.db = db;
  }

  create({ id, name }) {
    this.db.prepare('INSERT INTO brands (id, name) VALUES (?, ?)').run(id, name);
    return this.findById(id);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM brands WHERE id = ?').get(id) || null;
  }
}

module.exports = BrandRepository;
