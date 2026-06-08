import { Router } from "express";
import {
  createExchange,
  getMyExchanges,
  getExchangeById,
} from "../controllers/exchangeController.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Protect all exchange routes for signed-in members
router.use(verifyJWT);

router.post("/", createExchange);
router.get("/me", getMyExchanges);
router.get("/:id", getExchangeById);

export default router;
