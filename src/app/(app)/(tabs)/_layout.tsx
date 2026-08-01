import type { ReactNode } from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import {
  AccountIcon,
  CalendarIcon,
  CookbookIcon,
  GroceryIcon,
  HomeIcon,
} from '@/components/icons';
import { Colors, FontFamily, HitTarget, IconSize, Radius } from '@/constants/theme';

function TabBarIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: (color: string) => ReactNode;
}) {
  const color = focused ? Colors.accent : Colors.gray950;
  return (
    <View
      style={{
        width: HitTarget.min,
        height: HitTarget.min,
        borderRadius: Radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? Colors.accentSoftFill : 'transparent',
      }}>
      {children(color)}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.gray600,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontFamily: FontFamily.bodyMedium, fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused}>
              {(color) => <HomeIcon size={IconSize.md} color={color} />}
            </TabBarIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="cookbooks"
        options={{
          title: 'Cookbooks',
          tabBarAccessibilityLabel: 'Cookbooks',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused}>
              {(color) => <CookbookIcon size={IconSize.md} color={color} />}
            </TabBarIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarAccessibilityLabel: 'Meal Calendar',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused}>
              {(color) => <CalendarIcon size={IconSize.md} color={color} />}
            </TabBarIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'Grocery',
          tabBarAccessibilityLabel: 'Grocery List',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused}>
              {(color) => <GroceryIcon size={IconSize.md} color={color} />}
            </TabBarIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarAccessibilityLabel: 'Account',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused}>
              {(color) => <AccountIcon size={IconSize.md} color={color} />}
            </TabBarIcon>
          ),
        }}
      />
    </Tabs>
  );
}
