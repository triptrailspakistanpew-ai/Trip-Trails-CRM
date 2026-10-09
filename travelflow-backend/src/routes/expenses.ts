import { Router } from "express";
import { getExpenses, getExpense, createExpense } from "../services/expense.service";
import { buildContext } from "../utils/context";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const expenses = await getExpenses(buildContext(req));
    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const expense = await getExpense(buildContext(req), req.params.id);
    res.json(expense);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const expense = await createExpense(buildContext(req), req.body);
    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

export default router;
