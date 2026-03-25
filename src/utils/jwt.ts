import jwt, { SignOptions } from "jsonwebtoken";
import env from "../config/env";

export const generateAccessToken = (payload: object) => {
  const options: SignOptions = {
    expiresIn: env.jwt.accessExpiry as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.jwt.accessSecret, options);
};

export const generateRefreshToken = (payload: object) => {
  const options: SignOptions = {
    expiresIn: env.jwt.refreshExpiry as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.jwt.refreshSecret, options);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, env.jwt.refreshSecret);
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, env.jwt.accessSecret);
};

export const getRefreshTokenExpiry = () => {
  return new Date(Date.now() + parseInt(env.jwt.refreshExpiry) * 1000);
};