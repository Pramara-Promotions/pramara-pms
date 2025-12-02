import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, Building2, Layers, Grid, DoorOpen, Activity, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

type Factory = {
  id: string;
  name: string;
  location: string;
  code: string;
  capacity?: number;
  floors?: Floor[];
};

type Floor = {
  id: string;
  name: string;
  level: number;
  factoryId: string;
  sections?: Section[];
};

type Section = {
  id: string;
  name: string;
  floorId: string;
  rooms?: Room[];
};

type Room = {
  id: string;
  name: string;
  capacity?: number;
  sectionId: string;
  stations?: Station[];
};

type Station = {
  id: number;
  name: string;
  stationNumber?: string;
  status: string;
  roomId?: string;
  typeId?: string;
};

// Helper functions for capacity calculations
function calculateFactoryStats(factory: Factory) {
  let totalStations = 0;
  let operationalStations = 0;
  let totalCapacity = factory.capacity || 0;

  factory.floors?.forEach(floor => {
    floor.sections?.forEach(section => {
      section.rooms?.forEach(room => {
        if (room.capacity) totalCapacity += room.capacity;
        room.stations?.forEach(station => {
          totalStations++;
          if (station.status === 'operational') operationalStations++;
        });
      });
    });
  });

  const utilization = totalStations > 0 ? (operationalStations / totalStations) * 100 : 0;
  return { totalStations, operationalStations, totalCapacity, utilization };
}

function calculateFloorStats(floor: Floor) {
  let totalStations = 0;
  let operationalStations = 0;
  let totalRooms = 0;

  floor.sections?.forEach(section => {
    section.rooms?.forEach(room => {
      totalRooms++;
      room.stations?.forEach(station => {
        totalStations++;
        if (station.status === 'operational') operationalStations++;
      });
    });
  });

  const utilization = totalStations > 0 ? (operationalStations / totalStations) * 100 : 0;
  return { totalStations, operationalStations, totalRooms, utilization };
}

function calculateSectionStats(section: Section) {
  let totalStations = 0;
  let operationalStations = 0;

  section.rooms?.forEach(room => {
    room.stations?.forEach(station => {
      totalStations++;
      if (station.status === 'operational') operationalStations++;
    });
  });

  const utilization = totalStations > 0 ? (operationalStations / totalStations) * 100 : 0;
  return { totalStations, operationalStations, utilization };
}

function calculateRoomStats(room: Room) {
  let totalStations = room.stations?.length || 0;
  let operationalStations = room.stations?.filter(s => s.status === 'operational').length || 0;
  const utilization = totalStations > 0 ? (operationalStations / totalStations) * 100 : 0;
  return { totalStations, operationalStations, utilization };
}

function getUtilizationColor(utilization: number) {
  if (utilization >= 80) return 'text-green-600 bg-green-100';
  if (utilization >= 50) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

function getUtilizationIcon(utilization: number) {
  if (utilization >= 80) return CheckCircle;
  if (utilization >= 50) return AlertTriangle;
  return AlertTriangle;
}

export default function FactoryHierarchyPage() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'factory' | 'floor' | 'section' | 'room' | 'station'>('factory');
  const [modalAction, setModalAction] = useState<'create' | 'edit'>('create');
  const [parentId, setParentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  async function loadFactories() {
    setLoading(true);
    try {
      const res = await fetch('/api/factories', { credentials: 'include' });
      const data = await res.json();
      setFactories(data.factories || data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFactories(); }, []);

  const toggle = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpanded(newExpanded);
  };

  const openModal = (type: typeof modalType, action: typeof modalAction, parent?: string, existing?: any) => {
    setModalType(type);
    setModalAction(action);
    setParentId(parent || null);
    setFormData(existing || {});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({});
    setParentId(null);
  };

  async function handleSubmit() {
    setLoading(true);
    try {
      let url = '';
      let body = { ...formData };

      if (modalType === 'factory') {
        url = modalAction === 'create' ? '/api/factories' : `/api/factories/${formData.id}`;
      } else if (modalType === 'floor') {
        url = modalAction === 'create' ? `/api/factories/${parentId}/floors` : `/api/floors/${formData.id}`;
      } else if (modalType === 'section') {
        url = modalAction === 'create' ? `/api/floors/${parentId}/sections` : `/api/sections/${formData.id}`;
      } else if (modalType === 'room') {
        url = modalAction === 'create' ? `/api/sections/${parentId}/rooms` : `/api/rooms/${formData.id}`;
      } else if (modalType === 'station') {
        url = modalAction === 'create' ? `/api/rooms/${parentId}/stations` : `/api/stations/${formData.id}`;
        body = { ...body, projectId: body.projectId || 0 }; // Station requires projectId, use placeholder
      }

      const method = modalAction === 'create' ? 'POST' : 'PUT';
      await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      await loadFactories();
      closeModal();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(type: typeof modalType, id: string) {
    if (!confirm(`Delete this ${type}?`)) return;
    setLoading(true);
    try {
      let url = '';
      if (type === 'factory') url = `/api/factories/${id}`;
      else if (type === 'floor') url = `/api/floors/${id}`;
      else if (type === 'section') url = `/api/sections/${id}`;
      else if (type === 'room') url = `/api/rooms/${id}`;
      else if (type === 'station') url = `/api/stations/${id}`;

      await fetch(url, { method: 'DELETE', credentials: 'include' });
      await loadFactories();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Factory Hierarchy</h1>
              <p className="text-sm text-gray-500 mt-1">Manage factories, floors, sections, rooms, and stations with real-time capacity insights</p>
            </div>
            <button onClick={() => openModal('factory', 'create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={16} /> Add Factory
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {factories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Factories</div>
              <div className="text-2xl font-bold text-gray-900">{factories.length}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Stations</div>
              <div className="text-2xl font-bold text-gray-900">
                {factories.reduce((sum, f) => sum + calculateFactoryStats(f).totalStations, 0)}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Operational</div>
              <div className="text-2xl font-bold text-green-600">
                {factories.reduce((sum, f) => sum + calculateFactoryStats(f).operationalStations, 0)}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Avg Utilization</div>
              <div className="text-2xl font-bold text-gray-900">
                {factories.length > 0
                  ? (factories.reduce((sum, f) => sum + calculateFactoryStats(f).utilization, 0) / factories.length).toFixed(1)
                  : '0'}%
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 flex items-center justify-center">
            <div className="text-gray-500">Loading factory hierarchy...</div>
          </div>
        )}

        {/* Factory Tree */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {factories.map(factory => {
            const stats = calculateFactoryStats(factory);
            const UtilIcon = getUtilizationIcon(stats.utilization);

            return (
              <div key={factory.id} className="border-b last:border-b-0">
                <div className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <button onClick={() => toggle(factory.id)} className="text-gray-500 hover:text-gray-700">
                    {expanded.has(factory.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <Building2 size={18} className="text-blue-600" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{factory.name}</div>
                    <div className="text-xs text-gray-500">{factory.location} • {factory.code}</div>
                  </div>

                  {/* Factory Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Stations</div>
                      <div className="font-semibold text-gray-900">{stats.totalStations}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Capacity</div>
                      <div className="font-semibold text-gray-900">{stats.totalCapacity.toLocaleString()}</div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${getUtilizationColor(stats.utilization)}`}>
                      <UtilIcon size={12} />
                      <span className="text-xs font-semibold">{stats.utilization.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => openModal('floor', 'create', factory.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Add Floor">
                      <Plus size={16} />
                    </button>
                    <button onClick={() => openModal('factory', 'edit', undefined, factory)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete('factory', factory.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expanded.has(factory.id) && factory.floors && factory.floors.map(floor => {
                  const floorStats = calculateFloorStats(floor);
                  const FloorUtilIcon = getUtilizationIcon(floorStats.utilization);

                  return (
                    <div key={floor.id} className="ml-8 border-l-2 border-gray-200">
                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                        <button onClick={() => toggle(floor.id)} className="text-gray-500 hover:text-gray-700">
                          {expanded.has(floor.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <Layers size={16} className="text-purple-600" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{floor.name}</div>
                          <div className="text-xs text-gray-500">Level {floor.level}</div>
                        </div>

                        {/* Floor Stats */}
                        <div className="flex items-center gap-3 text-sm">
                          <div className="text-xs text-gray-500">{floorStats.totalRooms} rooms</div>
                          <div className="text-xs text-gray-500">{floorStats.totalStations} stations</div>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getUtilizationColor(floorStats.utilization)}`}>
                            <FloorUtilIcon size={10} />
                            {floorStats.utilization.toFixed(0)}%
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button onClick={() => openModal('section', 'create', floor.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Plus size={14} /></button>
                          <button onClick={() => openModal('floor', 'edit', undefined, floor)} className="p-1 text-gray-600 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete('floor', floor.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                        </div>
                      </div>

                      {expanded.has(floor.id) && floor.sections && floor.sections.map(section => {
                        const sectionStats = calculateSectionStats(section);
                        const SectionUtilIcon = getUtilizationIcon(sectionStats.utilization);

                        return (
                          <div key={section.id} className="ml-8 border-l-2 border-gray-200">
                            <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                              <button onClick={() => toggle(section.id)} className="text-gray-500 hover:text-gray-700">
                                {expanded.has(section.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                              <Grid size={16} className="text-indigo-600" />
                              <span className="flex-1 font-medium text-gray-900">{section.name}</span>

                              {/* Section Stats */}
                              <div className="flex items-center gap-3 text-sm">
                                <div className="text-xs text-gray-500">{sectionStats.totalStations} stations</div>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getUtilizationColor(sectionStats.utilization)}`}>
                                  <SectionUtilIcon size={10} />
                                  {sectionStats.utilization.toFixed(0)}%
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button onClick={() => openModal('room', 'create', section.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Plus size={14} /></button>
                                <button onClick={() => openModal('section', 'edit', undefined, section)} className="p-1 text-gray-600 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete('section', section.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                              </div>
                            </div>

                            {expanded.has(section.id) && section.rooms && section.rooms.map(room => {
                              const roomStats = calculateRoomStats(room);
                              const RoomUtilIcon = getUtilizationIcon(roomStats.utilization);

                              return (
                                <div key={room.id} className="ml-8 border-l-2 border-gray-200">
                                  <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                                    <button onClick={() => toggle(room.id)} className="text-gray-500 hover:text-gray-700">
                                      {expanded.has(room.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>
                                    <DoorOpen size={16} className="text-amber-600" />
                                    <span className="flex-1 font-medium text-gray-900">{room.name}</span>

                                    {/* Room Stats */}
                                    <div className="flex items-center gap-3 text-sm">
                                      {room.capacity && <div className="text-xs text-gray-500">Cap: {room.capacity}</div>}
                                      <div className="text-xs text-gray-500">{roomStats.totalStations} stations</div>
                                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getUtilizationColor(roomStats.utilization)}`}>
                                        <RoomUtilIcon size={10} />
                                        {roomStats.utilization.toFixed(0)}%
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button onClick={() => openModal('station', 'create', room.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Plus size={14} /></button>
                                      <button onClick={() => openModal('room', 'edit', undefined, room)} className="p-1 text-gray-600 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
                                      <button onClick={() => handleDelete('room', room.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                    </div>
                                  </div>

                                  {expanded.has(room.id) && room.stations && room.stations.map(station => (
                                    <div key={station.id} className="ml-8 border-l-2 border-gray-200">
                                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                                        <Activity size={16} className={station.status === 'operational' ? 'text-green-600' : 'text-red-600'} />
                                        <span className="flex-1 text-gray-900">
                                          {station.name} {station.stationNumber && <span className="text-gray-500 text-sm">(#{station.stationNumber})</span>}
                                        </span>
                                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${station.status === 'operational'
                                            ? 'bg-green-100 text-green-700'
                                            : station.status === 'maintenance'
                                              ? 'bg-yellow-100 text-yellow-700'
                                              : 'bg-red-100 text-red-700'
                                          }`}>
                                          {station.status}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <button onClick={() => openModal('station', 'edit', undefined, station)} className="p-1 text-gray-600 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
                                          <button onClick={() => handleDelete('station', String(station.id))} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4 capitalize">{modalAction} {modalType}</h2>

            <div className="space-y-3">
              {modalType === 'factory' && (
                <>
                  <input className="w-full border rounded px-3 py-2" placeholder="Factory Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  <input className="w-full border rounded px-3 py-2" placeholder="Location" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                  <input className="w-full border rounded px-3 py-2" placeholder="Code" value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                  <input className="w-full border rounded px-3 py-2" type="number" placeholder="Capacity" value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} />
                </>
              )}

              {modalType === 'floor' && (
                <>
                  <input className="w-full border rounded px-3 py-2" placeholder="Floor Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  <input className="w-full border rounded px-3 py-2" type="number" placeholder="Level" value={formData.level || ''} onChange={e => setFormData({ ...formData, level: Number(e.target.value) })} />
                </>
              )}

              {modalType === 'section' && (
                <input className="w-full border rounded px-3 py-2" placeholder="Section Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              )}

              {modalType === 'room' && (
                <>
                  <input className="w-full border rounded px-3 py-2" placeholder="Room Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  <input className="w-full border rounded px-3 py-2" type="number" placeholder="Capacity" value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} />
                </>
              )}

              {modalType === 'station' && (
                <>
                  <input className="w-full border rounded px-3 py-2" placeholder="Station Name" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  <input className="w-full border rounded px-3 py-2" placeholder="Station Number" value={formData.stationNumber || ''} onChange={e => setFormData({ ...formData, stationNumber: e.target.value })} />
                  <select className="w-full border rounded px-3 py-2" value={formData.status || 'operational'} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="operational">Operational</option>
                    <option value="down">Down</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" disabled={loading}>
                {modalAction === 'create' ? 'Create' : 'Update'}
              </button>
              <button onClick={closeModal} className="flex-1 border px-4 py-2 rounded hover:bg-gray-50" disabled={loading}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
