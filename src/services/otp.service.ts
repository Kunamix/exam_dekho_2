
import axios from "axios";
import { randomInt } from "crypto";

import { myEnvironment, prisma } from "@/configs";
import { APP_CONSTANTS, HTTP_STATUS, ERROR_MESSAGES } from "@/constants";
import { ApiError } from "@/utils";

export class OTPService {
  /**
   * Generate a secure 4-digit OTP.
   */
  private generateCode(): string {
    return randomInt(1000, 10000).toString();
  }

 
  private normalizePhoneNumber(phoneNumber: string): string {
    let cleanNumber = phoneNumber.trim();

    // Remove +91 prefix
    if (cleanNumber.startsWith("+91")) {
      cleanNumber = cleanNumber.substring(3);
    }

    // Remove any remaining non-digit characters
    cleanNumber = cleanNumber.replace(/\D/g, "");

    // Handle 91XXXXXXXXXX format
    if (cleanNumber.length === 12 && cleanNumber.startsWith("91")) {
      cleanNumber = cleanNumber.substring(2);
    }

    return cleanNumber;
  }

  /**
   * Send OTP to user's phone number.
   */
  async sendOTP(phoneNumber: string): Promise<{ otpId: string }> {
    const cleanNumber = this.normalizePhoneNumber(phoneNumber);

    // Validate phone number
    if (cleanNumber.length !== 10) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_PHONE_NUMBER,
      );
    }

    // 1. Invalidate old OTPs for this number
    await prisma.oTP.deleteMany({
      where: {
        phoneNumber: cleanNumber,
      },
    });

    // 2. Generate 4-digit OTP
    const code = this.generateCode();

    // 3. Build SMS message
    const message = `Dear User, your Code for Dekho Exam is ${code}. This code is valid for ${APP_CONSTANTS.OTP_EXPIRY_MINUTES} minutes. Please do not share it with anyone. - Dekho Exam Sysgrain Infotech`;

    // 4. Send SMS
    try {
      const { data } = await axios.get(
        myEnvironment.SMS_BASE_URL as string,
        {
          params: {
            apikey: myEnvironment.SMS_API_KEY,
            senderid: myEnvironment.SMS_SENDER_ID,
            templateid: myEnvironment.SMS_TEMPLATE_ID,
            number: cleanNumber,
            message,
          },
        },
      );

      // SMS API success response
      if (data?.status !== "Success") {
        console.error("SMS API error:", data);

        throw new Error(
          data?.description || "SMS delivery failed",
        );
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }

      console.error(
        "SMS send error:",
        error?.message || error,
      );

      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to send OTP. Please try again later.",
      );
    }

    // 5. Calculate OTP expiry
    const expiresAt = new Date();

    expiresAt.setMinutes(
      expiresAt.getMinutes() +
        APP_CONSTANTS.OTP_EXPIRY_MINUTES,
    );

    // 6. Store OTP in database
    const otpRecord = await prisma.oTP.create({
      data: {
        phoneNumber: cleanNumber,
        code,
        purpose: "login",
        expiresAt,
        isVerified: false,
        attempts: 0,
      },
    });

    return {
      otpId: otpRecord.id,
    };
  }

  /**
   * Verify OTP.
   */
  async verifyOTP(
    phoneNumber: string,
    code: string,
  ): Promise<void> {
    const cleanNumber = this.normalizePhoneNumber(phoneNumber);

    // Validate phone number
    if (cleanNumber.length !== 10) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_PHONE_NUMBER,
      );
    }

    // Validate OTP format
    if (!/^\d{4}$/.test(code)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_OTP,
      );
    }

    // 1. Get latest active OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        phoneNumber: cleanNumber,
        isVerified: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 2. OTP does not exist
    if (!otpRecord) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_REQUEST_OR_OTP,
      );
    }

    // 3. Check expiry
    if (new Date() > otpRecord.expiresAt) {
      await prisma.oTP.delete({
        where: {
          id: otpRecord.id,
        },
      });

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.OTP_EXPIRED,
      );
    }

    // 4. Check maximum attempts
    if (otpRecord.attempts >= 3) {
      await prisma.oTP.delete({
        where: {
          id: otpRecord.id,
        },
      });

      throw new ApiError(
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ERROR_MESSAGES.TOO_MANY_OTP_ATTEMPTS,
      );
    }

    // 5. Check OTP
    if (otpRecord.code !== code) {
      await prisma.oTP.update({
        where: {
          id: otpRecord.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        ERROR_MESSAGES.INVALID_OTP,
      );
    }

    // 6. Correct OTP - delete immediately
    // OTP becomes unusable after successful verification.
    await prisma.oTP.delete({
      where: {
        id: otpRecord.id,
      },
    });
  }
}






export const otpService = new OTPService();
