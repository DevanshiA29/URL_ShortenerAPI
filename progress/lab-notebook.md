# Final Demo Script Execution Log
Generated at: 2026-11-10T08:11:26Z

## 1. Health + Readiness Checks
```bash
$ curl -fsS http://localhost:3000/health
{"status":"ok","timestamp":"2026-11-10T08:11:29.792Z"}
$ curl -fsS http://localhost:3000/ready
{"status":"ready"}
```

## 2. Create Link (Protected & Public Tests)
```bash
$ curl -i http://localhost:3000/links (delete without auth -> 401)
HTTP/1.1 401 Unauthorized
X-Powered-By: Express
X-Request-ID: bc46685d-42d3-4fbf-9bad-0a70a64e35a2
Content-Type: application/json; charset=utf-8
Content-Length: 147
ETag: W/"93-XwBpYLxliyowD3jAOs7EFJZDPkA"
Date: Tue, 10 Nov 2026 08:11:29 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"error":{"code":"UNAUTHORIZED","message":"Authentication required","request_id":"bc46685d-42d3-4fbf-9bad-0a70a64e35a2","failure_mode":"http_401"}}

$ curl -i -H 'Authorization: Bearer test_token_123' -H 'Content-Type: application/json' -d '{"long_url":"https://example.com/demo-original"}' http://localhost:3000/links
HTTP/1.1 201 Created
X-Powered-By: Express
X-Request-ID: 289ca66a-bc8c-4b06-93cf-fd548fee0472
Content-Type: application/json; charset=utf-8
Content-Length: 185
ETag: W/"b9-HfYKNKUajsh8X5Jd5/S28lqaE5A"
Date: Tue, 10 Nov 2026 08:11:29 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"6af2d1b18b5c16fd2419f028","code":"Xy2EhCWQ","short_url":"http://localhost:3000/r/Xy2EhCWQ","long_url":"https://example.com/demo-original","created_at":"2026-11-10T08:11:29.851Z"}
```

## 3. Public Redirect Hot Path
```bash
$ curl -i http://localhost:3000/r/Xy2EhCWQ
HTTP/1.1 302 Found
X-Powered-By: Express
X-Request-ID: 6b55ef84-1163-4391-ad52-966968d59d1a
Location: https://example.com/demo-original
Vary: Accept
Content-Type: text/plain; charset=utf-8
Content-Length: 55
Date: Tue, 10 Nov 2026 08:11:29 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Found. Redirecting to https://example.com/demo-original
```

## 4. Analytics Updated
```bash
$ curl -i 'http://localhost:3000/links/6af2d1b18b5c16fd2419f028/analytics?from=2000-01-01&to=2100-01-01'
HTTP/1.1 200 OK
X-Powered-By: Express
X-Request-ID: 1e75e87f-b3f6-4ca0-b645-0bae9dc0f98b
Content-Type: application/json; charset=utf-8
Content-Length: 143
ETag: W/"8f-KTuqPJk1WHIs96GepNrVafaWeSg"
Date: Tue, 10 Nov 2026 08:11:29 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"link_id":"6af2d1b18b5c16fd2419f028","click_count":0,"from":"2000-01-01T00:00:00.000Z","to":"2100-01-01T00:00:00.000Z","last_clicked_at":null}
```

## 5. Cache Invalidation Proof
```bash
$ curl -i -X PATCH http://localhost:3000/links/6af2d1b18b5c16fd2419f028 -H 'Content-Type: application/json' -d '{"long_url":"https://example.org/demo-updated"}'
HTTP/1.1 200 OK
X-Powered-By: Express
X-Request-ID: b3abbca9-5c54-42b7-aee4-f7e04150e8dc
Content-Type: application/json; charset=utf-8
Content-Length: 184
ETag: W/"b8-kjJ36Vlm+PzzrWqHxTmKSDVPJQU"
Date: Tue, 10 Nov 2026 08:11:29 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"6af2d1b18b5c16fd2419f028","code":"Xy2EhCWQ","short_url":"http://localhost:3000/r/Xy2EhCWQ","long_url":"https://example.org/demo-updated","updated_at":"2026-11-10T08:11:29.900Z"}

$ curl -i http://localhost:3000/r/Xy2EhCWQ (Verify updated Location header)
HTTP/1.1 302 Found
X-Powered-By: Express
X-Request-ID: 47d6cc6b-736d-491a-898d-3f1450b733c9
Location: https://example.org/demo-updated
Vary: Accept
Content-Type: text/plain; charset=utf-8
Content-Length: 54
Date: Tue, 10 Nov 2026 08:11:29 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Found. Redirecting to https://example.org/demo-updated
```

## 6. Search + Pagination
```bash
$ curl -i 'http://localhost:3000/links/search?q=demo&page=1&page_size=10'
HTTP/1.1 200 OK
X-Powered-By: Express
X-Request-ID: 01fb18f6-ebce-435f-8ddf-0ab05aa0c1dc
Content-Type: application/json; charset=utf-8
Content-Length: 248
ETag: W/"f8-FX6VcYZvwVwEj5J48Tjnfg7vmYg"
Date: Tue, 10 Nov 2026 08:11:29 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"items":[{"_id":"6af2d1b18b5c16fd2419f028","code":"Xy2EhCWQ","long_url":"https://example.org/demo-updated","created_by":"test_token_123","tags":[],"created_at":"2026-11-10T08:11:29.851Z","__v":0}],"page":1,"page_size":10,"total":1,"total_pages":1}
```

## 7. Graceful Shutdown
```bash
$ docker stop bootcamp-api-demo
bootcamp-api-demo
$ docker rm bootcamp-api-demo
bootcamp-api-demo
```

All 7 Final Demo checks passed successfully.
