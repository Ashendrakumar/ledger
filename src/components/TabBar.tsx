import { Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { router, type Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '@/theme';
import { AppText } from './ui/AppText';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  index: { label: 'Home', icon: 'home' },
  activity: { label: 'Activity', icon: 'list' },
  plan: { label: 'Plan', icon: 'calendar' },
  insights: { label: 'Insights', icon: 'pie-chart' },
};

/** Floating dark pill with a raised mint + button in the centre. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2), right = routes.slice(2);

  const renderTab = (r: (typeof routes)[number]) => {
    const focused = state.routes[state.index]?.name === r.name;
    const t = TABS[r.name];
    const color = focused ? colors.mint : colors.onInkMuted;
    return (
      <Pressable
        key={r.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={t.label}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(r.name);
        }}
        style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', gap: 3 }}
      >
        <Feather name={t.icon} size={22} color={color} />
        <AppText style={{ fontFamily: focused ? font.bold : font.semibold, fontSize: 11 }} color={color}>{t.label}</AppText>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12), height: 68,
        borderRadius: 34, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-around', paddingHorizontal: 8,
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10,
      }}
    >
      {left.map(renderTab)}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        onPress={() => router.push('/add')}
        style={{ width: 60, height: 60, marginTop: -30, borderRadius: 30, borderWidth: 4, borderColor: colors.canvas, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}
      >
        <Feather name="plus" size={26} color={colors.ink} />
      </Pressable>
      {right.map(renderTab)}
    </View>
  );
}
