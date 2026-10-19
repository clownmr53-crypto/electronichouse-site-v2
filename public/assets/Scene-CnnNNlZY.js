// Stub for the lazily-loaded 3D scene chunk (original build artifact lost).
// React.lazy() only requires a valid ES module with a `default` export.
// The caller renders this inside <Suspense fallback={null}> and already
// shows a static <img> fallback in most cases, so rendering null is safe.
export default function SceneStub() {
  return null;
}
