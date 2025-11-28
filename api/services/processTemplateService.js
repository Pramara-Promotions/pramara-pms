// api/services/processTemplateService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get template suggestions for a new operation
 * @param {string} operationName - Name of the operation being created
 * @param {number} projectId - Optional project ID for context
 * @returns {Object} Template suggestions
 */
async function suggestTemplate(operationName, projectId = null) {
  // Detect process type from operation name
  const processType = detectProcessType(operationName);
  const subType = detectSubType(operationName);
  
  if (!processType) {
    return {
      processType: null,
      subType: null,
      templates: [],
      hasTemplates: false
    };
  }
  
  // Find matching templates, ordered by usage and success rate
  const templates = await prisma.processTemplate.findMany({
    where: {
      processType,
      ...(subType && { subType })
    },
    orderBy: [
      { successRate: 'desc' },
      { usageCount: 'desc' }
    ],
    take: 3 // Top 3 suggestions
  });
  
  return {
    processType,
    subType,
    templates,
    hasTemplates: templates.length > 0
  };
}

/**
 * Learn from a completed project
 * Analyzes process flows and creates/updates templates
 * @param {number} projectId - ID of completed project
 */
async function learnFromProject(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      processFlows: {
        where: { status: 'active' },
        include: {
          operations: {
            include: {
              subOperations: true,
              station: true
            },
            orderBy: { sequence: 'asc' }
          }
        }
      }
    }
  });
  
  if (!project || project.status !== 'completed') {
    return; // Only learn from successful projects
  }
  
  for (const flow of project.processFlows) {
    for (const operation of flow.operations) {
      const processType = detectProcessType(operation.operationName);
      const subType = detectSubType(operation.operationName);
      
      if (!processType) continue;
      
      // Check if template exists
      const existing = await prisma.processTemplate.findFirst({
        where: { processType, subType }
      });
      
      if (existing) {
        // Update usage count and success rate
        await prisma.processTemplate.update({
          where: { id: existing.id },
          data: {
            usageCount: { increment: 1 },
            successRate: calculateSuccessRate(existing.usageCount + 1, existing.successRate),
            updatedAt: new Date()
          }
        });
      } else {
        // Create new template from successful operation
        await createTemplateFromOperation(operation, processType, subType);
      }
    }
  }
}

/**
 * Detect process type from operation name
 * @param {string} operationName
 * @returns {string|null}
 */
function detectProcessType(operationName) {
  const name = operationName.toLowerCase();
  
  if (name.includes('mould') || name.includes('molding') || name.includes('injection') || name.includes('blow')) {
    return 'molding';
  }
  if (name.includes('cut') || name.includes('roll') || name.includes('paper') || name.includes('stick')) {
    return 'paper_processing';
  }
  if (name.includes('wood') || name.includes('carv') || name.includes('lathe') || name.includes('pencil')) {
    return 'wood_processing';
  }
  if (name.includes('stamp') || name.includes('metal') || name.includes('press') || name.includes('polish') || name.includes('engrav')) {
    return 'metal_processing';
  }
  if (name.includes('spray') || name.includes('paint') || name.includes('coat')) {
    return 'coating';
  }
  if (name.includes('pad') || name.includes('print') || name.includes('screen')) {
    return 'printing';
  }
  if (name.includes('assembl')) {
    return 'assembly';
  }
  if (name.includes('pack')) {
    return 'packaging';
  }
  
  return null; // Unknown process type
}

/**
 * Detect sub-type for more specific templates
 * @param {string} operationName
 * @returns {string|null}
 */
function detectSubType(operationName) {
  const name = operationName.toLowerCase();
  
  // Molding sub-types
  if (name.includes('injection')) return 'injection';
  if (name.includes('blow')) return 'blow';
  if (name.includes('roto')) return 'rotational';
  if (name.includes('compression')) return 'compression';
  
  // Metal processing sub-types
  if (name.includes('stamp')) return 'stamping';
  if (name.includes('polish')) return 'polishing';
  if (name.includes('engrav')) return 'engraving';
  
  // Printing sub-types
  if (name.includes('pad')) return 'pad_printing';
  if (name.includes('screen')) return 'screen_printing';
  
  return null;
}

/**
 * Create template from successful operation
 * @param {Object} operation - ProcessOperation with relations
 * @param {string} processType
 * @param {string} subType
 */
async function createTemplateFromOperation(operation, processType, subType = null) {
  const structure = {
    stages: analyzeOperationStages(operation),
    requiredResources: extractRequiredResources(operation),
    commonParameters: extractCommonParameters(operation)
  };
  
  const templateName = `${processType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}${subType ? ` - ${subType.replace('_', ' ')}` : ''} Standard Flow`;
  
  await prisma.processTemplate.create({
    data: {
      name: templateName,
      processType,
      subType,
      description: `Learned from successful operations`,
      isSystemDefined: false,
      usageCount: 1,
      successRate: 100.0,
      structure
    }
  });
}

/**
 * Analyze operation stages
 */
function analyzeOperationStages(operation) {
  const stages = [{
    name: operation.operationName,
    code: operation.operationCode,
    description: operation.operationDescription,
    estimatedTime: operation.estimatedTime,
    standardOutput: operation.standardOutput,
    skillLevel: operation.skillLevel,
    qualityCheckpoints: operation.qualityCheckpoints,
    safetyRequirements: operation.safetyRequirements
  }];
  
  // Add sub-operations
  if (operation.subOperations && operation.subOperations.length > 0) {
    stages.push(...operation.subOperations.map(sub => ({
      name: sub.subOperationName,
      code: sub.subOperationCode,
      description: sub.description,
      estimatedTime: sub.estimatedTime,
      isOptional: sub.isOptional,
      checkpoints: sub.checkpoints
    })));
  }
  
  return stages;
}

/**
 * Extract required resources
 */
function extractRequiredResources(operation) {
  const resources = [];
  
  if (operation.machineRequired) {
    resources.push({
      type: 'machine',
      specification: operation.machineRequired,
      required: true
    });
  }
  
  if (operation.toolsRequired) {
    resources.push({
      type: 'tools',
      items: operation.toolsRequired,
      required: true
    });
  }
  
  if (operation.station) {
    resources.push({
      type: 'station',
      specification: operation.station.name,
      required: true
    });
  }
  
  return resources;
}

/**
 * Extract common parameters
 */
function extractCommonParameters(operation) {
  return {
    estimatedTimeRange: {
      min: operation.estimatedTime ? operation.estimatedTime * 0.8 : null,
      max: operation.estimatedTime ? operation.estimatedTime * 1.2 : null
    },
    outputRange: {
      min: operation.standardOutput ? operation.standardOutput * 0.9 : null,
      max: operation.standardOutput ? operation.standardOutput * 1.1 : null
    },
    skillLevel: operation.skillLevel
  };
}

/**
 * Calculate success rate
 */
function calculateSuccessRate(usageCount, currentRate) {
  // Simple moving average - can be enhanced
  return ((currentRate * (usageCount - 1)) + 100) / usageCount;
}

/**
 * Apply template to a process flow
 * @param {string} templateId
 * @param {string} processFlowId
 */
async function applyTemplateToFlow(templateId, processFlowId) {
  const template = await prisma.processTemplate.findUnique({
    where: { id: templateId }
  });
  
  if (!template) {
    throw new Error('Template not found');
  }
  
  const processFlow = await prisma.processFlow.findUnique({
    where: { id: processFlowId },
    include: { operations: true }
  });
  
  if (!processFlow) {
    throw new Error('Process flow not found');
  }
  
  // Create operations from template structure
  const stages = template.structure.stages || [];
  let sequence = processFlow.operations.length + 1;
  
  for (const stage of stages) {
    await prisma.processOperation.create({
      data: {
        processFlowId,
        operationName: stage.name,
        operationCode: stage.code || `OP-${sequence}`,
        operationDescription: stage.description,
        sequence,
        estimatedTime: stage.estimatedTime,
        standardOutput: stage.standardOutput,
        skillLevel: stage.skillLevel,
        qualityCheckpoints: stage.qualityCheckpoints,
        safetyRequirements: stage.safetyRequirements
      }
    });
    sequence++;
  }
  
  // Update template usage
  await prisma.processTemplate.update({
    where: { id: templateId },
    data: { usageCount: { increment: 1 } }
  });
  
  return { success: true, operationsCreated: stages.length };
}

module.exports = {
  suggestTemplate,
  learnFromProject,
  detectProcessType,
  detectSubType,
  applyTemplateToFlow
};
