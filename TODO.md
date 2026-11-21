# Task Specification: 3D Relational Infrastructure & Asset Visualizer (React + Three.js)

> **Design & Engineering Mandate:** Build this as an **innovative, striking, and genuinely beautiful** interactive 3D spatial experience—surprising in its motion choreography, lighting, and clarity, yet engineered with the precision of a principal systems architect and a **master in user interfaces and graphical design**. Avoid generic "floating boxes with lines" clichés; craft tactile materials, intentional camera choreography, refined typography/HUD overlays, and effortless extensibility.

---

## 1. Core Architecture & Extensibility Contracts

* [x] **Define a normalized graph & hierarchy schema**
* Create TypeScript interfaces for `Node` (applications, servers, databases, certificates, DNS records, and future custom types), `Edge` (relationships with direction, protocol/dependency type, and weight), and `SubComponent` / `DetailSlot` (e.g., server CPUs, RAM sticks, storage drives, or nested child nodes).
* Support arbitrary nesting/drill-down depth so any node can expand into internal hardware/sub-elements or sub-graphs without hardcoding entity types.


* [x] **Build a Plugin / Registry System for Customizability & Extensibility**
* **Node Type Registry:** Allow consumers to register custom node types, 3D geometries/procedural meshes, shaders/materials, icons, and default layout roles.
* **Lens / Point-of-View Registry:** Allow custom analytical lenses beyond built-ins (`Usage`, `Power Consumption`, `Carbon Footprint`)—each defining how node scale, emissive glow, pulse rate, color ramp, link thickness, and inspector metrics are computed from node metadata.
* **Interaction & Adapter Hooks:** Provide clean props/callbacks (`onSelectNode`, `onDrillDown`, `onLensChange`, `dataAdapter`, `theme`) so host apps can feed live telemetry, mock data, or custom state stores.


* [x] **Decouple Three.js / R3F Scene State from React UI State**
* Use a lightweight store (e.g., Zustand or signals/refs) so high-frequency 60–120fps animations, spring transitions, hover raycasting, and camera flights do not trigger unnecessary React re-renders across the HUD.



---

## 2. Visual Direction, Materials & Atmospheric Craft

* [x] **Craft a signature aesthetic & lighting rig**
* Design a cohesive visual identity (e.g., deep obsidian/slate void or atmospheric studio backdrop with subtle depth fog, calibrated studio + rim lighting, soft reflections via an environment map, and selective bloom for active/high-impact signals).
* Give each asset class a distinct, unmistakable silhouette and tactile materiality (e.g., faceted/brushed metallic enclosures for servers, crystalline/layered strata for databases, luminous orbital rings or sigils for certificates, precision routing conduits for DNS records) while keeping visual harmony.


* [x] **Create "Surprising" Spatial & Motion Touches**
* **Animated Relationship Flows:** Directional data/dependency pulses traveling along curved 3D arcs/tubes between related assets, with speed and intensity tied to traffic or lens metrics.
* **Scene Evolution Choreography:** When clicking an application (e.g., from an initial carousel/overview), smoothly transition non-relevant context out of the way, materialize related infrastructure with staggered spring entrances, and settle into an expressive spatial arrangement (such as concentric tiers, radial constellations, or layered architectural planes).
* **Exploded / Cutaway Inspection:** When opening a server or complex asset, smoothly part or peel back its outer shell to reveal internal bays/modules (CPUs, RAM, drives) in crisp spatial alignment rather than just popping up a flat modal.



---

## 3. Multi-Scale Navigation: Carousel → Application Graph → Element Internals

* [x] **Application Carousel & Entry Experience**
* Build a sleek, responsive application carousel (floating glass/editorial HUD strip or integrated 3D/2D hybrid selector) showing key summary badges per app.
* Clicking an application triggers a smooth camera flight and scene morph into that application's dependency graph (servers, databases, certificates, DNS records, etc.).
* Include breadcrumbs / back-navigation (`All Applications → App Name → Server X → Drive 02`) with smooth reverse transitions.


* [x] **3D Graph Layout, Selection & Hover Affordances**
* Implement automatic, non-overlapping 3D layout algorithms (e.g., tiered/force-assisted/radial layouts) that adapt cleanly to varying numbers of connected assets.
* Support hover highlighting (dimming unrelated nodes/edges, illuminating direct neighbors, showing a crisp floating label/tooltip) and click selection (focusing camera, opening inspection panel, or drilling into internals).


* [x] **Deep Element Inspection (Hardware & Sub-Components)**
* Allow opening any element—such as a server—to inspect its internal components (CPUs, RAM modules, drives) both visually in 3D (exploded/highlighted sub-parts) and via a structured detail drawer/inspector showing specs, utilization, health, and nested sub-items.



---

## 4. Analytical Lenses ("Points of View")

* [x] **Implement Lens Switching (`Usage`, `Power Consumption`, `Carbon Footprint`, plus Custom Lenses)**
* Build a prominent, intuitive lens switcher in the UI.
* When switching lenses, smoothly interpolate:
* **Color palettes** (e.g., cool-to-warm or domain-specific accessible color scales, with colorblind-safe options).
* **3D visual encodings** (e.g., node scale, aura/glow intensity, flow speed, or vertical elevation reflecting load, watts, or $\text{CO}_2\text{e}$).
* **Inspector readouts & rankings** (highlighting top contributors/hotspots for the active lens).




* [x] **Support Aggregation Roll-Ups**
* Ensure parent/container nodes (e.g., an application or server) can aggregate metrics from their child assets or internals according to the active lens.



---

## 5. Master-Class UI, HUD & Ergonomics

* [x] **Design an unobtrusive, museum-grade HUD**
* Keep **greater than 80%** of the viewport open to the 3D canvas by default.
* Style panels with crisp typography, generous spacing, subtle borders/blur, clear visual hierarchy, and smooth collapse/expand states.
* Include camera controls (orbit, pan, zoom, reset view, focus selected, optional auto-orbit/guided tour) and keyboard shortcuts (`Esc` to step back/deselect, `R` to reset camera, number keys for lenses).


* [x] **Ensure Accessibility, Responsiveness & Performance**
* Support keyboard navigation and screen-reader-friendly labels/summaries alongside canvas interactions.
* Handle window resizing, DPR scaling, instancing/LOD for larger graphs, and graceful fallback/error boundaries if WebGL context is lost.



---

## 6. Sample Dataset, Documentation & Verification

* [x] **Create rich, realistic sample data**
* Include multiple sample applications with realistic servers, databases, TLS certificates, DNS records, and server internals (CPUs, RAM, NVMe/HDD drives) populated with `usage`, `powerConsumption` (W), and `carbonFootprint` ($\text{gCO}_2\text{e}$/h) data—plus edge cases like expiring certificates or hot nodes.


* [x] **Provide extension examples & tests**
* Include a clear example showing how to register a **custom node type** and a **custom lens** without modifying core component internals.
* Add unit tests for graph/lens aggregation logic and smoke/interaction tests for selection, drill-down, and lens switching.