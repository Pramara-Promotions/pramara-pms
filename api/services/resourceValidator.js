// api/services/resourceValidator.js
/**
 * ═══════════════════════════════════════════════════════════════════
 * CRITICAL DESIGN PRINCIPLE: ZERO HARDCODED PROCESS ASSUMPTIONS
 * ═══════════════════════════════════════════════════════════════════
 * 
 * The system NEVER assumes which processes a project needs.
 * It validates ONLY what the user actually defined in their ProcessFlow.
 * 
 * VALIDATION APPROACH:
 * 1. UNIVERSAL checks: station operational, capacity defined (applies to ALL)
 * 2. OPTIONAL special checks: IF operation name suggests molding, THEN check molds
 * 3. NEVER fails if special equipment not found - only warns
 * 4. User defines reality, system validates against that reality
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * MANDATORY validation before plan generation
 * @param {number} projectId
 * @param {string} processFlowId
 * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
 */
async function validatePlanningResources(projectId, processFlowId) {
  const errors = [];
  const warnings = [];
  
  const operations = await prisma.processOperation.findMany({
    where: { processFlowId },
    include: { Station: true },
    orderBy: { sequence: 'asc' }
  });
  
  if (operations.length === 0) {
    errors.push({
      operation: null,
      type: 'NO_OPERATIONS',
      message: 'No operations defined in process flow'
    });
    return { valid: false, errors, warnings };
  }
  
  // Validate EACH operation the user defined (NO assumptions)
  for (const op of operations) {
    // 1. Basic validation (applies to ALL operations)
    await validateBasicOperation(op, errors, warnings);
    
    // 2. Station validation
    if (op.stationId) {
      await validateStation(op, errors, warnings);
      await validateCapacity(op, errors, warnings);
    }
    
    // 3. Machine availability (if explicitly required)
    if (op.machineRequired) {
      await validateMachineAvailability(op, projectId, errors, warnings);
    }
    
    // 4. Try special validation (OPTIONAL - based on operation name detection)
    const specialValidator = trySpecialValidation(op, projectId);
    if (specialValidator) {
      await specialValidator(op, projectId, errors, warnings);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ===== UNIVERSAL VALIDATORS (Apply to ALL operations) =====

async function validateBasicOperation(op, errors, warnings) {
  if (!op.operationName) {
    errors.push({
      operation: op.id,
      type: 'MISSING_NAME',
      message: `Operation at sequence ${op.sequence} has no name`
    });
  }
  
  if (!op.stationId) {
    errors.push({
      operation: op.operationName,
      type: 'NO_STATION',
      message: `Operation "${op.operationName}" has no station assigned`
    });
  }
  
  if (!op.standardOutput || op.standardOutput <= 0) {
    errors.push({
      operation: op.operationName,
      type: 'NO_CAPACITY',
      message: `Operation "${op.operationName}" has no capacity defined (standardOutput)`
    });
  }
}

async function validateStation(op, errors, warnings) {
  if (!op.Station) return;
  
  const station = op.Station;
  
  // Station must be operational
  if (station.status !== 'operational') {
    errors.push({
      operation: op.operationName,
      type: 'STATION_NOT_OPERATIONAL',
      message: `Station "${station.name}" is ${station.status}, not operational`
    });
  }
}

async function validateCapacity(op, errors, warnings) {
  if (!op.Station) return;
  
  const station = op.Station;
  
  // If station has capacity limit, check if operation exceeds it
  if (station.capacity > 0 && op.standardOutput > station.capacity * 1.5) {
    warnings.push({
      operation: op.operationName,
      type: 'CAPACITY_MISMATCH',
      message: `Operation planned for ${op.standardOutput} units/hr, but station capacity is ${station.capacity} units/hr`
    });
  }
}

async function validateMachineAvailability(op, projectId, errors, warnings) {
  // Operation explicitly requires machines
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: op.stationId,
      status: 'operational'
    }
  });
  
  if (machines.length === 0) {
    errors.push({
      operation: op.operationName,
      type: 'NO_MACHINES',
      message: `Operation "${op.operationName}" requires machines, but station has none`
    });
  }
}

// ===== OPTIONAL SPECIAL VALIDATORS (Only if detected) =====

function trySpecialValidation(op, projectId) {
  const name = op.operationName.toLowerCase();
  const code = op.operationCode?.toLowerCase() || '';
  
  // Try to detect special equipment needs (OPTIONAL, not required)
  // These are intelligent hints, NOT mandatory checks
  
  // Plastic/Injection processes
  if (name.includes('mould') || name.includes('molding') || name.includes('injection') || code.includes('mould')) {
    return validateMoldingResources;
  }
  
  // Coating/Painting processes
  if (name.includes('spray') || name.includes('paint') || name.includes('coat') || code.includes('spray')) {
    return validateSprayResources;
  }
  
  // Printing processes
  if (name.includes('pad') || name.includes('print') || name.includes('screen') || code.includes('print')) {
    return validatePadPrintResources;
  }
  
  // Paper processes
  if (name.includes('cut') || name.includes('roll') || name.includes('paper') || name.includes('stick')) {
    return validatePaperProcessingResources;
  }
  
  // Wood processes
  if (name.includes('wood') || name.includes('carv') || name.includes('shape') || name.includes('lathe') || name.includes('pencil')) {
    return validateWoodProcessingResources;
  }
  
  // Metal processes
  if (name.includes('stamp') || name.includes('polish') || name.includes('engrav') || name.includes('metal') || name.includes('press')) {
    return validateMetalProcessingResources;
  }
  
  // Assembly processes
  if (name.includes('assembl') || name.includes('assm') || code.includes('assm')) {
    return validateAssemblyResources;
  }
  
  // Packaging
  if (name.includes('pack') || code.includes('pack')) {
    return validatePackagingResources;
  }
  
  // No special validation detected - generic checks are sufficient
  return null;
}

/**
 * ONLY validates molding if operation name/code suggests it needs molds
 */
async function validateMoldingResources(op, projectId, errors, warnings) {
  const station = op.Station;
  
  // 1. Check if station has molding machines
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: station.id,
      status: 'operational',
      machineType: 'molding'
    },
    include: { MoldMaster: true }
  });
  
  if (machines.length === 0) {
    errors.push({
      operation: op.operationName,
      type: 'NO_MOLDING_MACHINES',
      message: `Molding operation "${op.operationName}" requires molding machines at station "${station.name}"`
    });
    return;
  }
  
  // 2. Check if machines have molds assigned
  const machinesWithMolds = machines.filter(m => m.moldMasterId !== null);
  if (machinesWithMolds.length === 0) {
    errors.push({
      operation: op.operationName,
      type: 'NO_MOLDS_ASSIGNED',
      message: `Molding machines at "${station.name}" have no molds assigned`
    });
    return;
  }
  
  // 3. Check if molds are for this project
  const projectMolds = await prisma.moldMaster.findMany({
    where: {
      projectId,
      status: 'active'
    }
  });
  
  if (projectMolds.length === 0) {
    warnings.push({
      operation: op.operationName,
      type: 'NO_PROJECT_MOLDS',
      message: `No molds assigned to this project. Planning may proceed but ensure molds are available.`
    });
  }
  
  // 4. Calculate real capacity vs planned capacity
  if (machinesWithMolds.length > 0 && machinesWithMolds[0].MoldMaster) {
    const totalCavities = machinesWithMolds.reduce((sum, m) => sum + (m.cavities || 0), 0);
    const avgCycleTime = machinesWithMolds[0].MoldMaster.cycleTimeSec || machinesWithMolds[0].cycleTimeSec || 60;
    const realCapacityPerHour = Math.floor((3600 / avgCycleTime) * totalCavities);
    
    if (op.standardOutput > realCapacityPerHour * 1.2) {
      errors.push({
        operation: op.operationName,
        type: 'CAPACITY_EXCEEDS_PHYSICAL',
        message: `Planned ${op.standardOutput} units/hr exceeds physical capacity of ${realCapacityPerHour} units/hr (${machinesWithMolds.length} machines × ${totalCavities} cavities)`
      });
    } else if (op.standardOutput > realCapacityPerHour) {
      warnings.push({
        operation: op.operationName,
        type: 'CAPACITY_NEAR_LIMIT',
        message: `Planned ${op.standardOutput} units/hr is near physical limit of ${realCapacityPerHour} units/hr`
      });
    }
  }
  
  // 5. Check machine availability (not assigned to other projects)
  const busyMachines = machinesWithMolds.filter(m => 
    m.currentProjectId && m.currentProjectId !== projectId
  );
  if (busyMachines.length > 0) {
    warnings.push({
      operation: op.operationName,
      type: 'MACHINES_BUSY',
      message: `${busyMachines.length} molding machines are assigned to other projects`
    });
  }
}

async function validateSprayResources(op, errors, warnings) {
  const station = op.Station;
  
  const sprayMachines = await prisma.stationMachine.findMany({
    where: {
      stationId: station.id,
      status: 'operational',
      machineType: { in: ['spray_booth', 'painting', 'coating'] }
    }
  });
  
  if (sprayMachines.length === 0) {
    warnings.push({
      operation: op.operationName,
      type: 'NO_SPRAY_EQUIPMENT',
      message: `No spray booths found at station "${station.name}". Verify equipment availability.`
    });
  }
}

async function validatePadPrintResources(op, errors, warnings) {
  const station = op.Station;
  
  const printMachines = await prisma.stationMachine.findMany({
    where: {
      stationId: station.id,
      status: 'operational',
      machineType: { in: ['pad_printing', 'printing', 'screen_printing'] }
    }
  });
  
  if (printMachines.length === 0) {
    warnings.push({
      operation: op.operationName,
      type: 'NO_PRINTING_MACHINES',
      message: `No printing machines found at station "${station.name}". Verify equipment availability.`
    });
  }
}

async function validateAssemblyResources(op, errors, warnings) {
  const station = op.Station;
  
  if (station.status !== 'operational') {
    errors.push({
      operation: op.operationName,
      type: 'STATION_NOT_READY',
      message: `Assembly station "${station.name}" is not operational`
    });
  }
  
  if (!station.capacity || station.capacity === 0) {
    warnings.push({
      operation: op.operationName,
      type: 'NO_CAPACITY_DEFINED',
      message: `Assembly station "${station.name}" has no capacity defined`
    });
  }
}

async function validatePaperProcessingResources(op, errors, warnings) {
  const station = op.Station;
  
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: station.id,
      status: 'operational'
    }
  });
  
  if (machines.length === 0) {
    warnings.push({
      operation: op.operationName,
      type: 'NO_PROCESSING_EQUIPMENT',
      message: `No paper processing equipment found at station "${station.name}". Verify equipment availability.`
    });
  }
}

async function validateWoodProcessingResources(op, errors, warnings) {
  const station = op.Station;
  
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: station.id,
      status: 'operational'
    }
  });
  
  if (machines.length === 0) {
    warnings.push({
      operation: op.operationName,
      type: 'NO_WOODWORKING_EQUIPMENT',
      message: `No woodworking equipment found at station "${station.name}". Verify equipment availability.`
    });
  }
}

async function validateMetalProcessingResources(op, errors, warnings) {
  const station = op.Station;
  
  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId: station.id,
      status: 'operational'
    }
  });
  
  if (machines.length === 0) {
    warnings.push({
      operation: op.operationName,
      type: 'NO_METAL_EQUIPMENT',
      message: `No metal processing equipment found at station "${station.name}". Verify equipment availability.`
    });
  }
}

async function validatePackagingResources(op, errors, warnings) {
  const station = op.Station;
  
  if (station && station.status !== 'operational') {
    errors.push({
      operation: op.operationName,
      type: 'STATION_NOT_READY',
      message: `Packaging station "${station.name}" is not operational`
    });
  }
}

/**
 * Detect operation type (helper for UI/planning)
 * @param {string} operationName
 * @returns {string|null}
 */
function detectOperationType(operationName) {
  const name = operationName.toLowerCase();
  
  if (name.includes('mould') || name.includes('molding') || name.includes('injection')) return 'molding';
  if (name.includes('spray') || name.includes('paint') || name.includes('coat')) return 'coating';
  if (name.includes('pad') || name.includes('print') || name.includes('screen')) return 'printing';
  if (name.includes('cut') || name.includes('roll') || name.includes('paper')) return 'paper_processing';
  if (name.includes('wood') || name.includes('carv') || name.includes('lathe')) return 'wood_processing';
  if (name.includes('stamp') || name.includes('metal') || name.includes('polish')) return 'metal_processing';
  if (name.includes('assembl')) return 'assembly';
  if (name.includes('pack')) return 'packaging';
  
  return 'generic';
}

module.exports = {
  validatePlanningResources,
  detectOperationType
};
