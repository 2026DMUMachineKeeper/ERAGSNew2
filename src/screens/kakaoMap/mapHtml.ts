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
      .hospital-bed-labels { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
      .hospital-bed-label {
        display: block; padding: 7px 10px; border: 1px solid #E4E6EA; border-radius: 10px;
        background: #FFFFFF; color: #22252A; font: 12px/1.5 sans-serif;
        white-space: nowrap; box-shadow: 0 2px 6px #0000001A; cursor: pointer;
      }
      .hospital-bed-label:focus-visible { outline: 2px solid #FF3A3A; outline-offset: 2px; }
      .hospital-bed-label strong { color: #FF3A3A; }
      .hospital-bed-name { display: none; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
      .hospital-bed-labels.is-cluster .hospital-bed-name { display: block; }
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
      const CLUSTER_DISTANCE_PX = 28;
      const bounds = new kakao.maps.LatLngBounds();
      const markers = {};
      const markerEntries = [];
      let clusterMarkers = [];
      let clusterBedOverlays = [];
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

      const handleLocationPress = location => {
        window.ReactNativeWebView?.postMessage(JSON.stringify({
          locationId: location.id,
          type: 'medical-location-pressed',
        }));
      };

      const createHospitalBedLabel = location => {
        if (location.type !== 'hospital') return null;
        const details = location.hospitalDetails;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hospital-bed-label';
        const name = document.createElement('span');
        name.className = 'hospital-bed-name';
        name.textContent = location.name;
        button.appendChild(name);
        const summary = document.createElement('span');
        if (details?.availableBeds == null && details?.operatingRoomBeds == null) {
          summary.textContent = '병상 정보 없음';
        } else {
          const appendBeds = (label, beds) => {
            summary.appendChild(document.createTextNode(label + ' '));
            const value = document.createElement('strong');
            value.textContent = beds == null ? '정보 없음'
              : beds < 0 ? Math.abs(beds) + '명 대기 중' : String(beds);
            summary.appendChild(value);
          };
          appendBeds('병상', details.availableBeds);
          summary.appendChild(document.createTextNode(' · '));
          appendBeds('수술실', details.operatingRoomBeds);
        }
        button.appendChild(summary);
        button.setAttribute('aria-label', location.name + ': ' + summary.textContent);
        button.addEventListener('click', event => {
          event.stopPropagation();
          handleLocationPress(location);
        });
        return button;
      };

      const createBedOverlay = (content, position) => new kakao.maps.CustomOverlay({
        content, position, clickable: true, xAnchor: 0.5, yAnchor: 0, zIndex: 2,
      });

      const createClusterMarkerImage = additionalLocationCount => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40" viewBox="0 0 64 40">' +
          '<path d="M20 39C16 34 3 27 3 18a17 17 0 1 1 34 0c0 9-13 16-17 21Z" fill="#15803D" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>' +
          '<text x="20" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF">AED</text>' +
          '<circle cx="50" cy="11" r="11" fill="#FFFFFF" stroke="#15803D" stroke-width="2"/>' +
          '<text x="50" y="15" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#15803D">+' +
          additionalLocationCount + '</text></svg>';

        return new kakao.maps.MarkerImage(
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
          new kakao.maps.Size(64, 40),
          { offset: new kakao.maps.Point(20, 40) },
        );
      };

      const getMarkerClusters = visibleEntries => {
        const projection = window.eragsMap.getProjection();
        const points = new Map(visibleEntries.map(entry => [
          entry,
          projection.pointFromCoords(entry.position),
        ]));
        const remainingEntries = new Set(visibleEntries);
        const clusters = [];

        while (remainingEntries.size) {
          const firstEntry = remainingEntries.values().next().value;
          const group = [firstEntry];
          const entriesToCheck = [firstEntry];
          remainingEntries.delete(firstEntry);

          while (entriesToCheck.length) {
            const entry = entriesToCheck.pop();
            const entryPoint = points.get(entry);

            [...remainingEntries].forEach(candidate => {
              const candidatePoint = points.get(candidate);
              const distance = Math.hypot(
                entryPoint.x - candidatePoint.x,
                entryPoint.y - candidatePoint.y,
              );

              if (distance <= CLUSTER_DISTANCE_PX) {
                remainingEntries.delete(candidate);
                group.push(candidate);
                entriesToCheck.push(candidate);
              }
            });
          }

          const hasAed = group.some(entry => entry.location.type === 'aed');
          const hasHospital = group.some(
            entry => entry.location.type === 'hospital',
          );
          if (group.length > 1 && hasAed && hasHospital) {
            clusters.push(group);
          }
        }

        return clusters;
      };

      const renderMedicalMarkers = () => {
        clusterMarkers.forEach(marker => marker.setMap(null));
        clusterMarkers = [];
        clusterBedOverlays.forEach(overlay => overlay.setMap(null));
        clusterBedOverlays = [];
        markerEntries.forEach(entry => {
          entry.marker.setMap(null);
          entry.bedOverlay?.setMap(null);
        });

        const visibleEntries = markerEntries.filter(entry =>
          matchesCurrentFilter(entry.location),
        );
        const clusters = getMarkerClusters(visibleEntries);
        const clusteredEntries = new Set(clusters.flat());

        visibleEntries.forEach(entry => {
          if (!clusteredEntries.has(entry)) {
            entry.marker.setMap(window.eragsMap);
            if (entry.bedOverlay) {
              entry.bedContent.appendChild(entry.bedLabel);
              entry.bedOverlay.setMap(window.eragsMap);
            }
          }
        });

        clusters.forEach(cluster => {
          const representative = cluster.find(
            entry => entry.location.type === 'aed',
          );
          const additionalLocationCount = cluster.length - 1;
          const marker = new kakao.maps.Marker({
            image: createClusterMarkerImage(additionalLocationCount),
            map: window.eragsMap,
            position: representative.position,
            title: representative.location.name + ' 외 ' + additionalLocationCount + '곳',
          });

          kakao.maps.event.addListener(marker, 'click', () => {
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              locationId: representative.location.id,
              type: 'medical-location-pressed',
            }));
          });
          clusterMarkers.push(marker);
          const bedContent = document.createElement('div');
          bedContent.className = 'hospital-bed-labels is-cluster';
          cluster.forEach(entry => {
            if (entry.bedLabel) bedContent.appendChild(entry.bedLabel);
          });
          const bedOverlay = createBedOverlay(bedContent, representative.position);
          bedOverlay.setMap(window.eragsMap);
          clusterBedOverlays.push(bedOverlay);
        });
      };

      const addMarker = (location, position) => {
        bounds.extend(position);
        markerCount += 1;

        const marker = new kakao.maps.Marker({
          image: markerImages[location.type],
          position,
          title: location.name,
        });
        markers[location.id] = marker;
        const bedLabel = createHospitalBedLabel(location);
        const bedContent = bedLabel ? document.createElement('div') : null;
        if (bedContent) {
          bedContent.className = 'hospital-bed-labels';
          bedContent.appendChild(bedLabel);
        }
        const bedOverlay = bedContent ? createBedOverlay(bedContent, position) : null;
        markerEntries.push({ location, marker, position, bedLabel, bedContent, bedOverlay });

        kakao.maps.event.addListener(marker, 'click', () => {
          handleLocationPress(location);
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
        renderMedicalMarkers();
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
      kakao.maps.event.addListener(
        window.eragsMap,
        'idle',
        renderMedicalMarkers,
      );

      window.eragsFilterMedicalLocations = function (filter, query) {
        activeFilter = filter;
        activeQuery = (query || '').trim().toLocaleLowerCase();
        renderMedicalMarkers();
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
