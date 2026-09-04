"use server";

import { headers } from "next/headers";
import { registerVoter } from "@/lib/services/voter";

export async function submitVoterRegistrationAction(
  campaignSlug: string,
  publicCode: string,
  data: {
    name: string;
    motherName: string;
    zone: string;
    section: string;
    phone: string;
    voterTitle?: string;
    honeypot?: string;
  }
) {
  const headersList = await headers();
  return registerVoter(campaignSlug, publicCode, data, headersList);
}
