# ProxiSpeak WebSocket Protocol & Audio Pipeline Specification
**Version:** 1.0.0  
**Transport:** Socket.io / WebSockets (Binary JSON)  
**Audio Synthesizer:** HTML5 Web Audio API (`StereoPannerNode`, `GainNode`)

---

## 1. WebSocket Event Protocol

### Client to Server Events

#### `player:join`
Dispatched when a client joins a campus map room cluster.
```json
{
  "peerId": "user_98a72b",
  "username": "Dev Jangid",
  "initialPosition": { "x": 200, "y": 200 },
  "roomId": "campus_north_quad"
}
```

#### `player:move`
Dispatched at 30–60 Hz during keyboard avatar locomotion.
```json
{
  "peerId": "user_98a72b",
  "position": { "x": 245, "y": 210 },
  "timestamp": 1729783800000
}
```

---

## 2. Server to Client Broadcast Events

#### `proximity:update`
Emitted by the spatial delta worker broadcasting adjacent peer positions within the cluster radius.
```json
{
  "peers": [
    { "peerId": "user_b43f11", "x": 280, "y": 230 }
  ]
}
```

---

## 3. Acoustic Distance Attenuation Model
Distance falloff is computed using inverse-square Euclidean metrics:
\[
\text{Gain}(d) = \begin{cases} 
1.0 & d \le d_{\min} \\
\frac{1}{1 + \alpha \cdot \left(\frac{d - d_{\min}}{d_{\max} - d_{\min}}\right)^2} & d_{\min} < d < d_{\max} \\
0.0 & d \ge d_{\max}
\end{cases}
\]
Where \( d_{\min} = 30\text{px} \), \( d_{\max} = 350\text{px} \), and \( \alpha = 1.2 \) (rolloff factor).

---
*Authored by Dev Jangid — 2026.*
