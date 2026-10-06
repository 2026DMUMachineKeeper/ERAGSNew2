import { Script } from 'node:vm';

import { createKakaoMapHtml } from '@/screens/kakaoMap/mapHtml';
import type { MedicalMapLocation } from '@/screens/kakaoMap/medicalLocations';

class TestNode {
  className = '';
  type = '';
  parent: TestNode | null = null;
  children: TestNode[] = [];
  attributes: Record<string, string> = {};
  listeners: Record<string, (event: { stopPropagation: () => void }) => void> = {};
  private text = '';

  get textContent(): string {
    return this.text + this.children.map(child => child.textContent).join('');
  }

  set textContent(value: string) {
    this.text = value;
    this.children = [];
  }

  appendChild(child: TestNode): void {
    if (child.parent) {
      child.parent.children = child.parent.children.filter(item => item !== child);
    }
    child.parent = this;
    this.children.push(child);
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  addEventListener(name: string, handler: (event: { stopPropagation: () => void }) => void): void {
    this.listeners[name] = handler;
  }
}

const hospital = (
  id: string,
  availableBeds: number | null,
  operatingRoomBeds: number | null,
): MedicalMapLocation => ({
  id, name: id, address: '서울', distanceInMeters: 100,
  type: 'hospital', typeLabel: '병원',
  hospitalDetails: {
    availableBeds, operatingRoomBeds, isRealTimeAvailable: availableBeds !== null,
    ctAvailable: false, mriAvailable: false,
  },
});

const renderMap = async (locations: MedicalMapLocation[]) => {
  const overlays: { content: TestNode; setMap: jest.Mock }[] = [];
  const postMessage = jest.fn();
  const addressSearch = jest.fn();
  const window = {
    ReactNativeWebView: { postMessage },
    eragsFilterMedicalLocations: (_filter: string, _query: string): void => {},
    eragsSetMedicalLocations: (_locations: MedicalMapLocation[]): void => {},
  };
  const document = {
    getElementById: (): TestNode => new TestNode(),
    createElement: (): TestNode => new TestNode(),
    createTextNode: (value: string): TestNode => {
      const node = new TestNode();
      node.textContent = value;
      return node;
    },
  };
  class MapPosition {
    constructor(readonly latitude: number, readonly longitude: number) {}
  }
  class MapMarker {
    setMap = jest.fn();
  }
  const kakao = { maps: {
    Map: class {
      getProjection = () => ({ pointFromCoords: () => ({ x: 0, y: 0 }) });
      setCenter = jest.fn();
      setBounds = jest.fn();
    },
    LatLng: MapPosition,
    LatLngBounds: class {
      extend = jest.fn();
      getSouthWest = () => new MapPosition(37.5, 127);
    },
    Marker: MapMarker,
    MarkerImage: class {}, Size: class {}, Point: class {},
    CustomOverlay: class {
      setMap = jest.fn();
      content: TestNode;
      constructor(options: { content: TestNode }) {
        this.content = options.content;
        overlays.push(this);
      }
    },
    event: { addListener: jest.fn() },
    services: {
      Status: { OK: 'OK' },
      Geocoder: class {
        addressSearch(address: string, callback: (results: { x: number; y: number }[], status: string) => void): void {
          addressSearch(address);
          callback([{ x: 127, y: 37.5 }], 'OK');
        }
      },
    },
  } };
  const html = createKakaoMapHtml('key', { aed: 'aed', hospital: 'hospital' });
  const source = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  expect(source).toBeDefined();
  new Script(source ?? '').runInNewContext({ window, document, kakao });
  window.eragsSetMedicalLocations(locations);
  await Promise.resolve();
  const map = (window as unknown as { eragsMap: { setBounds: jest.Mock } })
    .eragsMap;
  const emitMapEvent = (name: string): void => {
    kakao.maps.event.addListener.mock.calls
      .filter(([target, eventName]) => target === map && eventName === name)
      .forEach(([, , handler]) => handler());
  };
  return { overlays, window, postMessage, addressSearch, map, emitMapEvent };
};

describe('병원 지도 병상 표시', () => {
  it('0, 누락 값, 음수 대기 인원을 구분하고 필터에 맞춰 표시한다', async () => {
    const { overlays, window } = await renderMap([
      hospital('가온', 3, 1), hospital('나래', 0, 0),
      hospital('한빛', null, null), hospital('대기', -2, null),
    ]);
    expect(overlays.map(overlay => overlay.content.textContent)).toEqual([
      '가온병상 3 · 수술실 1', '나래병상 0 · 수술실 0',
      '한빛병상 정보 없음', '대기병상 2명 대기 중 · 수술실 정보 없음',
    ]);
    window.eragsFilterMedicalLocations('aed', '');
    overlays.forEach(overlay => expect(overlay.setMap).toHaveBeenLastCalledWith(null));
    window.eragsFilterMedicalLocations('hospital', '가온');
    expect(overlays[0].setMap.mock.lastCall?.[0]).not.toBeNull();
    expect(overlays[1].setMap).toHaveBeenLastCalledWith(null);
  });

  it('장소를 다시 주입하면 이전 마커를 지우고 같은 주소는 다시 지오코딩하지 않는다', async () => {
    const { overlays, window, addressSearch, map, emitMapEvent } =
      await renderMap([hospital('가온', 3, 1), hospital('나래', 0, 0)]);
    expect(addressSearch).toHaveBeenCalledTimes(1);
    expect(map.setBounds).toHaveBeenCalledTimes(1);

    emitMapEvent('dragstart');
    window.eragsSetMedicalLocations([hospital('가온', 5, 2)]);
    await Promise.resolve();

    expect(addressSearch).toHaveBeenCalledTimes(1);
    expect(overlays.slice(0, 2).map(overlay => overlay.setMap.mock.lastCall?.[0]))
      .toEqual([null, null]);
    expect(overlays[2].content.textContent).toBe('가온병상 5 · 수술실 2');
    expect(overlays[2].setMap.mock.lastCall?.[0]).not.toBeNull();
    // 사용자가 지도를 옮긴 뒤에는 데이터 갱신으로 시점을 바꾸지 않습니다.
    expect(map.setBounds).toHaveBeenCalledTimes(1);
  });

  it('병상 라벨을 누르면 해당 병원을 선택하는 메시지를 보낸다', async () => {
    const { overlays, postMessage } = await renderMap([hospital('가온', 3, 1)]);
    const button = overlays[0].content.children[0];
    const stopPropagation = jest.fn();
    button.listeners.click({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(JSON.parse(postMessage.mock.lastCall?.[0])).toEqual({
      locationId: '가온', type: 'medical-location-pressed',
    });
    expect(button.attributes['aria-label']).toBe('가온: 병상 3 · 수술실 1');
  });

  it('AED와 묶인 병원도 표시하고 필터 변경 시 개별 라벨을 복원한다', async () => {
    const { overlays, window } = await renderMap([
      { id: 'aed', name: 'AED', address: '서울', distanceInMeters: 10,
        type: 'aed', typeLabel: 'AED', latitude: 37.5, longitude: 127 },
      hospital('가온', 3, 1),
    ]);
    expect(overlays).toHaveLength(2);
    expect(overlays[0].setMap).toHaveBeenLastCalledWith(null);
    expect(overlays[1].content.className).toBe('hospital-bed-labels is-cluster');
    expect(overlays[1].content.textContent).toBe('가온병상 3 · 수술실 1');
    window.eragsFilterMedicalLocations('hospital', '');
    expect(overlays[1].setMap).toHaveBeenLastCalledWith(null);
    expect(overlays[0].content.textContent).toBe('가온병상 3 · 수술실 1');
    expect(overlays[0].setMap.mock.lastCall?.[0]).not.toBeNull();
  });
});
