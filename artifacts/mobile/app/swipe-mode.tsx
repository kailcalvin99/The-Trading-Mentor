import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function SwipeModeScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(tabs)/academy");
  }, []);
  return null;
}
