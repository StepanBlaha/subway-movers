from pynput.keyboard import Controller, Key


class KeyboardBackend:
    """Sends arrow-key taps to whatever window has OS focus.

    Works for both the web game (focus the browser tab) and BlueStacks
    (map arrow keys to swipes in its keymap editor).
    """

    def __init__(self, keymap):
        self._kb = Controller()
        self._keys = {name: getattr(Key, keymap[name]) for name in keymap}

    def send(self, action):
        key = self._keys.get(action)
        if key is None:
            return
        self._kb.press(key)
        self._kb.release(key)

    def tap(self, key_name):
        """Tap an arbitrary key by pynput name (e.g. 'esc', 'p') or single char."""
        key = getattr(Key, key_name, key_name)
        self._kb.press(key)
        self._kb.release(key)


class NullBackend:
    """No-op backend for dry-run / debugging without touching the game."""

    def send(self, action):
        pass

    def tap(self, key_name):
        pass
