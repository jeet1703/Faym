'use strict';

const { AppError } = require('../utils/errors');

class UserService {
  constructor({ userRepo }) {
    this.userRepo = userRepo;
  }

  createUser({ id, name }) {
    if (!id || !name) throw new AppError('id and name are required');
    if (this.userRepo.findById(id)) throw new AppError(`User '${id}' already exists`, 409, 'CONFLICT');
    return this.userRepo.create({ id, name });
  }
}

module.exports = UserService;
