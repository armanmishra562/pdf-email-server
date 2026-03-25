import { Request, Response } from 'express';
import asyncHandler from '../../utils/asyncHandler';
import AuthService from './auth.service';
import ApiResponse from '../../utils/ApiResponse';

export const register = asyncHandler(async (req: Request, res: Response) => {
	const { email, password } = req.body;

	const response = await AuthService.register(email, password);

	return res.status(201).json(
		new ApiResponse(true, 'User registered successfully', {
			id: response.user.id,
			email: response.user.email,
			verificationToken: response.verificationToken,
		}),
	);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
	const { token } = req.query;

	await AuthService.verifyEmail(token as string);

	return res.json(new ApiResponse(true, 'Email verified successfully', null));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
	const { email, password } = req.body;

	const result = await AuthService.login(email, password);

	return res.json(new ApiResponse(true, 'Login successful', result));
});

export const refreshTokenHandler = asyncHandler(
	async (req: Request, res: Response) => {
		const { refreshToken } = req.body;

		const result = await AuthService.refreshToken(refreshToken);

		return res.json(new ApiResponse(true, 'Token refreshed', result));
	},
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await AuthService.forgotPassword(email);

    return res.json(
      new ApiResponse(true, "Reset token generated", result)
    );
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, password } = req.body;

    await AuthService.resetPassword(token, password);

    return res.json(
      new ApiResponse(true, "Password reset successful", null)
    );
  }
);

export const logout = asyncHandler(async (req: Request, res: Response) => {
	const { refreshToken } = req.body;

	await AuthService.logout(refreshToken);

	return res.json(new ApiResponse(true, 'Logged out successfully', null));
});
