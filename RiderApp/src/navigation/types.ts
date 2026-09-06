export type UtilityKind =
  | "wallet"
  | "help"
  | "leaderboard"
  | "referral"
  | "reviews"
  | "safety"
  | "language"
  | "edit"
  | "vehicle"
  | "settings";

export type RootStackParamList = {
  Intro: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
  Pending: undefined;
  Main: undefined;
  ActiveTask: undefined;
  OrderMap: { taskId: string };
  Notifications: undefined;
  Utility: { kind: UtilityKind };
};
