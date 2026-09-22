import React from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import { MedicalPlaceCard, type MedicalLocationListItem } from './MedicalPlaceCard';

export type MedicalPlacesSheetRef = {
  dismiss: () => void;
  expand: () => void;
};

type MedicalPlacesSheetStage = 'collapsed' | 'middle' | 'expanded';
type LocationLoadState =
  | 'loading'
  | 'ready'
  | 'permission-denied'
  | 'error';

type MedicalPlaceRequestStatus = {
  errorMessage?: string | null;
  isLoading: boolean;
  onRetry?: () => void;
};

type MedicalPlacesSheetProps = {
  aedStatus?: MedicalPlaceRequestStatus;
  floatingControl?: React.ReactNode;
  hasLoaded?: boolean;
  hasSearchConditions?: boolean;
  hospitalStatus?: MedicalPlaceRequestStatus;
  isAuthRedirecting?: boolean;
  locationLoadState?: LocationLoadState;
  locations: readonly MedicalLocationListItem[];
  mapHeight: number;
  onDirectionsPress: (location: MedicalLocationListItem) => void;
  onLocationPress: (location: MedicalLocationListItem) => void;
  searchQuery: string;
  selectedLocation?: MedicalLocationListItem | null;
};

const SHEET_MIDDLE_TRANSLATE_RATIO = 0.5;
const DISMISSED_SHEET_VISIBLE_HEIGHT = 40;
const SHEET_CONTENT_HEADER_HEIGHT = 108;
const IDLE_REQUEST_STATUS: MedicalPlaceRequestStatus = { isLoading: false };
const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});

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

const getReleasedSheetStage = (
  translateY: number,
  velocity: number,
  mapHeight: number,
  currentStage: MedicalPlacesSheetStage,
): MedicalPlacesSheetStage => {
  const projectedStage = getNearestSheetStage(translateY + velocity * 240, mapHeight);
  const distance = translateY - getSheetTranslateY(currentStage, mapHeight);
  if (projectedStage !== currentStage) {
    return projectedStage;
  }
  // 짧게 끌거나 가볍게 튕겨도 인접 단계로 이동해 원위치로 끌려가는 느낌을 줄인다.
  const isFlick = Math.abs(velocity) >= 0.35 && Math.abs(distance) >= 8;
  if (Math.abs(distance) < 72 && !isFlick) {
    return currentStage;
  }
  const direction = isFlick ? velocity : distance;
  if (direction < 0) {
    return currentStage === 'collapsed' ? 'middle' : 'expanded';
  }
  return currentStage === 'expanded' ? 'middle' : 'collapsed';
};

export const MedicalPlacesSheet = React.forwardRef<
  MedicalPlacesSheetRef,
  MedicalPlacesSheetProps
>(
  (
    {
      aedStatus = IDLE_REQUEST_STATUS,
      floatingControl,
      hasLoaded = true,
      hasSearchConditions = false,
      hospitalStatus = IDLE_REQUEST_STATUS,
      isAuthRedirecting = false,
      locationLoadState = 'ready',
      locations,
      mapHeight,
      onDirectionsPress,
      onLocationPress,
      selectedLocation,
    },
    ref,
  ): React.JSX.Element => {
    const [sheetStage, setSheetStage] =
      React.useState<MedicalPlacesSheetStage>('middle');
    const hasRequestError =
      !!aedStatus.errorMessage || !!hospitalStatus.errorMessage;
    const isLoadingPlaces =
      aedStatus.isLoading || hospitalStatus.isLoading;
    const title = isAuthRedirecting
      ? '로그인 화면으로 이동 중'
      : locationLoadState !== 'ready'
      ? locationLoadState === 'loading'
        ? '주변 장소 조회 중'
        : '주변 장소 안내'
      : isLoadingPlaces && locations.length === 0
      ? '주변 장소 조회 중'
      : hasRequestError && locations.length === 0
      ? '주변 장소 조회 실패'
      : hasSearchConditions
      ? `검색 결과 ${locations.length}곳`
      : `가까운 장소 ${locations.length}곳`;
    const placesSheetTranslateY = React.useRef(new Animated.Value(0)).current;
    const placesSheetTranslateYValue = React.useRef(0);
    const hasInitializedPlacesSheet = React.useRef(false);
    const placesSheetDragStart = React.useRef(0);
    const sheetStageRef = React.useRef<MedicalPlacesSheetStage>('middle');
    const dragRevision = React.useRef(0);
    const hasMoved = React.useRef(false);
    const scrollMetrics = React.useRef({ offset: 0, height: 0, contentHeight: 0 });
    const listDrag = React.useRef({ isActive: false, previousY: 0, startY: 0, sheetY: 0 });
    const [isDraggingFromList, setIsDraggingFromList] = React.useState(false);

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
          damping: 22,
          mass: 0.8,
          overshootClamping: true,
          stiffness: 200,
          toValue: getSheetTranslateY(stage, mapHeight),
          useNativeDriver: true,
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
    const handleShowMore = (): void => {
      handleSnap(sheetStage === 'expanded' ? 'middle' : 'expanded');
    };

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

            handleSnap(getReleasedSheetStage(
              placesSheetTranslateYValue.current,
              gestureState.vy,
              mapHeight,
              sheetStageRef.current,
            ));
          },
          onPanResponderTerminate: () => handleSnap(sheetStageRef.current),
        }),
      [handleSnap, mapHeight, placesSheetTranslateY],
    );

    const listGesture = React.useMemo(() => {
      const pan = Gesture.Pan()
        .activeOffsetY([-6, 6])
        .failOffsetX([-12, 12])
        .runOnJS(true)
        .onStart(event => {
          listDrag.current.isActive = false;
          listDrag.current.previousY = event.translationY;
        })
        .onUpdate(event => {
          const drag = listDrag.current;
          const deltaY = event.translationY - drag.previousY;
          drag.previousY = event.translationY;
          if (!mapHeight) {
            return;
          }
          if (!drag.isActive) {
            const { offset, height, contentHeight } = scrollMetrics.current;
            const canLowerSheet = deltaY > 0 && offset <= 1 &&
              sheetStageRef.current !== 'collapsed';
            const canRaiseSheet = deltaY < 0 && height > 0 &&
              offset + height >= contentHeight - 1 &&
              sheetStageRef.current !== 'expanded';
            if (!canLowerSheet && !canRaiseSheet) {
              return;
            }
            const revision = ++dragRevision.current;
            hasMoved.current = false;
            drag.isActive = true;
            // 목록을 스크롤한 거리를 제외해 시트로 전환될 때 위치가 튀지 않게 한다.
            drag.startY = event.translationY;
            drag.sheetY = placesSheetTranslateYValue.current;
            placesSheetTranslateY.stopAnimation(value => {
              if (revision !== dragRevision.current || hasMoved.current) {
                return;
              }
              placesSheetTranslateYValue.current = value;
              drag.sheetY = value;
            });
            setIsDraggingFromList(true);
            return;
          }
          const nextY = Math.min(getDismissedTranslateY(mapHeight), Math.max(
            0, drag.sheetY + event.translationY - drag.startY,
          ));
          placesSheetTranslateYValue.current = nextY;
          hasMoved.current = true;
          placesSheetTranslateY.setValue(nextY);
        })
        .onFinalize((event, isSuccessful) => {
          if (!listDrag.current.isActive) {
            return;
          }
          listDrag.current.isActive = false;
          setIsDraggingFromList(false);
          handleSnap(isSuccessful ? getReleasedSheetStage(
            placesSheetTranslateYValue.current,
            event.velocityY / 1000,
            mapHeight,
            sheetStageRef.current,
          ) : sheetStageRef.current);
        });
      return Gesture.Simultaneous(Gesture.Native(), pan);
    }, [handleSnap, mapHeight, placesSheetTranslateY]);

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
          className="absolute bottom-0 left-0 right-0 z-20 h-full overflow-hidden rounded-t-3xl bg-background px-4 pb-4 shadow-2xl"
          style={placesSheetAnimatedStyle}
        >
          <GestureHandlerRootView style={styles.gestureRoot}>
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
              className="items-center pb-5 pt-4"
            >
              <View className="h-1 w-12 rounded-full bg-gray" />
            </View>

            {sheetStage !== 'collapsed' ? (
              <>
                <View className="flex-row items-start justify-between px-1">
                  <View className="mr-2 flex-1">
                    <Text className="text-[18px] font-suitBold text-memoText">
                      {title}
                    </Text>
                    <Text className="mt-1 text-[13px] font-suitRegular text-gray">
                      {locationLoadState === 'ready'
                        ? '현재 위치 기준 가까운 순서예요.'
                        : '위치 상태를 확인해 주세요.'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={sheetStage === 'expanded' ? '장소 목록 접기' : '장소 목록 더보기'}
                    accessibilityRole="button"
                    className="min-h-[44px] flex-row items-center px-2"
                    onPress={handleShowMore}
                  >
                    <Text className="text-[13px] font-suitBold text-gray">
                      {sheetStage === 'expanded' ? '지도 보기' : '목록 확대'}
                    </Text>
                  </Pressable>
                </View>

                <GestureDetector gesture={listGesture}>
                  <ScrollView
                    className="mt-3"
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    scrollEnabled={!isDraggingFromList}
                    bounces={false}
                    overScrollMode="never"
                    scrollEventThrottle={16}
                    onLayout={event => {
                      scrollMetrics.current.height = event.nativeEvent.layout.height;
                    }}
                    onContentSizeChange={(_width, height) => {
                      scrollMetrics.current.contentHeight = height;
                    }}
                    onScroll={event => {
                      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                      scrollMetrics.current = {
                        offset: contentOffset.y,
                        height: layoutMeasurement.height,
                        contentHeight: contentSize.height,
                      };
                    }}
                    showsVerticalScrollIndicator={false}
                    style={placesSheetScrollStyle}
                  >
                    {isAuthRedirecting ? (
                      <View className="mb-3 flex-row items-center">
                        <Text className="text-coment text-gray">
                          로그인 화면으로 이동하고 있습니다.
                        </Text>
                      </View>
                    ) : locationLoadState !== 'ready' ? (
                      <View className="mb-3 flex-row items-center">
                        <Text className="text-coment text-gray">
                          {locationLoadState === 'loading'
                            ? '현재 위치를 확인하는 중입니다.'
                            : locationLoadState === 'permission-denied'
                            ? '주변 장소를 보려면 위치 권한이 필요합니다.'
                            : '현재 위치를 확인하지 못했습니다. 위치 버튼을 눌러 다시 시도해 주세요.'}
                        </Text>
                      </View>
                    ) : isLoadingPlaces ? (
                      <View className="mb-3 flex-row items-center">
                        <Text className="text-coment text-gray">
                          주변 병원·AED를 불러오는 중입니다.
                        </Text>
                      </View>
                    ) : null}
                    {!isAuthRedirecting && aedStatus.errorMessage ? (
                      <View className="mb-3 rounded-xl bg-white p-3">
                        <Text className="text-coment text-gray">AED: {aedStatus.errorMessage}</Text>
                        <Pressable accessibilityLabel="AED 다시 시도" accessibilityRole="button"
                          disabled={aedStatus.isLoading} onPress={aedStatus.onRetry}>
                          <Text className="mt-2 font-suitBold text-gray">다시 시도</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    {!isAuthRedirecting && hospitalStatus.errorMessage ? (
                      <View className="mb-3 rounded-xl bg-white p-3">
                        <Text className="text-coment text-gray">병원: {hospitalStatus.errorMessage}</Text>
                        <Pressable accessibilityLabel="병원 다시 시도" accessibilityRole="button"
                          disabled={hospitalStatus.isLoading} onPress={hospitalStatus.onRetry}>
                          <Text className="mt-2 font-suitBold text-gray">다시 시도</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    {!isAuthRedirecting && locations.length > 0 ? (
                      locations.map(location => (
                        <MedicalPlaceCard
                          key={location.id}
                          isSelected={selectedLocation?.id === location.id}
                          location={location}
                          onDirectionsPress={() => onDirectionsPress(location)}
                          onPress={() => onLocationPress(location)}
                        />
                      ))
                    ) : !isAuthRedirecting && locationLoadState === 'ready' &&
                      hasLoaded && !isLoadingPlaces && !hasRequestError ? (
                      <View className="items-center justify-center py-8">
                        <Text className="text-body font-suitBold text-memoText">
                          {hasSearchConditions ? '검색 조건에 맞는 결과가 없습니다.' : '주변 병원·AED가 없습니다.'}
                        </Text>
                        <Text className="mt-1 text-coment text-gray">
                          {hasSearchConditions ? '다른 검색어나 필터를 선택해 보세요.' : '다른 위치에서 다시 확인해 보세요.'}
                        </Text>
                      </View>
                    ) : null}
                    <View className="h-24" />
                  </ScrollView>
                </GestureDetector>
              </>
            ) : null}
          </GestureHandlerRootView>
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
