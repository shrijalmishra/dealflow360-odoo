const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../../config/db");
const { AppError } = require("../../middleware/errorHandler");

function signInternalToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, type: "internal" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

function signCustomerToken(portalUser) {
  return jwt.sign(
    { sub: portalUser.id, customerId: portalUser.customerId, type: "customer" },
    process.env.CUSTOMER_JWT_SECRET,
    { expiresIn: process.env.CUSTOMER_JWT_EXPIRES_IN || "30d" }
  );
}

async function signupInternalUser({ name, email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError("A user with this email already exists", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  return { user: sanitizeUser(user), token: signInternalToken(user) };
}

async function loginInternalUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) throw new AppError("Invalid credentials", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  return { user: sanitizeUser(user), token: signInternalToken(user) };
}

// Customer portal login. The PS allows either magic-link or email/password;
// this implements email/password and leaves a clear seam for a magic-link
// flow to be added alongside it later without touching the token logic.
async function loginCustomerPortalUser({ email, password }) {
  const portalUser = await prisma.customerPortalUser.findUnique({
    where: { email },
    include: { customer: true },
  });
  if (!portalUser || !portalUser.passwordHash) {
    throw new AppError("Invalid credentials", 401);
  }

  const valid = await bcrypt.compare(password, portalUser.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  return {
    customer: { id: portalUser.customer.id, name: portalUser.customer.name },
    token: signCustomerToken(portalUser),
  };
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = {
  signupInternalUser,
  loginInternalUser,
  loginCustomerPortalUser,
};
