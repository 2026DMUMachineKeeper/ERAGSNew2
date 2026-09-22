import type { MedicalFilter } from './components';
import type { MedicalMapLocation } from './medicalLocations';

export type MapCoordinates = { latitude: number; longitude: number };
export type MarkerAssetUris = { aed: string; hospital: string };

const createMarkerSvgUri = (
  fill: string,
  stroke: string,
  symbol: string,
): string => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <path d="M20 39C16 34 3 27 3 18a17 17 0 1 1 34 0c0 9-13 16-17 21Z"
      fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
    ${symbol}
  </svg>`,
)}`;

export const MEDICAL_MARKER_ASSET_URIS: MarkerAssetUris = {
  aed: createMarkerSvgUri(
    '#15803D', '#FFFFFF',
    '<text x="20" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">AED</text>',
  ),
  hospital: createMarkerSvgUri(
    '#FFFFFF', '#FF3A3A',
    '<path d="M17 9h6v6h6v6h-6v6h-6v-6h-6v-6h6Z" fill="#FF3A3A"/>',
  ),
};

const KAKAO_MAP_CENTER = {
  latitude: 37.4999957879,
  longitude: 126.8681696567,
};
export const createKakaoMapHtml = (
  appKey: string,
  markerAssetUris: MarkerAssetUris,
  medicalLocations: readonly MedicalMapLocation[],
): string => `
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>카카오맵</title>
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    </style>
    <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&libraries=services"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const mapContainer = document.getElementById('map');
      const mapOption = {
        center: new kakao.maps.LatLng(${KAKAO_MAP_CENTER.latitude}, ${
  KAKAO_MAP_CENTER.longitude
}),
        level: 4,
      };
      window.eragsMap = new kakao.maps.Map(mapContainer, mapOption);

      const medicalLocations = ${JSON.stringify(medicalLocations).replace(
        /</g,
        '\\u003c',
      )};
      const markerAssetUris = ${JSON.stringify(markerAssetUris)};
      const createMarkerImage = (assetUri) => new kakao.maps.MarkerImage(
        assetUri,
        new kakao.maps.Size(40, 40),
        { offset: new kakao.maps.Point(20, 40) },
      );
      const markerImages = {
        aed: createMarkerImage(markerAssetUris.aed),
        hospital: createMarkerImage(markerAssetUris.hospital),
      };
      const bounds = new kakao.maps.LatLngBounds();
      const markers = {};
      const failedHospitalIds = new Set();
      let markerCount = 0;
      let activeFilter = 'all';
      let activeQuery = '';
      let pendingFocusId = null;
      let pendingDirectionsId = null;
      let hasFocusedLocation = false;

      const sendDirectionsPosition = (locationId, position) => {
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          type: 'medical-directions-location',
          locationId,
          latitude: position.getLat(),
          longitude: position.getLng(),
        }));
      };

      const matchesCurrentFilter = location =>
        (activeFilter === 'all' || location.type === activeFilter) &&
        (!activeQuery || (location.name + ' ' + location.address)
          .toLocaleLowerCase().includes(activeQuery));

      const addMarker = (location, position) => {
        bounds.extend(position);
        markerCount += 1;

        const marker = new kakao.maps.Marker({
          image: markerImages[location.type],
          map: matchesCurrentFilter(location) ? window.eragsMap : null,
          position,
          title: location.name,
        });
        markers[location.id] = marker;

        kakao.maps.event.addListener(marker, 'click', () => {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            locationId: location.id,
            type: 'medical-location-pressed',
          }));
        });
        if (pendingFocusId === location.id) {
          window.eragsMap.setCenter(position);
          window.eragsMap.setLevel(3);
          pendingFocusId = null;
          hasFocusedLocation = true;
        }
        if (pendingDirectionsId === location.id) {
          sendDirectionsPosition(location.id, position);
          pendingDirectionsId = null;
        }
      };

      const geocoder = new kakao.maps.services.Geocoder();
      const hospitalSearches = [];
      medicalLocations.forEach(location => {
        if (location.type === 'aed') {
          addMarker(location, new kakao.maps.LatLng(
            location.latitude,
            location.longitude,
          ));
          return;
        }

        hospitalSearches.push(new Promise(resolve => {
          const searchAddress = location.address.split(',')[0]
            .replace(/\\s*\\(.*$/, '').trim();
          geocoder.addressSearch(searchAddress, (results, status) => {
            if (status === kakao.maps.services.Status.OK && results.length) {
              addMarker(location, new kakao.maps.LatLng(results[0].y, results[0].x));
            } else {
              failedHospitalIds.add(location.id);
              if (pendingDirectionsId === location.id) {
                window.ReactNativeWebView?.postMessage(JSON.stringify({
                  type: 'medical-directions-unavailable',
                  locationId: location.id,
                }));
                pendingDirectionsId = null;
              }
            }
            resolve();
          });
        }));
      });

      Promise.all(hospitalSearches).then(() => {
        if (hasFocusedLocation) {
          return;
        }
        if (markerCount === 1) {
          window.eragsMap.setCenter(bounds.getSouthWest());
        } else if (markerCount > 1) {
          window.eragsMap.setBounds(bounds, 56, 56, 56, 56);
        }
      });

      kakao.maps.event.addListener(window.eragsMap, 'click', () => {
        window.ReactNativeWebView?.postMessage('map-clicked');
      });

      window.eragsFilterMedicalLocations = function (filter, query) {
        activeFilter = filter;
        activeQuery = (query || '').trim().toLocaleLowerCase();

        medicalLocations.forEach(location => {
          const marker = markers[location.id];

          marker?.setMap(matchesCurrentFilter(location) ? window.eragsMap : null);
        });
      };

      window.eragsFocusMedicalLocation = function (locationId) {
        const marker = markers[locationId];

        if (!marker) {
          pendingFocusId = locationId;
          return;
        }

        hasFocusedLocation = true;
        window.eragsMap.setCenter(marker.getPosition());
        window.eragsMap.setLevel(3);
      };

      window.eragsRequestMedicalDirections = function (locationId) {
        const marker = markers[locationId];
        if (marker) {
          sendDirectionsPosition(locationId, marker.getPosition());
        } else if (failedHospitalIds.has(locationId)) {
          window.ReactNativeWebView?.postMessage(JSON.stringify({
            type: 'medical-directions-unavailable',
            locationId,
          }));
        } else {
          pendingDirectionsId = locationId;
        }
      };

      window.eragsUpdateCurrentLocation = function (latitude, longitude) {
        const position = new kakao.maps.LatLng(latitude, longitude);

        if (!window.eragsCurrentLocationMarker) {
          window.eragsCurrentLocationMarker = new kakao.maps.Marker({
            position,
          });
        } else {
          window.eragsCurrentLocationMarker.setPosition(position);
        }

        window.eragsCurrentLocationMarker.setMap(window.eragsMap);
      };
    </script>
  </body>
</html>
`;

export const createCurrentLocationScript = ({
  latitude,
  longitude,
}: MapCoordinates): string => `
  window.eragsUpdateCurrentLocation?.(${latitude}, ${longitude});
  true;
`;

export const createMedicalFilterScript = (
  filter: MedicalFilter,
  query: string,
): string => `
  window.eragsFilterMedicalLocations?.(${JSON.stringify(
    filter,
  )}, ${JSON.stringify(query)});
  true;
`;

export const createFocusMedicalLocationScript = (
  locationId: string,
): string => `
  window.eragsFocusMedicalLocation?.(${JSON.stringify(locationId)});
  true;
`;

export const createRequestMedicalDirectionsScript = (
  locationId: string,
): string => `
  window.eragsRequestMedicalDirections?.(${JSON.stringify(locationId)});
  true;
`;
