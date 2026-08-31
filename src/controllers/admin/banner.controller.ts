import { Request, Response } from "express";
import { bannerService } from "@/services/banner.service";
import { ERROR_MESSAGES, HTTP_STATUS, SUCCESS_MESSAGES } from "@/constants";
import { ApiError, ApiResponse, asyncHandler } from "@/utils";

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  const { title, redirectUrl, displayOrder } = req.body;
  const banner = await bannerService.create({
    title,
    redirectUrl,
    imagePath: file?.path,
    displayOrder: displayOrder === undefined ? 0 : Number(displayOrder),
  });

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, banner, SUCCESS_MESSAGES.BANNER_CREATED),
  );
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  const { title, redirectUrl, displayOrder, isActive, removeImage } = req.body;
  const banner = await bannerService.update({
    id: req.params.id.toString(),
    title,
    redirectUrl,
    imagePath: file?.path,
    displayOrder: displayOrder === undefined ? undefined : Number(displayOrder),
    isActive: isActive === undefined ? undefined : isActive === "true",
    removeImage: removeImage === "true",
  });

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, banner, SUCCESS_MESSAGES.BANNER_UPDATED),
  );
});

export const getAllBanners = asyncHandler(async (_req: Request, res: Response) => {
  const banners = await bannerService.getAll();
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, banners, SUCCESS_MESSAGES.BANNERS_FETCHED),
  );
});

export const toggleBannerStatus = asyncHandler(async (req: Request, res: Response) => {
  const banner = await bannerService.toggleStatus(req.params.id.toString());
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, banner, SUCCESS_MESSAGES.BANNER_UPDATED),
  );
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  if (!req.params.id) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.BANNER_NOT_FOUND);
  }
  const banner = await bannerService.delete(req.params.id.toString());
  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, banner, SUCCESS_MESSAGES.BANNER_DELETED),
  );
});