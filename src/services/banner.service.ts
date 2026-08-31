import { prisma } from "@/configs";
import {
  deleteImage,
  deleteLocalFile,
  extractPublicIdFromUrl,
  uploadImageFromPath,
} from "@/configs/cloudinary.config";
import { ERROR_MESSAGES, HTTP_STATUS } from "@/constants";
import { ApiError } from "@/utils";

interface CreateBannerInput {
  title?: string;
  redirectUrl?: string;
  imagePath?: string;
  displayOrder?: number;
}

interface UpdateBannerInput extends CreateBannerInput {
  id: string;
  isActive?: boolean;
  removeImage?: boolean;
}

export class BannerService {
  async create({ title, redirectUrl, imagePath, displayOrder = 0 }: CreateBannerInput) {
    if (!imagePath) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.BANNER_IMAGE_REQUIRED);
    }

    let imageUrl: string;
    try {
      imageUrl = (await uploadImageFromPath(imagePath, "banners")).secure_url;
    } catch (error) {
      console.error("Failed to upload banner image to Cloudinary:", error);
      throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_MESSAGES.IMAGE_UPLOAD_FAILED);
    }

    return prisma.banner.create({
      data: {
        title: title?.trim() || null,
        redirectUrl: redirectUrl?.trim() || null,
        imageUrl,
        displayOrder,
      },
    });
  }

  async update({
    id,
    title,
    redirectUrl,
    imagePath,
    displayOrder,
    isActive,
    removeImage = false,
  }: UpdateBannerInput) {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      if (imagePath) deleteLocalFile(imagePath);
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.BANNER_NOT_FOUND);
    }

    if (removeImage && !imagePath) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.BANNER_IMAGE_REQUIRED);
    }

    let imageUrl = banner.imageUrl;
    if (imagePath) {
      try {
        imageUrl = (await uploadImageFromPath(imagePath, "banners")).secure_url;
      } catch (error) {
        console.error("Failed to upload banner image to Cloudinary:", error);
        throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_MESSAGES.IMAGE_UPLOAD_FAILED);
      }

      const oldPublicId = extractPublicIdFromUrl(banner.imageUrl);
      if (oldPublicId) {
        try {
          await deleteImage(oldPublicId);
        } catch (error) {
          console.warn("Failed to delete old banner image from Cloudinary:", error);
        }
      }
    }

    return prisma.banner.update({
      where: { id },
      data: {
        title: title === undefined ? undefined : title.trim() || null,
        redirectUrl: redirectUrl === undefined ? undefined : redirectUrl.trim() || null,
        imageUrl,
        displayOrder,
        isActive,
      },
    });
  }

  async getAll() {
    return prisma.banner.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  async getActive() {
    return prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  async toggleStatus(id: string) {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.BANNER_NOT_FOUND);
    }

    return prisma.banner.update({
      where: { id },
      data: { isActive: !banner.isActive },
    });
  }

  async delete(id: string) {
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_MESSAGES.BANNER_NOT_FOUND);
    }

    const publicId = extractPublicIdFromUrl(banner.imageUrl);
    if (publicId) {
      try {
        await deleteImage(publicId);
      } catch (error) {
        console.warn("Failed to delete banner image from Cloudinary:", error);
      }
    }

    return prisma.banner.delete({ where: { id } });
  }
}

export const bannerService = new BannerService();