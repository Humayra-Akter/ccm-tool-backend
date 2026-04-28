import { prisma } from "../../lib/prisma.js";

const DEFAULT_SETTINGS = {
  system: {
    defaultLandingPage: "Dashboard",
    defaultCurrency: "AED",
    timezone: "Asia/Dubai",
    dateFormat: "DD MMM YYYY",
  },
  powerbi: {
    embeddingMode: "Power BI Embed",
    refreshCadence: "Hourly",
    workspaceMode: "Production",
    metadataSync: "Enabled",
  },
  upload: {
    allowedFormats: ["CSV", "XLS", "XLSX"],
    maxFileSizeMb: 15,
    duplicatePolicy: "Warn and continue",
    autoValidation: true,
  },
  security: {
    sessionTimeout: 30,
    passwordPolicy: "Strong",
    mfaMode: "Planned",
    auditLogging: true,
  },
  notifications: {
    uploadCompleted: true,
    validationFailed: true,
    powerBiRefreshCompleted: true,
    controlCritical: true,
    exceptionDueDateApproaching: true,
  },
};

const SETTINGS_KEY = "app.portalSettings";

function mergeWithDefaults(value = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    system: {
      ...DEFAULT_SETTINGS.system,
      ...(value.system || {}),
    },
    powerbi: {
      ...DEFAULT_SETTINGS.powerbi,
      ...(value.powerbi || {}),
    },
    upload: {
      ...DEFAULT_SETTINGS.upload,
      ...(value.upload || {}),
    },
    security: {
      ...DEFAULT_SETTINGS.security,
      ...(value.security || {}),
    },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...(value.notifications || {}),
    },
  };
}

export async function getSettings(req, res) {
  try {
    const existing = await prisma.appSetting.findFirst({
      where: {
        key: SETTINGS_KEY,
        scope: "SYSTEM",
        controlId: null,
      },
    });

    if (!existing) {
      const created = await prisma.appSetting.create({
        data: {
          key: SETTINGS_KEY,
          scope: "SYSTEM",
          value: DEFAULT_SETTINGS,
          description: "Portal-level CCM settings",
          updatedById: req.user?.id || null,
        },
      });

      return res.json({
        data: {
          id: created.id,
          settings: DEFAULT_SETTINGS,
          updatedAt: created.updatedAt,
        },
      });
    }

    return res.json({
      data: {
        id: existing.id,
        settings: mergeWithDefaults(existing.value),
        updatedAt: existing.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not fetch settings.",
      error: error.message,
    });
  }
}

export async function updateSettings(req, res) {
  try {
    const incomingSettings = req.body?.settings || req.body;
    const mergedSettings = mergeWithDefaults(incomingSettings);

    const existing = await prisma.appSetting.findFirst({
      where: {
        key: SETTINGS_KEY,
        scope: "SYSTEM",
        controlId: null,
      },
    });

    let saved;

    if (existing) {
      saved = await prisma.appSetting.update({
        where: {
          id: existing.id,
        },
        data: {
          value: mergedSettings,
          description: "Portal-level CCM settings",
          updatedById: req.user?.id || null,
        },
      });
    } else {
      saved = await prisma.appSetting.create({
        data: {
          key: SETTINGS_KEY,
          scope: "SYSTEM",
          value: mergedSettings,
          description: "Portal-level CCM settings",
          updatedById: req.user?.id || null,
        },
      });
    }

    return res.json({
      message: "Settings saved successfully.",
      data: {
        id: saved.id,
        settings: mergeWithDefaults(saved.value),
        updatedAt: saved.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not save settings.",
      error: error.message,
    });
  }
}

export async function resetSettings(req, res) {
  try {
    const existing = await prisma.appSetting.findFirst({
      where: {
        key: SETTINGS_KEY,
        scope: "SYSTEM",
        controlId: null,
      },
    });

    let saved;

    if (existing) {
      saved = await prisma.appSetting.update({
        where: {
          id: existing.id,
        },
        data: {
          value: DEFAULT_SETTINGS,
          description: "Portal-level CCM settings",
          updatedById: req.user?.id || null,
        },
      });
    } else {
      saved = await prisma.appSetting.create({
        data: {
          key: SETTINGS_KEY,
          scope: "SYSTEM",
          value: DEFAULT_SETTINGS,
          description: "Portal-level CCM settings",
          updatedById: req.user?.id || null,
        },
      });
    }

    return res.json({
      message: "Settings reset successfully.",
      data: {
        id: saved.id,
        settings: DEFAULT_SETTINGS,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not reset settings.",
      error: error.message,
    });
  }
}
