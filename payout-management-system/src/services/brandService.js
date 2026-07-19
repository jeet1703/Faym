'use strict';

const { AppError } = require('../utils/errors');

class BrandService {
  constructor({ brandRepo }) {
    this.brandRepo = brandRepo;
  }

  createBrand({ id, name }) {
    if (!id || !name) throw new AppError('id and name are required');
    if (this.brandRepo.findById(id)) throw new AppError(`Brand '${id}' already exists`, 409, 'CONFLICT');
    return this.brandRepo.create({ id, name });
  }
}

module.exports = BrandService;
