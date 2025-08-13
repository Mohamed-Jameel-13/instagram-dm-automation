'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type CacheEntry<T> = { data: T; timestamp: number }
const globalCache = new Map<string, CacheEntry<any>>()

export interface UseCachedFetchOptions<T> {
  ttlMs?: number
  initialData?: T
  fetchOptions?: RequestInit
}

export function useCachedFetch<T = any>(url: string | null, options?: UseCachedFetchOptions<T>) {
  const ttlMs = options?.ttlMs ?? 30000
  const initialData = options?.initialData
  const fetchOptions = options?.fetchOptions

  const cacheKey = useMemo(() => url || '', [url])
  const [data, setData] = useState<T | undefined>(() => {
    if (!cacheKey) return initialData
    const entry = globalCache.get(cacheKey) as CacheEntry<T> | undefined
    if (entry && Date.now() - entry.timestamp < ttlMs) return entry.data
    return initialData
  })
  const [loading, setLoading] = useState<boolean>(() => {
    if (!cacheKey) return false
    const entry = globalCache.get(cacheKey)
    return entry ? false : true
  })
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef(true)

  async function load(force = false) {
    if (!cacheKey) return
    try {
      setError(null)
      const entry = globalCache.get(cacheKey) as CacheEntry<T> | undefined
      const isExpired = !entry || Date.now() - entry.timestamp >= ttlMs
      if (!force && entry && !isExpired) {
        // Fresh enough
        setData(entry.data)
        setLoading(false)
        return
      }
      const res = await fetch(cacheKey, fetchOptions)
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const json = (await res.json()) as T
      globalCache.set(cacheKey, { data: json, timestamp: Date.now() })
      if (isMounted.current) setData(json)
    } catch (e) {
      if (isMounted.current) setError(e as Error)
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMounted.current = true
    if (!cacheKey) return () => { isMounted.current = false }
    // On mount, serve cached if present; fetch in background when stale
    const entry = globalCache.get(cacheKey) as CacheEntry<T> | undefined
    const isExpired = !entry || Date.now() - entry.timestamp >= ttlMs
    if (isExpired) {
      // Avoid flicker if we have some data
      if (!entry) setLoading(true)
      load()
    } else {
      // Revalidate in background without toggling loading
      load(true)
    }
    return () => {
      isMounted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, ttlMs])

  return { data, loading, error, refresh: () => load(true) }
}


