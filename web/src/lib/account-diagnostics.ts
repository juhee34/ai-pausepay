// 서버 계정 연결 진단 전용. 오류 객체·스택·요청을 통째로 기록하지 않는다.
// 알려진 기반 라이브러리 오류의 첫 줄만 남기고, 임의 내용은 생략한다.
const ERROR_NAMES = new Set([
  "Error", "TypeError", "SyntaxError", "ReferenceError", "RangeError", "AggregateError",
  "FirebaseAppError", "FirebaseAuthError", "GoogleError", "FetchError", "ApiError",
]);
const MODULE_NAMES = new Set([
  "firebase-admin", "jwks-rsa", "jose", "google-auth-library", "jsonwebtoken",
  "@google-cloud/firestore", "@google-cloud/storage", "@grpc/grpc-js", "google-gax",
  "lru-cache", "lru-memoizer", "limiter", "debug", "protobufjs", "gaxios", "gtoken",
]);
const STAGES = new Set([
  "load-app", "get-admin-app", "initialize-app", "load-auth", "initialize-auth",
  "load-firestore", "initialize-firestore", "ai-usage", "usage-route",
]);

function redact(text: string) {
  // 실제 환경 변수는 비교·마스킹에만 사용하며 반환하거나 로그로 출력하지 않는다.
  const secrets = Object.entries(process.env)
    .filter(([name, value]) => /KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|EMAIL/i.test(name) && value)
    .flatMap(([, value]) => [value!, value!.replace(/\\r/g, "").replace(/\\n/g, "\n")])
    .filter((value) => value.length > 0)
    .sort((a, b) => b.length - a.length);
  for (const value of secrets) text = text.split(value).join("[redacted]");
  return text
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g, "[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted]")
    .replace(/[A-Za-z0-9_+=-]{32,}/g, "[redacted]");
}

function moduleName(value: string) {
  const normalized = value.replace(/\\/g, "/");
  const marker = normalized.lastIndexOf("/node_modules/");
  const relative = marker >= 0 ? normalized.slice(marker + "/node_modules/".length) : normalized;
  const name = relative.match(/^(?:@[\w-]+\/)?[\w-]+/)?.[0];
  // 경로·임의 문자열은 출력하지 않고 알려진 패키지 이름만 남긴다.
  return name && MODULE_NAMES.has(name) ? name : "[module path]";
}

export function accountDiagnostic(error: unknown): [string, string] {
  if (!(error instanceof Error)) return ["UnknownError", "[non-Error exception omitted]"];
  const name = ERROR_NAMES.has(error.name) ? error.name : "Error";
  // 마스킹은 줄을 자르기 전에 한다. 여러 줄 PEM의 일부가 남지 않게 한다.
  const first = redact(error.message).split(/\r\n|\r|\n|\u2028|\u2029/, 1)[0];
  let message = "[unstructured message omitted]";
  const missing = first.match(/^(Cannot find (?:module|package)) ['"]([^'"]+)['"]/);
  const esm = first.match(/^require\(\) of ES Module (.+?) (?:from .*? )?not supported/);
  const external = first.match(/^Failed to load external module ([^:\s]+)/);
  const moduleCode = first.match(/\bERR_(?:MODULE_NOT_FOUND|REQUIRE_ESM|REQUIRE_ASYNC_MODULE|PACKAGE_PATH_NOT_EXPORTED|PACKAGE_IMPORT_NOT_DEFINED)\b/)?.[0];
  if (missing) message = `${missing[1]} '${moduleName(missing[2])}'`;
  else if (esm) message = `require() of ES Module ${moduleName(esm[1])} not supported`;
  else if (external) message = `Failed to load external module ${moduleName(external[1])}${moduleCode ? `: ${moduleCode}` : ""}`;
  else {
    // 이 목록에 없는 오류는 단계·종류만으로 먼저 좁힌다. 요청 내용을 추정해서 출력하지 않는다.
    const safe = first.match(/^(?:require\(\) cannot be used on an ESM graph with top-level await|(?:require|exports|module|__dirname|__filename) is not defined in ES module scope|Unexpected token|Unexpected identifier|Invalid or unexpected token|Cannot read properties of (?:undefined|null)|Cannot access|(?:getAuth|getFirestore|initializeApp|cert|getApps) is not a function|Failed to parse private key|Could not load the default credentials|(?:\d{1,2} )?(?:PERMISSION_DENIED|NOT_FOUND|UNAVAILABLE|DEADLINE_EXCEEDED|UNAUTHENTICATED|RESOURCE_EXHAUSTED)|(?:getaddrinfo )?(?:ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT)|ERR_(?:MODULE_NOT_FOUND|REQUIRE_ESM|REQUIRE_ASYNC_MODULE|PACKAGE_PATH_NOT_EXPORTED|PACKAGE_IMPORT_NOT_DEFINED|INVALID_ARG_TYPE|DLOPEN_FAILED))/);
    if (safe) message = safe[0];
    else if (moduleCode) message = moduleCode;
  }
  return [name, message.slice(0, 200)];
}

export function logAccountError(stage: string, error: unknown) {
  const [name, message] = accountDiagnostic(error);
  console.error(`account:${STAGES.has(stage) ? stage : "unknown"}`, name, message);
}
