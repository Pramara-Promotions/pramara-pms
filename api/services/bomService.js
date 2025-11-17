// BOM (Bill of Materials) Management Service
// Handles product component definitions, material mappings, and quantity calculations

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a product component for a project/SKU
 * @param {Object} data - Component data
 * @returns {Promise<Object>} Created component
 */
async function createComponent(data) {
  const {
    projectId,
    skuId,
    name,
    type, // frame, temple, lens, screw, packaging
    material,
    color,
    pantoneCode,
    isRubberised = false,
    qtyPerUnit = 1,
  } = data;

  return await prisma.productComponent.create({
    data: {
      projectId,
      skuId,
      name,
      type,
      material,
      color,
      pantoneCode,
      isRubberised,
      qtyPerUnit,
    },
    include: {
      materials: true,
    },
  });
}

/**
 * Link a material to a component with quantity
 * @param {Object} data - Material link data
 * @returns {Promise<Object>} Created link
 */
async function linkMaterialToComponent(data) {
  const { componentId, materialId, qtyPerComponent, unit, stage } = data;

  return await prisma.componentMaterial.create({
    data: {
      componentId,
      materialId,
      qtyPerComponent,
      unit,
      stage,
    },
    include: {
      Material: true,
    },
  });
}

/**
 * Get BOM for a project with all components and materials
 * @param {number} projectId
 * @returns {Promise<Array>} BOM components
 */
async function getProjectBOM(projectId) {
  const components = await prisma.productComponent.findMany({
    where: {
      projectId,
      active: true,
    },
    include: {
      ProjectSku: true,
      materials: {
        include: {
          Material: true,
        },
      },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  return components;
}

/**
 * Calculate total material requirements for a project
 * Based on BOM, order quantities, and component ratios
 * @param {number} projectId
 * @returns {Promise<Object>} Material requirements summary
 */
async function calculateMaterialRequirements(projectId) {
  // Get project with SKUs
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      skus: true,
    },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Get BOM components
  const components = await getProjectBOM(projectId);

  // Aggregate material requirements
  const materialMap = new Map();

  for (const component of components) {
    // Determine order quantity
    let orderQty = 0;
    if (component.skuId) {
      // Component specific to a SKU
      const sku = project.skus.find((s) => s.id === component.skuId);
      orderQty = sku?.orderQty || 0;
    } else {
      // Component applies to all SKUs
      orderQty = project.skus.reduce((sum, sku) => sum + (sku.orderQty || 0), 0);
    }

    // Calculate component requirement
    const componentQty = orderQty * component.qtyPerUnit;

    // Calculate material requirements for this component
    for (const matLink of component.materials) {
      const materialKey = matLink.materialId;
      const materialQty = componentQty * matLink.qtyPerComponent;

      if (!materialMap.has(materialKey)) {
        materialMap.set(materialKey, {
          materialId: materialKey,
          materialName: matLink.Material.name,
          unit: matLink.unit,
          totalQty: 0,
          breakdown: [],
        });
      }

      const entry = materialMap.get(materialKey);
      entry.totalQty += materialQty;
      entry.breakdown.push({
        componentId: component.id,
        componentName: component.name,
        componentType: component.type,
        qty: materialQty,
        stage: matLink.stage,
      });
    }
  }

  return {
    projectId,
    projectCode: project.code,
    materials: Array.from(materialMap.values()),
    totalUniqueMateri: materialMap.size,
    generatedAt: new Date(),
  };
}

/**
 * Create standard BOM template for sunglasses
 * Helper function to quickly set up sunglasses projects
 * @param {Object} data - Template data
 * @returns {Promise<Array>} Created components
 */
async function createSunglassesBOMTemplate(data) {
  const { projectId, skuId, materials = {} } = data;

  const components = [
    {
      name: 'Frame',
      type: 'frame',
      material: materials.frame || 'ABS',
      qtyPerUnit: 1,
    },
    {
      name: 'Temple Left',
      type: 'temple',
      material: materials.temple || 'ABS',
      qtyPerUnit: 1,
    },
    {
      name: 'Temple Right',
      type: 'temple',
      material: materials.temple || 'ABS',
      qtyPerUnit: 1,
    },
    {
      name: 'Lens Left',
      type: 'lens',
      material: materials.lens || 'PC',
      qtyPerUnit: 1,
    },
    {
      name: 'Lens Right',
      type: 'lens',
      material: materials.lens || 'PC',
      qtyPerUnit: 1,
    },
    {
      name: 'Screws',
      type: 'screw',
      material: 'Metal',
      qtyPerUnit: 4,
    },
  ];

  const created = [];
  for (const comp of components) {
    const component = await createComponent({
      projectId,
      skuId,
      ...comp,
    });
    created.push(component);
  }

  return created;
}

/**
 * Update component quantity per unit
 * @param {string} componentId
 * @param {number} newQty
 * @returns {Promise<Object>} Updated component
 */
async function updateComponentQuantity(componentId, newQty) {
  return await prisma.productComponent.update({
    where: { id: componentId },
    data: { qtyPerUnit: newQty },
  });
}

/**
 * Deactivate a component (soft delete)
 * @param {string} componentId
 * @returns {Promise<Object>} Updated component
 */
async function deactivateComponent(componentId) {
  return await prisma.productComponent.update({
    where: { id: componentId },
    data: { active: false },
  });
}

/**
 * Get components by type across all projects
 * Useful for analytics and templates
 * @param {string} type - Component type
 * @returns {Promise<Array>} Components
 */
async function getComponentsByType(type) {
  return await prisma.productComponent.findMany({
    where: {
      type,
      active: true,
    },
    include: {
      Project: { select: { code: true, name: true } },
      materials: {
        include: {
          Material: true,
        },
      },
    },
  });
}

module.exports = {
  createComponent,
  linkMaterialToComponent,
  getProjectBOM,
  calculateMaterialRequirements,
  createSunglassesBOMTemplate,
  updateComponentQuantity,
  deactivateComponent,
  getComponentsByType,
};
module.exports._prisma = prisma;
