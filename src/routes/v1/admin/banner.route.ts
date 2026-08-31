import { Router } from "express";
import { imageUpload, verifyAdmin, verifyToken } from "@/middlewares";
import {
  createBanner,
  deleteBanner,
  getAllBanners,
  toggleBannerStatus,
  updateBanner,
} from "@/controllers/admin/banner.controller";

const router = Router();
const adminOnly = [verifyToken, verifyAdmin];

router.post("/create", ...adminOnly, imageUpload.single("image"), createBanner);
router.get("/", ...adminOnly, getAllBanners);
router.put("/:id", ...adminOnly, imageUpload.single("image"), updateBanner);
router.patch("/:id/toggle-status", ...adminOnly, toggleBannerStatus);
router.delete("/:id", ...adminOnly, deleteBanner);

export default router;