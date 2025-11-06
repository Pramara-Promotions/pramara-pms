    import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFactories,
  getFactory,
  createFactory,
  updateFactory,
  deleteFactory,
  createFloor,
  updateFloor,
  deleteFloor,
  createSection,
  updateSection,
  deleteSection,
  createRoom,
  updateRoom,
  deleteRoom,
  type Factory,
  type Floor,
  type Section,
  type Room,
} from '../../lib/services/facilities';
import { ChevronRight, ChevronDown, Plus, Edit, Trash2, Building2, Layers, Grid3x3, DoorOpen, Settings } from 'lucide-react';

type EntityType = 'factory' | 'floor' | 'section' | 'room';
type SelectedEntity = 
  | { type: 'factory'; data: Factory }
  | { type: 'floor'; data: Floor; factory: Factory }
  | { type: 'section'; data: Section; floor: Floor; factory: Factory }
  | { type: 'room'; data: Room; section: Section; floor: Floor; factory: Factory }
  | null;

export function FacilityManagementPage() {
  const queryClient = useQueryClient();
  const [selectedFactoryId, setSelectedFactoryId] = useState<number | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formType, setFormType] = useState<EntityType>('factory');

  // Queries
  const { data: factories = [], isLoading: loadingFactories } = useQuery({
    queryKey: ['factories'],
    queryFn: () => listFactories(true),
  });

  const { data: selectedFactory } = useQuery({
    queryKey: ['factory', selectedFactoryId],
    queryFn: () => getFactory(selectedFactoryId!),
    enabled: !!selectedFactoryId,
  });

  // Mutations
  const createFactoryMut = useMutation({
    mutationFn: createFactory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      setShowForm(false);
    },
  });

  const updateFactoryMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateFactory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setShowForm(false);
    },
  });

  const deleteFactoryMut = useMutation({
    mutationFn: deleteFactory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      setSelectedFactoryId(null);
      setSelectedEntity(null);
    },
  });

  const createFloorMut = useMutation({
    mutationFn: createFloor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setShowForm(false);
    },
  });

  const updateFloorMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateFloor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setShowForm(false);
    },
  });

  const deleteFloorMut = useMutation({
    mutationFn: deleteFloor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setSelectedEntity(null);
    },
  });

  const createSectionMut = useMutation({
    mutationFn: createSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setShowForm(false);
    },
  });

  const updateSectionMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setShowForm(false);
    },
  });

  const deleteSectionMut = useMutation({
    mutationFn: deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setSelectedEntity(null);
    },
  });

  const createRoomMut = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setShowForm(false);
    },
  });

  const updateRoomMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setShowForm(false);
    },
  });

  const deleteRoomMut = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factory', selectedFactoryId] });
      setSelectedEntity(null);
    },
  });

  // Handlers
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleCreate = (type: EntityType, parentData?: any) => {
    setFormMode('create');
    setFormType(type);
    setShowForm(true);
  };

  const handleEdit = (entity: SelectedEntity) => {
    setFormMode('edit');
    setSelectedEntity(entity);
    if (entity) {
      setFormType(entity.type);
    }
    setShowForm(true);
  };

  const handleDelete = async (type: EntityType, id: number) => {
    if (!confirm(`Are you sure you want to deactivate this ${type}?`)) return;

    switch (type) {
      case 'factory':
        await deleteFactoryMut.mutateAsync(id);
        break;
      case 'floor':
        await deleteFloorMut.mutateAsync(id);
        break;
      case 'section':
        await deleteSectionMut.mutateAsync(id);
        break;
      case 'room':
        await deleteRoomMut.mutateAsync(id);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // Convert numeric fields
    if (data.floorNumber) data.floorNumber = parseInt(data.floorNumber);
    if (data.factoryId) data.factoryId = parseInt(data.factoryId);
    if (data.floorId) data.floorId = parseInt(data.floorId);
    if (data.sectionId) data.sectionId = parseInt(data.sectionId);

    try {
      if (formMode === 'create') {
        switch (formType) {
          case 'factory':
            await createFactoryMut.mutateAsync(data);
            break;
          case 'floor':
            await createFloorMut.mutateAsync(data);
            break;
          case 'section':
            await createSectionMut.mutateAsync(data);
            break;
          case 'room':
            await createRoomMut.mutateAsync(data);
            break;
        }
      } else {
        const id = selectedEntity?.data.id;
        if (!id) return;

        switch (formType) {
          case 'factory':
            await updateFactoryMut.mutateAsync({ id, data });
            break;
          case 'floor':
            await updateFloorMut.mutateAsync({ id, data });
            break;
          case 'section':
            await updateSectionMut.mutateAsync({ id, data });
            break;
          case 'room':
            await updateRoomMut.mutateAsync({ id, data });
            break;
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      alert(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Facility Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage factory hierarchy: Factories → Floors → Sections → Rooms → Stations
            </p>
          </div>
          <button
            onClick={() => handleCreate('factory')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Factory
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Factory List */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Factories</h2>
            {loadingFactories ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : factories.length === 0 ? (
              <div className="text-sm text-gray-500">No factories yet</div>
            ) : (
              <div className="space-y-2">
                {factories.map((factory) => (
                  <button
                    key={factory.id}
                    onClick={() => {
                      setSelectedFactoryId(factory.id);
                      setSelectedEntity({ type: 'factory', data: factory });
                      setShowForm(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedFactoryId === factory.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{factory.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {factory.floorCount || 0} floors · {factory.stationCount || 0} stations
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Panel: Tree View */}
        <div className="flex-1 bg-white dark:bg-gray-800 overflow-y-auto">
          {!selectedFactory ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              Select a factory to view its hierarchy
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedFactory.name}
                </h2>
                <button
                  onClick={() => handleCreate('floor')}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Floor
                </button>
              </div>

              {/* Hierarchy Tree */}
              <div className="space-y-2">
                {selectedFactory.Floor?.map((floor) => {
                  const floorNodeId = `floor-${floor.id}`;
                  const isFloorExpanded = expandedNodes.has(floorNodeId);

                  return (
                    <div key={floor.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <button onClick={() => toggleNode(floorNodeId)} className="p-1">
                          {isFloorExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <Layers className="w-4 h-4 text-blue-600" />
                        <button
                          onClick={() => setSelectedEntity({ type: 'floor', data: floor, factory: selectedFactory })}
                          className="flex-1 text-left font-medium text-gray-900 dark:text-white"
                        >
                          {floor.name}
                        </button>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {floor.sectionCount || 0} sections · {floor.stationCount || 0} stations
                        </div>
                        <button
                          onClick={() => handleEdit({ type: 'floor', data: floor, factory: selectedFactory })}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete('floor', floor.id)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>

                      {isFloorExpanded && (
                        <div className="pl-6 pr-3 pb-3 space-y-2">
                          <button
                            onClick={() => handleCreate('section', floor)}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Section
                          </button>

                          {floor.Section?.map((section) => {
                            const sectionNodeId = `section-${section.id}`;
                            const isSectionExpanded = expandedNodes.has(sectionNodeId);

                            return (
                              <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <button onClick={() => toggleNode(sectionNodeId)} className="p-1">
                                    {isSectionExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  </button>
                                  <Grid3x3 className="w-3 h-3 text-green-600" />
                                  <button
                                    onClick={() => setSelectedEntity({ type: 'section', data: section, floor, factory: selectedFactory })}
                                    className="flex-1 text-left text-sm font-medium text-gray-900 dark:text-white"
                                  >
                                    {section.name}
                                  </button>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {section.roomCount || 0} rooms
                                  </div>
                                  <button
                                    onClick={() => handleEdit({ type: 'section', data: section, floor, factory: selectedFactory })}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete('section', section.id)}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-600" />
                                  </button>
                                </div>

                                {isSectionExpanded && (
                                  <div className="pl-6 pr-2 pb-2 space-y-1">
                                    <button
                                      onClick={() => handleCreate('room', section)}
                                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Add Room
                                    </button>

                                    {section.Room?.map((room) => (
                                      <div
                                        key={room.id}
                                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                      >
                                        <DoorOpen className="w-3 h-3 text-purple-600" />
                                        <button
                                          onClick={() => setSelectedEntity({ type: 'room', data: room, section, floor, factory: selectedFactory })}
                                          className="flex-1 text-left text-sm text-gray-900 dark:text-white"
                                        >
                                          {room.name}
                                        </button>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {room.stationCount || 0} stations
                                        </div>
                                        <button
                                          onClick={() => handleEdit({ type: 'room', data: room, section, floor, factory: selectedFactory })}
                                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleDelete('room', room.id)}
                                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                        >
                                          <Trash2 className="w-3 h-3 text-red-600" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Details/Form */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
          {showForm ? (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {formMode === 'create' ? 'Create' : 'Edit'} {formType.charAt(0).toUpperCase() + formType.slice(1)}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formType === 'factory' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'factory' ? selectedEntity.data.name : ''}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Code *
                      </label>
                      <input
                        type="text"
                        name="code"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'factory' ? selectedEntity.data.code : ''}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'factory' ? selectedEntity.data.location || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Address
                      </label>
                      <textarea
                        name="address"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'factory' ? selectedEntity.data.address || '' : ''}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        name="contactPerson"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'factory' ? selectedEntity.data.contactPerson || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        name="contactPhone"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'factory' ? selectedEntity.data.contactPhone || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {formType === 'floor' && (
                  <>
                    <input type="hidden" name="factoryId" value={selectedFactoryId || ''} />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'floor' ? selectedEntity.data.name : ''}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Floor Number *
                      </label>
                      <input
                        type="number"
                        name="floorNumber"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'floor' ? selectedEntity.data.floorNumber : ''}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {formType === 'section' && (
                  <>
                    <input
                      type="hidden"
                      name="floorId"
                      value={
                        formMode === 'edit' && selectedEntity?.type === 'section'
                          ? selectedEntity.floor.id
                          : selectedEntity?.type === 'floor'
                          ? selectedEntity.data.id
                          : ''
                      }
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'section' ? selectedEntity.data.name : ''}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'section' ? selectedEntity.data.description || '' : ''}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {formType === 'room' && (
                  <>
                    <input
                      type="hidden"
                      name="sectionId"
                      value={
                        formMode === 'edit' && selectedEntity?.type === 'room'
                          ? selectedEntity.section.id
                          : selectedEntity?.type === 'section'
                          ? selectedEntity.data.id
                          : ''
                      }
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'room' ? selectedEntity.data.name : ''}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Room Number
                      </label>
                      <input
                        type="text"
                        name="roomNumber"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'room' ? selectedEntity.data.roomNumber || '' : ''}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        defaultValue={formMode === 'edit' && selectedEntity?.type === 'room' ? selectedEntity.data.description || '' : ''}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {formMode === 'create' ? 'Create' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : selectedEntity ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Details</h3>
                <button
                  onClick={() => handleEdit(selectedEntity)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedEntity.type === 'factory' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Name</label>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedEntity.data.name}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Code</label>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedEntity.data.code}</div>
                    </div>
                    {selectedEntity.data.location && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Location</label>
                        <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.data.location}</div>
                      </div>
                    )}
                    {selectedEntity.data.address && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Address</label>
                        <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.data.address}</div>
                      </div>
                    )}
                    {selectedEntity.data.contactPerson && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Contact Person</label>
                        <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.data.contactPerson}</div>
                      </div>
                    )}
                    {selectedEntity.data.contactPhone && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Contact Phone</label>
                        <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.data.contactPhone}</div>
                      </div>
                    )}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Statistics</label>
                      <div className="mt-2 space-y-1 text-sm text-gray-900 dark:text-white">
                        <div>Floors: {selectedEntity.data.floorCount || 0}</div>
                        <div>Sections: {selectedEntity.data.sectionCount || 0}</div>
                        <div>Rooms: {selectedEntity.data.roomCount || 0}</div>
                        <div>Stations: {selectedEntity.data.stationCount || 0}</div>
                      </div>
                    </div>
                  </>
                )}

                {selectedEntity.type === 'floor' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Name</label>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedEntity.data.name}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Floor Number</label>
                      <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.data.floorNumber}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Factory</label>
                      <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.factory.name}</div>
                    </div>
                  </>
                )}

                {selectedEntity.type === 'section' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Name</label>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedEntity.data.name}</div>
                    </div>
                    {selectedEntity.data.description && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Description</label>
                        <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.data.description}</div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Floor</label>
                      <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.floor.name}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Factory</label>
                      <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.factory.name}</div>
                    </div>
                  </>
                )}

                {selectedEntity.type === 'room' && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Name</label>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{selectedEntity.data.name}</div>
                    </div>
                    {selectedEntity.data.roomNumber && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Room Number</label>
                        <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.data.roomNumber}</div>
                      </div>
                    )}
                    {selectedEntity.data.description && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Description</label>
                        <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.data.description}</div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Section</label>
                      <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.section.name}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Floor</label>
                      <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.floor.name}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Factory</label>
                      <div className="text-sm text-gray-900 dark:text-white">{selectedEntity.factory.name}</div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Stations</label>
                      <div className="mt-2 text-sm text-gray-900 dark:text-white">
                        {selectedEntity.data.stationCount || 0} stations in this room
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              Select an entity to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
