const { z } = require("zod");
const customerService = require("./service");

const createCustomerSchema = z.object({
  name: z.string().min(1),
  tierId: z.string().uuid(),
  currency: z.string().min(3).max(3).optional(),
  assignedRepId: z.string().uuid().optional(),
});

async function listCustomers(req, res, next) {
  try {
    const customers = await customerService.listCustomers();
    res.json({ customers });
  } catch (error) {
    next(error);
  }
}

async function getCustomer(req, res, next) {
  try {
    const customer = await customerService.getCustomerById(
      req.params.id
    );

    res.json({ customer });
  } catch (error) {
    next(error);
  }
}

async function listCustomerTiers(req, res, next) {
  try {
    const tiers = await customerService.listCustomerTiers();
    res.json({ tiers });
  } catch (error) {
    next(error);
  }
}

async function createCustomer(req, res, next) {
  try {
    const data = createCustomerSchema.parse(req.body);

    const customer = await customerService.createCustomer(data);

    res.status(201).json({ customer });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCustomers,
  getCustomer,
  listCustomerTiers,
  createCustomer,
};