import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { signToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { toJSON } from "../utils/serialize";

export async function login(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), isDeleted: false },
  });

  if (!user || user.status !== "active") {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = signToken({
    userId: user.id,
    agencyId: user.agencyId,
    branchId: user.branchId,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  });

  const refreshToken = signRefreshToken({ userId: user.id });

  const populatedUser = await getMe(user.id);
  return { accessToken, refreshToken, user: populatedUser };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findFirst({
    where: { id: payload.userId, isDeleted: false, status: "active" },
  });

  if (!user) {
    throw ApiError.unauthorized("User not found or inactive");
  }

  const newAccessToken = signToken({
    userId: user.id,
    agencyId: user.agencyId,
    branchId: user.branchId,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  });

  const newRefreshToken = signRefreshToken({ userId: user.id });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(accessToken?: string) {
  if (accessToken) {
    try {
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.tokenBlacklist.create({ data: { token: accessToken, expiresAt } });
    } catch {}
  }
  return { success: true };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
  });

  if (!user) throw ApiError.notFound("User");

  const { password: _, ...safeUser } = user;
  const userObj: Record<string, unknown> = { ...safeUser };

  if (user.agencyId) {
    const agency = await prisma.agency.findUnique({ where: { id: user.agencyId } });
    if (agency) {
      userObj.agency = agency;
    }
  }

  if (user.branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: user.branchId } });
    if (branch) {
      userObj.branch = branch;
    }
  }

  if (user.role === "admin" || user.role === "owner") {
    userObj.permissions = ["admin", "all"];
  } else {
    const role = await prisma.role.findFirst({
      where: {
        agencyId: user.agencyId,
        name: { equals: user.role, mode: "insensitive" },
        isDeleted: false,
      },
    });
    if (role) {
      userObj.permissions = (role.permissions as string[]) || [];
    } else {
      userObj.permissions = [];
    }
  }

  return toJSON(userObj);
}
