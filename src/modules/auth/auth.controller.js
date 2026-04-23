import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt.js";

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles:
      user.userRoles?.map((ur) => ({
        id: ur.role.id,
        code: ur.role.code,
        name: ur.role.name,
        permissions:
          ur.role.permissions?.map((rp) => ({
            resource: rp.permission.resource,
            action: rp.permission.action,
            code: rp.permission.code,
          })) || [],
      })) || [],
  };
}

function getRoleCodes(user) {
  return user.userRoles?.map((ur) => ur.role.code) || [];
}

async function register(req, res, next) {
  try {
    const { email, username, fullName, password } = req.body;

    if (!email || !fullName || !password) {
      return res.status(400).json({
        success: false,
        message: "email, fullName and password are required",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          ...(username ? [{ username }] : []),
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email or username",
      });
    }

    const adminRole = await prisma.role.findUnique({
      where: { code: "ADMIN" },
    });

    if (!adminRole) {
      return res.status(500).json({
        success: false,
        message: "Default ADMIN role not found. Please run seed first.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username || null,
        fullName,
        passwordHash,
        isEmailVerified: true,
        userRoles: {
          create: [{ roleId: adminRole.id }],
        },
      },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const roleCodes = getRoleCodes(user);

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      roles: roleCodes,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: sanitizeUser(user),
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password, withRefreshToken = false } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (["SUSPENDED", "LOCKED", "DISABLED"].includes(user.status)) {
      return res.status(403).json({
        success: false,
        message: `User is ${user.status.toLowerCase()}`,
      });
    }

    const passwordMatched = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const roleCodes = getRoleCodes(user);

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      roles: roleCodes,
    });

    let refreshToken = null;

    if (withRefreshToken) {
      refreshToken = generateRefreshToken({
        sub: user.id,
        email: user.email,
        roles: roleCodes,
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginCount: 0,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: sanitizeUser({
          ...user,
          lastLoginAt: new Date(),
        }),
        accessToken,
        ...(withRefreshToken ? { refreshToken } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful. Remove token from client storage.",
    });
  } catch (error) {
    next(error);
  }
}

export { register, login, me, logout };
