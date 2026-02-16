#!/usr/bin/env node
/**
 * DELETE ALL DATA - Complete data flush for ALL projects, workers, and data
 * Removes everything: Projects, Workers, Users, Batches, Production, Compliance, etc.
 * This is a DESTRUCTIVE operation!
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllData() {
    console.log('🚨 DELETE ALL DATA - COMPLETE FLUSH');
    console.log('='.repeat(70));
    console.log('This will DELETE ALL projects, workers, users, and data!\n');

    try {
        // Delete in dependency order (respect foreign keys)

        console.log('🗑️  Deleting QC Data...');
        await prisma.qCItemResult.deleteMany({});
        await prisma.qCSubmission.deleteMany({});
        await prisma.qCItemTemplate.deleteMany({});
        await prisma.qCChecklistTemplate.deleteMany({});
        await prisma.qCRecord.deleteMany({}); console.log('🗑️  Deleting WIP Ledgers...');
        await prisma.wIPLedger.deleteMany({});

        console.log('🗑️  Deleting Production & Batch Data...');
        await prisma.batchMovement.deleteMany({});
        await prisma.batch.deleteMany({});
        await prisma.lot.deleteMany({});
        await prisma.productionEntry.deleteMany({});
        await prisma.productionCalculation.deleteMany({});

        console.log('🗑️  Deleting Material Consumption...');
        await prisma.materialConsumption.deleteMany({});
        await prisma.materialReservation.deleteMany({});
        await prisma.stockMovement.deleteMany({}); console.log('🗑️  Deleting Daily Plans & Shifts...');
        await prisma.dailyPlanStationAuto.deleteMany({});
        await prisma.dailyPlanStation.deleteMany({});
        await prisma.dailyPlan.deleteMany({});
        await prisma.shiftPlan.deleteMany({});
        await prisma.shiftHandover.deleteMany({});
        await prisma.shiftEntry.deleteMany({});
        await prisma.shift.deleteMany({});

        console.log('🗑️  Deleting Worker & Workforce Data...');
        await prisma.workerPerformance.deleteMany({});
        await prisma.worker.deleteMany({});
        await prisma.providerPerformance.deleteMany({});
        await prisma.thirdPartyProvider.deleteMany({});

        console.log('🗑️  Deleting Compliance & Documents...');
        await prisma.complianceDocument.deleteMany({});
        await prisma.complianceRequirement.deleteMany({});
        await prisma.complianceReminder.deleteMany({});
        await prisma.complianceAudit.deleteMany({});
        await prisma.companyCertification.deleteMany({});
        await prisma.materialCompliance.deleteMany({});
        await prisma.labTest.deleteMany({});
        await prisma.projectCompliance.deleteMany({});
        await prisma.projectDocument.deleteMany({});
        await prisma.projectPolicy.deleteMany({});

        console.log('🗑️  Deleting Process & Operations...');
        await prisma.processPlanDetail.deleteMany({});
        await prisma.subOperation.deleteMany({});
        await prisma.processOperation.deleteMany({});
        await prisma.processFlow.deleteMany({});
        await prisma.processConfig.deleteMany({});
        await prisma.processTemplate.deleteMany({}); console.log('🗑️  Deleting Plan Generation & Adaptations...');
        await prisma.planConflict.deleteMany({});
        await prisma.planModificationHistory.deleteMany({});
        await prisma.planAdaptation.deleteMany({});
        await prisma.loadBalancingOpportunity.deleteMany({});
        await prisma.resourceAvailabilityEvent.deleteMany({});
        await prisma.dailyPlanGeneration.deleteMany({});

        console.log('🗑️  Deleting Machine & Station Data...');
        await prisma.changeoverHistory.deleteMany({});
        await prisma.workstationAsset.deleteMany({});
        await prisma.asset.deleteMany({});
        await prisma.resourceAllocation.deleteMany({});
        await prisma.stationMachine.deleteMany({});
        await prisma.maintenanceLog.deleteMany({});
        await prisma.documentStation.deleteMany({});
        await prisma.station.deleteMany({}); console.log('🗑️  Deleting Trials & Molds...');
        await prisma.trial.deleteMany({});
        await prisma.mold.deleteMany({});
        await prisma.moldMaster.deleteMany({}); console.log('🗑️  Deleting Packaging & PPS...');
        await prisma.packagingDesign.deleteMany({});
        await prisma.pPSApproval.deleteMany({}); console.log('🗑️  Deleting Costing...');
        await prisma.costingApproval.deleteMany({});
        await prisma.pricingTier.deleteMany({});
        await prisma.costComponent.deleteMany({});
        await prisma.projectCosting.deleteMany({});
        await prisma.costTemplate.deleteMany({});
        await prisma.marginRule.deleteMany({}); console.log('🗑️  Deleting Components & Materials...');
        await prisma.componentMaterial.deleteMany({});
        await prisma.productComponent.deleteMany({});
        await prisma.bOMItem.deleteMany({});
        await prisma.mRPRecommendation.deleteMany({});
        await prisma.mRPLearning.deleteMany({});
        await prisma.materialRequirement.deleteMany({});
        await prisma.materialForecast.deleteMany({});
        await prisma.materialLot.deleteMany({});
        await prisma.material.deleteMany({});

        console.log('🗑️  Deleting Tasks & Boards...');
        await prisma.reminder.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.boardColumn.deleteMany({});

        console.log('🗑️  Deleting Project Data...');
        await prisma.changeLog.deleteMany({});
        await prisma.alertAction.deleteMany({});
        await prisma.alert.deleteMany({});
        await prisma.alertRule.deleteMany({});
        await prisma.inventoryNeed.deleteMany({});
        await prisma.preProdStep.deleteMany({});
        await prisma.varianceItem.deleteMany({});
        await prisma.approvalReminder.deleteMany({});
        await prisma.approvalRequest.deleteMany({});
        await prisma.workflowTask.deleteMany({});
        await prisma.workflowDependency.deleteMany({});
        await prisma.stageDocument.deleteMany({});
        await prisma.workflowStage.deleteMany({});
        await prisma.projectWorkflowStatus.deleteMany({});
        await prisma.projectPref.deleteMany({});
        await prisma.projectSku.deleteMany({});
        await prisma.purchaseOrder.deleteMany({});
        await prisma.complianceItem.deleteMany({});

        const projectResult = await prisma.project.deleteMany({});
        console.log(`    Deleted ${projectResult.count} projects`);

        console.log('🗑️  Deleting Infrastructure...');
        await prisma.room.deleteMany({});
        await prisma.section.deleteMany({});
        await prisma.floor.deleteMany({});
        await prisma.factory.deleteMany({});

        console.log('🗑️  Deleting User & System Data...');
        await prisma.session.deleteMany({});
        await prisma.device.deleteMany({});
        await prisma.auditLog.deleteMany({});
        await prisma.notification.deleteMany({});
        await prisma.userPreferences.deleteMany({});
        await prisma.temporaryPermission.deleteMany({});
        await prisma.permissionRequest.deleteMany({});
        await prisma.plannerPreference.deleteMany({});
        await prisma.roleApproval.deleteMany({});

        console.log('🗑️  Deleting User & Role Data...');
        await prisma.userRole.deleteMany({});

        const userResult = await prisma.user.deleteMany({});
        console.log(`    Deleted ${userResult.count} users`);

        console.log('🗑️  Deleting Roles...');
        await prisma.rolePermission.deleteMany({});
        const roleResult = await prisma.role.deleteMany({});
        console.log(`    Deleted ${roleResult.count} roles`);

        console.log('🗑️  Deleting Permissions...');
        await prisma.permission.deleteMany({});

        console.log('🗑️  Deleting Departments...');
        await prisma.department.deleteMany({});

        console.log('🗑️  Deleting Email & System...');
        await prisma.emailLog.deleteMany({});
        await prisma.inboundEmail.deleteMany({});
        await prisma.emailAccount.deleteMany({});
        await prisma.emailTemplate.deleteMany({});
        await prisma.documentExtractionField.deleteMany({});
        await prisma.documentExtractionApproval.deleteMany({});
        await prisma.documentExtractionJob.deleteMany({});
        await prisma.stationType.deleteMany({});
        await prisma.systemSetting.deleteMany({}); console.log('\n' + '='.repeat(70));
        console.log('✅ ALL DATA COMPLETELY DELETED!');
        console.log('='.repeat(70));
        console.log('\n📋 Summary:');
        console.log(`    ✓ ${projectResult.count} projects removed`);
        console.log(`    ✓ ${userResult.count} users removed`);
        console.log(`    ✓ ${roleResult.count} roles removed`);
        console.log(`    ✓ All workers, batches, production, and compliance data deleted`);
        console.log(`    ✓ All local storage already cleared`);
        console.log('\n🟢 System is ready for fresh data entry!\n');

    } catch (error) {
        console.error('\n❌ ERROR during deletion:', error.message);
        if (error.code) console.error('Code:', error.code);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

deleteAllData();
