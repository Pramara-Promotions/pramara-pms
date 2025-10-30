const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// Helper function to calculate relevance score
function calculateRelevance(item, query, searchFields) {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  
  searchFields.forEach(field => {
    const value = String(item[field] || '').toLowerCase();
    if (value === lowerQuery) {
      score += 100; // Exact match
    } else if (value.startsWith(lowerQuery)) {
      score += 50; // Starts with query
    } else if (value.includes(lowerQuery)) {
      score += 25; // Contains query
    }
  });
  
  return score;
}

// POST /api/search - Universal search across all entities
router.post('/', async (req, res) => {
  try {
    const { 
      query, 
      scope = ['all'], 
      filters = {},
      page = 1,
      limit = 50
    } = req.body;

    if (!query || query.trim().length === 0) {
      return res.json({
        results: [],
        total: 0,
        page,
        totalPages: 0
      });
    }

    const searchQuery = query.trim();
    const results = [];
    
    // Determine which scopes to search
    const searchAll = scope.includes('all');
    const scopesToSearch = searchAll 
      ? ['tasks', 'projects', 'people', 'batches', 'stations', 'documents']
      : scope;

    // Search Tasks
    if (scopesToSearch.includes('tasks')) {
      try {
        const tasks = await prisma.task.findMany({
          where: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { section: { contains: searchQuery, mode: 'insensitive' } },
            ],
            ...(filters.status && { status: filters.status }),
            ...(filters.priority && { priority: filters.priority }),
            ...(filters.assignee && { assignee: filters.assignee }),
            ...(filters.projectId && { projectId: parseInt(filters.projectId) }),
          },
          include: {
            Project: { select: { id: true, name: true } },
          },
          take: 100,
        });

        tasks.forEach(task => {
          const relevance = calculateRelevance(task, searchQuery, ['name', 'section']);
          results.push({
            type: 'task',
            id: task.id,
            title: task.name,
            subtitle: task.Project?.name || 'No Project',
            metadata: {
              status: task.status,
              priority: task.priority,
              assignee: task.assignee,
              dueDate: task.dueDate,
              section: task.section,
            },
            relevance,
            url: `/projects/${task.projectId || 'all'}/tasks/${task.id}`,
          });
        });
      } catch (error) {
        console.error('Error searching tasks:', error);
      }
    }

    // Search Projects
    if (scopesToSearch.includes('projects')) {
      try {
        const projects = await prisma.project.findMany({
          where: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { code: { contains: searchQuery, mode: 'insensitive' } },
              { customerName: { contains: searchQuery, mode: 'insensitive' } },
            ],
            ...(filters.status && { status: filters.status }),
          },
          take: 100,
        });

        projects.forEach(project => {
          const relevance = calculateRelevance(project, searchQuery, ['name', 'code', 'customerName']);
          results.push({
            type: 'project',
            id: project.id,
            title: project.name,
            subtitle: `${project.code} - ${project.customerName || 'No Customer'}`,
            metadata: {
              status: project.status,
              customerName: project.customerName,
              targetDate: project.targetDate,
              code: project.code,
            },
            relevance,
            url: `/projects/${project.id}`,
          });
        });
      } catch (error) {
        console.error('Error searching projects:', error);
      }
    }

    // Search People (Users)
    if (scopesToSearch.includes('people')) {
      try {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
            ],
            ...(filters.role && { role: filters.role }),
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
          take: 100,
        });

        users.forEach(user => {
          const relevance = calculateRelevance(user, searchQuery, ['name', 'email']);
          results.push({
            type: 'person',
            id: user.id,
            title: user.name,
            subtitle: user.email,
            metadata: {
              role: user.role,
              department: user.department,
            },
            relevance,
            url: `/people/${user.id}`,
          });
        });
      } catch (error) {
        console.error('Error searching people:', error);
      }
    }

    // Search Batches
    if (scopesToSearch.includes('batches')) {
      try {
        const batches = await prisma.batch.findMany({
          where: {
            OR: [
              { code: { contains: searchQuery, mode: 'insensitive' } },
              { poNumber: { contains: searchQuery, mode: 'insensitive' } },
            ],
            ...(filters.status && { status: filters.status }),
            ...(filters.projectId && { projectId: parseInt(filters.projectId) }),
          },
          include: {
            project: { select: { id: true, name: true } },
          },
          take: 100,
        });

        batches.forEach(batch => {
          const relevance = calculateRelevance(batch, searchQuery, ['code', 'poNumber']);
          results.push({
            type: 'batch',
            id: batch.id,
            title: batch.code,
            subtitle: `PO: ${batch.poNumber || 'N/A'} - ${batch.project?.name || 'No Project'}`,
            metadata: {
              status: batch.status,
              quantity: batch.quantity,
              poNumber: batch.poNumber,
              currentStation: batch.currentStation,
            },
            relevance,
            url: `/batches/${batch.id}`,
          });
        });
      } catch (error) {
        console.error('Error searching batches:', error);
      }
    }

    // Search Stations
    if (scopesToSearch.includes('stations')) {
      try {
        const stations = await prisma.station.findMany({
          where: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { code: { contains: searchQuery, mode: 'insensitive' } },
            ],
            ...(filters.type && { type: filters.type }),
          },
          take: 100,
        });

        stations.forEach(station => {
          const relevance = calculateRelevance(station, searchQuery, ['name', 'code']);
          results.push({
            type: 'station',
            id: station.id,
            title: station.name,
            subtitle: `${station.code} - ${station.type || 'Station'}`,
            metadata: {
              code: station.code,
              type: station.type,
              capacity: station.capacity,
            },
            relevance,
            url: `/stations/${station.id}`,
          });
        });
      } catch (error) {
        console.error('Error searching stations:', error);
      }
    }

    // Search Documents
    if (scopesToSearch.includes('documents')) {
      try {
        const documents = await prisma.document.findMany({
          where: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { type: { contains: searchQuery, mode: 'insensitive' } },
            ],
            ...(filters.type && { type: filters.type }),
            ...(filters.projectId && { projectId: parseInt(filters.projectId) }),
          },
          include: {
            project: { select: { id: true, name: true } },
            uploadedBy: { select: { id: true, name: true } },
          },
          take: 100,
        });

        documents.forEach(doc => {
          const relevance = calculateRelevance(doc, searchQuery, ['name', 'type']);
          results.push({
            type: 'document',
            id: doc.id,
            title: doc.name,
            subtitle: `${doc.type || 'Document'} - ${doc.project?.name || 'No Project'}`,
            metadata: {
              type: doc.type,
              size: doc.size,
              uploadedBy: doc.uploadedBy?.name,
              createdAt: doc.createdAt,
            },
            relevance,
            url: doc.url || `/documents/${doc.id}`,
          });
        });
      } catch (error) {
        console.error('Error searching documents:', error);
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Group by type
    const groupedResults = results.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {});

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    // Save to recent searches
    try {
      await prisma.searchHistory.create({
        data: {
          userId: req.user.id,
          query: searchQuery,
          scope: scopesToSearch,
          resultsCount: results.length,
        },
      });
    } catch (error) {
      // Ignore if SearchHistory table doesn't exist yet
      console.log('Note: SearchHistory table not available yet');
    }

    res.json({
      results: paginatedResults,
      grouped: groupedResults,
      total: results.length,
      page,
      totalPages: Math.ceil(results.length / limit),
      counts: {
        tasks: groupedResults.task?.length || 0,
        projects: groupedResults.project?.length || 0,
        people: groupedResults.person?.length || 0,
        batches: groupedResults.batch?.length || 0,
        stations: groupedResults.station?.length || 0,
        documents: groupedResults.document?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error in universal search:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/search/recent - Get user's recent searches
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    try {
      const recentSearches = await prisma.searchHistory.findMany({
        where: {
          userId: req.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        select: {
          id: true,
          query: true,
          scope: true,
          resultsCount: true,
          createdAt: true,
        },
      });

      res.json(recentSearches);
    } catch (error) {
      // If SearchHistory table doesn't exist, return empty array
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching recent searches:', error);
    res.status(500).json({ error: 'Failed to fetch recent searches' });
  }
});

// GET /api/search/saved - Get user's saved searches
router.get('/saved', async (req, res) => {
  try {
    try {
      const savedSearches = await prisma.savedSearch.findMany({
        where: {
          userId: req.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          query: true,
          scope: true,
          filters: true,
          createdAt: true,
        },
      });

      res.json(savedSearches);
    } catch (error) {
      // If SavedSearch table doesn't exist, return empty array
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    res.status(500).json({ error: 'Failed to fetch saved searches' });
  }
});

// POST /api/search/saved - Save a search
router.post('/saved', async (req, res) => {
  try {
    const { name, query, scope, filters } = req.body;

    if (!name || !query) {
      return res.status(400).json({ error: 'Name and query are required' });
    }

    try {
      const savedSearch = await prisma.savedSearch.create({
        data: {
          userId: req.user.id,
          name,
          query,
          scope: scope || ['all'],
          filters: filters || {},
        },
      });

      res.status(201).json(savedSearch);
    } catch (error) {
      // If SavedSearch table doesn't exist, return appropriate error
      res.status(501).json({ 
        error: 'Saved searches feature not yet implemented in database',
        message: 'Please run database migrations to enable this feature'
      });
    }
  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
});

// DELETE /api/search/saved/:id - Delete a saved search
router.delete('/saved/:id', async (req, res) => {
  try {
    const { id } = req.params;

    try {
      // Verify ownership
      const savedSearch = await prisma.savedSearch.findFirst({
        where: {
          id,
          userId: req.user.id,
        },
      });

      if (!savedSearch) {
        return res.status(404).json({ error: 'Saved search not found' });
      }

      await prisma.savedSearch.delete({
        where: { id },
      });

      res.json({ message: 'Saved search deleted successfully' });
    } catch (error) {
      // If SavedSearch table doesn't exist, return appropriate error
      res.status(501).json({ 
        error: 'Saved searches feature not yet implemented in database'
      });
    }
  } catch (error) {
    console.error('Error deleting saved search:', error);
    res.status(500).json({ error: 'Failed to delete saved search' });
  }
});

module.exports = router;
