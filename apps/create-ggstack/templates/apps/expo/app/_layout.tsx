import { expoEnv } from "@packages/env/client";
import { Stack } from "expo-router";

void expoEnv;

export default function RootLayout() {
  return <Stack />;
}
