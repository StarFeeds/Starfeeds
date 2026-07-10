"""Ad-hoc realtime smoke test. Run with the venv python."""
import asyncio
import json
import time
import urllib.request

import websockets

BASE = "http://localhost:8000/api/v1"
WS = "ws://localhost:8000/api/v1/ws"


def post(path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or "null")


def get(path, token=None):
    req = urllib.request.Request(BASE + path)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


async def main():
    # Wait for server
    for _ in range(30):
        try:
            urllib.request.urlopen("http://localhost:8000/health")
            break
        except Exception:
            time.sleep(0.5)

    a = post("/auth/login", {"email": "demo@starfeeds.app", "password": "password123"})
    tok_a = a["access_token"]
    me_a = get("/auth/me", tok_a)

    b = post("/auth/login", {"email": "ola@starfeeds.app", "password": "password123"})
    tok_b = b["access_token"]
    me_b = get("/auth/me", tok_b)

    convos = get("/conversations", tok_a)
    convo_id = convos[0]["id"]

    received = []
    async with websockets.connect(f"{WS}?token={tok_a}") as ws:
        await asyncio.sleep(0.3)  # let server register the connection

        # B sends a message in the shared conversation
        post(f"/conversations/{convo_id}/messages", {"body": "Realtime ping!"}, tok_b)
        # B comments on one of A's ideas -> notification to A (always fires)
        ideas = get(f"/ideas?author_id={me_a['id']}", tok_a)["items"]
        post(f"/ideas/{ideas[0]['id']}/comments", {"body": "Live notif test"}, tok_b)

        # Collect events for up to 3 seconds
        try:
            while len(received) < 2:
                raw = await asyncio.wait_for(ws.recv(), timeout=3)
                received.append(json.loads(raw))
        except asyncio.TimeoutError:
            pass

    types = [e["type"] for e in received]
    print("RECEIVED EVENT TYPES:", types)
    for e in received:
        if e["type"] == "message":
            print("  message:", e["message"]["body"], "from sender", e["message"]["sender_id"])
        elif e["type"] == "notification":
            print("  notification:", e["notification"]["text"], "from", e["notification"]["actor"]["full_name"])
    assert "message" in types, "did NOT receive live message"
    assert "notification" in types, "did NOT receive live notification"
    print("REALTIME OK: both message and notification pushed live")


asyncio.run(main())
