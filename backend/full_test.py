"""Full end-to-end flow test for StarFeeds.

Run the backend on :8000, then:  python full_test.py
Exercises every API flow across multiple users + realtime WebSocket delivery.
Mutates data — re-run `python -m app.seed` afterwards for a clean state.
"""
import asyncio
import json
import time
import urllib.error
import urllib.request

import websockets

BASE = "http://localhost:8000/api/v1"
WS = "ws://localhost:8000/api/v1/ws"

PASS, FAIL = 0, 0


def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name}  {detail}")


def _req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = raw.decode(errors="ignore")
        return e.code, parsed


def post(path, body=None, token=None):
    return _req("POST", path, body, token)


def get(path, token=None):
    return _req("GET", path, None, token)


def patch(path, body, token=None):
    return _req("PATCH", path, body, token)


def delete(path, token=None):
    return _req("DELETE", path, None, token)


def login(email, pw):
    _, t = post("/auth/login", {"email": email, "password": pw})
    return t["access_token"], t["refresh_token"]


async def main():
    print("\n=== AUTH ===")
    a_tok, a_refresh = login("demo@starfeeds.app", "password123")   # MI Abaga
    b_tok, _ = login("ada@starfeeds.app", "password123")            # Ada
    c_tok, _ = login("ola@starfeeds.app", "password123")            # Ola
    check("login demo/ada/ola", all([a_tok, b_tok, c_tok]))

    st, me_a = get("/auth/me", a_tok)
    check("GET /auth/me", st == 200 and me_a["email"] == "demo@starfeeds.app", me_a)
    _, me_b = get("/auth/me", b_tok)
    _, me_c = get("/auth/me", c_tok)

    st, refreshed = post("/auth/refresh", {"refresh_token": a_refresh})
    check("refresh token", st == 200 and "access_token" in refreshed, st)

    # Register a throwaway user (deleted at the end)
    qa_email = f"qa_{int(time.time())}@starfeeds.app"
    st, qa_tokens = post("/auth/register", {
        "email": qa_email, "username": f"qa{int(time.time())}",
        "full_name": "QA Bot", "password": "password123",
    })
    check("register new user", st == 201 and "access_token" in qa_tokens, st)
    qa_tok = qa_tokens["access_token"]

    st, bad = post("/auth/login", {"email": qa_email, "password": "wrong"})
    check("login rejects bad password", st == 401, st)

    print("\n=== PROFILE ===")
    st, upd = patch("/auth/me", {"headline": "Serial Founder", "bio": "QA bio", "phone": "+15550001"}, a_tok)
    check("PATCH profile", st == 200 and upd["headline"] == "Serial Founder" and upd["phone"] == "+15550001", upd)

    st, prefs = patch("/auth/me/notification-prefs", {"mentions": True, "weekly": False}, a_tok)
    check("PATCH notification-prefs", st == 200 and prefs["notification_prefs"]["mentions"] is True
          and prefs["notification_prefs"]["weekly"] is False, prefs.get("notification_prefs"))

    print("\n=== IDEAS ===")
    st, feed = get("/ideas?page=1&page_size=50&sort=recent", a_tok)
    check("list ideas (recent)", st == 200 and feed["total"] >= 4, feed.get("total"))

    st, top = get("/ideas?sort=top", a_tok)
    check("list ideas (top)", st == 200 and len(top["items"]) > 0)

    st, mine = get(f"/ideas?author_id={me_a['id']}", a_tok)
    check("author_id filter", st == 200 and all(i["author"]["id"] == me_a["id"] for i in mine["items"]),
          "non-matching author present")

    st, created = post("/ideas", {"title": "QA Idea", "body": "Body text", "category": "Testing"}, a_tok)
    check("create idea", st == 201 and created["title"] == "QA Idea", st)
    qa_idea_id = created["id"]

    # Upvote toggle (A upvotes own new idea -> count 0->1->0)
    st, up1 = post(f"/ideas/{qa_idea_id}/upvote", None, a_tok)
    st, up2 = post(f"/ideas/{qa_idea_id}/upvote", None, a_tok)
    check("upvote toggle on/off", up1["upvote_count"] == 1 and up2["upvote_count"] == 0,
          f"{up1['upvote_count']}/{up2['upvote_count']}")

    # Save toggle + saved filter
    post(f"/ideas/{qa_idea_id}/save", None, a_tok)
    st, saved = get("/ideas?saved=true", a_tok)
    check("save + saved=true filter", any(i["id"] == qa_idea_id for i in saved["items"]), "saved idea missing")
    post(f"/ideas/{qa_idea_id}/save", None, a_tok)  # unsave
    st, saved2 = get("/ideas?saved=true", a_tok)
    check("unsave removes from saved", not any(i["id"] == qa_idea_id for i in saved2["items"]))

    # Comments: B comments on A's idea -> count increments
    bs_idea = mine["items"][0]
    st, before = get(f"/ideas?author_id={me_a['id']}", a_tok)
    before_count = next(i for i in before["items"] if i["id"] == bs_idea["id"])["comment_count"]
    st, cm = post(f"/ideas/{bs_idea['id']}/comments", {"body": "Great idea from QA"}, b_tok)
    check("add comment", st == 201 and cm["author"]["id"] == me_b["id"], st)
    st, after = get(f"/ideas?author_id={me_a['id']}", a_tok)
    after_count = next(i for i in after["items"] if i["id"] == bs_idea["id"])["comment_count"]
    check("comment_count increments", after_count == before_count + 1, f"{before_count}->{after_count}")
    st, clist = get(f"/ideas/{bs_idea['id']}/comments", a_tok)
    check("list comments", st == 200 and any(c["body"] == "Great idea from QA" for c in clist))

    print("\n=== COLLABORATION ===")
    # C expresses interest in A's idea
    st, interest = post(f"/ideas/{bs_idea['id']}/interest", None, c_tok)
    check("express interest", st == 201 and interest["status"] == "pending", st)
    # duplicate interest blocked
    st, dup = post(f"/ideas/{bs_idea['id']}/interest", None, c_tok)
    check("duplicate interest blocked (409)", st == 409, st)
    # cannot express interest in own idea
    st, own = post(f"/ideas/{bs_idea['id']}/interest", None, a_tok)
    check("own-idea interest blocked (400)", st == 400, st)

    st, incoming = get("/collaboration-requests?box=incoming", a_tok)
    check("incoming collab list", st == 200 and any(r["id"] == interest["id"] for r in incoming))
    st, outgoing = get("/collaboration-requests?box=outgoing", c_tok)
    check("outgoing collab list", st == 200 and any(r["id"] == interest["id"] for r in outgoing))

    # Accept -> conversation created
    st, accepted = post(f"/collaboration-requests/{interest['id']}/accept", None, a_tok)
    check("accept creates conversation", st == 200 and accepted["status"] == "accepted"
          and accepted.get("conversation_id"), accepted)
    convo_id = accepted["conversation_id"]
    st, a_convos = get("/conversations", a_tok)
    check("conversation appears for accepter", any(c["id"] == convo_id for c in a_convos))
    st, c_convos = get("/conversations", c_tok)
    check("conversation appears for requester", any(c["id"] == convo_id for c in c_convos))

    print("\n=== MESSAGES ===")
    st, sent = post(f"/conversations/{convo_id}/messages", {"body": "Hi from A"}, a_tok)
    check("send message", st == 201 and sent["sender_id"] == me_a["id"], st)
    st, msgs = get(f"/conversations/{convo_id}/messages", c_tok)  # C reads -> marks read
    check("list messages", st == 200 and any(m["body"] == "Hi from A" for m in msgs))
    st, c_convos2 = get("/conversations", c_tok)
    this_convo = next(c for c in c_convos2 if c["id"] == convo_id)
    check("unread cleared after read", this_convo["unread"] == 0, this_convo["unread"])

    print("\n=== NOTIFICATIONS / ACTIVITY ===")
    st, notifs = get("/notifications", a_tok)
    check("notifications include comment+collab", st == 200
          and any(n["type"] == "comment" for n in notifs)
          and any(n["type"] == "collab" for n in notifs), [n["type"] for n in notifs][:6])
    st, uc = get("/notifications/unread-count", a_tok)
    check("unread-count > 0", uc["count"] > 0, uc)
    if notifs:
        st, _ = post(f"/notifications/{notifs[0]['id']}/read", None, a_tok)
        check("mark one read", st == 200)
    st, _ = post("/notifications/read-all", None, a_tok)
    st, uc2 = get("/notifications/unread-count", a_tok)
    check("read-all -> unread 0", uc2["count"] == 0, uc2)

    st, act_all = get("/activity?type=all", a_tok)
    st, act_comments = get("/activity?type=comments", a_tok)
    check("activity all/comments", st == 200 and len(act_all) >= len(act_comments) and len(act_comments) > 0)

    print("\n=== REALTIME (WebSocket) ===")
    received = []
    async with websockets.connect(f"{WS}?token={a_tok}") as ws:
        await asyncio.sleep(0.3)
        post(f"/conversations/{convo_id}/messages", {"body": "live ws msg"}, c_tok)
        post(f"/ideas/{bs_idea['id']}/comments", {"body": "live ws comment"}, b_tok)
        try:
            while len(received) < 2:
                raw = await asyncio.wait_for(ws.recv(), timeout=4)
                received.append(json.loads(raw))
        except asyncio.TimeoutError:
            pass
    types = [e["type"] for e in received]
    check("WS delivers live message", "message" in types, types)
    check("WS delivers live notification", "notification" in types, types)

    # bad token rejected
    try:
        async with websockets.connect(f"{WS}?token=garbage") as ws:
            await ws.recv()
        check("WS rejects bad token", False, "connection not rejected")
    except Exception:
        check("WS rejects bad token", True)

    print("\n=== ACCOUNT DELETION ===")
    st, _ = delete("/auth/me", qa_tok)
    check("delete account (204)", st == 204, st)
    st, _ = get("/auth/me", qa_tok)
    check("deleted token rejected (401)", st == 401, st)

    print(f"\n===== RESULT: {PASS} passed, {FAIL} failed =====")
    if FAIL:
        raise SystemExit(1)


asyncio.run(main())
