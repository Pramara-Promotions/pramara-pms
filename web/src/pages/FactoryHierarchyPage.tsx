import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, Building2, Layers, Grid, DoorOpen, Activity } from 'lucide-react';

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

export default function FactoryHierarchyPage() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'factory'|'floor'|'section'|'room'|'station'>('factory');
  const [modalAction, setModalAction] = useState<'create'|'edit'>('create');
  const [parentId, setParentId] = useState<string|null>(null);
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Factory Hierarchy</h1>
          <p className="text-sm text-gray-500">Manage factories, floors, sections, rooms, and stations</p>
        </div>
        <button onClick={() => openModal('factory', 'create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Plus size={16} /> Add Factory
        </button>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}

      <div className="bg-white rounded border">
        {factories.map(factory => (
          <div key={factory.id} className="border-b last:border-b-0">
            <div className="flex items-center gap-2 p-3 hover:bg-gray-50">
              <button onClick={() => toggle(factory.id)} className="text-gray-500">
                {expanded.has(factory.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <Building2 size={16} className="text-blue-600" />
              <span className="flex-1 font-medium">{factory.name}</span>
              <span className="text-xs text-gray-500">{factory.code}</span>
              <button onClick={() => openModal('floor', 'create', factory.id)} className="text-green-600 hover:text-green-700">
                <Plus size={14} />
              </button>
              <button onClick={() => openModal('factory', 'edit', undefined, factory)} className="text-gray-600 hover:text-gray-700">
                <Edit2 size={14} />
              </button>
              <button onClick={() => handleDelete('factory', factory.id)} className="text-red-600 hover:text-red-700">
                <Trash2 size={14} />
              </button>
            </div>

            {expanded.has(factory.id) && factory.floors && factory.floors.map(floor => (
              <div key={floor.id} className="ml-6 border-l-2">
                <div className="flex items-center gap-2 p-3 hover:bg-gray-50">
                  <button onClick={() => toggle(floor.id)} className="text-gray-500">
                    {expanded.has(floor.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <Layers size={16} className="text-purple-600" />
                  <span className="flex-1">{floor.name} (Level {floor.level})</span>
                  <button onClick={() => openModal('section', 'create', floor.id)} className="text-green-600"><Plus size={14} /></button>
                  <button onClick={() => openModal('floor', 'edit', undefined, floor)} className="text-gray-600"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete('floor', floor.id)} className="text-red-600"><Trash2 size={14} /></button>
                </div>

                {expanded.has(floor.id) && floor.sections && floor.sections.map(section => (
                  <div key={section.id} className="ml-6 border-l-2">
                    <div className="flex items-center gap-2 p-3 hover:bg-gray-50">
                      <button onClick={() => toggle(section.id)} className="text-gray-500">
                        {expanded.has(section.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <Grid size={16} className="text-indigo-600" />
                      <span className="flex-1">{section.name}</span>
                      <button onClick={() => openModal('room', 'create', section.id)} className="text-green-600"><Plus size={14} /></button>
                      <button onClick={() => openModal('section', 'edit', undefined, section)} className="text-gray-600"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete('section', section.id)} className="text-red-600"><Trash2 size={14} /></button>
                    </div>

                    {expanded.has(section.id) && section.rooms && section.rooms.map(room => (
                      <div key={room.id} className="ml-6 border-l-2">
                        <div className="flex items-center gap-2 p-3 hover:bg-gray-50">
                          <button onClick={() => toggle(room.id)} className="text-gray-500">
                            {expanded.has(room.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <DoorOpen size={16} className="text-amber-600" />
                          <span className="flex-1">{room.name}</span>
                          {room.capacity && <span className="text-xs text-gray-500">Cap: {room.capacity}</span>}
                          <button onClick={() => openModal('station', 'create', room.id)} className="text-green-600"><Plus size={14} /></button>
                          <button onClick={() => openModal('room', 'edit', undefined, room)} className="text-gray-600"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete('room', room.id)} className="text-red-600"><Trash2 size={14} /></button>
                        </div>

                        {expanded.has(room.id) && room.stations && room.stations.map(station => (
                          <div key={station.id} className="ml-6 border-l-2">
                            <div className="flex items-center gap-2 p-3 hover:bg-gray-50">
                              <Activity size={16} className="text-green-600" />
                              <span className="flex-1">{station.name} {station.stationNumber && `(#${station.stationNumber})`}</span>
                              <span className={`px-2 py-0.5 text-xs rounded ${station.status === 'operational' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{station.status}</span>
                              <button onClick={() => openModal('station', 'edit', undefined, station)} className="text-gray-600"><Edit2 size={14} /></button>
                              <button onClick={() => handleDelete('station', String(station.id))} className="text-red-600"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4 capitalize">{modalAction} {modalType}</h2>
            
            <div className="space-y-3">
              {modalType === 'factory' && (
                <>
                  <input className="w-full border rounded px-3 py-2" placeholder="Factory Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <input className="w-full border rounded px-3 py-2" placeholder="Location" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
                  <input className="w-full border rounded px-3 py-2" placeholder="Code" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                  <input className="w-full border rounded px-3 py-2" type="number" placeholder="Capacity" value={formData.capacity || ''} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} />
                </>
              )}

              {modalType === 'floor' && (
                <>
                  <input className="w-full border rounded px-3 py-2" placeholder="Floor Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <input className="w-full border rounded px-3 py-2" type="number" placeholder="Level" value={formData.level || ''} onChange={e => setFormData({...formData, level: Number(e.target.value)})} />
                </>
              )}

              {modalType === 'section' && (
                <input className="w-full border rounded px-3 py-2" placeholder="Section Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              )}

              {modalType === 'room' && (
                <>
                  <input className="w-full border rounded px-3 py-2" placeholder="Room Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <input className="w-full border rounded px-3 py-2" type="number" placeholder="Capacity" value={formData.capacity || ''} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} />
                </>
              )}

              {modalType === 'station' && (
                <>
                  <input className="w-full border rounded px-3 py-2" placeholder="Station Name" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <input className="w-full border rounded px-3 py-2" placeholder="Station Number" value={formData.stationNumber || ''} onChange={e => setFormData({...formData, stationNumber: e.target.value})} />
                  <select className="w-full border rounded px-3 py-2" value={formData.status || 'operational'} onChange={e => setFormData({...formData, status: e.target.value})}>
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
