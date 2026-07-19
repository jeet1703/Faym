'use strict';

const { NotFoundError, AppError } = require('../utils/errors');

class SaleService {
  constructor({ saleRepo, userRepo, brandRepo }) {
    this.saleRepo = saleRepo;
    this.userRepo = userRepo;
    this.brandRepo = brandRepo;
  }

  createSale({ userId, brandId, earning }) {
    if (!this.userRepo.findById(userId)) {
      throw new NotFoundError(`User '${userId}' does not exist`);
    }
    if (!this.brandRepo.findById(brandId)) {
      throw new NotFoundError(`Brand '${brandId}' does not exist`);
    }
    if (typeof earning !== 'number' || earning < 0) {
      throw new AppError('earning must be a non-negative number');
    }
    return this.saleRepo.create({ userId, brandId, earning });
  }

  listForUser(userId) {
    return this.saleRepo.findByUser(userId);
  }
}

module.exports = SaleService;
