import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '@/theme';
import { AppText } from './ui/AppText';

type TabRoute = { key: string; name: string; params?: object };
type TabNav = {
  emit?: (event: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => { defaultPrevented?: boolean } | undefined;
  navigate?: (name: string, params?: object) => void;
};
type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors?: Record<string, { navigation?: TabNav }>;
  navigation?: TabNav;
};

const TABS: Record<string, { label: string; filled: React.ComponentProps<typeof Ionicons>['name']; outline: React.ComponentProps<typeof Ionicons>['name'] }> = {
  index: { label: 'Home', filled: 'home', outline: 'home-outline' },
  activity: { label: 'Activity', filled: 'list', outline: 'list-outline' },
  plan: { label: 'Plan', filled: 'calendar', outline: 'calendar-outline' },
  insights: { label: 'Insights', filled: 'pie-chart', outline: 'pie-chart-outline' },
};

/** Floating dark pill with a raised mint + button in the centre. Active tab = filled icon, no background. */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2), right = routes.slice(2);

  const renderTab = (r: (typeof routes)[number]) => {
    const focused = state.routes[state.index]?.name === r.name;
    const t = TABS[r.name];
    const color = focused ? colors.mint : colors.onInkMuted;
    const routeNav = descriptors?.[r.key]?.navigation ?? navigation;
    return (
      <Pressable
        key={r.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={t.label}
        onPress={() => {
          const event = routeNav?.emit?.({ type: 'tabPress', target: r.key, canPreventDefault: true });
          if (focused || event?.defaultPrevented) return;
          if (routeNav?.navigate) {
            routeNav.navigate(r.name, r.params);
          } else {
            const href = r.name === 'index' ? '/(tabs)' : `/(tabs)/${r.name}`;
            router.navigate(href as never);
          }
        }}
        style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', gap: 3 }}
      >
        <Ionicons name={focused ? t.filled : t.outline} size={22} color={color} />
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
        <Ionicons name="add" size={28} color={colors.ink} />
      </Pressable>
      {right.map(renderTab)}
    </View>
  );
}
