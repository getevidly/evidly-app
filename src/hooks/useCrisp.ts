/**
 * CRISP-CHAT-01 — Crisp live chat integration.
 *
 * useCrisp()         — initializes Crisp widget (call once at app root)
 * useCrispIdentify() — sends user context to Crisp inbox (call in auth layout)
 * useCrispHide()     — hides widget on specific routes (call per-page)
 */

import { useEffect } from 'react';
import { Crisp } from 'crisp-sdk-web';

const WEBSITE_ID = import.meta.env.VITE_CRISP_WEBSITE_ID as string;

export function useCrisp() {
  useEffect(() => {
    if (!WEBSITE_ID) return;
    try {
      Crisp.configure(WEBSITE_ID);
    } catch {
      // Silent fail — chat is non-critical
    }
  }, []);
}

export function useCrispIdentify(user: {
  email?: string;
  name?: string;
  role?: string;
  orgId?: string;
  plan?: string;
}) {
  useEffect(() => {
    if (!WEBSITE_ID || !user.email) return;
    try {
      Crisp.user.setEmail(user.email);
      if (user.name) Crisp.user.setNickname(user.name);

      Crisp.session.setData({
        role: user.role ?? 'unknown',
        org_id: user.orgId ?? '',
        plan: user.plan ?? 'trial',
        platform: 'EvidLY',
      });
    } catch {
      // Silent fail
    }
  }, [user.email, user.role, user.orgId]);
}

export function useCrispHide() {
  useEffect(() => {
    if (!WEBSITE_ID) return;
    try {
      Crisp.chat.hide();
    } catch {
      // Silent fail
    }
    return () => {
      try {
        Crisp.chat.show();
      } catch {
        // Silent fail
      }
    };
  }, []);
}
