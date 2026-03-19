type Listener = () => void;

let listener: Listener | null = null;

export function registerAvatarPickerListener(fn: Listener) {
  listener = fn;
}

export function unregisterAvatarPickerListener() {
  listener = null;
}

export function emitOpenAvatarPicker() {
  if (listener) listener();
}
