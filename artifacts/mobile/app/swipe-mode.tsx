import { useEffect } from "react";
import { type Href, useRouter } from "expo-router";

export default function SwipeModeScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(tabs)/academy" as Href);
  }, []);
  return null;
}
