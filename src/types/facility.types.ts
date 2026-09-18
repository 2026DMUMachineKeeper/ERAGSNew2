export type NearbyAed = {
  address: string;
  detailPlaces: readonly string[];
  distanceInMeters: number;
  latitude: number;
  longitude: number;
  name: string;
  phone: string;
};

export type NearbyHospital = {
  address: string;
  availableBeds: number | null;
  ctAvailable: boolean;
  distanceInMeters: number;
  hpid: string;
  isRealTimeAvailable: boolean;
  mriAvailable: boolean;
  name: string;
  operatingRoomBeds: number | null;
};
