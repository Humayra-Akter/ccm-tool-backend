import { prisma } from "../lib/prisma.js";

function hasAnyRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const userRoles = req.user.roles || [];
      const allowed = allowedRoles.flat();

      const matched = userRoles.some((role) => allowed.includes(role));

      if (!matched) {
        return res.status(403).json({
          success: false,
          message: "Forbidden. Insufficient role.",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function hasPermission(resource, action) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

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
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const permissions = [];

      for (const userRole of user.userRoles) {
        for (const rp of userRole.role.permissions) {
          permissions.push(rp.permission);
        }
      }

      const allowed = permissions.some(
        (p) => p.resource === resource && p.action === action,
      );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Forbidden. Missing permission: ${resource}_${action}`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export { hasAnyRole, hasPermission };