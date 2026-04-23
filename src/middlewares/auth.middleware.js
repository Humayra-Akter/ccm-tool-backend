import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Bearer token missing.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Token missing.",
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. User not found.",
      });
    }

    if (["SUSPENDED", "LOCKED", "DISABLED"].includes(user.status)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. User is ${user.status.toLowerCase()}.`,
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      status: user.status,
      roles: user.userRoles.map((ur) => ur.role.code),
    };

    next();
  } catch (error) {
    next(error);
  }
}

export { protect };