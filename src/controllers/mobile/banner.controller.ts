import { Request, Response } from "express";
import { HTTP_STATUS, SUCCESS_MESSAGES } from "@/constants";
import { ApiResponse, asyncHandler } from "@/utils";
import { bannerService } from "@/services/banner.service";

export const getActiveBanners = asyncHandler(async (_req: Request, res: Response) => {
  const banners = await bannerService.getActive();
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, banners, SUCCESS_MESSAGES.BANNERS_FETCHED),
  );
});