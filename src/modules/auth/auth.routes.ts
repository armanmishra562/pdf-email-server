import { Router } from 'express';
import {
	register,
	verifyEmail,
	login,
	refreshTokenHandler,
	logout,
    forgotPassword,
    resetPassword,
} from './auth.controller';
import validate from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validation';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: 'Too many requests, try again later',
});

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);

router.get('/verify-email', verifyEmail);

router.post('/login', authLimiter, validate(loginSchema), login);

router.post(
	'/refresh',
	authLimiter,
	validate(refreshSchema),
	refreshTokenHandler,
);

router.post('/logout', authLimiter, validate(refreshSchema), logout);

router.post("/forgot-password", authLimiter,validate(forgotPasswordSchema), forgotPassword);

router.post("/reset-password", authLimiter,validate(resetPasswordSchema), resetPassword);

export default router;
