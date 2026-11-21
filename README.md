# Assets3D

Assets3D is a React and Three.js infrastructure atlas. Open an application to see its dependencies. Open a server to see its processor, memory and drives. Drive 02 in Compute 01 has a further level for its controller.

```sh
npm install
npm run dev
```

Use the carousel or Inspector to navigate with the keyboard. Search by application name to filter the carousel and 3D overview. Drag to orbit, right-drag to pan and scroll to zoom. Press Esc to go back, R to reset the camera, or 1–9 to pick a lens. The overview places the lowest application at the bottom left and the highest at the top right for the current lens. The overview shows up to 32 matching apps. Choose the highest or lowest values for the active lens, or switch to newest or oldest updates. Its gradient and legend use the apps on screen. Search always checks the full fleet before applying the limit. Use **Most obsolete assets** or **Most vulnerabilities** to surface apps that need attention. The Inspector shows counts and affected components. Use **Settings** to choose whether the carousel sits at the bottom or right, and to independently hide obsolete assets, vulnerabilities, or the Security tab. Drag up and down to browse when the carousel is on the right. Open an app’s **Security** tab to see its administrators, owner, support group, security group, and last access review. Rank contained assets by the current lens in the Inspector.

## Embed and extend

```sh
npm install @mickyballadelli/assets3d react three
```

```tsx
import { Visualizer } from '@mickyballadelli/assets3d'
import '@mickyballadelli/assets3d/styles.css'

export default function App() {
  return <Visualizer />
}
```

Pass `graph` for static data or `dataAdapter` for live data. An adapter should return the same snapshot object until data changes and notify subscribers after publishing a new immutable snapshot. Use `onSelectNode`, `onDrillDown`, and `onLensChange` to listen for user actions. The optional `theme` sets the title, subtitle, icon, background and accent. Pass `overviewAppLimit={24}` to change how many apps the overview shows.

```tsx
<Visualizer theme={{
  title: 'Assets3D',
  subtitle: 'Fleet overview',
  icon: <img src="/fleet-logo.png" alt="" />
}} />
```

The visualizer fills its parent’s height. Give the parent a height, or pass a size using `style`, for example `<Visualizer style={{ height: '60vh' }} />`. Use **Settings → Footer** to hide the bottom status bar.

Pass `icon: null` to hide the mark or `subtitle: ''` to hide the subtitle.

Nodes are keyed by ID. Provide an ISO 8601 `updatedAt` timestamp to include an app in update-date ordering. Set application `security` metadata to show ownership and support information. Use `healthReason` to explain a reported health status. Use `maintenance.obsolete` for an obsolete asset and `maintenance.vulnerabilities` for findings. Open findings and obsolete assets roll up through containment, with each asset counted once per parent. Set `roots` to the top-level applications, `children` to direct containment slots and `edges` to directed relationships. Containment should be acyclic. Supply normalized edge weights between zero and one. Define data centers in optional `graph.locations` and assign assets with `node.locationId`. The application view can filter by site while keeping shared assets visible. Each view shows the current asset, its immediate children and the relationships between those visible assets.

See `examples/extensions.ts` in the source project for a load-balancer mesh and a temperature lens. Pass its registry to `<Visualizer registry={registry} graph={graph} />`, give the asset a `type` of `load-balancer`, and set `metrics.temperature` to its reading in °C. Build the registry before mounting. Model factories create owned Three.js resources per asset and receive flags for detail and reduced geometry. Signal meshes with a standard material can opt into lens tint and emissive changes through `userData.signal`. Keep geometry centered and within roughly a one-unit radius for the built-in orbital layout.

Explicit readings take priority over roll-ups. Otherwise usage averages available direct child readings and power and carbon sum them. Custom lenses define their own measurement, aggregation, visual encoding, and units.

## Verification commands

- `npm run build` type-checks and builds the production demo.
- `npm run build:library` builds the npm library and its TypeScript declarations.
- `npm test` runs the graph and lens unit tests.
- `npx playwright install chromium` installs the browser for interaction tests.
- `APP_URL=http://localhost:5173 npm run test:browser` runs the interaction tests against an already running app.

## Large fleet demo

Open `/fleet.html` to explore the generated fleet. The demo starts with 32 applications and supports up to 1,000. Choose an application in the carousel, then drill into a compute host or drive. Servers are spread across Paris, Frankfurt, and Ashburn. Each site has a labeled 3D platform. Click its label or use the **Data center** filter to isolate one site. **Regenerate** creates a fresh fleet.

`npm run demo:offline` creates `dist/fleet-offline.html`. Open it directly in a browser for an interactive preview without a server.
