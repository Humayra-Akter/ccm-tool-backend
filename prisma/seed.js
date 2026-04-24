import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  RoleCode,
  ControlCode,
  ControlCategory,
  ControlState,
  UserStatus,
  PermissionResource,
  PermissionAction,
  ReportAccessMode,
  SettingScope,
} from "@prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding CCM database...");

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
      permissions: Object.keys(permissionIdsByCode),
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

  const demoPassword = "Admin@12345";
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: "admin@ccm.local" },
    update: {
      fullName: "CCM Admin",
      passwordHash,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    },
    create: {
      email: "admin@ccm.local",
      username: "ccmadmin",
      fullName: "CCM Admin",
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

  const settings = [
    {
      key: "app.defaultLandingPage",
      scope: SettingScope.SYSTEM,
      value: { page: "DASHBOARD" },
      description: "Default page after login",
    },
    {
      key: "app.demoMode",
      scope: SettingScope.SYSTEM,
      value: { enabled: true },
      description: "Demo mode toggle for local development",
    },
    {
      key: "powerbi.embed.enabled",
      scope: SettingScope.SYSTEM,
      value: { enabled: true },
      description: "Power BI embedding global switch",
    },
    {
      key: "upload.maxFileSizeMb",
      scope: SettingScope.SYSTEM,
      value: { value: 15 },
      description: "Maximum upload file size in MB",
    },
  ];

  for (const s of settings) {
    const existing = await prisma.appSetting.findFirst({
      where: {
        key: s.key,
        scope: s.scope,
        controlId: null,
      },
    });

    if (existing) {
      await prisma.appSetting.update({
        where: { id: existing.id },
        data: {
          value: s.value,
          description: s.description,
          updatedById: demoUser.id,
        },
      });
    } else {
      await prisma.appSetting.create({
        data: {
          key: s.key,
          scope: s.scope,
          value: s.value,
          description: s.description,
          updatedById: demoUser.id,
        },
      });
    }
  }

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

    const existingMap = await prisma.controlReportMap.findFirst({
      where: {
        controlId: controlIdsByCode[item.code],
        reportId: report.id,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

    if (existingMap) {
      await prisma.controlReportMap.update({
        where: { id: existingMap.id },
        data: { isDefault: true },
      });
    } else {
      await prisma.controlReportMap.create({
        data: {
          controlId: controlIdsByCode[item.code],
          reportId: report.id,
          isDefault: true,
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        },
      });
    }
  }

  const entities = [
    { type: "BUSINESS_UNIT", code: "CORP_PROJ", name: "Corporate Projects" },
    {
      type: "BUSINESS_UNIT",
      code: "PROC_SHARED",
      name: "Procurement Shared Services",
    },
    { type: "BUSINESS_UNIT", code: "TRACK_DEV", name: "Track Development" },
    {
      type: "BUSINESS_UNIT",
      code: "DELIVERY_OPS",
      name: "Delivery Operations",
    },
  ];

  const entityIdsByCode = {};

  for (const item of entities) {
    const entity = await prisma.businessEntity.upsert({
      where: {
        type_code: {
          type: item.type,
          code: item.code,
        },
      },
      update: {
        name: item.name,
        isActive: true,
      },
      create: {
        type: item.type,
        code: item.code,
        name: item.name,
        isActive: true,
      },
    });

    entityIdsByCode[item.code] = entity.id;
  }

  const monthlyTrendValues = [42, 45, 44, 58, 63, 79, 96, 84, 71, 59, 48, 52];
  const months = Array.from({ length: 12 }, (_, i) => i);

  for (const controlCode of Object.keys(controlIdsByCode)) {
    if (controlCode === "DELAY_IN_INVOICING") continue;

    for (const monthIndex of months) {
      const snapshotDate = new Date(Date.UTC(2026, monthIndex, 1));

      const existingSnapshot = await prisma.controlMetricSnapshot.findFirst({
        where: {
          controlId: controlIdsByCode[controlCode],
          snapshotDate,
          granularity: "MONTHLY",
        },
      });

      if (!existingSnapshot) {
        await prisma.controlMetricSnapshot.create({
          data: {
            controlId: controlIdsByCode[controlCode],
            snapshotDate,
            granularity: "MONTHLY",
            periodLabel: snapshotDate.toLocaleString("en-US", {
              month: "short",
            }),
            healthStatus: monthIndex > 6 ? "AMBER" : "GREEN",
            trendDirection: monthIndex > 0 ? "UP" : "FLAT",
            totalPopulation: 100,
            passCount: 80,
            warningCount: 12,
            breachCount: 8,
            exceptionCount: Math.max(
              1,
              Math.round(monthlyTrendValues[monthIndex] / 20),
            ),
            exceptionAmount: monthlyTrendValues[monthIndex] * 10000,
            exposureAmount: monthlyTrendValues[monthIndex] * 15000,
            healthScore: monthlyTrendValues[monthIndex],
          },
        });
      }
    }
  }
  const dormantPoReport = await prisma.powerBIReport.upsert({
    where: { reportKey: "DORMANT_PO_REPORT" },
    update: {
      reportName: "Dormant PO Demo PDF",
      workspaceId: workspace.id,
      embedUrl: "",
      accessMode: ReportAccessMode.POWERBI_EMBED,
      sourceSystem: "POWERBI",
      isPublished: false,
      isActive: true,
      notes: "Demo PDF preview for Dormant PO.",
      metadata: {
        demoType: "PDF_PREVIEW",
        demoPdfUrl: "http://localhost:5000/static/demo/dormant-po-demo-v2.pdf",
        pipeline: "Prototype demo preview",
      },
    },
    create: {
      workspaceId: workspace.id,
      reportKey: "DORMANT_PO_REPORT",
      reportName: "Dormant PO Demo PDF",
      embedUrl: "",
      accessMode: ReportAccessMode.POWERBI_EMBED,
      sourceSystem: "POWERBI",
      isPublished: false,
      isActive: true,
      notes: "Demo PDF preview for Dormant PO.",
      metadata: {
        demoType: "PDF_PREVIEW",
        demoPdfUrl: "http://localhost:5000/static/demo/dormant-po-demo-v2.pdf",
        pipeline: "Prototype demo preview",
      },
    },
  });
  
  const existingDormantMap = await prisma.controlReportMap.findFirst({
    where: {
      controlId: controlIdsByCode["DORMANT_PO"],
      reportId: dormantPoReport.id,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  if (existingDormantMap) {
    await prisma.controlReportMap.update({
      where: { id: existingDormantMap.id },
      data: {
        isDefault: true,
        prototypeMode: true,
      },
    });
  } else {
    await prisma.controlReportMap.create({
      data: {
        controlId: controlIdsByCode["DORMANT_PO"],
        reportId: dormantPoReport.id,
        isDefault: true,
        prototypeMode: true,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
  }
  const exceptionSeed = [
    {
      controlCode: "DUPLICATE_PAYMENTS",
      entityCode: "PROC_SHARED",
      externalRef: "EX-1001",
      title: "Duplicate payment cluster detected",
      riskLevel: "HIGH",
      severity: "HIGH",
      amount: 4800000,
      dueAt: new Date("2026-05-27"),
    },
    {
      controlCode: "AGED_OPEN_ADVANCES",
      entityCode: "CORP_PROJ",
      externalRef: "EX-1002",
      title: "Aged advance remains unreconciled",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 3200000,
      dueAt: new Date("2026-05-29"),
    },
    {
      controlCode: "INVOICE_SPLIT_BYPASS",
      entityCode: "PROC_SHARED",
      externalRef: "EX-1003",
      title: "Invoice split bypass pattern found",
      riskLevel: "HIGH",
      severity: "HIGH",
      amount: 5900000,
      dueAt: new Date("2026-05-31"),
    },
    {
      controlCode: "DORMANT_PO",
      entityCode: "TRACK_DEV",
      externalRef: "EX-1004",
      title: "Dormant PO ageing beyond threshold",
      riskLevel: "LOW",
      severity: "LOW",
      amount: 700000,
      dueAt: new Date("2026-06-02"),
    },
    {
      controlCode: "NEW_UNDELIVERED_POS",
      entityCode: "DELIVERY_OPS",
      externalRef: "EX-1005",
      title: "Undelivered PO requiring escalation",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 2400000,
      dueAt: new Date("2026-06-04"),
    },
    {
      controlCode: "EARLY_PAYMENTS",
      entityCode: "CORP_PROJ",
      externalRef: "EX-1006",
      title: "Early settlement before approved schedule",
      riskLevel: "HIGH",
      severity: "HIGH",
      amount: 1800000,
      dueAt: new Date("2026-06-06"),
    },
    {
      controlCode: "EARLY_PAYMENTS",
      entityCode: "CORP_PROJ",
      externalRef: "EX-1007",
      title: "Additional early payment variance",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 1200000,
      dueAt: new Date("2026-06-08"),
    },
    {
      controlCode: "EARLY_PAYMENTS",
      entityCode: "CORP_PROJ",
      externalRef: "EX-1008",
      title: "Third early payment anomaly",
      riskLevel: "HIGH",
      severity: "HIGH",
      amount: 900000,
      dueAt: new Date("2026-06-09"),
    },
    {
      controlCode: "DUPLICATE_PAYMENTS",
      entityCode: "PROC_SHARED",
      externalRef: "EX-1009",
      title: "Additional duplicate vendor invoice",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 1100000,
      dueAt: new Date("2026-06-10"),
    },
    {
      controlCode: "DUPLICATE_PAYMENTS",
      entityCode: "PROC_SHARED",
      externalRef: "EX-1010",
      title: "Payment rerun duplication issue",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 600000,
      dueAt: new Date("2026-06-11"),
    },
    {
      controlCode: "DUPLICATE_PAYMENTS",
      entityCode: "PROC_SHARED",
      externalRef: "EX-1011",
      title: "Third duplicate payment exception",
      riskLevel: "LOW",
      severity: "LOW",
      amount: 400000,
      dueAt: new Date("2026-06-12"),
    },
    {
      controlCode: "TWO_WAY_MATCH",
      entityCode: "DELIVERY_OPS",
      externalRef: "EX-1012",
      title: "Mismatch between PO and invoice values",
      riskLevel: "LOW",
      severity: "LOW",
      amount: 500000,
      dueAt: new Date("2026-06-13"),
    },
    {
      controlCode: "TWO_WAY_MATCH",
      entityCode: "DELIVERY_OPS",
      externalRef: "EX-1013",
      title: "Additional line-level mismatch",
      riskLevel: "LOW",
      severity: "LOW",
      amount: 350000,
      dueAt: new Date("2026-06-14"),
    },
    {
      controlCode: "TWO_WAY_MATCH",
      entityCode: "DELIVERY_OPS",
      externalRef: "EX-1014",
      title: "Third mismatch case under review",
      riskLevel: "LOW",
      severity: "LOW",
      amount: 250000,
      dueAt: new Date("2026-06-15"),
    },
    {
      controlCode: "TWO_WAY_MATCH",
      entityCode: "DELIVERY_OPS",
      externalRef: "EX-1015",
      title: "Fourth mismatch case under review",
      riskLevel: "LOW",
      severity: "LOW",
      amount: 220000,
      dueAt: new Date("2026-06-16"),
    },
    {
      controlCode: "NEW_UNDELIVERED_POS",
      entityCode: "DELIVERY_OPS",
      externalRef: "EX-1016",
      title: "Second undelivered PO issue",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 1200000,
      dueAt: new Date("2026-06-17"),
    },
    {
      controlCode: "AGED_OPEN_ADVANCES",
      entityCode: "CORP_PROJ",
      externalRef: "EX-1017",
      title: "Second aged advance case",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 1700000,
      dueAt: new Date("2026-06-18"),
    },
    {
      controlCode: "AGED_OPEN_ADVANCES",
      entityCode: "CORP_PROJ",
      externalRef: "EX-1018",
      title: "Third aged advance case",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 900000,
      dueAt: new Date("2026-06-19"),
    },
    {
      controlCode: "INVOICE_SPLIT_BYPASS",
      entityCode: "PROC_SHARED",
      externalRef: "EX-1019",
      title: "Second invoice split exception",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 2500000,
      dueAt: new Date("2026-06-20"),
    },
    {
      controlCode: "INVOICE_SPLIT_BYPASS",
      entityCode: "PROC_SHARED",
      externalRef: "EX-1020",
      title: "Third invoice split exception",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 1400000,
      dueAt: new Date("2026-06-21"),
    },
    {
      controlCode: "INVOICE_SPLIT_BYPASS",
      entityCode: "PROC_SHARED",
      externalRef: "EX-1021",
      title: "Fourth invoice split exception",
      riskLevel: "MEDIUM",
      severity: "MEDIUM",
      amount: 800000,
      dueAt: new Date("2026-06-22"),
    },
  ];

  for (const item of exceptionSeed) {
    const existing = await prisma.exceptionRecord.findFirst({
      where: {
        controlId: controlIdsByCode[item.controlCode],
        externalRef: item.externalRef,
      },
    });

    if (!existing) {
      await prisma.exceptionRecord.create({
        data: {
          controlId: controlIdsByCode[item.controlCode],
          entityId: entityIdsByCode[item.entityCode],
          externalRef: item.externalRef,
          title: item.title,
          status: "OPEN",
          severity: item.severity,
          riskLevel: item.riskLevel,
          amount: item.amount,
          currencyCode: "AED",
          dueAt: item.dueAt,
          sourceSystem: "MANUAL_UPLOAD",
        },
      });
    }
  }

  const entityScoreSeed = [
    {
      controlCode: "EARLY_PAYMENTS",
      entityCode: "CORP_PROJ",
      score: 72,
      exceptionCount: 3,
      exceptionAmount: 3900000,
    },
    {
      controlCode: "DUPLICATE_PAYMENTS",
      entityCode: "PROC_SHARED",
      score: 84,
      exceptionCount: 4,
      exceptionAmount: 6900000,
    },
    {
      controlCode: "DORMANT_PO",
      entityCode: "TRACK_DEV",
      score: 22,
      exceptionCount: 1,
      exceptionAmount: 700000,
    },
    {
      controlCode: "TWO_WAY_MATCH",
      entityCode: "DELIVERY_OPS",
      score: 28,
      exceptionCount: 4,
      exceptionAmount: 1320000,
    },
    {
      controlCode: "NEW_UNDELIVERED_POS",
      entityCode: "DELIVERY_OPS",
      score: 47,
      exceptionCount: 2,
      exceptionAmount: 3600000,
    },
    {
      controlCode: "AGED_OPEN_ADVANCES",
      entityCode: "CORP_PROJ",
      score: 58,
      exceptionCount: 3,
      exceptionAmount: 5800000,
    },
    {
      controlCode: "INVOICE_SPLIT_BYPASS",
      entityCode: "PROC_SHARED",
      score: 76,
      exceptionCount: 4,
      exceptionAmount: 10500000,
    },
  ];

  for (const item of entityScoreSeed) {
    const snapshotDate = new Date("2026-06-01T00:00:00.000Z");

    const existing = await prisma.entityScoreSnapshot.findFirst({
      where: {
        controlId: controlIdsByCode[item.controlCode],
        entityId: entityIdsByCode[item.entityCode],
        snapshotDate,
        granularity: "MONTHLY",
      },
    });

    if (!existing) {
      await prisma.entityScoreSnapshot.create({
        data: {
          controlId: controlIdsByCode[item.controlCode],
          entityId: entityIdsByCode[item.entityCode],
          snapshotDate,
          granularity: "MONTHLY",
          healthStatus:
            item.score >= 70 ? "RED" : item.score >= 40 ? "AMBER" : "GREEN",
          riskLevel:
            item.score >= 70 ? "HIGH" : item.score >= 40 ? "MEDIUM" : "LOW",
          score: item.score,
          exceptionCount: item.exceptionCount,
          exceptionAmount: item.exceptionAmount,
          exposureAmount: item.exceptionAmount,
        },
      });
    }
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
