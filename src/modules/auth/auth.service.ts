import bcrypt from 'bcrypt';
import crypto from 'crypto';
import AppError from '../../utils/AppError';
import { sendMail } from '../../utils/mailer';
import env from '../../config/env';
import {
	generateAccessToken,
	generateRefreshToken,
	getRefreshTokenExpiry,
	verifyRefreshToken,
} from '../../utils/jwt';
import authRepository from './auth.repository';

class AuthService {
	async register(email: string, password: string) {
		const existingUser = await authRepository.findUserByEmail(email);

		if (existingUser) {
			throw new AppError('User already exists', 409);
		}

		const hashedPassword = await bcrypt.hash(password, 12);

		const user = await authRepository.createUser(email, hashedPassword);

		const verificationToken = crypto.randomBytes(32).toString('hex');

		await authRepository.setEmailVerificationToken(
			user.id,
			verificationToken,
			new Date(Date.now() + 1000 * 60 * 60), // 1 hour
		);

		await sendMail({
			to: user.email,
			subject: 'Verify your email',
			// Use HTML so the token + instructions render cleanly in email clients.
			html: `<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.4;">
    <h2>Welcome!</h2>
    <p>Your email verification token is:</p>
    <p style="font-family: monospace; font-size: 14px; padding: 8px 12px; background: #f5f5f5; border-radius: 6px;">
      ${verificationToken}
    </p>
    <p>Verify by clicking the link below:</p>
    <p style="margin: 10px 0;">
      <a href="${env.publicUrl}/api/v1/auth/verify-email?token=${verificationToken}" target="_blank" style="display: inline-block; padding: 10px 14px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">
        Verify Email
      </a>
    </p>
    <p style="color: #6b7280; font-size: 12px;">If the link doesn&apos;t work, use the token in the verification endpoint.</p>
  </body>
</html>`,
		});

		return {
			user,
			verificationToken, // later send via email
		};
	}

	async verifyEmail(token: string) {
		const user = await authRepository.findByVerificationToken(token);

		if (!user) {
			throw new AppError('Invalid token', 400);
		}

		if (user.emailVerificationExpires! < new Date()) {
			throw new AppError('Token expired', 400);
		}

		await authRepository.verifyUser(token);

		return true;
	}

	async login(email: string, password: string) {
		const user = await authRepository.findUserByEmail(email);

		if (!user) {
			throw new AppError('Invalid credentials', 401);
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);

		if (!isPasswordValid) {
			throw new AppError('Invalid credentials', 401);
		}

		if (!user.isVerified) {
			throw new AppError('Please verify your email first', 403);
		}

		const accessToken = generateAccessToken({
			userId: user.id,
			role: user.role,
		});

		const refreshToken = generateRefreshToken({
			userId: user.id,
			role: user.role,
		});

		const hashedToken = await bcrypt.hash(refreshToken, 12);

		await authRepository.createRefreshToken(
			hashedToken,
			user.id,
			getRefreshTokenExpiry(),
		);

		return {
			accessToken,
			refreshToken,
			user: {
				id: user.id,
				email: user.email,
				role: user.role,
			},
		};
	}

	async refreshToken(refreshToken: string) {
		if (!refreshToken) {
			throw new AppError('Refresh token required', 400);
		}

		const decoded = verifyRefreshToken(refreshToken) as {
			userId: string;
			role: string;
		};

		const tokens = await authRepository.getUserTokens(decoded.userId);

		let validToken = null;

		for (const token of tokens) {
			const isMatch = await bcrypt.compare(refreshToken, token.token);
			if (isMatch) {
				validToken = token;
				break;
			}
		}

		if (!validToken) {
			throw new AppError('Invalid refresh token', 401);
		}

		if (validToken.expiresAt < new Date()) {
			await authRepository.deleteTokenById(validToken.id);

			throw new AppError('Refresh token expired', 401);
		}

		// TOKEN ROTATION

		// Delete old token
		await authRepository.deleteTokenById(validToken.id);

		// generate new tokens
		const newAccessToken = generateAccessToken({
			userId: decoded.userId,
			role: decoded.role,
		});

		const newRefreshToken = generateRefreshToken({
			userId: decoded.userId,
			role: decoded.role,
		});

		// store new refresh token (hashed)
		const hashedToken = await bcrypt.hash(newRefreshToken, 12);

		await authRepository.createRefreshToken(
			hashedToken,
			decoded.userId,
			getRefreshTokenExpiry(),
		);

		return {
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		};
	}

	async logout(refreshToken: string) {
		if (!refreshToken) {
			throw new AppError('Refresh token required', 400);
		}

		// 1️⃣ Decode to get userId
		const decoded = verifyRefreshToken(refreshToken) as {
			userId: string;
		};

		// 2️⃣ Get all tokens of user
		const tokens = await authRepository.getUserTokens(decoded.userId);

		// 3️⃣ Find matching token
		let tokenToDelete = null;

		for (const token of tokens) {
			const isMatch = await bcrypt.compare(refreshToken, token.token);
			if (isMatch) {
				tokenToDelete = token;
				break;
			}
		}

		if (!tokenToDelete) {
			throw new AppError('Invalid refresh token', 401);
		}

		// 4️⃣ Delete token
		await authRepository.deleteTokenById(tokenToDelete.id);

		return true;
	}

  async forgotPassword(email: string) {
    const user = await authRepository.findUserByEmail(email);
  
    if (!user) {
      throw new AppError("User not found", 404);
    }
  
    const resetToken = crypto.randomBytes(32).toString("hex");
  
    await authRepository.setPasswordResetToken(
      user.id,
      resetToken,
      new Date(Date.now() + 1000 * 60 * 15) // 15 min
    );
  
    // Send password reset token using configured mail provider.
    await sendMail({
      to: user.email,
      subject: 'Password reset',
      text:
        'You requested a password reset.\\n\\n' +
        'Your password reset token is:\\n' +
        `${resetToken}\\n\\n` +
        'To reset your password, call:\\n' +
        'POST /api/v1/auth/reset-password\\n' +
        'Body: { \"token\": \"<token>\", \"password\": \"<newPassword>\" }',
    });

    return { resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await authRepository.findByResetToken(token);
  
    if (!user) {
      throw new AppError("Invalid token", 400);
    }
  
    if (user.passwordResetExpires! < new Date()) {
      throw new AppError("Token expired", 400);
    }
  
    const hashedPassword = await bcrypt.hash(newPassword, 12);
  
    await authRepository.updatePassword(user.id, hashedPassword);
  
    // IMPORTANT: invalidate all refresh tokens
    const tokens = await authRepository.getUserTokens(user.id);
  
    for (const token of tokens) {
      await authRepository.deleteTokenById(token.id);
    }
  
    return true;
  }
}

export default new AuthService();
