import { Router } from "express";
import { getActiveBanners } from "@/controllers/mobile/banner.controller";
import { verifyToken } from "@/middlewares";

const router = Router();

router.get("/", verifyToken, getActiveBanners);

export default router;