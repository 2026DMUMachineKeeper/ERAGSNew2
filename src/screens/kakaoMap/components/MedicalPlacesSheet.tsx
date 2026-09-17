import React from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import aedMapMarker from '@/assets/icons/markers/aed-map-marker.png';
import hospitalMapMarker from '@/assets/icons/markers/hospital-map-marker.png';

export type MedicalLocationListItem = {
  id: string;
  type: 'hospital' | 'aed';
  typeLabel: string;
  name: string;
  address: string;
  distanceInMeters: number;
  detailPlaces?: readonly string[];
  phone?: string;
};

export type MedicalPlacesSheetRef = {
  dismiss: () => void;
  expand: () => void;
};

type MedicalPlacesSheetStage = 'collapsed' | 'middle' | 'expanded';

type MedicalPlacesSheetProps = {
  floatingControl?: React.ReactNode;
  locations: readonly MedicalLocationListItem[];
  mapHeight: number;
  onLocationPress: (location: MedicalLocationListItem) => void;
  searchQuery: string;
  selectedLocation?: MedicalLocationListItem | null;
};

const SHEET_MIDDLE_TRANSLATE_RATIO = 0.5;
const DISMISSED_SHEET_VISIBLE_HEIGHT = 24;
const SHEET_CONTENT_HEADER_HEIGHT = 92;

const getDismissedTranslateY = (mapHeight: number): number =>
  Math.max(0, mapHeight - DISMISSED_SHEET_VISIBLE_HEIGHT);

const getSheetTranslateY = (
  stage: MedicalPlacesSheetStage,
  mapHeight: number,
): number => {
  if (stage === 'expanded') {
    return 0;
  }

  if (stage === 'middle') {
    return mapHeight * SHEET_MIDDLE_TRANSLATE_RATIO;
  }

  return getDismissedTranslateY(mapHeight);
};

const getNearestSheetStage = (
  translateY: number,
  mapHeight: number,
): MedicalPlacesSheetStage => {
  const snapPoints: ReadonlyArray<{
    stage: MedicalPlacesSheetStage;
    translateY: number;
  }> = [
    { stage: 'expanded', translateY: 0 },
    {
      stage: 'middle',
      translateY: mapHeight * SHEET_MIDDLE_TRANSLATE_RATIO,
    },
    { stage: 'collapsed', translateY: getDismissedTranslateY(mapHeight) },
  ];

  return snapPoints.reduce((closest, snapPoint) =>
    Math.abs(snapPoint.translateY - translateY) <
    Math.abs(closest.translateY - translateY)
      ? snapPoint
      : closest,
  ).stage;
};

const formatDistance = (distanceInMeters: number): string => {
  if (distanceInMeters < 1000) {
    return `${Math.max(10, Math.round(distanceInMeters / 10) * 10)}m`;
  }

  return `${(distanceInMeters / 1000).toFixed(1)}km`;
};

export const MedicalPlacesSheet = React.forwardRef<
  MedicalPlacesSheetRef,
  MedicalPlacesSheetProps
>(
  (
    {
      floatingControl,
      locations,
      mapHeight,
      onLocationPress,
      searchQuery,
      selectedLocation,
    },
    ref,
  ): React.JSX.Element => {
    const [sheetStage, setSheetStage] =
      React.useState<MedicalPlacesSheetStage>('middle');
    const placesSheetTranslateY = React.useRef(new Animated.Value(0)).current;
    const placesSheetTranslateYValue = React.useRef(0);
    const hasInitializedPlacesSheet = React.useRef(false);
    const placesSheetDragStart = React.useRef(0);
    const sheetStageRef = React.useRef<MedicalPlacesSheetStage>('middle');
    const dragRevision = React.useRef(0);
    const hasMoved = React.useRef(false);

    React.useEffect(() => {
      const listenerId = placesSheetTranslateY.addListener(({ value }) => {
        placesSheetTranslateYValue.current = value;
      });

      return () => placesSheetTranslateY.removeListener(listenerId);
    }, [placesSheetTranslateY]);

    const handleSnap = React.useCallback(
      (stage: MedicalPlacesSheetStage): void => {
        dragRevision.current += 1;
        sheetStageRef.current = stage;
        setSheetStage(stage);

        if (!mapHeight) {
          return;
        }

        // 같은 단계로 돌아와도 드래그로 이동한 위치를 반드시 복구한다.
        Animated.spring(placesSheetTranslateY, {
          damping: 26,
          mass: 0.9,
          overshootClamping: true,
          stiffness: 160,
          toValue: getSheetTranslateY(stage, mapHeight),
          useNativeDriver: false,
        }).start();
      },
      [mapHeight, placesSheetTranslateY],
    );
    const handleDismiss = React.useCallback((): void => {
      handleSnap('collapsed');
    }, [handleSnap]);
    const handleExpand = React.useCallback((): void => {
      handleSnap('expanded');
    }, [handleSnap]);

    React.useImperativeHandle(
      ref,
      () => ({ dismiss: handleDismiss, expand: handleExpand }),
      [handleDismiss, handleExpand],
    );

    const placesSheetAnimatedStyle = React.useMemo(
      () => ({
        transform: [{ translateY: placesSheetTranslateY }],
      }),
      [placesSheetTranslateY],
    );
    const placesSheetScrollStyle = React.useMemo(
      () => ({
        flexGrow: 0,
        height: Math.max(
          0,
          mapHeight -
            getSheetTranslateY(sheetStage, mapHeight) -
            SHEET_CONTENT_HEADER_HEIGHT,
        ),
      }),
      [mapHeight, sheetStage],
    );
    const placesSheetPanResponder = React.useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => false,
          onMoveShouldSetPanResponder: (_, gestureState) =>
            Math.abs(gestureState.dy) > 6 &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: () => {
            const revision = ++dragRevision.current;
            hasMoved.current = false;
            placesSheetDragStart.current = placesSheetTranslateYValue.current;
            placesSheetTranslateY.stopAnimation(value => {
              // 네이티브 응답이 늦게 도착해 진행 중인 드래그 기준점을 바꾸지 않게 한다.
              if (revision !== dragRevision.current || hasMoved.current) {
                return;
              }
              placesSheetTranslateYValue.current = value;
              placesSheetDragStart.current = value;
            });
          },
          onPanResponderMove: (_, gestureState) => {
            if (!mapHeight) {
              return;
            }

            const dismissedTranslateY = getDismissedTranslateY(mapHeight);
            const nextTranslateY = Math.min(
              dismissedTranslateY,
              Math.max(0, placesSheetDragStart.current + gestureState.dy),
            );

            hasMoved.current = true;
            placesSheetTranslateYValue.current = nextTranslateY;
            placesSheetTranslateY.setValue(nextTranslateY);
          },
          onPanResponderRelease: (_, gestureState) => {
            if (!mapHeight) {
              return;
            }

            const dismissedTranslateY = getDismissedTranslateY(mapHeight);

            const projectedTranslateY = Math.min(
              dismissedTranslateY,
              Math.max(
                0,
                placesSheetDragStart.current +
                  gestureState.dy +
                  gestureState.vy * mapHeight * 0.18,
              ),
            );

            handleSnap(getNearestSheetStage(projectedTranslateY, mapHeight));
          },
          onPanResponderTerminate: () => handleSnap(sheetStageRef.current),
        }),
      [handleSnap, mapHeight, placesSheetTranslateY],
    );

    React.useEffect(() => {
      if (!mapHeight) {
        return;
      }

      const targetTranslateY = getSheetTranslateY(
        sheetStageRef.current,
        mapHeight,
      );

      if (!hasInitializedPlacesSheet.current) {
        placesSheetTranslateY.setValue(targetTranslateY);
        hasInitializedPlacesSheet.current = true;
        return;
      }

      handleSnap(sheetStageRef.current);
    }, [handleSnap, mapHeight, placesSheetTranslateY]);

    React.useEffect(
      () => () => {
        dragRevision.current += 1;
        placesSheetTranslateY.stopAnimation();
      },
      [placesSheetTranslateY],
    );

    return (
      <>
        <Animated.View
          className="absolute bottom-0 left-0 right-0 z-20 h-full overflow-hidden rounded-t-3xl  bg-background px-4 pb-4 shadow-2xl"
          style={placesSheetAnimatedStyle}
        >
          <View
            {...placesSheetPanResponder.panHandlers}
            accessible
            accessibilityLabel={
              sheetStage === 'collapsed'
                ? '주변 응급시설 목록 펼치기'
                : sheetStage === 'expanded'
                ? '주변 응급시설 목록 접기'
                : '주변 응급시설 목록 펼치기'
            }
            accessibilityRole="button"
            className="items-center pb-3 pt-2"
          >
            <View className="h-1 w-10 rounded-full bg-gray" />
          </View>

          {sheetStage !== 'collapsed' ? (
            <>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-body font-suitBold text-black">
                    {searchQuery
                      ? `검색 결과 ${locations.length}곳`
                      : `가까운 장소 ${locations.length}곳`}
                  </Text>
                  <Text className="mt-1 text-coment text-textDim">
                    현재 위치 기준 가까운 순서예요.
                  </Text>
                </View>
              </View>

              <ScrollView
                className="mt-3"
                nestedScrollEnabled
                scrollEnabled
                showsVerticalScrollIndicator={false}
                style={placesSheetScrollStyle}
              >
                {locations.length > 0 ? (
                  locations.map(location => (
                    <View
                      key={location.id}
                      className={`mb-2 overflow-hidden rounded-xl border bg-white shadow ${
                        selectedLocation?.id === location.id
                          ? 'border-red'
                          : 'border-transparent'
                      }`}
                    >
                      <Pressable
                        accessibilityLabel={`${location.name} 위치 보기`}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: selectedLocation?.id === location.id,
                        }}
                        className="min-h-[64px] flex-row items-center px-3 py-2"
                        onPress={() => onLocationPress(location)}
                      >
                        <Image
                          accessibilityLabel={`${location.typeLabel} 마커`}
                          className="h-9 w-9"
                          resizeMode="contain"
                          source={
                            location.type === 'aed'
                              ? aedMapMarker
                              : hospitalMapMarker
                          }
                        />
                        <View className="ml-2 flex-1">
                          <Text
                            className="text-body font-suitBold text-black"
                            numberOfLines={1}
                          >
                            {location.name}
                          </Text>
                          <Text
                            className="mt-1 text-coment text-textDim"
                            numberOfLines={2}
                          >
                            {location.address}
                          </Text>
                        </View>
                        <View className="ml-2 rounded-full bg-background px-2 py-1">
                          <Text className="text-[11px] font-suitBold text-gray">
                            {location.typeLabel} ·{' '}
                            {formatDistance(location.distanceInMeters)}
                          </Text>
                        </View>
                      </Pressable>
                      {selectedLocation?.id === location.id ? (
                        <View className="border-t border-memoLine px-3 pb-4 pt-3">
                          {location.detailPlaces?.length ? (
                            <>
                              <Text className="text-coment font-suitBold text-black">
                                설치 위치
                              </Text>
                              <Text className="mt-2 text-coment leading-5 text-textDim">
                                {location.detailPlaces.join(' · ')}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <View className="items-center justify-center py-8">
                    <Text className="text-body font-suitBold text-black">
                      검색 결과가 없습니다.
                    </Text>
                    <Text className="mt-1 text-coment text-textDim">
                      다른 장소명이나 주소로 검색해 보세요.
                    </Text>
                  </View>
                )}
                <View className="h-24" />
              </ScrollView>
            </>
          ) : null}
        </Animated.View>
        {floatingControl ? (
          <Animated.View
            className="absolute right-4 z-30"
            pointerEvents="box-none"
            style={[{ bottom: mapHeight + 12 }, placesSheetAnimatedStyle]}
          >
            {floatingControl}
          </Animated.View>
        ) : null}
      </>
    );
  },
);

MedicalPlacesSheet.displayName = 'MedicalPlacesSheet';

export default MedicalPlacesSheet;
