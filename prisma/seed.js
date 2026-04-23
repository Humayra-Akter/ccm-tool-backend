const {
  PrismaClient,
  RoleCode,
  ControlCode,
  ControlCategory,
  ControlState,
  UserStatus,
  PermissionResource,
  PermissionAction,
  ReportAccessMode,
} = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CCM database...");

  // -----------------------------
  // Permissions
  // -----------------------------
  const permissionMatrix = [
    [PermissionResource.USERS, PermissionAction.CREATE],
    [PermissionResource.USERS, PermissionAction.READ],
    [PermissionResource.USERS, PermissionAction.UPDATE],
    [PermissionResource.USERS, PermissionAction.DELETE],

    [PermissionResource.ROLES, PermissionAction.READ],
    [PermissionResource.ROLES, PermissionAction.MANAGE],

    [PermissionResource.DASHBOARD, PermissionAction.READ],
    [PermissionResource.DASHBOARD, PermissionAction.EXPORT],

    [PermissionResource.KPI, PermissionAction.READ],
    [PermissionResource.KPI, PermissionAction.EXPORT],
    [PermissionResource.KPI, PermissionAction.UPDATE],

    [PermissionResource.EXCEPTION, PermissionAction.CREATE],
    [PermissionResource.EXCEPTION, PermissionAction.READ],
    [PermissionResource.EXCEPTION, PermissionAction.UPDATE],
    [PermissionResource.EXCEPTION, PermissionAction.EXPORT],

    [PermissionResource.UPLOAD, PermissionAction.READ],
    [PermissionResource.UPLOAD, PermissionAction.UPLOAD],
    [PermissionResource.UPLOAD, PermissionAction.UPDATE],

    [PermissionResource.SETTINGS, PermissionAction.READ],
    [PermissionResource.SETTINGS, PermissionAction.UPDATE],

    [PermissionResource.POWERBI_REPORT, PermissionAction.READ],
    [PermissionResource.POWERBI_REPORT, PermissionAction.MANAGE],

    [PermissionResource.CONTROL, PermissionAction.READ],
    [PermissionResource.CONTROL, PermissionAction.UPDATE],
    [PermissionResource.THRESHOLD, PermissionAction.READ],
    [PermissionResource.THRESHOLD, PermissionAction.UPDATE],

    [PermissionResource.AUDIT_LOG, PermissionAction.READ],
  ];

  const permissionIdsByCode = {};

  for (const [resource, action] of permissionMatrix) {
    const code = `${resource}_${action}`;
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {
        description: `${action} access on ${resource}`,
      },
      create: {
        resource,
        action,
        code,
        description: `${action} access on ${resource}`,
      },
    });

    permissionIdsByCode[code] = permission.id;
  }

  // -----------------------------
  // Roles
  // -----------------------------
  const roles = [
    {
      code: RoleCode.SUPER_ADMIN,
      name: "Super Admin",
      description: "Full system access across CCM platform",
      permissions: Object.keys(permissionIdsByCode),
    },
    {
      code: RoleCode.ADMIN,
      name: "Admin",
      description:
        "Operational admin for dashboard, controls, uploads, and users",
      permissions: Object.keys(permissionIdsByCode).filter(
        (c) => !c.startsWith("AUDIT_LOG_") || c === "AUDIT_LOG_READ",
      ),
    },
    {
      code: RoleCode.ANALYST,
      name: "Analyst",
      description: "Can view dashboards, KPI pages, exceptions, and uploads",
      permissions: [
        "DASHBOARD_READ",
        "DASHBOARD_EXPORT",
        "KPI_READ",
        "KPI_EXPORT",
        "EXCEPTION_READ",
        "EXCEPTION_UPDATE",
        "EXCEPTION_EXPORT",
        "UPLOAD_READ",
        "UPLOAD_UPLOAD",
        "POWERBI_REPORT_READ",
        "CONTROL_READ",
        "THRESHOLD_READ",
      ],
    },
    {
      code: RoleCode.VIEWER,
      name: "Viewer",
      description: "Read-only business user",
      permissions: [
        "DASHBOARD_READ",
        "KPI_READ",
        "EXCEPTION_READ",
        "UPLOAD_READ",
        "POWERBI_REPORT_READ",
        "CONTROL_READ",
        "THRESHOLD_READ",
      ],
    },
    {
      code: RoleCode.AUDITOR,
      name: "Auditor",
      description: "Audit-focused persona with read and export access",
      permissions: [
        "DASHBOARD_READ",
        "DASHBOARD_EXPORT",
        "KPI_READ",
        "KPI_EXPORT",
        "EXCEPTION_READ",
        "EXCEPTION_EXPORT",
        "UPLOAD_READ",
        "POWERBI_REPORT_READ",
        "CONTROL_READ",
        "THRESHOLD_READ",
        "AUDIT_LOG_READ",
      ],
    },
  ];

  const roleIdsByCode = {};

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { code: roleData.code },
      update: {
        name: roleData.name,
        description: roleData.description,
      },
      create: {
        code: roleData.code,
        name: roleData.name,
        description: roleData.description,
        isSystem: true,
      },
    });

    roleIdsByCode[roleData.code] = role.id;

    for (const permissionCode of roleData.permissions) {
      const permissionId = permissionIdsByCode[permissionCode];
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  }

  // -----------------------------
  // Demo User
  // -----------------------------
  const demoPassword = "Admin@12345";
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: "admin@ccm.local" },
    update: {
      fullName: "CCM Demo Admin",
      passwordHash,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
    create: {
      email: "admin@ccm.local",
      username: "ccmadmin",
      fullName: "CCM Demo Admin",
      passwordHash,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: demoUser.id,
        roleId: roleIdsByCode[RoleCode.ADMIN],
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      roleId: roleIdsByCode[RoleCode.ADMIN],
    },
  });

  // -----------------------------
  // Controls
  // -----------------------------
  const controls = [
    {
      code: ControlCode.EARLY_PAYMENTS,
      name: "Early Payments",
      description:
        "Detects payments processed earlier than allowed policy or agreed schedule.",
      category: ControlCategory.PAYMENT,
      displayOrder: 1,
      isEnabled: true,
      uiConfig: { icon: "BadgeDollarSign", colorTone: "success" },
    },
    {
      code: ControlCode.DUPLICATE_PAYMENTS,
      name: "Duplicate Payments",
      description:
        "Flags duplicate invoice or payment events across vendors and periods.",
      category: ControlCategory.PAYMENT,
      displayOrder: 2,
      isEnabled: true,
      uiConfig: { icon: "CopyCheck", colorTone: "error" },
    },
    {
      code: ControlCode.DORMANT_PO,
      name: "Dormant PO",
      description:
        "Tracks purchase orders with no recent activity beyond acceptable ageing threshold.",
      category: ControlCategory.PROCUREMENT,
      displayOrder: 3,
      isEnabled: true,
      uiConfig: { icon: "FileClock", colorTone: "warning" },
    },
    {
      code: ControlCode.TWO_WAY_MATCH,
      name: "Two Way Match",
      description:
        "Highlights cases where invoice and PO matching logic indicates potential control gaps.",
      category: ControlCategory.PROCURE_TO_PAY,
      displayOrder: 4,
      isEnabled: true,
      uiConfig: { icon: "GitCompareArrows", colorTone: "secondary" },
    },
    {
      code: ControlCode.NEW_UNDELIVERED_POS,
      name: "New Undelivered POs",
      description:
        "Identifies newly ageing undelivered purchase orders requiring follow-up.",
      category: ControlCategory.PROCUREMENT,
      displayOrder: 5,
      isEnabled: true,
      uiConfig: { icon: "Truck", colorTone: "warning" },
    },
    {
      code: ControlCode.AGED_OPEN_ADVANCES,
      name: "Aged Open Advances",
      description:
        "Monitors aged advances that remain unreconciled or uncleared.",
      category: ControlCategory.ADVANCE,
      displayOrder: 6,
      isEnabled: true,
      uiConfig: { icon: "WalletCards", colorTone: "error" },
    },
    {
      code: ControlCode.INVOICE_SPLIT_BYPASS,
      name: "Invoice Split Bypass",
      description:
        "Detects invoice splitting patterns that may bypass approval thresholds.",
      category: ControlCategory.INVOICING,
      displayOrder: 7,
      isEnabled: true,
      uiConfig: { icon: "Split", colorTone: "error" },
    },
    {
      code: ControlCode.DELAY_IN_INVOICING,
      name: "Delay in Invoicing",
      description:
        "Tracks delays between service or receipt date and invoice creation date.",
      category: ControlCategory.INVOICING,
      displayOrder: 8,
      isEnabled: false,
      uiConfig: { icon: "TimerReset", colorTone: "muted" },
    },
  ];

  const controlIdsByCode = {};

  for (const item of controls) {
    const control = await prisma.control.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
        category: item.category,
        state: item.isEnabled ? ControlState.ACTIVE : ControlState.DRAFT,
        displayOrder: item.displayOrder,
        defaultCurrency: "USD",
        isEnabled: item.isEnabled,
        uiConfig: item.uiConfig,
      },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
        category: item.category,
        state: item.isEnabled ? ControlState.ACTIVE : ControlState.DRAFT,
        displayOrder: item.displayOrder,
        defaultCurrency: "USD",
        isEnabled: item.isEnabled,
        uiConfig: item.uiConfig,
      },
    });

    controlIdsByCode[item.code] = control.id;
  }

  // -----------------------------
  // App Settings
  // -----------------------------
  const settings = [
    {
      key: "app.defaultLandingPage",
      scope: "SYSTEM",
      value: { page: "DASHBOARD" },
      description: "Default page after login",
    },
    {
      key: "app.demoMode",
      scope: "SYSTEM",
      value: { enabled: true },
      description: "Demo mode toggle for local development",
    },
    {
      key: "powerbi.embed.enabled",
      scope: "SYSTEM",
      value: { enabled: true },
      description: "Power BI embedding global switch",
    },
    {
      key: "upload.maxFileSizeMb",
      scope: "SYSTEM",
      value: { value: 15 },
      description: "Maximum upload file size in MB",
    },
  ];

  for (const s of settings) {
    await prisma.appSetting.upsert({
      where: {
        key_scope_controlId: {
          key: s.key,
          scope: s.scope,
          controlId: null,
        },
      },
      update: {
        value: s.value,
        description: s.description,
        updatedById: demoUser.id,
      },
      create: {
        key: s.key,
        scope: s.scope,
        value: s.value,
        description: s.description,
        updatedById: demoUser.id,
      },
    });
  }

  // -----------------------------
  // Optional Power BI placeholders
  // -----------------------------
  const workspace = await prisma.powerBIWorkspace.upsert({
    where: { workspaceKey: "demo-workspace" },
    update: {
      name: "Demo Workspace",
      description: "Local placeholder workspace for report mapping",
      isActive: true,
    },
    create: {
      workspaceKey: "demo-workspace",
      name: "Demo Workspace",
      description: "Local placeholder workspace for report mapping",
      isActive: true,
    },
  });

  for (const item of controls.filter((c) => c.isEnabled)) {
    const report = await prisma.powerBIReport.upsert({
      where: { reportKey: `${item.code}_REPORT` },
      update: {
        reportName: `${item.name} Report`,
        workspaceId: workspace.id,
        embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${item.code.toLowerCase()}-placeholder`,
        accessMode: ReportAccessMode.POWERBI_EMBED,
        isActive: true,
      },
      create: {
        workspaceId: workspace.id,
        reportKey: `${item.code}_REPORT`,
        reportName: `${item.name} Report`,
        embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${item.code.toLowerCase()}-placeholder`,
        accessMode: ReportAccessMode.POWERBI_EMBED,
        isActive: true,
      },
    });

    await prisma.controlReportMap.upsert({
      where: {
        controlId_reportId_effectiveFrom: {
          controlId: controlIdsByCode[item.code],
          reportId: report.id,
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        },
      },
      update: {
        isDefault: true,
      },
      create: {
        controlId: controlIdsByCode[item.code],
        reportId: report.id,
        isDefault: true,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
  }

  console.log("Seed completed.");
  console.log("Demo login:");
  console.log("email: admin@ccm.local");
  console.log("password: Admin@12345");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
