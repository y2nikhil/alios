import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'

export interface UsernameSignInInput {
  username: string
  password: string
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

/**
 * Signs a user in with their username + password entirely on the server.
 * The account's email address is never returned to the browser, so usernames
 * cannot be used to harvest email addresses.
 */
export const signInWithUsername = createServerFn({ method: 'POST' })
  .inputValidator((input: UsernameSignInInput) => input)
  .handler(async ({ data }) => {
    const username = (data.username ?? '').trim().toLowerCase()
    const password = data.password ?? ''
    if (!USERNAME_RE.test(username) || password.length < 1 || password.length > 200) {
      return { ok: false as const, error: 'Invalid username or password.' }
    }

    const url = process.env['SUPABASE_URL']!
    const publishableKey = process.env['SUPABASE_PUBLISHABLE_KEY']!

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: email, error: lookupError } = await supabaseAdmin.rpc('email_for_username', {
      _username: username,
    })

    if (lookupError || !email) {
      return { ok: false as const, error: 'Invalid username or password.' }
    }

    const authClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    })

    const { data: signIn, error } = await authClient.auth.signInWithPassword({
      email: email as string,
      password,
    })

    if (error || !signIn.session) {
      return { ok: false as const, error: 'Invalid username or password.' }
    }

    return {
      ok: true as const,
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    }
  })
