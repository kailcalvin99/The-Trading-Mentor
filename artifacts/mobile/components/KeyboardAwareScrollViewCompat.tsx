import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { Platform, ScrollView, ScrollViewProps } from "react-native";
import { forwardRef, type Ref } from "react";

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export const KeyboardAwareScrollViewCompat = forwardRef<ScrollView, Props>(function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props, ref: Ref<ScrollView>) {
  if (Platform.OS === "web") {
    return (
      <ScrollView ref={ref} keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      ref={ref as Ref<ScrollView>}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
});
