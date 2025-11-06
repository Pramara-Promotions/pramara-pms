import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api';

// ==================== TYPES ====================

export interface Factory {
  id: number;
  name: string;
  code: string;
  location?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  Floor?: Floor[];
  floorCount?: number;
  sectionCount?: number;
  roomCount?: number;
  stationCount?: number;
}

export interface Floor {
  id: number;
  factoryId: number;
  name: string;
  floorNumber: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  Factory?: Factory;
  Section?: Section[];
  sectionCount?: number;
  roomCount?: number;
  stationCount?: number;
}

export interface Section {
  id: number;
  floorId: number;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  Floor?: Floor;
  Room?: Room[];
  roomCount?: number;
  stationCount?: number;
}

export interface Room {
  id: number;
  sectionId: number;
  name: string;
  roomNumber?: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  Section?: Section;
  Station?: any[];
  stationCount?: number;
}

export interface FactoryAnalytics {
  factory: {
    id: number;
    name: string;
    code: string;
  };
  hierarchy: {
    floors: number;
    sections: number;
    rooms: number;
    stations: number;
  };
  production: {
    totalOutput: number;
    totalTarget: number;
    totalRejected: number;
    efficiency: string;
    qualityRate: string;
    entriesCount: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

// ==================== FACTORIES ====================

export async function listFactories(active?: boolean): Promise<Factory[]> {
  const params = new URLSearchParams();
  if (active !== undefined) params.append('active', String(active));
  
  return apiGet(`/factories?${params.toString()}`) as Promise<Factory[]>;
}

export async function getFactory(id: number): Promise<Factory> {
  return apiGet(`/factories/${id}`) as Promise<Factory>;
}

export async function createFactory(data: {
  name: string;
  code: string;
  location?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  active?: boolean;
}): Promise<Factory> {
  return apiPost('/factories', data) as Promise<Factory>;
}

export async function updateFactory(id: number, data: Partial<{
  name: string;
  code: string;
  location: string;
  address: string;
  contactPerson: string;
  contactPhone: string;
  active: boolean;
}>): Promise<Factory> {
  return apiPut(`/factories/${id}`, data) as Promise<Factory>;
}

export async function deleteFactory(id: number): Promise<void> {
  await apiDelete(`/factories/${id}`);
}

export async function getFactoryAnalytics(
  id: number,
  startDate?: string,
  endDate?: string
): Promise<FactoryAnalytics> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  return apiGet(`/factories/${id}/analytics?${params.toString()}`) as Promise<FactoryAnalytics>;
}

// ==================== FLOORS ====================

export async function listFloors(factoryId: number): Promise<Floor[]> {
  return apiGet(`/factories/${factoryId}/floors`) as Promise<Floor[]>;
}

export async function createFloor(data: {
  factoryId: number;
  name: string;
  floorNumber: number;
  active?: boolean;
}): Promise<Floor> {
  return apiPost('/floors', data) as Promise<Floor>;
}

export async function updateFloor(id: number, data: Partial<{
  name: string;
  floorNumber: number;
  active: boolean;
}>): Promise<Floor> {
  return apiPut(`/floors/${id}`, data) as Promise<Floor>;
}

export async function deleteFloor(id: number): Promise<void> {
  await apiDelete(`/floors/${id}`);
}

// ==================== SECTIONS ====================

export async function listSections(floorId: number): Promise<Section[]> {
  return apiGet(`/floors/${floorId}/sections`) as Promise<Section[]>;
}

export async function createSection(data: {
  floorId: number;
  name: string;
  description?: string;
  active?: boolean;
}): Promise<Section> {
  return apiPost('/sections', data) as Promise<Section>;
}

export async function updateSection(id: number, data: Partial<{
  name: string;
  description: string;
  active: boolean;
}>): Promise<Section> {
  return apiPut(`/sections/${id}`, data) as Promise<Section>;
}

export async function deleteSection(id: number): Promise<void> {
  await apiDelete(`/sections/${id}`);
}

// ==================== ROOMS ====================

export async function listRooms(params: {
  sectionId?: number;
  floorId?: number;
  factoryId?: number;
}): Promise<Room[]> {
  const searchParams = new URLSearchParams();
  if (params.sectionId) searchParams.append('sectionId', String(params.sectionId));
  if (params.floorId) searchParams.append('floorId', String(params.floorId));
  if (params.factoryId) searchParams.append('factoryId', String(params.factoryId));
  
  return apiGet(`/rooms?${searchParams.toString()}`) as Promise<Room[]>;
}

export async function listSectionRooms(sectionId: number): Promise<Room[]> {
  return apiGet(`/sections/${sectionId}/rooms`) as Promise<Room[]>;
}

export async function createRoom(data: {
  sectionId: number;
  name: string;
  roomNumber?: string;
  description?: string;
  active?: boolean;
}): Promise<Room> {
  return apiPost('/rooms', data) as Promise<Room>;
}

export async function updateRoom(id: number, data: Partial<{
  name: string;
  roomNumber: string;
  description: string;
  active: boolean;
}>): Promise<Room> {
  return apiPut(`/rooms/${id}`, data) as Promise<Room>;
}

export async function deleteRoom(id: number): Promise<void> {
  await apiDelete(`/rooms/${id}`);
}
