// Remotion entry — registers the composition root. `renderRemotion`/the "remotion"
// EDL segment point their `entry` here.
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root.tsx";

registerRoot(RemotionRoot);
