// Web build of the notifications setup (Metro picks *.web.ts on web).
//
// expo-notifications is intentionally not imported here: merely importing it
// registers a push token listener at module load, which logs
// "[expo-notifications] Listening to push token changes is not yet fully
// supported on web" — and local notifications are unsupported on web anyway.

export {};
