import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useRider } from "@/context/RiderContext";
import { readIntroSeen } from "@/lib/intro";
import { colors } from "@/theme/colors";
import { RiderTabBar } from "@/components/ui/RiderTabBar";
import { WelcomeScreen } from "@/screens/auth/WelcomeScreen";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { IntroScreen } from "@/screens/onboarding/IntroScreen";
import { OnboardingScreen } from "@/screens/onboarding/OnboardingScreen";
import { PendingScreen } from "@/screens/onboarding/PendingScreen";
import { HomeScreen } from "@/screens/tabs/HomeScreen";
import { TasksScreen } from "@/screens/tabs/TasksScreen";
import { EarningsScreen } from "@/screens/tabs/EarningsScreen";
import { ProfileScreen } from "@/screens/tabs/ProfileScreen";
import { ActiveTaskScreen } from "@/screens/task/ActiveTaskScreen";
import { OrderMapScreen } from "@/screens/task/OrderMapScreen";
import { NotificationScreen } from "@/screens/notifications/NotificationScreen";
import { UtilityScreen } from "@/screens/UtilityScreen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();
function MainTabs(): React.ReactElement {
  return (
    <Tabs.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <RiderTabBar {...props} />}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Tasks" component={TasksScreen} />
      <Tabs.Screen name="Earnings" component={EarningsScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}
export function AppNavigator(): React.ReactElement {
  const { rider, ready } = useRider();
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  useEffect(() => {
    void readIntroSeen()
      .then((seen) => setIntroSeen(seen))
      .catch(() => setIntroSeen(true));
  }, []);
  if (!ready || introSeen === null)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand[600]} size="large" />
      </View>
    );
  const authed = Boolean(rider);
  const approved = rider?.status === "approved";
  const waiting =
    authed &&
    ["submitted", "under_review", "suspended"].includes(rider?.status ?? "");
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}
      >
        {!authed ? (
          <>
            {!introSeen ? (
              <Stack.Screen name="Intro" component={IntroScreen} />
            ) : null}
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : approved ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ActiveTask"
              component={ActiveTaskScreen}
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="OrderMap"
              component={OrderMapScreen}
              options={{ animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationScreen}
              options={{ animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="Utility"
              component={UtilityScreen}
              options={{ animation: "slide_from_right" }}
            />
          </>
        ) : waiting ? (
          <Stack.Screen name="Pending" component={PendingScreen} />
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Pending" component={PendingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
const styles = {
  loading: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.background,
  },
};
