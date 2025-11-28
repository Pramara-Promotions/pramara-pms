// Part 3: Shift Schedules, Quality Checkpoints, and Work Orders
// This will be merged into the main comprehensive-seed.js

// ============================================================================
// CREATE SHIFT SCHEDULES (2 shifts x 12 hours each)
// ============================================================================

async function createShiftSchedules(users, productionProjects) {
  const shifts = [];
  const supervisors = users.filter(u => u.name.includes('Supervisor'));
  const operators = users.filter(u => u.name.includes('Operator'));

  for (let day = -10; day <= 30; day++) {
    const date = addDays(new Date(), day);
    
    // Day Shift (08:00 - 20:00)
    const dayShift = await prisma.shiftEntry.create({
      data: {
        date: date,
        shiftType: 'DAY',
        startTime: new Date(date.setHours(8, 0, 0)),
        endTime: new Date(date.setHours(20, 0, 0)),
        supervisorId: supervisors[day % supervisors.length].id,
        metadata: {
          shiftName: 'Day Shift',
          hours: 12,
          breakTimes: ['10:30-10:45', '13:00-13:30', '16:30-16:45'],
          activeProjects: productionProjects.slice(0, 4).map(p => p.code)
        }
      }
    });
    shifts.push(dayShift);

    // Night Shift (20:00 - 08:00)
    const nightShift = await prisma.shiftEntry.create({
      data: {
        date: date,
        shiftType: 'NIGHT',
        startTime: new Date(date.setHours(20, 0, 0)),
        endTime: new Date(addDays(date, 1).setHours(8, 0, 0)),
        supervisorId: supervisors[(day + 1) % supervisors.length].id,
        metadata: {
          shiftName: 'Night Shift',
          hours: 12,
          breakTimes: ['22:30-22:45', '01:00-01:30', '04:30-04:45'],
          activeProjects: productionProjects.slice(4, 8).map(p => p.code)
        }
      }
    });
    shifts.push(nightShift);
  }

  // Create shift transfer logs
  for (let i = 0; i < Math.min(shifts.length - 1, 40); i++) {
    const currentShift = shifts[i];
    const nextShift = shifts[i + 1];
    
    await prisma.shiftEntry.update({
      where: { id: currentShift.id },
      data: {
        metadata: {
          ...currentShift.metadata,
          transferLog: {
            transferredTo: nextShift.id,
            transferTime: currentShift.endTime,
            handoverNotes: `All machines running. ${Math.floor(Math.random() * 3)} minor issues reported.`,
            pendingTasks: Math.floor(Math.random() * 5),
            completedTasks: Math.floor(10 + Math.random() * 15)
          }
        }
      }
    });
  }

  return shifts;
}

// ============================================================================
// CREATE QUALITY CHECKPOINTS
// ============================================================================

async function createQualityCheckpoints(productionProjects) {
  const checkpoints = [];

  for (const project of productionProjects) {
    if (!project.operations) continue;

    for (const operation of project.operations) {
      // In-line QC checkpoints for each operation
      const inlineChecks = [
        {
          name: `${operation.name} - Visual Inspection`,
          type: 'VISUAL',
          frequency: 'EVERY_BATCH',
          parameters: ['Surface finish', 'Color consistency', 'No scratches', 'No flash'],
          acceptanceCriteria: 'Zero defects visible to naked eye',
          sampleSize: 5
        },
        {
          name: `${operation.name} - Dimensional Check`,
          type: 'DIMENSIONAL',
          frequency: 'HOURLY',
          parameters: ['Length ±0.1mm', 'Width ±0.1mm', 'Thickness ±0.05mm', 'Flatness'],
          acceptanceCriteria: 'All measurements within tolerance',
          sampleSize: 3
        }
      ];

      // Add operation-specific checks
      if (operation.operationType === 'MOLDING') {
        inlineChecks.push({
          name: `${operation.name} - Cavity Check`,
          type: 'PROCESS',
          frequency: 'START_OF_SHIFT',
          parameters: ['All cavities filling', 'Proper ejection', 'Gate appearance', 'Cycle time stable'],
          acceptanceCriteria: 'All cavities producing good parts',
          sampleSize: 10
        });
      } else if (operation.operationType === 'PAINTING') {
        inlineChecks.push({
          name: `${operation.name} - Paint Quality`,
          type: 'VISUAL',
          frequency: 'EVERY_30MIN',
          parameters: ['Even coating', 'No runs', 'No orange peel', 'Color match'],
          acceptanceCriteria: 'Paint finish meets standard',
          sampleSize: 5
        });
      } else if (operation.operationType === 'ULTRASONIC') {
        inlineChecks.push({
          name: `${operation.name} - Weld Strength`,
          type: 'FUNCTIONAL',
          frequency: 'EVERY_BATCH',
          parameters: ['Weld integrity', 'No gaps', 'Pull test', 'Visual seam check'],
          acceptanceCriteria: 'Weld strength > 50N',
          sampleSize: 3
        });
      } else if (operation.operationType === 'SCREWING') {
        inlineChecks.push({
          name: `${operation.name} - Torque Check`,
          type: 'FUNCTIONAL',
          frequency: 'HOURLY',
          parameters: ['Torque setting', 'Thread engagement', 'No cross-threading', 'Screw depth'],
          acceptanceCriteria: 'Torque within 10-15 N⋅cm',
          sampleSize: 5
        });
      } else if (operation.operationType === 'ASSEMBLY') {
        inlineChecks.push({
          name: `${operation.name} - Assembly Verification`,
          type: 'FUNCTIONAL',
          frequency: 'EVERY_BATCH',
          parameters: ['All parts present', 'Correct orientation', 'Proper fit', 'Function test'],
          acceptanceCriteria: 'Assembly complete and functional',
          sampleSize: 5
        });
      }

      // Create checkpoint records
      for (const check of inlineChecks) {
        const checkpoint = await prisma.qCSubmission.create({
          data: {
            projectId: project.id,
            operationId: operation.id,
            checkpointName: check.name,
            checkpointType: check.type,
            status: 'PENDING',
            metadata: {
              frequency: check.frequency,
              parameters: check.parameters,
              acceptanceCriteria: check.acceptanceCriteria,
              sampleSize: check.sampleSize,
              operationType: operation.operationType
            }
          }
        });
        checkpoints.push(checkpoint);
      }
    }

    // Final QC checkpoint at the end
    const finalQC = await prisma.qCSubmission.create({
      data: {
        projectId: project.id,
        checkpointName: `${project.name} - Final Quality Inspection`,
        checkpointType: 'FINAL',
        status: 'PENDING',
        metadata: {
          frequency: 'EVERY_UNIT',
          parameters: [
            'Complete assembly',
            'All functions working',
            'Packaging integrity',
            'Documentation included',
            'Label correct'
          ],
          acceptanceCriteria: '100% pass rate',
          sampleSize: 100,
          destructiveTesting: false
        }
      }
    });
    checkpoints.push(finalQC);
  }

  return checkpoints;
}

// ============================================================================
// CREATE WORK ORDERS WITH DETAILED DOCUMENTATION
// ============================================================================

async function createWorkOrders(productionProjects, stations, users) {
  const workOrders = [];
  const operators = users.filter(u => u.name.includes('Operator'));

  for (const project of productionProjects) {
    if (!project.operations) continue;

    for (let day = -5; day <= 10; day++) {
      const date = addDays(new Date(), day);
      
      for (const operation of project.operations) {
        const assignedStation = operation.stationId 
          ? stations.find(s => s.id === operation.stationId)
          : stations.filter(s => s.category === operation.operationType.toLowerCase())[0];

        if (!assignedStation) continue;

        // Calculate quantities
        const dailyTarget = Math.floor(project.metadata.dailyTarget / project.operations.length);
        const actualProduced = day < 0 ? Math.floor(dailyTarget * (0.85 + Math.random() * 0.2)) : 0;
        const rejectedQty = day < 0 ? Math.floor(actualProduced * 0.02) : 0;

        // Day shift work order
        const dayWorkOrder = await prisma.workOrder.create({
          data: {
            projectId: project.id,
            operationId: operation.id,
            stationId: assignedStation.id,
            assignedTo: operators[Math.floor(Math.random() * operators.length)].id,
            workOrderNumber: `WO-${project.code}-${operation.sequenceOrder}-D${day}-DAY`,
            scheduledDate: date,
            shiftType: 'DAY',
            status: day < 0 ? 'COMPLETED' : 'PENDING',
            priority: project.priority,
            targetQuantity: dailyTarget / 2,
            completedQuantity: day < 0 ? Math.floor(actualProduced / 2) : 0,
            rejectedQuantity: day < 0 ? Math.floor(rejectedQty / 2) : 0,
            metadata: {
              operationName: operation.name,
              sequenceOrder: operation.sequenceOrder,
              cycleTime: operation.metadata.cycleTime,
              setupTime: operation.metadata.setupTime,
              operatorsRequired: operation.metadata.operatorsRequired,
              
              // Production Guidelines
              productionGuidelines: {
                setup: [
                  'Verify machine settings match work order',
                  'Check material availability',
                  'Inspect tooling condition',
                  'Run trial pieces and get approval'
                ],
                operation: [
                  'Monitor cycle time continuously',
                  'Perform in-line QC checks per schedule',
                  'Record all rejections with reason codes',
                  'Maintain 5S at workstation'
                ],
                qualityPoints: [
                  'Check first piece from each batch',
                  'Monitor dimensional accuracy',
                  'Report any variation immediately',
                  'Tag and segregate rejected parts'
                ],
                safety: [
                  'Wear required PPE',
                  'Follow machine safety protocols',
                  'Keep emergency stops accessible',
                  'Report any unsafe conditions'
                ]
              },

              // Material Movement Planning
              materialMovement: {
                inputMaterial: {
                  location: 'Raw Material Store',
                  requiredQuantity: dailyTarget / 2,
                  pickupTime: '07:45',
                  transportMethod: 'Material Cart',
                  verification: 'Scan barcode and verify quantity'
                },
                outputMaterial: {
                  location: `WIP-${operation.sequenceOrder + 1}`,
                  expectedQuantity: Math.floor(dailyTarget / 2 * 0.95),
                  deliveryTime: '19:45',
                  transportMethod: 'Pallet',
                  documentation: 'Complete handover form'
                },
                rejectedParts: {
                  location: 'Rejection Store',
                  segregation: 'By defect type',
                  documentation: 'Rejection tag with reason code'
                }
              },

              // In-line QC Checks
              inlineQCSchedule: [
                { time: '08:30', type: 'First piece inspection', duration: 10 },
                { time: '10:00', type: 'Dimensional check', duration: 5 },
                { time: '12:00', type: 'Visual inspection', duration: 5 },
                { time: '14:00', type: 'Dimensional check', duration: 5 },
                { time: '16:00', type: 'Visual inspection', duration: 5 },
                { time: '18:00', type: 'End of shift verification', duration: 10 }
              ],

              // Station Work Order Details
              stationWorkOrder: {
                stationCode: assignedStation.code,
                stationName: assignedStation.name,
                setupChecklistVerified: day < 0,
                machineCondition: day < 0 ? 'Good' : 'Not checked',
                toolingCondition: day < 0 ? 'Good' : 'Not checked',
                materialVerified: day < 0,
                firstPieceApproved: day < 0,
                firstPieceApprovalBy: day < 0 ? 'QC Inspector' : null,
                firstPieceApprovalTime: day < 0 ? '08:25' : null
              },

              // Shift Transfer Notes
              shiftTransfer: day < 0 ? {
                transferredTo: 'Night Shift',
                transferTime: '20:00',
                machineStatus: 'Running',
                pendingQuantity: dailyTarget / 2 - Math.floor(actualProduced / 2),
                issuesReported: Math.random() > 0.8 ? ['Minor color variation in batch'] : [],
                actionRequired: Math.random() > 0.8 ? ['Monitor next batch closely'] : [],
                materialRemaining: Math.floor(dailyTarget * 0.1),
                notes: 'All normal, continue production'
              } : null,

              // Performance Metrics
              performance: day < 0 ? {
                efficiency: Math.floor(85 + Math.random() * 12),
                quality: Math.floor(96 + Math.random() * 3),
                downtime: Math.floor(Math.random() * 30),
                downtimeReasons: Math.random() > 0.7 ? ['Material shortage - 15min'] : [],
                cycleTimeVariance: Math.floor(-5 + Math.random() * 10),
                operatorEfficiency: Math.floor(88 + Math.random() * 10)
              } : null
            }
          }
        });
        workOrders.push(dayWorkOrder);

        // Night shift work order
        const nightWorkOrder = await prisma.workOrder.create({
          data: {
            projectId: project.id,
            operationId: operation.id,
            stationId: assignedStation.id,
            assignedTo: operators[Math.floor(Math.random() * operators.length)].id,
            workOrderNumber: `WO-${project.code}-${operation.sequenceOrder}-D${day}-NIGHT`,
            scheduledDate: date,
            shiftType: 'NIGHT',
            status: day < 0 ? 'COMPLETED' : 'PENDING',
            priority: project.priority,
            targetQuantity: dailyTarget / 2,
            completedQuantity: day < 0 ? Math.floor(actualProduced / 2) : 0,
            rejectedQuantity: day < 0 ? Math.floor(rejectedQty / 2) : 0,
            metadata: {
              operationName: operation.name,
              sequenceOrder: operation.sequenceOrder,
              cycleTime: operation.metadata.cycleTime,
              setupTime: operation.metadata.setupTime,
              operatorsRequired: operation.metadata.operatorsRequired,
              
              productionGuidelines: {
                setup: [
                  'Receive handover from day shift',
                  'Verify machine settings',
                  'Check material availability',
                  'Review any issues from previous shift'
                ],
                operation: [
                  'Continue production per plan',
                  'Monitor cycle time continuously',
                  'Perform in-line QC checks per schedule',
                  'Maintain production log'
                ],
                qualityPoints: [
                  'Check first piece after shift change',
                  'Monitor dimensional accuracy',
                  'Report any variation immediately',
                  'Complete QC documentation'
                ],
                safety: [
                  'Wear required PPE',
                  'Extra caution during night hours',
                  'Keep supervisor informed',
                  'Emergency contact numbers visible'
                ]
              },

              materialMovement: {
                inputMaterial: {
                  location: `WIP-${operation.sequenceOrder}`,
                  requiredQuantity: dailyTarget / 2,
                  pickupTime: '19:45',
                  transportMethod: 'Material Cart',
                  verification: 'Verify handover from day shift'
                },
                outputMaterial: {
                  location: `WIP-${operation.sequenceOrder + 1}`,
                  expectedQuantity: Math.floor(dailyTarget / 2 * 0.95),
                  deliveryTime: '07:45',
                  transportMethod: 'Pallet',
                  documentation: 'Complete handover form for day shift'
                },
                rejectedParts: {
                  location: 'Rejection Store',
                  segregation: 'By defect type',
                  documentation: 'Rejection tag with reason code and shift'
                }
              },

              inlineQCSchedule: [
                { time: '20:30', type: 'First piece after handover', duration: 10 },
                { time: '22:00', type: 'Dimensional check', duration: 5 },
                { time: '00:00', type: 'Visual inspection', duration: 5 },
                { time: '02:00', type: 'Dimensional check', duration: 5 },
                { time: '04:00', type: 'Visual inspection', duration: 5 },
                { time: '07:00', type: 'End of shift verification', duration: 10 }
              ],

              stationWorkOrder: {
                stationCode: assignedStation.code,
                stationName: assignedStation.name,
                setupChecklistVerified: day < 0,
                machineCondition: day < 0 ? 'Good' : 'Not checked',
                toolingCondition: day < 0 ? 'Good' : 'Not checked',
                materialVerified: day < 0,
                firstPieceApproved: day < 0,
                firstPieceApprovalBy: day < 0 ? 'QC Inspector' : null,
                firstPieceApprovalTime: day < 0 ? '20:25' : null
              },

              shiftTransfer: day < 0 ? {
                transferredTo: 'Day Shift',
                transferTime: '08:00',
                machineStatus: 'Running',
                pendingQuantity: dailyTarget / 2 - Math.floor(actualProduced / 2),
                issuesReported: Math.random() > 0.8 ? ['Slight increase in cycle time'] : [],
                actionRequired: Math.random() > 0.8 ? ['Check machine temperature'] : [],
                materialRemaining: Math.floor(dailyTarget * 0.08),
                notes: 'Normal operation throughout shift'
              } : null,

              performance: day < 0 ? {
                efficiency: Math.floor(80 + Math.random() * 12),
                quality: Math.floor(95 + Math.random() * 4),
                downtime: Math.floor(Math.random() * 45),
                downtimeReasons: Math.random() > 0.7 ? ['Tool change - 20min'] : [],
                cycleTimeVariance: Math.floor(-3 + Math.random() * 8),
                operatorEfficiency: Math.floor(85 + Math.random() * 10)
              } : null
            }
          }
        });
        workOrders.push(nightWorkOrder);

        // Create WIP Ledger entries for completed work orders
        if (day < 0) {
          await prisma.wIPLedger.create({
            data: {
              projectId: project.id,
              operationId: operation.id,
              date: date,
              shiftType: 'DAY',
              openingBalance: Math.floor(dailyTarget * 0.1),
              received: Math.floor(actualProduced / 2),
              consumed: Math.floor(actualProduced / 2 * 0.98),
              rejected: Math.floor(rejectedQty / 2),
              closingBalance: Math.floor(dailyTarget * 0.12),
              metadata: {
                workOrderNumber: dayWorkOrder.workOrderNumber,
                stationCode: assignedStation.code,
                movementTracking: 'All movements recorded'
              }
            }
          });

          await prisma.wIPLedger.create({
            data: {
              projectId: project.id,
              operationId: operation.id,
              date: date,
              shiftType: 'NIGHT',
              openingBalance: Math.floor(dailyTarget * 0.12),
              received: Math.floor(actualProduced / 2),
              consumed: Math.floor(actualProduced / 2 * 0.98),
              rejected: Math.floor(rejectedQty / 2),
              closingBalance: Math.floor(dailyTarget * 0.14),
              metadata: {
                workOrderNumber: nightWorkOrder.workOrderNumber,
                stationCode: assignedStation.code,
                movementTracking: 'All movements recorded'
              }
            }
          });
        }
      }
    }
  }

  return workOrders;
}

// Export functions
module.exports = {
  createShiftSchedules,
  createQualityCheckpoints,
  createWorkOrders,
  SHIFTS
};
