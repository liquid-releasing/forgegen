Step 7 is the **automation and orchestration layer** of a full funscript‑generation pipeline. This is where everything becomes scalable: batch processing, watch‑folders, job queues, metadata syncing, and integration with media libraries like Stash or XBVR. It’s the layer that turns your pipeline from a single‑file tool into a production‑grade system.

The table below matches the structure of Steps 1–6 with **Inputs → Outputs**, capabilities, licenses, and realistic runtimes for a 5‑minute clip.

---

## Step 7 — Batch Automation, Orchestration, and Integration

### Table: Libraries, Inputs/Outputs, Capabilities, License, Runtime

| Step | Task | Library / Model | Inputs → Outputs | Capabilities Summary | License | Est. Time (1080p, 5 min) |
|------|------|-----------------|------------------|-----------------------|----------|---------------------------|
| 7.1 | File watching / auto‑trigger | **watchdog** | Folder events → Pipeline job triggers | Monitors directories for new videos; triggers processing automatically | Apache 2.0 | <1 sec per event |
| 7.2 | Job scheduling | **APScheduler** | Timed triggers → Scheduled pipeline runs | Cron‑like scheduling, interval jobs, background workers | MIT | <1 sec |
| 7.3 | Task queueing | **Celery** | Job requests → Distributed tasks | Scales processing across machines; retries, prioritization | BSD | 1–2 sec overhead per job |
| 7.3 | Task queueing | **RQ (Redis Queue)** | Jobs → Worker tasks | Lightweight queueing; ideal for single‑node pipelines | BSD | <1 sec overhead |
| 7.4 | Pipeline orchestration | **Prefect** | Pipeline graph → Managed workflow | DAG‑based orchestration, retries, caching, observability | Apache 2.0 | 1–3 sec overhead |
| 7.4 | Pipeline orchestration | **Airflow** | DAG → Scheduled workflow | Enterprise‑grade orchestration; dependency management | Apache 2.0 | 2–5 sec overhead |
| 7.5 | Metadata extraction | **FFprobe** | Video file → Metadata JSON | Extracts duration, resolution, FPS, codec, audio info | LGPL/GPL | <1 sec |
| 7.6 | Media library integration | **Stash API** | Funscript + metadata → Attached script | Attaches scripts to videos; updates tags, performers | MIT | 1–2 sec |
| 7.6 | Media library integration | **XBVR API** | Funscript + metadata → Script assignment | VR‑focused library integration; auto‑sync | MIT | 1–2 sec |
| 7.7 | Logging & monitoring | **loguru** | Pipeline events → Structured logs | Human‑friendly logging with rotation, formatting | MIT | Continuous |
| 7.7 | Logging & monitoring | **Prometheus + Grafana** | Metrics → Dashboards | Tracks throughput, errors, GPU usage, queue depth | Apache 2.0 | Continuous |
| 7.8 | Error handling & retries | **Celery / Prefect built‑ins** | Failed tasks → Retry or fallback | Automatic retries, exponential backoff, failure routing | BSD/Apache | <1 sec overhead |
| 7.9 | Parallel processing | **multiprocessing / Ray** | Video list → Parallel jobs | Parallelizes motion detection and smoothing across cores | BSD | 5–20 sec overhead depending on scale |
| 7.10 | Output management | **Python I/O + pathlib** | Funscript JSON → Organized output folders | Writes scripts to structured directories; versioning | MIT/BSD | <1 sec |

---

## What Step 7 accomplishes  
This layer turns your pipeline into a **production system**:

- automatically detects new videos  
- schedules and distributes processing  
- integrates with media libraries  
- logs and monitors performance  
- handles retries and failures  
- organizes outputs cleanly  
- scales across CPU/GPU nodes  

It’s the difference between “run this script manually” and “drop a video in a folder and the funscript appears automatically.”

---

## How Step 7 connects to Step 8  
Step 7 produces:

- processed funscripts  
- metadata‑enriched outputs  
- logs and metrics  
- job‑level artifacts  

Step 8 typically handles **quality assurance, human‑in‑the‑loop review, and optional refinement**, depending on how automated you want the system to be.

Would you like Step 8 in the same structured format?