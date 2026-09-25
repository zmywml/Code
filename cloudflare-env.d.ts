declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    LOCAL_PREVIEW?: string;
    APP_SESSION_SECRET?: string;
    TEACHER_ACCESS_CODE?: string;
  }
}
