const { z } = require("zod");
const authService = require("./service");

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SALES_REP", "SALES_MANAGER", "FINANCE_OPS", "ADMIN"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function signup(req, res, next) {
  try {
    const data = signupSchema.parse(req.body);
    const result = await authService.signupInternalUser(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.loginInternalUser(data);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function customerLogin(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.loginCustomerPortalUser(data);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

const customerRegisterSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().optional(),
});

async function customerRegister(req, res, next) {
  try {
    const data = customerRegisterSchema.parse(req.body);
    const result = await authService.signupCustomerPortalUser(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, customerLogin, customerRegister };
