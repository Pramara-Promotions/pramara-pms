/**
 * Kanban Board Utilities
 * 
 * Provides board configuration management for project Kanban boards.
 * Supports custom columns, WIP limits, positioning, and default board setup.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Default board columns for new projects
 */
const DEFAULT_COLUMNS = [
  { name: 'To Do', section: 'Pre_Prod', position: 0, color: '#6366f1', isDefault: true },
  { name: 'In Progress', section: 'Production', position: 1, color: '#f59e0b', isDefault: true },
  { name: 'Review', section: 'QC', position: 2, color: '#8b5cf6', isDefault: true },
  { name: 'Done', section: 'Dispatch', position: 3, color: '#10b981', isDefault: true }
];

/**
 * Get board configuration for a project
 * Creates default columns if none exist
 * 
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>} Array of column objects
 */
async function getBoardConfig(projectId) {
  // Check if columns exist
  let columns = await prisma.boardColumn.findMany({
    where: { projectId },
    orderBy: { position: 'asc' }
  });

  // Create default columns if none exist
  if (columns.length === 0) {
    columns = await createDefaultColumns(projectId);
  }

  // Get task counts per column
  const tasksGrouped = await prisma.task.groupBy({
    by: ['section'],
    where: { projectId },
    _count: { id: true }
  });

  const taskCounts = {};
  tasksGrouped.forEach(group => {
    taskCounts[group.section] = group._count.id;
  });

  // Enrich columns with task counts
  return columns.map(col => ({
    ...col,
    taskCount: taskCounts[col.section] || 0
  }));
}

/**
 * Create default columns for a project
 * 
 * @param {number} projectId - Project ID
 * @returns {Promise<Array>} Created columns
 */
async function createDefaultColumns(projectId) {
  const columnsData = DEFAULT_COLUMNS.map(col => ({
    ...col,
    projectId
  }));

  await prisma.boardColumn.createMany({
    data: columnsData
  });

  return prisma.boardColumn.findMany({
    where: { projectId },
    orderBy: { position: 'asc' }
  });
}

/**
 * Update board column configuration
 * 
 * @param {number} projectId - Project ID
 * @param {string} columnId - Column ID
 * @param {Object} updates - Fields to update (name, position, wipLimit, color)
 * @returns {Promise<Object>} Updated column
 */
async function updateBoardColumn(projectId, columnId, updates) {
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, projectId }
  });

  if (!column) {
    throw new Error('Column not found');
  }

  // Handle position updates (reorder other columns if needed)
  if (updates.position !== undefined && updates.position !== column.position) {
    await reorderColumns(projectId, column.position, updates.position);
  }

  return prisma.boardColumn.update({
    where: { id: columnId },
    data: updates
  });
}

/**
 * Reorder columns when a column position changes
 * 
 * @param {number} projectId - Project ID
 * @param {number} oldPosition - Old position
 * @param {number} newPosition - New position
 */
async function reorderColumns(projectId, oldPosition, newPosition) {
  const columns = await prisma.boardColumn.findMany({
    where: { projectId },
    orderBy: { position: 'asc' }
  });

  // Moving forward (right)
  if (newPosition > oldPosition) {
    for (const col of columns) {
      if (col.position > oldPosition && col.position <= newPosition) {
        await prisma.boardColumn.update({
          where: { id: col.id },
          data: { position: col.position - 1 }
        });
      }
    }
  }
  // Moving backward (left)
  else {
    for (const col of columns) {
      if (col.position >= newPosition && col.position < oldPosition) {
        await prisma.boardColumn.update({
          where: { id: col.id },
          data: { position: col.position + 1 }
        });
      }
    }
  }
}

/**
 * Create new custom column
 * 
 * @param {number} projectId - Project ID
 * @param {Object} columnData - Column data (name, section, wipLimit, color)
 * @returns {Promise<Object>} Created column
 */
async function createBoardColumn(projectId, columnData) {
  // Validate section is unique for project
  const existing = await prisma.boardColumn.findFirst({
    where: {
      projectId,
      section: columnData.section
    }
  });

  if (existing) {
    throw new Error(`Column for section ${columnData.section} already exists`);
  }

  // Get max position
  const maxPosition = await prisma.boardColumn.aggregate({
    where: { projectId },
    _max: { position: true }
  });

  const position = (maxPosition._max.position || -1) + 1;

  return prisma.boardColumn.create({
    data: {
      ...columnData,
      projectId,
      position,
      isDefault: false
    }
  });
}

/**
 * Delete board column (only custom columns)
 * 
 * @param {number} projectId - Project ID
 * @param {string} columnId - Column ID
 * @returns {Promise<Object>} Deletion result
 */
async function deleteBoardColumn(projectId, columnId) {
  const column = await prisma.boardColumn.findFirst({
    where: { id: columnId, projectId }
  });

  if (!column) {
    throw new Error('Column not found');
  }

  if (column.isDefault) {
    throw new Error('Cannot delete default columns');
  }

  // Check if column has tasks
  const taskCount = await prisma.task.count({
    where: {
      projectId,
      section: column.section
    }
  });

  if (taskCount > 0) {
    throw new Error(`Cannot delete column with ${taskCount} tasks. Move tasks first.`);
  }

  // Delete column
  await prisma.boardColumn.delete({
    where: { id: columnId }
  });

  // Reorder remaining columns
  const columns = await prisma.boardColumn.findMany({
    where: { projectId },
    orderBy: { position: 'asc' }
  });

  for (let i = 0; i < columns.length; i++) {
    if (columns[i].position !== i) {
      await prisma.boardColumn.update({
        where: { id: columns[i].id },
        data: { position: i }
      });
    }
  }

  return { success: true };
}

/**
 * Move task to different column/position
 * Updates task section and position, reorders other tasks
 * 
 * @param {string} taskId - Task ID
 * @param {string} newSection - New TaskSection value
 * @param {number} newPosition - New position in column
 * @returns {Promise<Object>} Updated task
 */
async function moveTask(taskId, newSection, newPosition) {
  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  const oldSection = task.section;
  const oldPosition = task.position;

  // If moving to same column, just reorder
  if (oldSection === newSection) {
    await reorderTasksInColumn(task.projectId, newSection, oldPosition, newPosition);
    return prisma.task.update({
      where: { id: taskId },
      data: { position: newPosition, updatedAt: new Date() }
    });
  }

  // Moving to different column
  // 1. Remove from old column (shift tasks up)
  await prisma.task.updateMany({
    where: {
      projectId: task.projectId,
      section: oldSection,
      position: { gt: oldPosition }
    },
    data: { position: { decrement: 1 } }
  });

  // 2. Make space in new column (shift tasks down)
  await prisma.task.updateMany({
    where: {
      projectId: task.projectId,
      section: newSection,
      position: { gte: newPosition }
    },
    data: { position: { increment: 1 } }
  });

  // 3. Update task
  return prisma.task.update({
    where: { id: taskId },
    data: {
      section: newSection,
      position: newPosition,
      updatedAt: new Date()
    }
  });
}

/**
 * Reorder tasks within same column
 * 
 * @param {number} projectId - Project ID
 * @param {string} section - TaskSection
 * @param {number} oldPosition - Old position
 * @param {number} newPosition - New position
 */
async function reorderTasksInColumn(projectId, section, oldPosition, newPosition) {
  if (oldPosition === newPosition) return;

  // Moving down (later in list)
  if (newPosition > oldPosition) {
    await prisma.task.updateMany({
      where: {
        projectId,
        section,
        position: { gt: oldPosition, lte: newPosition }
      },
      data: { position: { decrement: 1 } }
    });
  }
  // Moving up (earlier in list)
  else {
    await prisma.task.updateMany({
      where: {
        projectId,
        section,
        position: { gte: newPosition, lt: oldPosition }
      },
      data: { position: { increment: 1 } }
    });
  }
}

module.exports = {
  getBoardConfig,
  createDefaultColumns,
  updateBoardColumn,
  createBoardColumn,
  deleteBoardColumn,
  moveTask,
  DEFAULT_COLUMNS
};
