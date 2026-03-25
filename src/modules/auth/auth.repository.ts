import prisma from "../../config/prisma";

class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async createUser(email: string, password: string) {
    return prisma.user.create({
      data: { email, password },
    });
  }

  async createRefreshToken(token: string, userId: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  async getUserTokens(userId: string) {
    return prisma.refreshToken.findMany({
      where: { userId },
    });
  }

  async deleteTokenById(id: string) {
    return prisma.refreshToken.delete({
      where: { id },
    });
  }

  async setEmailVerificationToken(
    userId: string,
    token: string,
    expires: Date
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      },
    });
  }
  
  async verifyUser(token: string) {
    return prisma.user.update({
      where: { emailVerificationToken: token },
      data: {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
  }
  
  async findByVerificationToken(token: string) {
    return prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
  }

  async setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date
  ) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });
  }
  
  async findByResetToken(token: string) {
    return prisma.user.findUnique({
      where: { passwordResetToken: token },
    });
  }
  
  async updatePassword(userId: string, password: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        password,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  }
}

export default new AuthRepository();