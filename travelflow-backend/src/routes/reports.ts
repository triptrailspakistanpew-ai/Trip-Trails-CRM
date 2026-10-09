import { Router } from "express";
import { getProfitAndLoss, getBalanceSheet, getTrialBalance } from "../services/report.service";
import { buildContext } from "../utils/context";
import { requirePermission } from "../middleware/role.middleware";

const router = Router();

router.use(requirePermission("Reports: View"));

router.get("/profit-and-loss", async (req, res, next) => {
  try {
    const startDate = new Date(req.query.startDate as string || "2000-01-01");
    const endDate = new Date(req.query.endDate as string || "2100-01-01");
    const report = await getProfitAndLoss(buildContext(req), startDate, endDate);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.get("/balance-sheet", async (req, res, next) => {
  try {
    const asOfDate = new Date(req.query.asOfDate as string || new Date());
    const report = await getBalanceSheet(buildContext(req), asOfDate);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.get("/trial-balance", async (req, res, next) => {
  try {
    const asOfDate = new Date(req.query.asOfDate as string || new Date());
    const report = await getTrialBalance(buildContext(req), asOfDate);
    res.json(report);
  } catch (error) {
    next(error);
  }
});

export default router;
