/**
 * testimonialSystem — SOCIAL-PROOF-01
 *
 * Types, submission helper, and fetch helpers for the testimonial system.
 * Testimonials are collected after first_inspection_passed milestone
 * and displayed on ScoreTable county pages (approved only).
 */
import { supabase } from './supabase';

export interface Testimonial {
  id: string;
  org_id: string | null;
  user_id: string | null;
  quote: string;
  author_name: string | null;
  role_title: string | null;
  org_name: string | null;
  county: string | null;
  city: string | null;
  approved: boolean;
  featured: boolean;
  created_at: string;
}

/**
 * Submit a new testimonial. Requires authenticated user.
 * Testimonial starts as unapproved — admin must approve before display.
 */
export async function submitTestimonial(
  userId: string,
  orgId: string,
  quote: string,
  authorName: string,
  roleTitle: string,
  orgName: string,
  county: string,
  city: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('testimonials').insert({
    user_id: userId,
    org_id: orgId,
    quote,
    author_name: authorName,
    role_title: roleTitle,
    org_name: orgName,
    county: county.toLowerCase(),
    city,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Fetch approved testimonials, optionally filtered by county.
 * Falls back to all approved testimonials if county has none.
 * Used on public ScoreTable pages.
 */
export async function fetchApprovedTestimonials(
  county?: string,
): Promise<Testimonial[]> {
  if (county) {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .eq('approved', true)
      .eq('county', county.toLowerCase())
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3);

    if (data && data.length > 0) return data;
  }

  // Fallback: statewide approved testimonials
  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .eq('approved', true)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(3);

  return data ?? [];
}

/**
 * Fetch all testimonials for admin management.
 */
export async function fetchAllTestimonials(): Promise<Testimonial[]> {
  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  return data ?? [];
}

/**
 * Toggle approved status on a testimonial (admin action).
 */
export async function toggleTestimonialApproval(
  id: string,
  approved: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from('testimonials')
    .update({ approved })
    .eq('id', id);

  return !error;
}

/**
 * Toggle featured status on a testimonial (admin action).
 */
export async function toggleTestimonialFeatured(
  id: string,
  featured: boolean,
): Promise<boolean> {
  const { error } = await supabase
    .from('testimonials')
    .update({ featured })
    .eq('id', id);

  return !error;
}

/**
 * Delete a testimonial (admin action).
 */
export async function deleteTestimonial(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('testimonials')
    .delete()
    .eq('id', id);

  return !error;
}
