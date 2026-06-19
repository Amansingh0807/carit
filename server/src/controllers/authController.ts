import type { Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  revokeRefreshToken,
  getUserById,
  ConflictError,
  UnauthorizedError,
} from '../services/authService';
import type { RegisterInput, LoginInput, RefreshTokenInput } from '../validators/schemas';

/**
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, username, password } = req.body as RegisterInput;

    const result = await registerUser(email, username, password);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        tokens: result.tokens,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    if (error instanceof ConflictError) {
      res.status(409).json({
        success: false,
        message: error.message,
      });
      return;
    }
    throw error;
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as LoginInput;

    const result = await loginUser(email, password);

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        tokens: result.tokens,
      },
      message: 'Login successful',
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
      return;
    }
    throw error;
  }
}

/**
 * POST /api/auth/refresh
 */
export function refresh(req: Request, res: Response): void {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;

    const tokens = refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: { tokens },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
      return;
    }
    // JWT verification errors
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
}

/**
 * POST /api/auth/logout
 */
export function logout(req: Request, res: Response): void {
  const { refreshToken } = req.body as RefreshTokenInput;

  revokeRefreshToken(refreshToken);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * GET /api/auth/me
 */
export function getMe(req: Request, res: Response): void {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return;
  }

  const user = getUserById(userId);

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
}
