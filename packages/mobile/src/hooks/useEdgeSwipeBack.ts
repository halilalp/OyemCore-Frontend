import { useRef } from 'react';
import { Animated, Dimensions, PanResponder } from 'react-native';

// Ekranın sol kenarından başlayan bir sürüklemeyi yakalayıp geri/kapat davranışı
// tetikler — React Navigation'ın native-stack ekranlarındaki standart geri kaydırma
// jestiyle AYNI yönde (sol kenardan sağa doğru). Kendi içinde <Modal> ile açılan
// (ayrı bir stack sayfası OLMAYAN) liste+detay ekranlarında kullanılır; o ekranlarda
// native-stack'in kendi jesti hiç devreye girmediği için bu jest onun yerini alır.
//
// react-native-gesture-handler gibi ek native bağımlılık GEREKTİRMEZ — sadece
// React Native çekirdeğindeki PanResponder kullanılır, native build şart değil.
export function useEdgeSwipeBack(onClose: () => void, enabled: boolean = true) {
  const translateX = useRef(new Animated.Value(0)).current;

  // PanResponder.create tek seferlik (useRef) olduğu için handler'lar içinde onClose/enabled'ı
  // DOĞRUDAN kullanmak eski (stale) closure'a kilitlenir — bunun yerine her render'da
  // güncellenen ref'lerden okunuyor.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const EDGE_WIDTH = 32;
  const CLOSE_DISTANCE_RATIO = 0.28;
  const CLOSE_VELOCITY = 0.5;

  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => enabledRef.current && evt.nativeEvent.pageX <= EDGE_WIDTH,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        if (!enabledRef.current) return false;
        const startX = evt.nativeEvent.pageX - gestureState.dx;
        return (
          startX <= EDGE_WIDTH &&
          gestureState.dx > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2
        );
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dx > 0) translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const screenWidth = Dimensions.get('window').width;
        const shouldClose =
          gestureState.dx > screenWidth * CLOSE_DISTANCE_RATIO || gestureState.vx > CLOSE_VELOCITY;
        if (shouldClose) {
          Animated.timing(translateX, {
            toValue: screenWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateX.setValue(0);
            onCloseRef.current();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    })
  );

  return { panHandlers: panResponderRef.current.panHandlers, translateX };
}
