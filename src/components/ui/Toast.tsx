import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, font, radius } from '@/theme';

const ToastContext = createContext<{ showError: (message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-20));

  const showError = useCallback((nextMessage: string) => {
    setToast({ message: nextMessage });
  }, []);
  const contextValue = useMemo(() => ({ showError }), [showError]);

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    translateY.setValue(-20);
    const animation = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, speed: 20, bounciness: 3, useNativeDriver: true }),
    ]);
    animation.start();
    const timeout = setTimeout(() => setToast(null), 4500);
    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, [toast, opacity, translateY]);

  return (
    <ToastContext.Provider value={contextValue}>
      <View style={{ flex: 1 }}>
        {children}
        {toast ? (
          <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: Math.max(insets.top, 12) + 8, alignItems: 'center', paddingHorizontal: 16 }}>
            <Animated.View
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={{
                width: '100%',
                maxWidth: 560,
                minHeight: 56,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingLeft: 16,
                paddingRight: 8,
                paddingVertical: 10,
                borderRadius: radius.card,
                backgroundColor: colors.ink,
                opacity,
                transform: [{ translateY }],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Feather name="alert-circle" size={20} color={colors.expense} />
              <AppText color={colors.white} style={{ flex: 1, fontFamily: font.medium, fontSize: 14, lineHeight: 20 }}>
                {toast.message}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss error"
                hitSlop={8}
                onPress={() => setToast(null)}
                style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Feather name="x" size={18} color={colors.onInkMuted} />
              </Pressable>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider.');
  return context;
}
