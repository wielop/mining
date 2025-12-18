export default function pinoPrettyShim() {
  throw new Error(
    "pino-pretty is not bundled in this app (shimbed to avoid optional dependency resolution failures)."
  );
}

