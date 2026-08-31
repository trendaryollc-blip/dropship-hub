"use client";

import useSWR, { type SWRConfiguration, mutate } from "swr";
import useSWRMutation from "swr/mutation";
import { safeFetch } from "@/lib/safe-fetch";
import { auth } from "@/lib/firebase";

async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

async function authFetcher<T = unknown>(url: string): Promise<T> {
  const token = await getIdToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return safeFetch<T>(url, { headers });
}

export function useAPI<T = unknown>(url: string | null, options?: SWRConfiguration<T>) {
  return useSWR<T>(url, authFetcher as never, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    ...options,
  });
}

type MutationArgs = {
  body?: unknown;
  method?: string;
  headers?: Record<string, string>;
};

async function mutationFetcher(_url: string, { arg }: { arg: MutationArgs }) {
  const { body, method = "POST", headers = {} } = arg;
  const token = await getIdToken();
  const authHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (token) authHeaders["Authorization"] = `Bearer ${token}`;
  return safeFetch<unknown>(_url, {
    method,
    headers: authHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function useMutation<T = unknown>(url: string, options?: { onSuccess?: (data: T) => void }) {
  const swrMutation = useSWRMutation(url, mutationFetcher as (url: string, arg: { arg: MutationArgs }) => Promise<T>, {
    onSuccess: options?.onSuccess as (data: T) => void | undefined,
  });
  return {
    trigger: swrMutation.trigger as (args?: MutationArgs) => Promise<T>,
    data: swrMutation.data as T | undefined,
    error: swrMutation.error,
    isMutating: swrMutation.isMutating,
  };
}

export function revalidate(url: string) {
  return mutate(url);
}
