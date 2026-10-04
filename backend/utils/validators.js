const mongoose = require('mongoose');

// Shared server-side field validators. Keep messages user-safe: they are returned
// to the client inside 400 responses, so never echo secrets or internals.

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const LICENSE_REGEX = /^(?=.{5,10}$)[A-Za-z]{2,5}-[0-9]{2,7}$/;

const isValidEmail = (value) => typeof value === 'string' && EMAIL_REGEX.test(value.trim());

const isValidPhone = (value) => typeof value === 'string' && PHONE_REGEX.test(value.trim());

// Passwords must be at least 8 characters and contain a letter and a number.
const isValidPassword = (value) =>
  typeof value === 'string' && value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value));

const isValidTime = (value) => typeof value === 'string' && TIME_REGEX.test(value);

const isValidLicenseNumber = (value) => typeof value === 'string' && LICENSE_REGEX.test(value.trim());

// Accepts a Date-parseable value that is not in the past (compares calendar days).
const isPresentOrFutureDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return date >= startOfToday;
};

const isPastDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date < new Date();
};

// Normalizes pagination query params. `all=true` short-circuits paging and is
// capped server-side so export endpoints can stream a full (bounded) dataset.
const MAX_LIMIT = 100;
const EXPORT_LIMIT = 5000;

const getPagination = (query, defaultLimit = 10) => {
  if (String(query.all) === 'true') {
    return { page: 1, limit: EXPORT_LIMIT, skip: 0, isExport: true };
  }
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, isExport: false };
};

const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidObjectId,
  isValidTime,
  isValidLicenseNumber,
  isPresentOrFutureDate,
  isPastDate,
  getPagination,
  buildPaginationMeta,
};
