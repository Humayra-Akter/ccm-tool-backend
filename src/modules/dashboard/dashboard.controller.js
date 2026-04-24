import { prisma } from "../../lib/prisma.js";

const ACTIVE_CONTROL_CODES = [
  "EARLY_PAYMENTS",
  "DUPLICATE_PAYMENTS",
  "DORMANT_PO",
  "TWO_WAY_MATCH",
  "NEW_UNDELIVERED_POS",
  "AGED_OPEN_ADVANCES",
  "INVOICE_SPLIT_BYPASS",
];

function mapControlStatus(findings) {
  if (findings >= 3) return "Critical";
  if (findings >= 2) return "Warning";
  return "Healthy";
}

function mapRiskLevelToBadge(riskLevel) {
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH") return "High";
  if (riskLevel === "MEDIUM") return "Medium";
  return "Low";
}

function buildExceptionWhere(query = {}) {
  const { entity } = query;

  const where = {
    status: {
      in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"],
    },
    control: {
      isEnabled: true,
      code: {
        in: [
          "EARLY_PAYMENTS",
          "DUPLICATE_PAYMENTS",
          "DORMANT_PO",
          "TWO_WAY_MATCH",
          "NEW_UNDELIVERED_POS",
          "AGED_OPEN_ADVANCES",
          "INVOICE_SPLIT_BYPASS",
        ],
      },
    },
  };

  if (entity && entity !== "ALL") {
    where.entity = {
      code: entity,
    };
  }

  return where;
}

function buildEntityScoreWhere(query = {}) {
  const { entity } = query;

  const where = {};

  if (entity && entity !== "ALL") {
    where.entity = {
      code: entity,
    };
  }

  return where;
}

export async function getDashboardSummary(req, res, next) {
  try {
   const exceptionWhere = buildExceptionWhere(req.query);

   const controls = await prisma.control.findMany({
     where: {
       isEnabled: true,
       code: {
         in: [
           "EARLY_PAYMENTS",
           "DUPLICATE_PAYMENTS",
           "DORMANT_PO",
           "TWO_WAY_MATCH",
           "NEW_UNDELIVERED_POS",
           "AGED_OPEN_ADVANCES",
           "INVOICE_SPLIT_BYPASS",
         ],
       },
     },
     include: {
       exceptions: {
         where: exceptionWhere,
       },
     },
     orderBy: { displayOrder: "asc" },
   });

    const totalKpis = controls.length;
    const openFindings = controls.reduce(
      (sum, control) => sum + control.exceptions.length,
      0,
    );

    const criticalControls = controls.filter(
      (control) => control.exceptions.length >= 3,
    ).length;

    const warningControls = controls.filter(
      (control) =>
        control.exceptions.length >= 2 && control.exceptions.length < 3,
    ).length;

    const potentialExposure = controls.reduce((sum, control) => {
      const controlAmount = control.exceptions.reduce(
        (subSum, item) => subSum + Number(item.amount || 0),
        0,
      );
      return sum + controlAmount;
    }, 0);

    return res.json({
      success: true,
      data: {
        totalKpis,
        exceptionKpis: criticalControls + warningControls,
        financialImpact: potentialExposure,
        openFindings,
        criticalControls,
        warningControls,
        healthyControls: Math.max(
          0,
          totalKpis - (criticalControls + warningControls),
        ),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardTrend(req, res, next) {
  try {
    const snapshots = await prisma.controlMetricSnapshot.findMany({
      where: {
        control: {
          isEnabled: true,
          code: { in: ACTIVE_CONTROL_CODES },
        },
        granularity: "MONTHLY",
      },
      include: {
        control: true,
      },
      orderBy: { snapshotDate: "asc" },
    });

    const grouped = new Map();

    for (const item of snapshots) {
      const label = new Date(item.snapshotDate).toLocaleString("en-US", {
        month: "short",
      });

      if (!grouped.has(label)) {
        grouped.set(label, 0);
      }

      grouped.set(label, grouped.get(label) + Number(item.healthScore || 0));
    }

    const trend = Array.from(grouped.entries()).map(([label, value]) => ({
      label,
      value: Number(value.toFixed(2)),
    }));

    return res.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardKpiHealth(req, res, next) {
  try {
    const exceptionWhere = buildExceptionWhere(req.query);

    const controls = await prisma.control.findMany({
      where: {
        isEnabled: true,
        code: {
          in: [
            "EARLY_PAYMENTS",
            "DUPLICATE_PAYMENTS",
            "DORMANT_PO",
            "TWO_WAY_MATCH",
            "NEW_UNDELIVERED_POS",
            "AGED_OPEN_ADVANCES",
            "INVOICE_SPLIT_BYPASS",
          ],
        },
      },
      include: {
        exceptions: {
          where: exceptionWhere,
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    const result = controls.map((control) => ({
      id: control.id,
      name: control.name,
      count: control.exceptions.length,
      status: mapControlStatus(control.exceptions.length),
    }));

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getExceptionAnalytics(req, res, next) {
  try {
    const exceptions = await prisma.exceptionRecord.findMany({
      include: {
        control: true,
      },
    });

    const total = exceptions.length;
    const highRisk = exceptions.filter((e) => e.riskLevel === "HIGH").length;
    const mediumRisk = exceptions.filter(
      (e) => e.riskLevel === "MEDIUM",
    ).length;
    const lowRisk = exceptions.filter((e) => e.riskLevel === "LOW").length;

    const exposure = exceptions.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const byControlMap = {};
    for (const item of exceptions) {
      const key = item.control?.name || "Unknown";
      byControlMap[key] = (byControlMap[key] || 0) + 1;
    }

    const byControl = Object.entries(byControlMap).map(([label, value]) => ({
      label,
      value,
    }));

    const trend = [
      { label: "Jan", value: 3 },
      { label: "Feb", value: 5 },
      { label: "Mar", value: 4 },
      { label: "Apr", value: 7 },
      { label: "May", value: 6 },
      { label: "Jun", value: 9 },
    ];

    res.json({
      success: true,
      data: {
        summary: {
          total,
          highRisk,
          mediumRisk,
          lowRisk,
          exposure,
        },
        byControl,
        trend,
      },
    });
  } catch (error) {
    next(error);
  }
}


export async function getAllExceptions(req, res, next) {
  try {
    const {
      entity = "ALL",
      risk = "ALL",
      status = "ALL",
      control = "ALL",
      search = "",
      sortBy = "detectedAt",
      sortDir = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    if (risk !== "ALL") {
      where.riskLevel = risk.toUpperCase();
    }

    if (status !== "ALL") {
      where.status = status.toUpperCase();
    }

    if (entity !== "ALL") {
      where.entity = {
        code: entity,
      };
    }

    if (control !== "ALL") {
      where.control = {
        code: control,
      };
    }

    if (search.trim()) {
      where.OR = [
        { externalRef: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { control: { name: { contains: search, mode: "insensitive" } } },
        { entity: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

   const safeSortFields = {
     id: "externalRef",
     amount: "amount",
     dueDate: "dueAt",
     detectedAt: "detectedAt",
     risk: "riskLevel",
     status: "status",
   };

    const orderField = safeSortFields[sortBy] || "detectedAt";

    const skip = (Number(page) - 1) * Number(limit);

    const [rows, total] = await Promise.all([
      prisma.exceptionRecord.findMany({
        where,
        include: {
          control: true,
          entity: true,
        },
        orderBy: {
          [orderField]: sortDir === "asc" ? "asc" : "desc",
        },
        skip,
        take: Number(limit),
      }),
      prisma.exceptionRecord.count({ where }),
    ]);

    const formatted = rows.map((row) => ({
      id: row.externalRef || row.id.slice(0, 8).toUpperCase(),
      risk:
        row.riskLevel === "HIGH"
          ? "High"
          : row.riskLevel === "MEDIUM"
            ? "Medium"
            : "Low",
      status: row.status,
      control: row.control?.name || "-",
      entity: row.entity?.name || "-",
      amount: `AED ${Number(row.amount || 0).toLocaleString()}`,
      dueDate: row.dueAt
        ? new Date(row.dueAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "-",
      owner: "-",
      title: row.title || "-",
    }));

    res.json({
      success: true,
      data: {
        rows: formatted,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardRecentExceptions(req, res, next) {
  try {

    const where = buildExceptionWhere(req.query);

    const exceptions = await prisma.exceptionRecord.findMany({
      where,
      include: {
        control: true,
        entity: true,
      },
      orderBy: { detectedAt: "desc" },
      take: Number(req.query.limit || 5),
    });

  

    const result = exceptions.map((item) => ({
      id: item.externalRef || item.id.slice(0, 8).toUpperCase(),
      risk: mapRiskLevelToBadge(item.riskLevel),
      control: item.control?.name || "-",
      entity: item.entity?.name || "Unassigned Entity",
      amount: `AED ${Number(item.amount || 0).toLocaleString()}`,
      dueDate: item.dueAt
        ? new Date(item.dueAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "-",
    }));

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardEntityScores(req, res, next) {
  try {
    const where = buildEntityScoreWhere(req.query);

    const scores = await prisma.entityScoreSnapshot.findMany({
      where,
      include: {
        entity: true,
        control: true,
      },
      orderBy: { snapshotDate: "desc" },
      take: Number(req.query.limit || 50),
    });

    const grouped = new Map();

    for (const item of scores) {
      const entityName = item.entity?.name || "Unknown Entity";

      if (!grouped.has(entityName)) {
        grouped.set(entityName, {
          id: item.entityId,
          entity: entityName,
          totalScore: 0,
          totalExceptions: 0,
          rows: 0,
        });
      }

      const current = grouped.get(entityName);
      current.totalScore += Number(item.score || 0);
      current.totalExceptions += item.exceptionCount || 0;
      current.rows += 1;
    }

    const result = Array.from(grouped.values()).map((item) => {
      const avgScore = item.rows ? item.totalScore / item.rows : 0;

      let finalResults = "Low";
      if (avgScore >= 70) finalResults = "High";
      else if (avgScore >= 40) finalResults = "Moderate";

      return {
        id: item.id,
        entity: item.entity,
        exceptionDiscovery: `${item.totalExceptions}%`,
        businessResponse: `${Math.max(0, 100 - Math.round(avgScore))}%`,
        finalResults,
      };
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
