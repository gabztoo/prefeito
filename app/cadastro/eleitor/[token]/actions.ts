"use server";

import { completeVoterRegistration } from "@/lib/services/registration";
import { ActionResult } from "@/lib/types";

export async function submitVoterRegistrationAction(data: {
  token: string;
  name: string;
  phone: string;
  zone: string;
  section: string;
  voterTitle?: string;
  cep?: string;
}): Promise<ActionResult<{ id: string }>> {
  return completeVoterRegistration({
    token: data.token,
    name: data.name,
    phone: data.phone,
    zone: data.zone,
    section: data.section,
    voterTitle: data.voterTitle,
    cep: data.cep,
  });
}
