/**
 * Server-side rate limiting using the rate_limit_buckets table.
 *
 * Usage:
 *   const { allowed, remaining } = await checkRateLimit({
 *     key: `landing_chat:${clientIp}`,
 *     maxRequests: 20,
 *     windowSeconds: 3600,
 *     supabase,
 *   });
 *   if (!allowed) return new Response('Rate limit exceeded', { status: 429 });
 */

interface RateLimitConfig {
  key: string;
  maxRequests: number;
  windowSeconds: number;
  supabase: any;
}

export async function checkRateLimit({
  key,
  maxRequests,
  windowSeconds,
  supabase,
}: RateLimitConfig): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();

  try {
    const { data: bucket } = await supabase
      .from('rate_limit_buckets')
      .select('*')
      .eq('key', key)
      .single();

    if (!bucket || new Date(bucket.expires_at) < now) {
      // New window — upsert fresh bucket
      await supabase.from('rate_limit_buckets').upsert(
        {
          key,
          count: 1,
          window_start: now.toISOString(),
          expires_at: new Date(now.getTime() + windowSeconds * 1000).toISOString(),
        },
        { onConflict: 'key' },
      );
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (bucket.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    await supabase
      .from('rate_limit_buckets')
      .update({ count: bucket.count + 1 })
      .eq('key', key);

    return { allowed: true, remaining: maxRequests - bucket.count - 1 };
  } catch {
    // Fail open — don't block requests if rate limit check fails
    return { allowed: true, remaining: maxRequests };
  }
}
