# Ham's Kisekae System (HKS)

A high-performance, web-based synchronization engine for **VTube Studio** designed to handle modular clothing and accessories with minimal latency.

---

## **Overview**
[cite_start]The Kisekae System allows VTubers and content creators to drag and drop Live2D items into a scene and have them automatically track the main model's position and parameters[cite: 19]. [cite_start]It uses a "tracking-part-physics" logic to ensure that items move naturally while preserving the base model's original physics settings[cite: 356].

## **Core Features**
* [cite_start]**Real-time Sync**: Synchronizes item position, rotation, and scale with the main Live2D model using batched API requests[cite: 140, 517].
* [cite_start]**Parameter Mirroring**: Automatically reflects `ParamCustom` and `ParamPart` values from the main model to all connected HKS items[cite: 323].
* [cite_start]**Event-Driven Architecture**: Utilizes the VTube Studio Event API to minimize CPU usage by refreshing item lists only when models or items are loaded/changed[cite: 109, 110].
* [cite_start]**Parallel Processing**: Uses `Promise.all` to gather data and inject parameters simultaneously, ensuring updates happen within a single frame[cite: 148].

## **Technical Stack**
* **Framework**: [Svelte](https://svelte.dev/) + [Vite](https://vitejs.dev/)
* **Language**: TypeScript
* [cite_start]**API Library**: [VTubeStudioJS](https://github.com/Hawkbar/VTubeStudioJS) [cite: 27]

## **How to Use**
1.  [cite_start]**Authorize**: Open VTube Studio, ensure "Allow Plugin API access" is turned on, and click **Connect** on the dashboard[cite: 53, 87].
2.  [cite_start]**Naming Convention**: Live2D items must have the `HKS_` prefix in their filename to be recognized by the engine[cite: 421].
3.  **Sync**: Toggle **Start Sync** to begin the real-time tracking loop.

## **Legal**
[cite_start]Built using the public [VTube Studio API](https://github.com/DenchiSoft/VTubeStudio)[cite: 19]. [cite_start]No permission is required and there are no licensing fees or royalties for plugin development[cite: 21, 22].