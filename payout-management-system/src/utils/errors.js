'use strict';

class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404, 'NOT_FOUND');
  }
}

class AlreadyReconciledError extends AppError {
  constructor(message) {
    super(message, 409, 'ALREADY_RECONCILED');
  }
}

class InsufficientBalanceError extends AppError {
  constructor(message) {
    super(message, 422, 'INSUFFICIENT_BALANCE');
  }
}

class WithdrawalCooldownError extends AppError {
  constructor(message, retryAt) {
    super(message, 429, 'WITHDRAWAL_COOLDOWN');
    this.retryAt = retryAt;
  }
}

class InvalidStateTransitionError extends AppError {
  constructor(message) {
    super(message, 409, 'INVALID_STATE_TRANSITION');
  }
}

module.exports = {
  AppError,
  NotFoundError,
  AlreadyReconciledError,
  InsufficientBalanceError,
  WithdrawalCooldownError,
  InvalidStateTransitionError,
};
