-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'ANALYST', 'VIEWER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "PermissionResource" AS ENUM ('USERS', 'ROLES', 'DASHBOARD', 'KPI', 'EXCEPTION', 'UPLOAD', 'SETTINGS', 'POWERBI_REPORT', 'CONTROL', 'THRESHOLD', 'AUDIT_LOG');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'UPLOAD', 'APPROVE', 'MANAGE');

-- CreateEnum
CREATE TYPE "ControlCode" AS ENUM ('EARLY_PAYMENTS', 'DUPLICATE_PAYMENTS', 'DORMANT_PO', 'TWO_WAY_MATCH', 'NEW_UNDELIVERED_POS', 'AGED_OPEN_ADVANCES', 'INVOICE_SPLIT_BYPASS', 'DELAY_IN_INVOICING');

-- CreateEnum
CREATE TYPE "ControlCategory" AS ENUM ('PAYMENT', 'PROCURE_TO_PAY', 'PROCUREMENT', 'ADVANCE', 'INVOICING');

-- CreateEnum
CREATE TYPE "ControlState" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('GREEN', 'AMBER', 'RED', 'GREY');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('UP', 'DOWN', 'FLAT');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'FALSE_POSITIVE', 'WAIVED');

-- CreateEnum
CREATE TYPE "SnapshotGranularity" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('COMPANY', 'LEGAL_ENTITY', 'BUSINESS_UNIT', 'DEPARTMENT', 'VENDOR', 'COUNTRY', 'REGION');

-- CreateEnum
CREATE TYPE "UploadCategory" AS ENUM ('CONTROL_SOURCE_DATA', 'EXCEPTION_SOURCE', 'KPI_BASELINE', 'MASTER_DATA', 'REPORT_REFRESH', 'TEMPLATE', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceSystem" AS ENUM ('MANUAL_UPLOAD', 'ERP', 'SAP', 'ORACLE', 'POWERBI', 'API', 'CSV', 'EXCEL', 'OTHER');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'VALIDATING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RunType" AS ENUM ('INGESTION', 'VALIDATION', 'AGGREGATION', 'KPI_REFRESH', 'POWERBI_REFRESH', 'SCHEDULED_SYNC', 'MANUAL_RECALC');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULED', 'API', 'UPLOAD', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReportAccessMode" AS ENUM ('POWERBI_EMBED', 'EMBED_URL', 'IFRAME');

-- CreateEnum
CREATE TYPE "SettingScope" AS ENUM ('SYSTEM', 'USER', 'CONTROL');

-- CreateEnum
CREATE TYPE "ThresholdOperator" AS ENUM ('GT', 'GTE', 'LT', 'LTE', 'EQ', 'BETWEEN');

-- CreateEnum
CREATE TYPE "PageScope" AS ENUM ('DASHBOARD', 'KPI', 'EXCEPTIONS', 'UPLOAD', 'SETTINGS');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'UPLOAD', 'RETRY', 'PROCESS', 'ASSIGN', 'RESOLVE', 'CONFIGURE');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('USER', 'ROLE', 'PERMISSION', 'CONTROL', 'POWERBI_REPORT', 'CONTROL_REPORT_MAP', 'EXCEPTION', 'UPLOAD', 'PROCESS_RUN', 'SETTING', 'SESSION');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "fullName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "resource" "PermissionResource" NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT,
    "accessJti" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Control" (
    "id" UUID NOT NULL,
    "code" "ControlCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ControlCategory" NOT NULL,
    "state" "ControlState" NOT NULL DEFAULT 'ACTIVE',
    "ownerTeam" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "thresholdConfig" JSONB,
    "uiConfig" JSONB,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlThreshold" (
    "id" UUID NOT NULL,
    "controlId" UUID NOT NULL,
    "metricKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "operator" "ThresholdOperator" NOT NULL,
    "greenMin" DECIMAL(18,4),
    "greenMax" DECIMAL(18,4),
    "amberMin" DECIMAL(18,4),
    "amberMax" DECIMAL(18,4),
    "redMin" DECIMAL(18,4),
    "redMax" DECIMAL(18,4),
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerBIWorkspace" (
    "id" UUID NOT NULL,
    "workspaceKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PowerBIWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerBIReport" (
    "id" UUID NOT NULL,
    "workspaceId" UUID,
    "reportKey" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "datasetKey" TEXT,
    "embedUrl" TEXT NOT NULL,
    "pageName" TEXT,
    "accessMode" "ReportAccessMode" NOT NULL DEFAULT 'POWERBI_EMBED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PowerBIReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlReportMap" (
    "id" UUID NOT NULL,
    "controlId" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "pageName" TEXT,
    "filterConfig" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlReportMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessEntity" (
    "id" UUID NOT NULL,
    "type" "EntityType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlMetricSnapshot" (
    "id" UUID NOT NULL,
    "controlId" UUID NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "granularity" "SnapshotGranularity" NOT NULL,
    "periodLabel" TEXT,
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'GREY',
    "trendDirection" "TrendDirection" NOT NULL DEFAULT 'FLAT',
    "totalPopulation" INTEGER NOT NULL DEFAULT 0,
    "passCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "breachCount" INTEGER NOT NULL DEFAULT 0,
    "exceptionCount" INTEGER NOT NULL DEFAULT 0,
    "exceptionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exposureAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "healthScore" DECIMAL(5,2),
    "sourceRunId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityScoreSnapshot" (
    "id" UUID NOT NULL,
    "controlId" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "granularity" "SnapshotGranularity" NOT NULL,
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'GREY',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "score" DECIMAL(5,2),
    "exceptionCount" INTEGER NOT NULL DEFAULT 0,
    "exceptionAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exposureAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExceptionRecord" (
    "id" UUID NOT NULL,
    "controlId" UUID NOT NULL,
    "entityId" UUID,
    "ownerId" UUID,
    "resolvedById" UUID,
    "sourceRunId" UUID,
    "externalRef" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "SeverityLevel" NOT NULL DEFAULT 'MEDIUM',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "amount" DECIMAL(18,2),
    "currencyCode" TEXT DEFAULT 'USD',
    "sourceSystem" "SourceSystem" NOT NULL DEFAULT 'MANUAL_UPLOAD',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "rootCause" TEXT,
    "actionRequired" TEXT,
    "resolutionNote" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExceptionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadBatch" (
    "id" UUID NOT NULL,
    "controlId" UUID,
    "uploadedById" UUID,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileExtension" TEXT,
    "fileSizeBytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "category" "UploadCategory" NOT NULL,
    "sourceSystem" "SourceSystem" NOT NULL DEFAULT 'MANUAL_UPLOAD',
    "reportingPeriodStart" TIMESTAMP(3),
    "reportingPeriodEnd" TIMESTAMP(3),
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "successRowCount" INTEGER NOT NULL DEFAULT 0,
    "failedRowCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "meta" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadRowError" (
    "id" UUID NOT NULL,
    "uploadBatchId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "fieldName" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadRowError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessRun" (
    "id" UUID NOT NULL,
    "controlId" UUID,
    "uploadBatchId" UUID,
    "triggeredById" UUID,
    "type" "RunType" NOT NULL,
    "triggerType" "TriggerType" NOT NULL DEFAULT 'MANUAL',
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "controlId" UUID,
    "page" "PageScope" NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "scope" "SettingScope" NOT NULL DEFAULT 'SYSTEM',
    "controlId" UUID,
    "updatedById" UUID,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_accessJti_key" ON "AuthSession"("accessJti");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Control_code_key" ON "Control"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Control_name_key" ON "Control"("name");

-- CreateIndex
CREATE INDEX "ControlThreshold_controlId_metricKey_idx" ON "ControlThreshold"("controlId", "metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "PowerBIWorkspace_workspaceKey_key" ON "PowerBIWorkspace"("workspaceKey");

-- CreateIndex
CREATE UNIQUE INDEX "PowerBIReport_reportKey_key" ON "PowerBIReport"("reportKey");

-- CreateIndex
CREATE INDEX "PowerBIReport_workspaceId_idx" ON "PowerBIReport"("workspaceId");

-- CreateIndex
CREATE INDEX "ControlReportMap_controlId_isDefault_idx" ON "ControlReportMap"("controlId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "ControlReportMap_controlId_reportId_effectiveFrom_key" ON "ControlReportMap"("controlId", "reportId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "BusinessEntity_parentId_idx" ON "BusinessEntity"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessEntity_type_code_key" ON "BusinessEntity"("type", "code");

-- CreateIndex
CREATE INDEX "ControlMetricSnapshot_snapshotDate_idx" ON "ControlMetricSnapshot"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "ControlMetricSnapshot_controlId_snapshotDate_granularity_key" ON "ControlMetricSnapshot"("controlId", "snapshotDate", "granularity");

-- CreateIndex
CREATE INDEX "EntityScoreSnapshot_entityId_snapshotDate_idx" ON "EntityScoreSnapshot"("entityId", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "EntityScoreSnapshot_controlId_entityId_snapshotDate_granula_key" ON "EntityScoreSnapshot"("controlId", "entityId", "snapshotDate", "granularity");

-- CreateIndex
CREATE INDEX "ExceptionRecord_controlId_status_severity_idx" ON "ExceptionRecord"("controlId", "status", "severity");

-- CreateIndex
CREATE INDEX "ExceptionRecord_entityId_idx" ON "ExceptionRecord"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ExceptionRecord_controlId_externalRef_key" ON "ExceptionRecord"("controlId", "externalRef");

-- CreateIndex
CREATE INDEX "UploadBatch_status_uploadedAt_idx" ON "UploadBatch"("status", "uploadedAt");

-- CreateIndex
CREATE INDEX "UploadBatch_controlId_uploadedAt_idx" ON "UploadBatch"("controlId", "uploadedAt");

-- CreateIndex
CREATE INDEX "UploadRowError_uploadBatchId_rowNumber_idx" ON "UploadRowError"("uploadBatchId", "rowNumber");

-- CreateIndex
CREATE INDEX "ProcessRun_status_createdAt_idx" ON "ProcessRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProcessRun_controlId_type_idx" ON "ProcessRun"("controlId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_userId_page_name_key" ON "SavedView"("userId", "page", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_scope_controlId_key" ON "AppSetting"("key", "scope", "controlId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlThreshold" ADD CONSTRAINT "ControlThreshold_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PowerBIReport" ADD CONSTRAINT "PowerBIReport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "PowerBIWorkspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlReportMap" ADD CONSTRAINT "ControlReportMap_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlReportMap" ADD CONSTRAINT "ControlReportMap_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PowerBIReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessEntity" ADD CONSTRAINT "BusinessEntity_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BusinessEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlMetricSnapshot" ADD CONSTRAINT "ControlMetricSnapshot_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlMetricSnapshot" ADD CONSTRAINT "ControlMetricSnapshot_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ProcessRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityScoreSnapshot" ADD CONSTRAINT "EntityScoreSnapshot_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityScoreSnapshot" ADD CONSTRAINT "EntityScoreSnapshot_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "BusinessEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionRecord" ADD CONSTRAINT "ExceptionRecord_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionRecord" ADD CONSTRAINT "ExceptionRecord_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "BusinessEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionRecord" ADD CONSTRAINT "ExceptionRecord_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionRecord" ADD CONSTRAINT "ExceptionRecord_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExceptionRecord" ADD CONSTRAINT "ExceptionRecord_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ProcessRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadBatch" ADD CONSTRAINT "UploadBatch_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadBatch" ADD CONSTRAINT "UploadBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadRowError" ADD CONSTRAINT "UploadRowError_uploadBatchId_fkey" FOREIGN KEY ("uploadBatchId") REFERENCES "UploadBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRun" ADD CONSTRAINT "ProcessRun_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRun" ADD CONSTRAINT "ProcessRun_uploadBatchId_fkey" FOREIGN KEY ("uploadBatchId") REFERENCES "UploadBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessRun" ADD CONSTRAINT "ProcessRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
