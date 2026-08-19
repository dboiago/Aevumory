# Technical Architecture & System Boundaries

## System Design
The application operates on a **Thin Client / Smart Server** pattern. An old tablet acts strictly as a rendering engine for a lightweight web dashboard, while a backend container on TrueNAS handles state, polling, scheduling, and game logic.

┌──────────────────────────┐   WebSockets / REST   ┌──────────────────────────────┐
│ Wall Tablet (Frontend)   │ ◄───────────────────► │ TrueNAS Backend (Docker)     │
│ • Svelte / Alpine.js     │                       │ • Fastify/Go Service         │
│ • Fully Kiosk Browser    │                       │ • SQLite Database            │
│ • CSS Token Engine       │                       │ • External APIs (Calendar)   │
└──────────────────────────┘                       └──────────────┬───────────────┘
│
▼
┌──────────────────────────────┐
│ Memoix Read-Only Bridge      │
│ (Optional Sync Engine)       │
└──────────────────────────────┘


## Technology Stack
* **Frontend:** Svelte (or lightweight vanilla JS/HTML/CSS). Minimal client-side dependencies to ensure high performance on low-end tablet hardware.
* **Backend:** Node.js (Fastify) or Go running inside Docker on TrueNAS.
* **Database:** SQLite (persisted volume) storing Users, RPG Stats, Event Logs, and Task/Reward Specs.
* **Communication:** Real-time updates pushed from server to client via **WebSockets**.

## API & WebSocket Event Specification
All WebSocket events sent to the display must conform to this wrapper payload:

```json
{
  "event_type": "ORBITAL_UPDATE | TRANSIENT_ALERT | RPG_STATE | SYSTEM_COMMAND",
  "timestamp": 1787152112,
  "payload": {}
}
```

Event Horizon State Payload Example:

```json
{
  "event_type": "ORBITAL_UPDATE",
  "payload": {
    "nodes": [
      {
        "id": "event_101",
        "title": "Canada's Wonderland",
        "days_out": 3,
        "opacity": 0.65,
        "orbit_position": 0.4,
        "weather_warning": {
          "active": true,
          "condition": "Thunderstorms",
          "precip_chance": 80
        }
      }
    ]
  }
}
```